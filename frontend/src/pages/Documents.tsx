import { useState, useRef, type FormEvent } from "react";
import { FileText, Upload, CheckCircle2, Clock, XCircle, Eye } from "lucide-react";
import { documentsApi, type DocumentItem } from "../api/documents";
import { uploadFile } from "../api/upload";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";

// The 4 required document types every employee must submit
const REQUIRED_DOCS = [
  { type: "school", label: "School Certificates", description: "10th / SSC / equivalent certificates" },
  { type: "intermediate", label: "Intermediate / 12th Certificates", description: "12th / HSC / equivalent certificates" },
  { type: "degree", label: "Degree Certificates", description: "UG / PG degree certificates" },
  { type: "transcript", label: "Transcripts", description: "Academic transcripts and marksheets" },
] as const;

export default function Documents() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useApi(() => documentsApi.list(), [refreshKey]);
  const documents = data ?? [];
  const [uploadType, setUploadType] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<DocumentItem | null>(null);

  // Get the latest document for each required type
  function getDocForType(type: string): DocumentItem | undefined {
    const matches = documents.filter((d) => d.document_type === type);
    if (matches.length === 0) return undefined;
    // Return the most recently uploaded one
    return matches.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  }

  // Other documents (type = "other")
  const otherDocs = documents.filter(
    (d) => !REQUIRED_DOCS.some((r) => r.type === d.document_type)
  );

  // Calculate stats
  const totalUploaded = documents.length;
  const verified = documents.filter((d) => d.status === "verified").length;
  const pending = REQUIRED_DOCS.filter((r) => {
    const doc = getDocForType(r.type);
    return !doc || doc.status === "uploaded";
  }).length;
  const rejected = documents.filter((d) => d.status === "rejected").length;

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Upload your required educational documents."
      />
      <AsyncState loading={loading} error={error}>
        {/* Stats Row */}
        <div className="docs-stats-row">
          <div className="docs-stat-card">
            <div className="docs-stat-icon" style={{ background: "hsl(var(--primary-light) / 0.15)", color: "var(--primary-color)" }}>
              <FileText size={20} />
            </div>
            <div>
              <div className="docs-stat-val">{totalUploaded}</div>
              <div className="docs-stat-lbl">Total Uploaded</div>
            </div>
          </div>
          <div className="docs-stat-card">
            <div className="docs-stat-icon" style={{ background: "hsl(142 60% 93%)", color: "hsl(142 71% 45%)" }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="docs-stat-val">{verified}</div>
              <div className="docs-stat-lbl">Verified Docs</div>
            </div>
          </div>
          <div className="docs-stat-card">
            <div className="docs-stat-icon" style={{ background: "hsl(45 90% 93%)", color: "hsl(45 90% 40%)" }}>
              <Clock size={20} />
            </div>
            <div>
              <div className="docs-stat-val">{pending}</div>
              <div className="docs-stat-lbl">Pending Review / Upload</div>
            </div>
          </div>
          <div className="docs-stat-card">
            <div className="docs-stat-icon" style={{ background: "hsl(0 84% 94%)", color: "hsl(0 84% 50%)" }}>
              <XCircle size={20} />
            </div>
            <div>
              <div className="docs-stat-val">{rejected}</div>
              <div className="docs-stat-lbl">Rejected Docs</div>
            </div>
          </div>
        </div>

        {/* Required documents grid */}
        <h2 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Required Documents</h2>
        <div className="docs-grid">
          {REQUIRED_DOCS.map((req) => {
            const doc = getDocForType(req.type);
            return (
              <RequiredDocCard
                key={req.type}
                label={req.label}
                description={req.description}
                document={doc}
                onUpload={() => setUploadType(req.type)}
                onView={(d) => setViewDoc(d)}
              />
            );
          })}
        </div>

        {/* Other uploaded documents */}
        <div style={{ marginBottom: 24, marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Other Documents</h2>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {otherDocs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted" style={{ textAlign: "center", padding: 24 }}>
                      No other documents uploaded yet.
                    </td>
                  </tr>
                ) : (
                  otherDocs.map((doc) => (
                    <tr key={doc.id}>
                      <td style={{ fontWeight: 600 }}>{doc.document_name ?? "Document"}</td>
                      <td className="muted" style={{ textTransform: "capitalize" }}>{doc.document_type}</td>
                      <td className="muted">{doc.created_at.slice(0, 10)}</td>
                      <td><StatusBadge status={doc.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upload additional */}
        <button className="btn btn-outline btn-sm" onClick={() => setUploadType("other")}>
          + Upload Other Document
        </button>

        {/* Upload modal */}
        {uploadType && (
          <UploadDocumentModal
            documentType={uploadType}
            label={REQUIRED_DOCS.find((r) => r.type === uploadType)?.label ?? "Other Document"}
            onSuccess={() => {
              setUploadType(null);
              setRefreshKey((k) => k + 1);
            }}
            onClose={() => setUploadType(null)}
          />
        )}

        {/* Document viewer modal */}
        {viewDoc && (
          <DocumentViewerModal document={viewDoc} onClose={() => setViewDoc(null)} />
        )}
      </AsyncState>
    </div>
  );
}

// ------- Required Document Card -------

function RequiredDocCard({
  label,
  description,
  document,
  onUpload,
  onView,
}: {
  label: string;
  description: string;
  document: DocumentItem | undefined;
  onUpload: () => void;
  onView: (doc: DocumentItem) => void;
}) {
  const hasDoc = !!document;
  const status = document?.status;

  let cardClass = "docs-card";
  if (!hasDoc) cardClass += " docs-card-pending";
  else if (status === "verified") cardClass += " docs-card-verified";
  else if (status === "rejected") cardClass += " docs-card-rejected";

  return (
    <div className={cardClass}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
        <div>
          <div className="docs-icon-wrapper" style={{
            background: hasDoc ? (status === "verified" ? "hsl(142 60% 93%)" : status === "rejected" ? "hsl(0 84% 94%)" : "hsl(45 90% 93%)") : "var(--surface-hover)",
          }}>
            {!hasDoc && <FileText size={20} style={{ color: "var(--text-muted)" }} />}
            {hasDoc && status === "verified" && <CheckCircle2 size={20} style={{ color: "hsl(142 71% 45%)" }} />}
            {hasDoc && status === "uploaded" && <Clock size={20} style={{ color: "hsl(45 90% 40%)" }} />}
            {hasDoc && status === "rejected" && <XCircle size={20} style={{ color: "hsl(0 84% 50%)" }} />}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 4 }}>
            {label}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.4 }}>
            {description}
          </div>
        </div>

        <div>
          {!hasDoc && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="badge" style={{ background: "hsl(0 84% 60% / 0.1)", color: "hsl(0 84% 50%)", borderColor: "transparent", fontSize: 11 }}>
                Required
              </span>
              <button className="btn btn-sm" onClick={onUpload}>
                <Upload size={13} style={{ marginRight: 4 }} /> Upload
              </button>
            </div>
          )}
          {hasDoc && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <StatusBadge status={status!} />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {document!.created_at.slice(0, 10)}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-outline btn-sm" onClick={() => onView(document!)}>
                  <Eye size={13} style={{ marginRight: 4 }} /> View
                </button>
                {status === "rejected" && (
                  <button className="btn btn-sm" onClick={onUpload}>
                    Re-upload
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ------- Upload Document Modal (with file upload) -------

function UploadDocumentModal({
  documentType,
  label,
  onSuccess,
  onClose,
}: {
  documentType: string;
  label: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [documentName, setDocumentName] = useState(label);
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setFormError("Only JPG, PNG, and PDF files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError("File must be under 5MB.");
      return;
    }

    setFormError("");
    setUploading(true);
    try {
      const res = await uploadFile(file);
      setFileUrl(res.url);
      setFileName(res.filename);
      if (!documentName || documentName === label) {
        setDocumentName(res.filename.replace(/\.[^.]+$/, ""));
      }
    } catch (err: any) {
      setFormError(err.message || "File upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!documentName) {
      setFormError("Document name is required.");
      return;
    }
    if (!fileUrl) {
      setFormError("Please upload a file first.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await documentsApi.create({
        document_name: documentName,
        document_type: documentType,
        file_url: fileUrl,
      });
      onSuccess();
    } catch {
      setFormError("Failed to save document.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload: {label}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div className="field">
            <label>Document Name</label>
            <input className="input" value={documentName} onChange={(e) => setDocumentName(e.target.value)} />
          </div>

          {/* File upload area */}
          <div className="field">
            <label>File (JPG, PNG, or PDF — max 5MB)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            {!fileUrl ? (
              <div
                className="upload-box"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: 24 }}
              >
                {uploading ? (
                  <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Uploading...</span>
                ) : (
                  <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                    <Upload size={20} style={{ marginBottom: 6, color: "var(--primary-color)" }} />
                    <br />
                    Click to select file
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}>
                <FileText size={18} style={{ color: "var(--primary-color)" }} />
                <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{fileName}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFileUrl(""); setFileName(""); }} style={{ padding: 4 }}>✕</button>
              </div>
            )}
          </div>

          {formError && <p className="error-text" style={{ marginBottom: 12 }}>{formError}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-sm" disabled={submitting || !fileUrl}>
              {submitting ? "Saving…" : "Save Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------- Document Viewer Modal -------

function DocumentViewerModal({
  document,
  onClose,
}: {
  document: DocumentItem;
  onClose: () => void;
}) {
  const url = document.file_url;
  const isPdf = url.includes("application/pdf") || url.endsWith(".pdf");
  const isImage = url.startsWith("data:image") || /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 800, maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{document.document_name ?? "Document"}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
              download={document.document_name}
            >
              Download
            </a>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
          </div>
        </div>
        <div style={{ padding: 20, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300, overflow: "auto" }}>
          {isImage && (
            <img
              src={url}
              alt={document.document_name ?? "Document"}
              style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: "var(--radius)" }}
            />
          )}
          {isPdf && (
            <iframe
              src={url}
              title={document.document_name ?? "Document"}
              style={{ width: "100%", height: "70vh", border: "none", borderRadius: "var(--radius)" }}
            />
          )}
          {!isImage && !isPdf && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <FileText size={48} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
              <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Cannot preview this file type.</p>
              <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
                Open in new tab
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
