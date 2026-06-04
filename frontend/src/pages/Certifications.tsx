import { useRef, useState, type FormEvent } from "react";
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
          }}
        />
      )}
      <AsyncState loading={loading} error={error}>
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
              {certifications.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="muted"
                    style={{ textAlign: "center" }}
                  >
                    No certifications added yet.
                  </td>
                </tr>
              ) : (
                certifications.map((cert) => (
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
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setPreviewUrl(cert.file_url);
                            setPreviewTitle(cert.certificate_name);
                          }}
                        >
                          View
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={cert.verification_status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
