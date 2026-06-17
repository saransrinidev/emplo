"""Certificate OCR parsing endpoint.

Accepts either:
1. Raw text (from client-side OCR) and parses it into structured fields
2. Base64 image (attempts server-side extraction if Tesseract is available)

Extracts: certificate name, certificate number, issuing authority, dates.
"""
import re
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/ocr", tags=["ocr"])


class OCRRequest(BaseModel):
    text: str | None = None       # Pre-extracted text (from client-side OCR)
    image_base64: str | None = None  # Base64 image for server-side OCR


class ParsedCertificate(BaseModel):
    certificate_name: str | None = None
    certificate_number: str | None = None
    issuing_authority: str | None = None
    issued_date: str | None = None
    expiry_date: str | None = None
    category: str | None = None
    raw_text: str | None = None
    confidence: float = 0.0  # 0-1 confidence score


# Known certificate issuers and their patterns
KNOWN_ISSUERS = {
    "microsoft": ["microsoft", "ms-", "az-", "azure", "mcp", "mcsa", "mcse", "ms certified"],
    "aws": ["amazon web services", "aws", "aws certified", "amazon"],
    "google": ["google", "gcp", "google cloud"],
    "scrum": ["scrum.org", "scrum alliance", "csm", "psm", "safe"],
    "pmp": ["pmi", "project management", "pmp", "capm", "pgmp"],
    "cisco": ["cisco", "ccna", "ccnp", "ccie"],
    "comptia": ["comptia", "comp tia", "a+", "network+", "security+"],
    "oracle": ["oracle", "oca", "ocp"],
    "meta": ["meta", "facebook", "meta front", "meta back", "meta database"],
    "coursera": ["coursera", "coursera.org"],
    "ibm": ["ibm", "ibm certified"],
    "salesforce": ["salesforce", "trailhead"],
    "hashicorp": ["hashicorp", "terraform"],
    "kubernetes": ["kubernetes", "cka", "ckad", "cks"],
    "linux": ["linux foundation", "lfcs", "lfce"],
}

# Common date patterns
DATE_PATTERNS = [
    r"(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})",           # DD/MM/YYYY or MM/DD/YYYY
    r"(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})",           # YYYY-MM-DD
    r"(\w+)\s+(\d{1,2}),?\s+(\d{4})",                         # Month DD, YYYY
    r"(\d{1,2})\s+(\w+)\s+(\d{4})",                           # DD Month YYYY
]

# Certificate number patterns
CERT_NUMBER_PATTERNS = [
    r"(?:certificate|credential|cert|license|badge)\s*(?:no|number|id|#)?[:\s]*([A-Z0-9\-]{4,20})",
    r"(?:id|no|number|#)[:\s]*([A-Z0-9\-]{4,20})",
    r"verify.*?/([A-Z0-9]{8,20})",                            # Verification URL ID
    r"credential[:\s]+id[:\s]*([A-Z0-9\-]{4,20})",
    r"\b([A-Z]{2,4}-\d{4,12})\b",                            # XX-123456
    r"\b([A-Z0-9]{10,16})\b",                                 # Long alphanumeric sequences
]

# Expiry-related keywords
EXPIRY_KEYWORDS = ["expir", "valid until", "valid through", "valid till", "expiration", "expires on", "renewal"]
ISSUE_KEYWORDS = ["issued", "date of issue", "issue date", "awarded", "earned", "completed", "date of completion"]


def _extract_dates(text: str) -> list[str]:
    """Extract all dates from text."""
    dates = []
    for pattern in DATE_PATTERNS:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for m in matches:
            dates.append(m.group(0))
    return dates


def _classify_dates(text: str, dates: list[str]) -> tuple[str | None, str | None]:
    """Try to classify which dates are issue vs expiry dates."""
    issued = None
    expiry = None

    lines = text.lower().split("\n")
    for line in lines:
        for d in dates:
            if d.lower() in line:
                if any(kw in line for kw in EXPIRY_KEYWORDS):
                    expiry = d
                elif any(kw in line for kw in ISSUE_KEYWORDS):
                    issued = d

    # If we found dates but couldn't classify, assume first is issue, second is expiry
    if not issued and not expiry and len(dates) >= 1:
        issued = dates[0]
        if len(dates) >= 2:
            expiry = dates[1]
    elif not issued and len(dates) >= 1:
        for d in dates:
            if d != expiry:
                issued = d
                break

    return issued, expiry


def _detect_category(text: str) -> str | None:
    """Detect the certificate category from known issuers."""
    lower = text.lower()
    for category, keywords in KNOWN_ISSUERS.items():
        if any(kw in lower for kw in keywords):
            return category
    return "other"


