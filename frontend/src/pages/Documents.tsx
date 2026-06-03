import { useState, type FormEvent } from "react";
import { documentsApi } from "../api/features";
import { useAuth } from "../auth/AuthContext";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";

export default function Documents() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useApi(() => documentsApi.list(), [refreshKey]);
  const documents = data ?? [];
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Educational documents and certificates."
        actions={
          <button className="btn btn-sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ Upload Document"}
          </button>
        }
      />
      {showForm && user && (
        <UploadDocumentForm
          employeeId={user.id}
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
                <th>Document</th>
                <th>Type</th>
                <th>Uploaded</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted" style={{ textAlign: "center" }}>
                    No documents uploaded yet.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.document_name ?? "Document"}</td>
                    <td className="muted" style={{ textTransform: "capitalize" }}>
                      {doc.document_type}
                    </td>
                    <td className="muted">{doc.created_at.slice(0, 10)}</td>
                    <td>
                      <StatusBadge status={doc.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AsyncState>
    </div>
  );
}

function UploadDocumentForm({
  employeeId,
  onSuccess,
}: {
  employeeId: string;
  onSuccess: () => void;
}) {
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("other");
  const [fileUrl, setFileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!documentName || !fileUrl) {
      setFormError("Document name and file URL are required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await documentsApi.create({
        employee_id: employeeId,
        document_name: documentName,
        document_type: documentType,
        file_url: fileUrl,
      });
      onSuccess();
    } catch {
      setFormError("Failed to upload document.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h2 style={{ marginBottom: 12 }}>Upload Document</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Document Name</label>
            <input className="input" value={documentName} onChange={(e) => setDocumentName(e.target.value)} />
          </div>
          <div className="field">
            <label>Document Type</label>
            <select className="input" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              <option value="school">School</option>
              <option value="intermediate">Intermediate</option>
              <option value="degree">Degree</option>
              <option value="transcript">Transcript</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field">
            <label>File URL</label>
            <input className="input" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        {formError && <p className="error-text" style={{ marginBottom: 12 }}>{formError}</p>}
        <button className="btn btn-sm" type="submit" disabled={submitting}>
          {submitting ? "Uploading…" : "Upload"}
        </button>
      </form>
    </div>
  );
}
