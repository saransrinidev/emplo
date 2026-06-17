import { useRef, useState, type FormEvent } from "react";
import { Upload, Wand2, Edit3, CheckCircle, Loader2 } from "lucide-react";
import { certificationsApi } from "../api/certifications";
import { uploadFile } from "../api/upload";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import AsyncState from "../components/AsyncState";
import EmptyState from "../components/EmptyState";
import ImageModal from "../components/ImageModal";
import PageHeader from "../components/PageHeader";
import Skeleton from "../components/Skeleton";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { useApi } from "../hooks/useApi";

interface ParsedCertificate {
  certificate_name: string | null;
  certificate_number: string | null;
  issuing_authority: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  category: string | null;
  raw_text: string | null;
  confidence: number;
}

export default function Certifications() {
  const { user } = useAuth();
  const toast = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useApi(
    () => certificationsApi.list(),
    [refreshKey],
  );
  const certifications = data ?? [];
  const [showForm, setShowForm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  return (
    <div>
      <PageHeader
        title="Certifications"
        subtitle="Technical and professional certifications."
        actions={
          <button className="btn btn-sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ Add Certification"}
          </button>
        }
      />
      {showForm && user && (
        <AddCertificationForm
          onSuccess={() => {
            setShowForm(false);
            setRefreshKey((k) => k + 1);
            toast.success("Certification added successfully!");
          }}
        />
      )}
      <AsyncState loading={loading} error={error}>
        {certifications.length === 0 ? (
          <EmptyState
            title="No certifications yet"
            description="Upload your professional certifications — they'll be verified by HR."
            action={
              <button className="btn btn-sm" onClick={() => setShowForm(true)}>
                + Add Certification
              </button>
            }
          />
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Certificate</th>
                  <th>Number</th>
                  <th>Category</th>
                  <th>Issued</th>
                  <th>Expiry</th>
                  <th>File</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {certifications.map((cert) => (
                  <tr key={cert.id}>
                    <td>{cert.certificate_name}</td>
                    <td className="muted">{cert.certificate_number ?? "—"}</td>
                    <td className="muted" style={{ textTransform: "capitalize" }}>
                      {cert.category.replace("_", " ")}
                    </td>
                    <td className="muted">{cert.issued_date ?? "—"}</td>
                    <td className="muted">{cert.expiry_date ?? "—"}</td>
                    <td>
                      {cert.file_url ? (
                        <button className="btn btn-outline btn-sm" onClick={() => { setPreviewUrl(cert.file_url); setPreviewTitle(cert.certificate_name); }}>
                          View
                        </button>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td><StatusBadge status={cert.verification_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncState>
      {previewUrl && (
        <ImageModal url={previewUrl} title={previewTitle} onClose={() => setPreviewUrl(null)} />
      )}
    </div>
  );
}

// ─── Add Certification Form with Automatic / Manual modes ────────────────────

type Mode = "automatic" | "manual";

function AddCertificationForm({
  employeeId,
  onSuccess,
}: {
  employeeId?: string;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<Mode>("automatic");
  const [certName, setCertName] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [category, setCategory] = useState("other");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanConfidence, setScanConfidence] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [showPasteField, setShowPasteField] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setScanned(false);
    setFormError("");

    if (file && mode === "automatic") {
      // Auto-scan the image
      await scanImage(file);
    }
  };

  const scanImage = async (file: File) => {
    setScanning(true);
    setFormError("");

    try {
      // Do OCR in the browser using Tesseract.js
      const Tesseract = await import("tesseract.js");
      const worker = await Tesseract.createWorker("eng");
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const text = data.text;

      if (text && text.trim().length > 10) {
        // Send extracted text to backend for structured parsing
        const result = await api.post<ParsedCertificate>("/ocr/parse-certificate", { text });
        applyParsedResult(result);
      } else {
        toast.warning("Could not read text from image. Try a clearer image or paste the text.");
        setShowPasteField(true);
        setCertName(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
      }
    } catch (err) {
      // Tesseract.js failed — show paste fallback
      setCertName(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
      toast.info("Scanning not available. Please paste certificate text below.");
      setShowPasteField(true);
    } finally {
      setScanning(false);
    }
  };

  const applyParsedResult = (result: ParsedCertificate) => {
    if (result.certificate_name) setCertName(result.certificate_name);
    if (result.certificate_number) setCertNumber(result.certificate_number);
    if (result.category) {
      // Map to valid enum values; anything not recognized → "other"
      const validCategories = ["aws", "microsoft", "azure", "google", "meta", "cisco", "comptia", "scrum", "pmp", "ibm", "coursera", "power_bi", "other"];
      setCategory(validCategories.includes(result.category) ? result.category : "other");
    }
    if (result.issued_date) {
      const parsed = parseDateString(result.issued_date);
      if (parsed) setIssuedDate(parsed);
    }
    if (result.expiry_date) {
      const parsed = parseDateString(result.expiry_date);
      if (parsed) setExpiryDate(parsed);
    }
    setScanConfidence(result.confidence);
    setScanned(true);

    if (result.confidence > 0.5) {
      toast.success("Certificate scanned! Please verify the extracted details.");
    } else if (result.confidence > 0) {
      toast.info("Partially scanned — please fill in the remaining fields.");
    } else {
      toast.warning("Could not extract details. Please verify and complete the form.");
    }
  };

  const handlePasteText = async (text: string) => {
    if (!text.trim()) return;
    setScanning(true);
    try {
      const result = await api.post<ParsedCertificate>("/ocr/parse-certificate", { text });
      applyParsedResult(result);
      setShowPasteField(false);
    } catch {
      toast.error("Failed to parse text.");
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!certName) {
      setFormError("Certificate name is required.");
      return;
    }

    setSubmitting(true);

    try {
      let finalUrl = fileUrl;

      // Upload the file if selected
      if (selectedFile) {
        setUploading(true);
        try {
          const result = await uploadFile(selectedFile);
          finalUrl = result.url;
        } catch (err) {
          setFormError(err instanceof Error ? err.message : "File upload failed.");
          setSubmitting(false);
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      await certificationsApi.create({
        ...(employeeId ? { employee_id: employeeId } : {}),
        certificate_name: certName,
        certificate_number: certNumber || undefined,
        category,
        issued_date: issuedDate || undefined,
        expiry_date: expiryDate || undefined,
        file_url: finalUrl || undefined,
      });
      onSuccess();
    } catch {
      setFormError("Failed to add certification.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card cert-form-card">
      <h2 style={{ marginBottom: 4 }}>Add Certification</h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
        Upload a certificate image to auto-fill details, or enter them manually.
      </p>

      {/* Mode Toggle */}
      <div className="cert-mode-toggle">
        <button
          type="button"
          className={`cert-mode-btn ${mode === "automatic" ? "cert-mode-active" : ""}`}
          onClick={() => setMode("automatic")}
        >
          <Wand2 size={16} />
          <span>Automatic</span>
          <span className="cert-mode-sub">Scan & auto-fill</span>
        </button>
        <button
          type="button"
          className={`cert-mode-btn ${mode === "manual" ? "cert-mode-active" : ""}`}
          onClick={() => setMode("manual")}
        >
          <Edit3 size={16} />
          <span>Manual</span>
          <span className="cert-mode-sub">Enter details</span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* File Upload Area */}
        <div className="cert-upload-area" style={{ marginBottom: 20 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <div className="cert-upload-box" onClick={() => fileInputRef.current?.click()}>
            {scanning ? (
              <div className="cert-upload-scanning">
                <Loader2 size={24} className="spin" />
                <span>Scanning certificate...</span>
              </div>
            ) : selectedFile ? (
              <div className="cert-upload-selected">
                {scanned && <CheckCircle size={18} className="text-success" />}
                <div>
                  <div style={{ fontWeight: 500 }}>{selectedFile.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB
                    {scanned && ` · ${Math.round(scanConfidence * 100)}% confidence`}
                    {" · Click to change"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="cert-upload-placeholder">
                <Upload size={24} />
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {mode === "automatic" ? "Upload certificate to scan" : "Upload certificate file (optional)"}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>JPG, PNG, PDF accepted</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scanned indicator */}
        {scanned && mode === "automatic" && (
          <div className="cert-scan-result">
            <CheckCircle size={14} />
            <span>Fields auto-filled from scan. Please verify and correct if needed.</span>
          </div>
        )}

        {/* Paste text fallback (when OCR is unavailable) */}
        {showPasteField && mode === "automatic" && !scanned && (
          <div className="cert-paste-section">
            <p className="cert-paste-hint">
              💡 Copy the text from your certificate (Ctrl+A → Ctrl+C on the certificate page) and paste it below:
            </p>
            <textarea
              className="input"
              rows={4}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste certificate text here... (e.g. from Coursera, AWS, Microsoft credential page)"
            />
            <button
              type="button"
              className="btn btn-sm"
              style={{ marginTop: 8 }}
              disabled={!pasteText.trim() || scanning}
              onClick={() => handlePasteText(pasteText)}
            >
              {scanning ? "Parsing..." : "Parse Text"}
            </button>
          </div>
        )}

        {/* Form Fields */}
        <div className="form-grid">
          <div className="field">
            <label>Certificate Name *</label>
            <input className="input" value={certName} onChange={(e) => setCertName(e.target.value)} placeholder="AWS Solutions Architect Associate" />
          </div>
          <div className="field">
            <label>Certificate Number</label>
            <input className="input" value={certNumber} onChange={(e) => setCertNumber(e.target.value)} placeholder="e.g. AWS-SAA-2024-1234" />
          </div>
          <div className="field">
            <label>Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="aws">AWS</option>
              <option value="microsoft">Microsoft</option>
              <option value="azure">Azure</option>
              <option value="google">Google Cloud</option>
              <option value="meta">Meta</option>
              <option value="cisco">Cisco</option>
              <option value="comptia">CompTIA</option>
              <option value="scrum">Scrum</option>
              <option value="pmp">PMP / PMI</option>
              <option value="ibm">IBM</option>
              <option value="coursera">Coursera</option>
              <option value="power_bi">Power BI</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field">
            <label>Issued Date</label>
            <input className="input" type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Expiry Date</label>
            <input className="input" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
        </div>

        {formError && <p className="error-text" style={{ marginBottom: 12 }}>{formError}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn" type="submit" disabled={submitting}>
            {uploading ? "Uploading file…" : submitting ? "Saving…" : "Save Certification"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDateString(dateStr: string): string | null {
  // Try to parse various date formats into YYYY-MM-DD for the input
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch { /* ignore */ }

  // Try DD/MM/YYYY
  const match = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (match) {
    const [, a, b, year] = match;
    // Assume DD/MM/YYYY
    const day = parseInt(a);
    const month = parseInt(b);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  return null;
}
