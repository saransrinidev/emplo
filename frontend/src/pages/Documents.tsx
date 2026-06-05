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

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Upload your required educational documents."
      />
      <AsyncState loading={loading} error={error}>
        {/* Required documents grid */}
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 24 }}>
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
        {otherDocs.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 12, fontSize: 15 }}>Other Documents</h2>
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
                  {otherDocs.map((doc) => (
                    <tr key={doc.id}>
                      <td>{doc.document_name ?? "Document"}</td>
                      <td className="muted" style={{ textTransform: "capitalize" }}>{doc.document_type}</td>
                      <td className="muted">{doc.created_at.slice(0, 10)}</td>
                      <td><StatusBadge status={doc.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: "var(--radius)",
          background: hasDoc ? (status === "verified" ? "hsl(142 60% 93%)" : "hsl(45 90% 93%)") : "var(--surface-hover)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          {!hasDoc && <FileText size={18} style={{ color: "var(--text-muted)" }} />}
          {hasDoc && status === "verified" && <CheckCircle2 size={18} style={{ color: "hsl(142 71% 45%)" }} />}
          {hasDoc && status === "uploaded" && <Clock size={18} style={{ color: "hsl(45 90% 40%)" }} />}
          {hasDoc && status === "rejected" && <XCircle size={18} style={{ color: "hsl(0 84% 60%)" }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 14, color: "var(--text)", marginBottom: 2 }}>
            {label}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
            {description}
          </div>
          {!hasDoc && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="badge" style={{ background: "hsl(0 84% 60% / 0.1)", color: "hsl(0 84% 50%)", borderColor: "transparent", fontSize: 11 }}>
                Pending Upload
              </span>
              <button className="btn btn-sm" onClick={onUpload} style={{ padding: "4px 10px", fontSize: 12 }}>
                <Upload size={12} /> Upload
              </button>
            </div>
          )}
          {hasDoc && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusBadge status={status!} />
              <button className="btn btn-outline btn-sm" onClick={() => onView(document!)} style={{ padding: "4px 10px", fontSize: 12 }}>
                <Eye size={12} /> View
              </button>
              {status === "rejected" && (
                <button className="btn btn-outline btn-sm" onClick={onUpload} style={{ padding: "4px 10px", fontSize: 12 }}>
                  Re-upload
                </button>
              )}
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {document!.created_at.slice(0, 10)}
              </span>
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
