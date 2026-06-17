import { useRef, useState, type FormEvent } from "react";
import { Award, CheckCircle2, Clock, AlertTriangle, Calendar, ExternalLink } from "lucide-react";
import { certificationsApi } from "../api/certifications";
import { uploadFile } from "../api/upload";
import { useAuth } from "../context/AuthContext";
import AsyncState from "../components/AsyncState";
import ImageModal from "../components/ImageModal";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";

export default function Certifications() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useApi(
    () => certificationsApi.list(),
    [refreshKey],
  );
  const certifications = data ?? [];
  const [showForm, setShowForm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  // Calculate Stats
  const totalCerts = certifications.length;
  const verifiedCerts = certifications.filter((c) => c.verification_status === "verified").length;
  const pendingCerts = certifications.filter((c) => c.verification_status === "uploaded").length;
  const expiredCerts = certifications.filter((c) => {
    if (!c.expiry_date) return false;
    const expiry = new Date(c.expiry_date);
    const today = new Date();
    // Reset hours for accurate date comparison
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return expiry <= today;
  }).length;

  // Helper to determine category badge styling
  const getCategoryBadge = (category: string) => {
    const cat = category.toLowerCase();
    if (["aws", "azure", "microsoft"].includes(cat)) {
      return <span className="cert-badge cert-badge-cloud">Cloud</span>;
    } else if (["scrum", "pmp"].includes(cat)) {
      return <span className="cert-badge cert-badge-management">Management</span>;
    } else if (["security", "cissp"].includes(cat)) {
      return <span className="cert-badge cert-badge-security">Security</span>;
    } else {
      return <span className="cert-badge cert-badge-other">{category.replace("_", " ")}</span>;
    }
  };

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
        <div className="cert-form-container">
          <AddCertificationForm
            onSuccess={() => {
              setShowForm(false);
              setRefreshKey((k) => k + 1);
            }}
          />
        </div>
      )}

      <AsyncState loading={loading} error={error}>
        {/* Stats Row */}
        <div className="certs-stats-row">
          <div className="certs-stat-card">
            <div className="docs-stat-icon" style={{ background: "hsl(var(--primary-light) / 0.15)", color: "var(--primary-color)" }}>
              <Award size={20} />
            </div>
            <div>
              <div className="docs-stat-val">{totalCerts}</div>
              <div className="docs-stat-lbl">Total Certifications</div>
            </div>
          </div>
          <div className="certs-stat-card">
            <div className="docs-stat-icon" style={{ background: "hsl(142 60% 93%)", color: "hsl(142 71% 45%)" }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="docs-stat-val">{verifiedCerts}</div>
              <div className="docs-stat-lbl">Verified</div>
            </div>
          </div>
          <div className="certs-stat-card">
            <div className="docs-stat-icon" style={{ background: "hsl(45 90% 93%)", color: "hsl(45 90% 40%)" }}>
              <Clock size={20} />
            </div>
            <div>
              <div className="docs-stat-val">{pendingCerts}</div>
              <div className="docs-stat-lbl">Pending Review</div>
            </div>
          </div>
          <div className="certs-stat-card">
            <div className="docs-stat-icon" style={{ background: "hsl(0 84% 94%)", color: "hsl(0 84% 50%)" }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="docs-stat-val">{expiredCerts}</div>
              <div className="docs-stat-lbl">Expired</div>
            </div>
          </div>
        </div>

        {/* Certifications Card Grid */}
        {certifications.length === 0 ? (
          <div className="perf-empty">
            <Award size={48} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
            <div style={{ fontWeight: 700, fontSize: 16 }}>No certifications added yet</div>
            <div style={{ fontSize: 13.5, color: "var(--text-muted)", maxWidth: 300 }}>
              Add your technical credentials or industry certificates to highlight them in your profile.
            </div>
          </div>
        ) : (
          <div className="certs-grid">
            {certifications.map((cert) => (
              <div key={cert.id} className="certs-card">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    {getCategoryBadge(cert.category)}
                    <StatusBadge status={cert.verification_status} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: "4px 0", color: "var(--text)" }}>
                      {cert.certificate_name}
                    </h3>
                    <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>
                      ID: {cert.certificate_number || "—"}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-secondary)" }}>
                      <Calendar size={14} style={{ color: "var(--text-muted)" }} />
                      <span>Issued: {cert.issued_date || "—"}</span>
                    </div>
                    {cert.expiry_date && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-secondary)" }}>
                        <Calendar size={14} style={{ color: "var(--text-muted)" }} />
                        <span style={{
                          color: cert.expiry_date && new Date(cert.expiry_date) <= new Date() ? "hsl(0 84% 50%)" : "inherit"
                        }}>
                          Expires: {cert.expiry_date}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 18, borderTop: "1px solid hsl(var(--border) / 0.5)", paddingTop: 14, display: "flex", justifyContent: "end" }}>
                  {cert.file_url ? (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setPreviewUrl(cert.file_url!);
                        setPreviewTitle(cert.certificate_name);
                      }}
                      style={{ width: "100%" }}
                    >
                      <ExternalLink size={13} style={{ marginRight: 6 }} /> View Certificate
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>No file attached</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </AsyncState>
      {previewUrl && (
        <ImageModal
          url={previewUrl}
          title={previewTitle}
          onClose={() => setPreviewUrl(null)}
        />
      )}
    </div>
  );
}

