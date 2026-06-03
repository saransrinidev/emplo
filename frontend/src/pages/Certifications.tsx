import { useState, type FormEvent } from "react";
import { certificationsApi } from "../api/features";
import { useAuth } from "../auth/AuthContext";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";

export default function Certifications() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useApi(() => certificationsApi.list(), [refreshKey]);
  const certifications = data ?? [];
  const [showForm, setShowForm] = useState(false);

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
                <th>Certificate</th>
                <th>Number</th>
                <th>Issued</th>
                <th>Expiry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {certifications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted" style={{ textAlign: "center" }}>
                    No certifications added yet.
                  </td>
                </tr>
              ) : (
                certifications.map((cert) => (
                  <tr key={cert.id}>
                    <td>{cert.certificate_name}</td>
                    <td className="muted">{cert.certificate_number ?? "—"}</td>
                    <td className="muted">{cert.issued_date ?? "—"}</td>
                    <td className="muted">{cert.expiry_date ?? "—"}</td>
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
    </div>
  );
}

function AddCertificationForm({
  employeeId,
  onSuccess,
}: {
  employeeId: string;
  onSuccess: () => void;
}) {
  const [certName, setCertName] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [category, setCategory] = useState("other");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!certName) {
      setFormError("Certificate name is required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await certificationsApi.create({
        employee_id: employeeId,
        certificate_name: certName,
        certificate_number: certNumber || undefined,
        category,
        issued_date: issuedDate || undefined,
        expiry_date: expiryDate || undefined,
        file_url: fileUrl || undefined,
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
      <h2 style={{ marginBottom: 12 }}>Add Certification</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Certificate Name</label>
            <input className="input" value={certName} onChange={(e) => setCertName(e.target.value)} />
          </div>
          <div className="field">
            <label>Certificate Number</label>
            <input className="input" value={certNumber} onChange={(e) => setCertNumber(e.target.value)} />
          </div>
          <div className="field">
            <label>Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
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
            <input className="input" type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Expiry Date</label>
            <input className="input" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
          <div className="field">
            <label>File URL</label>
            <input className="input" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        {formError && <p className="error-text" style={{ marginBottom: 12 }}>{formError}</p>}
        <button className="btn btn-sm" type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Add Certification"}
        </button>
      </form>
    </div>
  );
}
