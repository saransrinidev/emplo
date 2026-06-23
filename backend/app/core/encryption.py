"""Real encryption for sensitive fields (bank account numbers, etc.).

Uses Fernet symmetric encryption from the `cryptography` library.
The key is derived from the JWT_SECRET_KEY (for simplicity in dev). 
In production, use a dedicated KMS-managed key.
"""
import base64
import hashlib

from cryptography.fernet import Fernet

from app.core.config import get_settings


def _get_fernet() -> Fernet:
    """Derive a Fernet key from the JWT secret."""
    settings = get_settings()
    # Fernet requires a 32-byte base64-encoded key.
    # Derive from JWT secret using SHA256.
    raw = hashlib.sha256(settings.jwt_secret_key.encode()).digest()
    key = base64.urlsafe_b64encode(raw)
    return Fernet(key)


def encrypt(plaintext: str) -> str:
    """Encrypt a string. Returns a base64-encoded ciphertext."""
    f = _get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt back to plaintext. Returns original string."""
    f = _get_fernet()
    return f.decrypt(ciphertext.encode()).decode()


def mask_account_number(ciphertext: str) -> str:
    """Decrypt and show only last 4 digits. Returns masked string like XXXX1234."""
    try:
        plain = decrypt(ciphertext)
        return "XXXX" + plain[-4:] if len(plain) >= 4 else "XXXX"
    except Exception:
        # Fallback for legacy base64-encoded values
        try:
            plain = base64.b64decode(ciphertext.encode()).decode()
            return "XXXX" + plain[-4:] if len(plain) >= 4 else "XXXX"
        except Exception:
            return "XXXX****"