// ---- Add Certification Form with two modes ----

type Mode = "upload" | "manual";

function AddCertificationForm({
  employeeId,
  onSuccess,
}: {
  employeeId?: string;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<Mode>("upload");
  const [certName, setCertName] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [category, setCategory] = useState("other");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file && !certName) {
      // Auto-fill cert name from filename
      setCertName(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!certName) {
      setFormError("Certificate name is required.");
      return;
    }

    if (mode === "upload" && !selectedFile) {
      setFormError("Please select a file to upload.");
      return;
    }

    setSubmitting(true);

    try {
      let finalUrl = fileUrl;

      // If upload mode, upload the file first
      if (mode === "upload" && selectedFile) {
        setUploading(true);
        try {
          const result = await uploadFile(selectedFile);
          finalUrl = result.url;
        } catch (err) {
          setFormError(
            err instanceof Error ? err.message : "File upload failed.",
          );
          setSubmitting(false);
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      // Create the certification record
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
    <div className="card" style={{ marginBottom: 20 }}>
      <h2 style={{ marginBottom: 16 }}>Add Certification</h2>

      {/* Mode toggle */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`tab-btn ${mode === "upload" ? "tab-btn-active" : ""}`}
          onClick={() => setMode("upload")}
        >
          Upload Certificate
        </button>
        <button
          type="button"
          className={`tab-btn ${mode === "manual" ? "tab-btn-active" : ""}`}
          onClick={() => setMode("manual")}
        >
          Add Manual Details
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* File upload area (upload mode) */}
        {mode === "upload" && (
          <div className="upload-area" style={{ marginBottom: 20 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <div
              className="upload-box"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div>
                  <div style={{ fontWeight: 500 }}>{selectedFile.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB · Click to change
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 500 }}>
                    Click to select certificate file
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    PDF, JPG, PNG, DOC accepted
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual URL (manual mode) */}
        {mode === "manual" && (
          <div className="field" style={{ marginBottom: 16 }}>
            <label>Certificate File URL (optional)</label>
            <input
              className="input"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        )}

        {/* Common fields for both modes */}
        <div className="form-grid">
          <div className="field">
            <label>Certificate Name *</label>
            <input
              className="input"
              value={certName}
              onChange={(e) => setCertName(e.target.value)}
              placeholder="AWS Solutions Architect"
            />
          </div>
          <div className="field">
            <label>Certificate Number</label>
            <input
              className="input"
              value={certNumber}
              onChange={(e) => setCertNumber(e.target.value)}
              placeholder="e.g. AWS-2024-1234"
            />
          </div>
          <div className="field">
            <label>Category</label>
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="microsoft">Microsoft</option>
              <option value="aws">AWS</option>
              <option value="azure">Azure</option>
              <option value="scrum">Scrum</option>
              <option value="power_bi">Power BI</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field">
            <label>Issued Date</label>
            <input
              className="input"
              type="date"
              value={issuedDate}
              onChange={(e) => setIssuedDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Expiry Date</label>
            <input
              className="input"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
        </div>

        {formError && (
          <p className="error-text" style={{ marginBottom: 12 }}>
            {formError}
          </p>
        )}

        <button
          className="btn"
          type="submit"
          disabled={submitting}
          style={{ marginTop: 8 }}
        >
          {uploading
            ? "Uploading file…"
            : submitting
              ? "Saving…"
              : mode === "upload"
                ? "Upload & Save"
                : "Save Certification"}
        </button>
      </form>
    </div>
  );
}