def _extract_cert_number(text: str) -> str | None:
    """Extract certificate/credential number."""
    # First try: verification URL (Coursera, Credly, etc.) — grab last path segment
    url_match = re.search(r"https?://[^\s]+/([A-Za-z0-9]{8,20})(?:\s|$|\.)", text, re.IGNORECASE)
    if url_match:
        return url_match.group(1)

    # Credential ID pattern
    m = re.search(r"credential\s*(?:id|#)?[:\s]+([A-Z0-9\-]{4,20})", text, re.IGNORECASE)
    if m:
        return m.group(1)

    # Generic patterns
    for pattern in [
        r"(?:certificate|cert|license|badge)\s*(?:no|number|id|#)[:\s]+([A-Z0-9\-]{4,20})",
        r"(?:id|number|#)[:\s]+([A-Z0-9\-]{6,20})",
        r"\b([A-Z]{2,4}-\d{4,12})\b",
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(1)
    return None


def _extract_cert_name(text: str) -> str | None:
    """Try to extract the certificate title — usually the most prominent line."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    candidates = [l for l in lines if 10 <= len(l) <= 120]

    # Skip patterns: lines that are clearly NOT the cert name
    skip_patterns = [
        "this is to", "hereby", "awarded to", "has successfully", "presented to",
        "certify that", "credential", "member since", "certificate number",
        "certification number", "date", "issued", "expired", "valid",
        "verify", "https://", "http://", "instructor", "candidate",
    ]

    # Strategy 1: Find lines containing strong title keywords
    title_keywords = [
        "certified", "developer", "architect", "engineer", "associate",
        "professional", "practitioner", "specialist", "expert", "master",
        "analyst", "administrator", "network", "security", "cloud",
        "data science", "machine learning", "solutions", "devops",
        "scrum", "project management", "front-end", "back-end", "full stack",
    ]

    for line in candidates:
        lower = line.lower()
        if any(kw in lower for kw in title_keywords):
            if any(skip in lower for skip in skip_patterns):
                continue
            # Don't pick lines that look like a person's name (all caps, short)
            if line.isupper() and len(line.split()) <= 3 and len(line) < 30:
                continue
            return line

    # Strategy 2: Look for line AFTER "certificate" or "completed" line
    for i, line in enumerate(lines):
        lower = line.lower()
        if any(kw in lower for kw in ["completed", "certificate", "earned"]):
            for j in range(i + 1, min(i + 3, len(lines))):
                candidate = lines[j].strip()
                lower_c = candidate.lower()
                if len(candidate) >= 8:
                    if any(skip in lower_c for skip in skip_patterns):
                        continue
                    # Skip lines that look like a person's name
                    if candidate.isupper() and len(candidate.split()) <= 4:
                        continue
                    return candidate

    # Strategy 3: Longest candidate line (excluding skipped ones)
    valid = [l for l in candidates if not any(skip in l.lower() for skip in skip_patterns)]
    if valid:
        return max(valid, key=len)
    return None


def _extract_issuer(text: str) -> str | None:
    """Try to extract the issuing authority."""
    lower = text.lower()
    # Check known issuers first
    for category, keywords in KNOWN_ISSUERS.items():
        for kw in keywords:
            if kw in lower:
                # Return a clean name
                names = {
                    "microsoft": "Microsoft",
                    "aws": "Amazon Web Services",
                    "google": "Google Cloud",
                    "scrum": "Scrum Alliance",
                    "pmp": "Project Management Institute",
                    "cisco": "Cisco",
                    "comptia": "CompTIA",
                    "oracle": "Oracle",
                    "meta": "Meta",
                    "coursera": "Coursera",
                    "ibm": "IBM",
                    "salesforce": "Salesforce",
                    "hashicorp": "HashiCorp",
                    "kubernetes": "Linux Foundation (Kubernetes)",
                    "linux": "Linux Foundation",
                }
                return names.get(category, kw.title())

    # Look for "issued by" or "by" patterns
    m = re.search(r"(?:issued by|awarded by|certified by|by)\s*[:\s]*(.+)", text, re.IGNORECASE)
    if m:
        return m.group(1).strip()[:100]
    return None


def parse_certificate_text(text: str) -> ParsedCertificate:
    """Parse raw text into structured certificate fields."""
    if not text or len(text.strip()) < 10:
        return ParsedCertificate(raw_text=text, confidence=0.0)

    cert_name = _extract_cert_name(text)
    cert_number = _extract_cert_number(text)
    issuer = _extract_issuer(text)
    dates = _extract_dates(text)
    issued_date, expiry_date = _classify_dates(text, dates)
    category = _detect_category(text)

    # Calculate confidence based on how many fields we extracted
    fields_found = sum([
        bool(cert_name),
        bool(cert_number),
        bool(issuer),
        bool(issued_date),
    ])
    confidence = min(fields_found / 4, 1.0)

    return ParsedCertificate(
        certificate_name=cert_name,
        certificate_number=cert_number,
        issuing_authority=issuer,
        issued_date=issued_date,
        expiry_date=expiry_date,
        category=category,
        raw_text=text[:500],
        confidence=confidence,
    )


@router.post("/parse-certificate", response_model=ParsedCertificate)
def parse_certificate(
    payload: OCRRequest,
    _: User = Depends(get_current_user),
) -> ParsedCertificate:
    """Parse a certificate image or text into structured fields.

    Send either `text` (if client-side OCR was used) or `image_base64`.
    """
    text = payload.text

    # If image provided but no text, try server-side OCR
    if not text and payload.image_base64:
        try:
            import base64
            import io
            from PIL import Image
            import pytesseract

            img_data = base64.b64decode(payload.image_base64.split(",")[-1])
            img = Image.open(io.BytesIO(img_data))
            text = pytesseract.image_to_string(img)
        except ImportError:
            raise HTTPException(
                400,
                "Server-side OCR not available. Please use client-side text extraction."
            )
        except Exception as e:
            raise HTTPException(400, f"Failed to process image: {str(e)}")

    if not text:
        raise HTTPException(400, "Provide either text or image_base64")

    return parse_certificate_text(text)
