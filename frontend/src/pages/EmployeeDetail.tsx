import { useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { employeesApi, type Employee } from "../api/employees";
import {
  certificationsApi,
  documentsApi,
  performanceApi,
  permissionsApi,
  salaryApi,
  type DocumentItem,
  type Permission,
  type VerificationStatus,
} from "../api/features";
import { useAuth } from "../auth/AuthContext";
import AsyncState from "../components/AsyncState";
import ImageModal from "../components/ImageModal";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";

type Tab = "profile" | "documents" | "certifications" | "salary" | "performance" | "permissions";

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("profile");
  const isHr = user?.role === "hr_admin";

  const { data: emp, loading, error } = useApi(
    () => employeesApi.get(id!),
    [id],
  );

  if (!id) return null;

  const tabs: Tab[] = isHr
    ? ["profile", "documents", "certifications", "salary", "performance", "permissions"]
    : ["profile", "documents", "certifications", "salary", "performance"];

  return (
    <div>
      <PageHeader
        title={emp?.full_name ?? "Employee"}
        subtitle={emp ? `${emp.employee_code} · ${emp.department ?? ""}` : ""}
        actions={
          <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>
            ← Back
          </button>
        }
      />
      <AsyncState loading={loading} error={error}>
        {emp && (
          <>
            <div className="tabs" style={{ marginBottom: 20 }}>
              {tabs.map((t) => (
                <button
                  key={t}
                  className={`tab-btn ${tab === t ? "tab-btn-active" : ""}`}
                  onClick={() => setTab(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            {tab === "profile" && <ProfileTab emp={emp} />}
            {tab === "documents" && <DocumentsTab empId={id} isHr={isHr} />}
            {tab === "certifications" && <CertsTab empId={id} isHr={isHr} />}
            {tab === "salary" && <SalaryTab empId={id} isHr={isHr} />}
            {tab === "performance" && <PerfTab empId={id} isHr={isHr} />}
            {tab === "permissions" && isHr && <PermissionsTab empId={id} />}
          </>
        )}
      </AsyncState>
    </div>
  );
}

function ProfileTab({ emp }: { emp: Employee }) {
  const rows: [string, string][] = [
    ["Employee ID", emp.employee_code],
    ["Full Name", emp.full_name],
    ["Email", emp.email],
    ["Mobile", emp.mobile_number ?? "—"],
    ["Date of Birth", emp.date_of_birth ?? "—"],
    ["Gender", emp.gender ?? "—"],
    ["Marital Status", emp.marital_status ?? "—"],
    ["Date of Joining", emp.date_of_joining ?? "—"],
    ["Department", emp.department ?? "—"],
    ["Designation", emp.designation ?? "—"],
    ["Status", emp.employment_status ?? "—"],
    ["Location", emp.work_location ?? "—"],
  ];
  return (
    <div className="card">
      <div className="detail-grid">
        {rows.map(([label, value]) => (
          <div key={label} className="detail-item">
            <div className="detail-label">{label}</div>
            <div className="detail-value">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentsTab({ empId, isHr }: { empId: string; isHr: boolean }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useApi(() => documentsApi.list(empId), [empId, refreshKey]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Sync once loaded
  if (data && docs.length === 0 && data.length > 0) setDocs(data);
  const list = docs.length > 0 ? docs : data ?? [];

  const handleVerify = async (docId: string, status: VerificationStatus) => {
    const updated = await documentsApi.verify(docId, status);
    setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  return (
    <AsyncState loading={loading} error={error}>
      {isHr && (
        <div style={{ marginBottom: 12 }}>
          <button className="btn btn-sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ Upload Document"}
          </button>
        </div>
      )}
      {showForm && isHr && (
        <UploadDocForm
          employeeId={empId}
          onSuccess={() => {
            setShowForm(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Uploaded</th>
              <th>Status</th>
              {isHr && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={isHr ? 5 : 4} className="muted" style={{ textAlign: "center" }}>No documents.</td></tr>
            ) : (
              list.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.document_name ?? "Document"}</td>
                  <td className="muted">{doc.document_type}</td>
                  <td className="muted">{doc.created_at.slice(0, 10)}</td>
                  <td><StatusBadge status={doc.status} /></td>
                  {isHr && (
                    <td>
                      {doc.status === "uploaded" && (
                        <>
                          <button className="btn btn-sm" style={{ marginRight: 4 }} onClick={() => handleVerify(doc.id, "verified")}>Verify</button>
                          <button className="btn btn-outline btn-sm" onClick={() => handleVerify(doc.id, "rejected")}>Reject</button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AsyncState>
  );
}

function UploadDocForm({ employeeId, onSuccess }: { employeeId: string; onSuccess: () => void }) {
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("other");
  const [fileUrl, setFileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!documentName || !fileUrl) { setFormError("Document name and file URL are required."); return; }
    setSubmitting(true);
    setFormError("");
    try {
      await documentsApi.create({ employee_id: employeeId, document_name: documentName, document_type: documentType, file_url: fileUrl });
      onSuccess();
    } catch { setFormError("Failed to upload document."); } finally { setSubmitting(false); }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Upload Document</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field"><label>Document Name</label><input className="input" value={documentName} onChange={(e) => setDocumentName(e.target.value)} /></div>
          <div className="field"><label>Type</label>
            <select className="input" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              <option value="school">School</option><option value="intermediate">Intermediate</option><option value="degree">Degree</option><option value="transcript">Transcript</option><option value="other">Other</option>
            </select>
          </div>
          <div className="field"><label>File URL</label><input className="input" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." /></div>
        </div>
        {formError && <p className="error-text" style={{ marginBottom: 12 }}>{formError}</p>}
        <button className="btn btn-sm" type="submit" disabled={submitting}>{submitting ? "Uploading…" : "Upload"}</button>
      </form>
    </div>
  );
}

function CertsTab({ empId, isHr }: { empId: string; isHr: boolean }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useApi(() => certificationsApi.list(empId), [empId, refreshKey]);
  const [showForm, setShowForm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const handleVerify = async (certId: string, status: "verified" | "rejected") => {
    await certificationsApi.verify(certId, status);
    setRefreshKey((k) => k + 1);
  };

  return (
    <AsyncState loading={loading} error={error}>
      {isHr && (
        <div style={{ marginBottom: 12 }}>
          <button className="btn btn-sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ Add Certification"}
          </button>
        </div>
      )}
      {showForm && isHr && (
        <AddCertForm employeeId={empId} onSuccess={() => { setShowForm(false); setRefreshKey((k) => k + 1); }} />
      )}
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Certificate</th>
              <th>Number</th>
              <th>Issued</th>
              <th>Expiry</th>
              <th>File</th>
              <th>Status</th>
              {isHr && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {(data ?? []).length === 0 ? (
              <tr><td colSpan={isHr ? 7 : 6} className="muted" style={{ textAlign: "center" }}>No certifications.</td></tr>
            ) : (data ?? []).map((c) => (
              <tr key={c.id}>
                <td>{c.certificate_name}</td>
                <td className="muted">{c.certificate_number ?? "—"}</td>
                <td className="muted">{c.issued_date ?? "—"}</td>
                <td className="muted">{c.expiry_date ?? "—"}</td>
                <td>
                  {c.file_url ? (
                    <button className="btn btn-outline btn-sm" onClick={() => { setPreviewUrl(c.file_url); setPreviewTitle(c.certificate_name); }}>View</button>
                  ) : <span className="muted">—</span>}
                </td>
                <td><StatusBadge status={c.verification_status} /></td>
                {isHr && (
                  <td>
                    {c.verification_status === "uploaded" && (
                      <>
                        <button className="btn btn-sm" style={{ marginRight: 4 }} onClick={() => handleVerify(c.id, "verified")}>Verify</button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleVerify(c.id, "rejected")}>Reject</button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {previewUrl && (
        <ImageModal url={previewUrl} title={previewTitle} onClose={() => setPreviewUrl(null)} />
      )}
    </AsyncState>
  );
}

function AddCertForm({ employeeId, onSuccess }: { employeeId: string; onSuccess: () => void }) {
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
    if (!certName) { setFormError("Certificate name is required."); return; }
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
    } catch { setFormError("Failed to add certification."); } finally { setSubmitting(false); }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Add Certification</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field"><label>Certificate Name</label><input className="input" value={certName} onChange={(e) => setCertName(e.target.value)} /></div>
          <div className="field"><label>Certificate Number</label><input className="input" value={certNumber} onChange={(e) => setCertNumber(e.target.value)} /></div>
          <div className="field"><label>Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="microsoft">Microsoft</option><option value="aws">AWS</option><option value="azure">Azure</option><option value="scrum">Scrum</option><option value="power_bi">Power BI</option><option value="other">Other</option>
            </select>
          </div>
          <div className="field"><label>Issued Date</label><input className="input" type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} /></div>
          <div className="field"><label>Expiry Date</label><input className="input" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></div>
          <div className="field"><label>File URL</label><input className="input" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." /></div>
        </div>
        {formError && <p className="error-text" style={{ marginBottom: 12 }}>{formError}</p>}
        <button className="btn btn-sm" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Add Certification"}</button>
      </form>
    </div>
  );
}

function SalaryTab({ empId, isHr }: { empId: string; isHr: boolean }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const current = useApi(() => salaryApi.current(empId), [empId, refreshKey]);
  const history = useApi(() => salaryApi.history(empId), [empId, refreshKey]);
  const money = (v: string | null) => v ? `${Number(v).toLocaleString()}` : "—";
  const [showForm, setShowForm] = useState(false);

  return (
    <AsyncState loading={current.loading || history.loading} error={current.error || history.error}>
      <div className="grid grid-cards" style={{ marginBottom: 16 }}>
        <div className="card"><div className="card-title">Current Salary</div><div className="card-value">{money(current.data?.current_salary ?? null)}</div></div>
        <div className="card"><div className="card-title">Latest Revision</div><div className="card-value">{current.data?.latest_revision_date ?? "—"}</div></div>
      </div>
      {isHr && (
        <div style={{ marginBottom: 12 }}>
          <button className="btn btn-sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ Add Salary Revision"}
          </button>
        </div>
      )}
      {showForm && isHr && (
        <SalaryRevisionForm employeeId={empId} onSuccess={() => { setShowForm(false); setRefreshKey((k) => k + 1); }} />
      )}
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th>Date</th><th>Previous</th><th>Revised</th><th>%</th><th>Comments</th></tr></thead>
          <tbody>
            {(history.data ?? []).length === 0 ? (
              <tr><td colSpan={5} className="muted" style={{ textAlign: "center" }}>No salary history.</td></tr>
            ) : (history.data ?? []).map((r) => (
              <tr key={r.id}>
                <td>{r.effective_date}</td>
                <td className="muted">{money(r.previous_salary)}</td>
                <td>{money(r.revised_salary)}</td>
                <td className="muted">{r.revision_percentage ? `+${r.revision_percentage}%` : "—"}</td>
                <td className="muted">{r.comments ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AsyncState>
  );
}

function SalaryRevisionForm({ employeeId, onSuccess }: { employeeId: string; onSuccess: () => void }) {
  const [effectiveDate, setEffectiveDate] = useState("");
  const [previousSalary, setPreviousSalary] = useState("");
  const [revisedSalary, setRevisedSalary] = useState("");
  const [revisionPct, setRevisionPct] = useState("");
  const [comments, setComments] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("approved");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!effectiveDate || !revisedSalary) { setFormError("Effective date and revised salary are required."); return; }
    setSubmitting(true);
    setFormError("");
    try {
      await salaryApi.addRevision({
        employee_id: employeeId,
        effective_date: effectiveDate,
        previous_salary: previousSalary || undefined,
        revised_salary: revisedSalary,
        revision_percentage: revisionPct || undefined,
        comments: comments || undefined,
        approval_status: approvalStatus,
      });
      onSuccess();
    } catch { setFormError("Failed to add salary revision."); } finally { setSubmitting(false); }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Add Salary Revision</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field"><label>Effective Date</label><input className="input" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} /></div>
          <div className="field"><label>Previous Salary</label><input className="input" type="number" value={previousSalary} onChange={(e) => setPreviousSalary(e.target.value)} /></div>
          <div className="field"><label>Revised Salary</label><input className="input" type="number" value={revisedSalary} onChange={(e) => setRevisedSalary(e.target.value)} /></div>
          <div className="field"><label>Revision %</label><input className="input" type="number" value={revisionPct} onChange={(e) => setRevisionPct(e.target.value)} /></div>
          <div className="field"><label>Comments</label><input className="input" value={comments} onChange={(e) => setComments(e.target.value)} /></div>
          <div className="field"><label>Approval Status</label>
            <select className="input" value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value)}>
              <option value="approved">Approved</option><option value="pending">Pending</option>
            </select>
          </div>
        </div>
        {formError && <p className="error-text" style={{ marginBottom: 12 }}>{formError}</p>}
        <button className="btn btn-sm" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Add Revision"}</button>
      </form>
    </div>
  );
}

function PerfTab({ empId, isHr }: { empId: string; isHr: boolean }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useApi(() => performanceApi.list(empId), [empId, refreshKey]);
  const [showForm, setShowForm] = useState(false);

  return (
    <AsyncState loading={loading} error={error}>
      {isHr && (
        <div style={{ marginBottom: 12 }}>
          <button className="btn btn-sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ Add Review"}
          </button>
        </div>
      )}
      {showForm && isHr && (
        <PerfReviewForm employeeId={empId} onSuccess={() => { setShowForm(false); setRefreshKey((k) => k + 1); }} />
      )}
      {(data ?? []).length === 0 ? (
        <p className="muted">No reviews yet.</p>
      ) : (
        <div className="stack">
          {(data ?? []).map((r) => (
            <div key={r.id} className="card">
              <div className="row" style={{ marginBottom: 12 }}>
                <h2>{r.review_period ?? "Review"}</h2>
                {r.rating && <span className="badge badge-solid">{r.rating} / 5</span>}
              </div>
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Date</div><div className="detail-value">{r.review_date ?? "—"}</div></div>
                <div className="detail-item"><div className="detail-label">Reviewer</div><div className="detail-value">{r.reviewer_name ?? "—"}</div></div>
                <div className="detail-item"><div className="detail-label">Strengths</div><div className="detail-value">{r.strengths ?? "—"}</div></div>
                <div className="detail-item"><div className="detail-label">Improvements</div><div className="detail-value">{r.areas_for_improvement ?? "—"}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AsyncState>
  );
}

function PerfReviewForm({ employeeId, onSuccess }: { employeeId: string; onSuccess: () => void }) {
  const [reviewPeriod, setReviewPeriod] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [rating, setRating] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewPeriod) { setFormError("Review period is required."); return; }
    setSubmitting(true);
    setFormError("");
    try {
      await performanceApi.add({
        employee_id: employeeId,
        review_period: reviewPeriod,
        review_date: reviewDate || undefined,
        rating: rating || undefined,
        strengths: strengths || undefined,
        areas_for_improvement: improvements || undefined,
        comments: comments || undefined,
      });
      onSuccess();
    } catch { setFormError("Failed to add review."); } finally { setSubmitting(false); }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Add Performance Review</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field"><label>Review Period</label><input className="input" value={reviewPeriod} onChange={(e) => setReviewPeriod(e.target.value)} placeholder="e.g. Q1 2024" /></div>
          <div className="field"><label>Review Date</label><input className="input" type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} /></div>
          <div className="field"><label>Rating (1-5)</label><input className="input" type="number" min="1" max="5" value={rating} onChange={(e) => setRating(e.target.value)} /></div>
          <div className="field"><label>Strengths</label><input className="input" value={strengths} onChange={(e) => setStrengths(e.target.value)} /></div>
          <div className="field"><label>Areas for Improvement</label><input className="input" value={improvements} onChange={(e) => setImprovements(e.target.value)} /></div>
          <div className="field"><label>Comments</label><input className="input" value={comments} onChange={(e) => setComments(e.target.value)} /></div>
        </div>
        {formError && <p className="error-text" style={{ marginBottom: 12 }}>{formError}</p>}
        <button className="btn btn-sm" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Add Review"}</button>
      </form>
    </div>
  );
}

function PermissionsTab({ empId }: { empId: string }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useApi(() => permissionsApi.list(empId), [empId, refreshKey]);
  const [showForm, setShowForm] = useState(false);
  const permissions = data ?? [];

  const handleRevoke = async (id: string) => {
    await permissionsApi.revoke(id);
    setRefreshKey((k) => k + 1);
  };

  return (
    <AsyncState loading={loading} error={error}>
      <div style={{ marginBottom: 12 }}>
        <button className="btn btn-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Grant Permission"}
        </button>
      </div>
      {showForm && (
        <GrantPermForm employeeId={empId} onSuccess={() => { setShowForm(false); setRefreshKey((k) => k + 1); }} />
      )}
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr><th>Section</th><th>Start</th><th>Expiry</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {permissions.length === 0 ? (
              <tr><td colSpan={5} className="muted" style={{ textAlign: "center" }}>No permissions granted.</td></tr>
            ) : permissions.map((p: Permission) => (
              <tr key={p.id}>
                <td style={{ textTransform: "capitalize" }}>{p.section}</td>
                <td className="muted">{p.start_at.slice(0, 16).replace("T", " ")}</td>
                <td className="muted">{p.expiry_at.slice(0, 16).replace("T", " ")}</td>
                <td>
                  {p.is_revoked ? (
                    <span className="badge">Revoked</span>
                  ) : p.is_active ? (
                    <span className="badge badge-solid">Active</span>
                  ) : (
                    <span className="badge">Expired</span>
                  )}
                </td>
                <td>
                  {!p.is_revoked && p.is_active && (
                    <button className="btn btn-outline btn-sm" onClick={() => handleRevoke(p.id)}>Revoke</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AsyncState>
  );
}

function GrantPermForm({ employeeId, onSuccess }: { employeeId: string; onSuccess: () => void }) {
  const [section, setSection] = useState("address");
  const [startAt, setStartAt] = useState("");
  const [expiryAt, setExpiryAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!startAt || !expiryAt) { setFormError("Start and expiry dates are required."); return; }
    setSubmitting(true);
    setFormError("");
    try {
      await permissionsApi.grant({
        employee_id: employeeId,
        section,
        start_at: new Date(startAt).toISOString(),
        expiry_at: new Date(expiryAt).toISOString(),
      });
      onSuccess();
    } catch { setFormError("Failed to grant permission."); } finally { setSubmitting(false); }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Grant Edit Permission</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field"><label>Section</label>
            <select className="input" value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="address">Address</option>
              <option value="phone">Phone</option>
              <option value="certifications">Certifications</option>
            </select>
          </div>
          <div className="field"><label>Start At</label><input className="input" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></div>
          <div className="field"><label>Expiry At</label><input className="input" type="datetime-local" value={expiryAt} onChange={(e) => setExpiryAt(e.target.value)} /></div>
        </div>
        {formError && <p className="error-text" style={{ marginBottom: 12 }}>{formError}</p>}
        <button className="btn btn-sm" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Grant"}</button>
      </form>
    </div>
  );
}
