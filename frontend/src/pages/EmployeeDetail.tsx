import { useState, type FormEvent } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  BellRing, User, Briefcase, Calendar, MapPin, ChevronLeft,
  Mail, Phone, Cake, Users, Hash, Award, Activity, FileText
} from "lucide-react";
import { employeesApi, type Employee } from "../api/employees";
import { certificationsApi } from "../api/certifications";
import { documentsApi, type DocumentItem } from "../api/documents";
import { notificationsApi } from "../api/notifications";
import { performanceApi } from "../api/performance";
import { permissionsApi, type Permission } from "../api/permissions";
import { salaryApi } from "../api/salary";
import type { VerificationStatus } from "../api/types";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import AsyncState from "../components/AsyncState";
import Breadcrumbs from "../components/Breadcrumbs";
import ImageModal from "../components/ImageModal";
import Skeleton from "../components/Skeleton";
import StatusBadge from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";

type Tab = "profile" | "documents" | "certifications" | "salary" | "performance" | "permissions";

// Tabs that send alerts to employee + manager
const EMPLOYEE_ALERT_TABS: Tab[] = ["profile", "documents", "certifications"];
// Tabs that send alerts only to manager
const MANAGER_ALERT_TABS: Tab[] = ["salary", "performance", "permissions"];

// ------- Redesign Helper Components -------



function Section({
  title,
  rows,
  icon,
  iconVariant = "indigo",
}: {
  title: string;
  rows: [string, string][];
  icon?: React.ReactNode;
  iconVariant?: "indigo" | "blue" | "orange";
}) {
  const getFieldIcon = (label: string) => {
    const cleanLabel = label.toLowerCase();
    if (cleanLabel.includes("name")) return <User size={14} />;
    if (cleanLabel.includes("email")) return <Mail size={14} />;
    if (cleanLabel.includes("mobile") || cleanLabel.includes("phone")) return <Phone size={14} />;
    if (cleanLabel.includes("birth")) return <Cake size={14} />;
    if (cleanLabel.includes("gender")) return <User size={14} />;
    if (cleanLabel.includes("marital")) return <Users size={14} />;
    if (cleanLabel.includes("location") || cleanLabel.includes("address")) return <MapPin size={14} />;
    if (cleanLabel.includes("id") || cleanLabel.includes("code")) return <Hash size={14} />;
    if (cleanLabel.includes("joining") || cleanLabel.includes("date")) return <Calendar size={14} />;
    if (cleanLabel.includes("dept") || cleanLabel.includes("department")) return <Briefcase size={14} />;
    if (cleanLabel.includes("designation")) return <Award size={14} />;
    if (cleanLabel.includes("status")) return <Activity size={14} />;
    return <FileText size={14} />;
  };

  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="row" style={{ marginBottom: 20, display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {icon && (
            <div
              className={`section-title-icon section-title-${iconVariant}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: iconVariant === "indigo" ? "rgba(3, 18, 115, 0.12)" : "rgba(59, 130, 246, 0.12)",
                color: iconVariant === "indigo" ? "#031273" : "#3b82f6"
              }}
            >
              {icon}
            </div>
          )}
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{title}</h2>
        </div>
      </div>
      <div className="info-chips-grid">
        {rows.map(([label, value]) => {
          const isStatusActive = value === "Active";
          const isStatusLeave = value === "On Leave";
          const isStatusTerminated = value === "Terminated";

          let valueStyle: React.CSSProperties = {};
          if (isStatusActive) {
            valueStyle = { color: "#10b981", fontWeight: 700 };
          } else if (isStatusLeave) {
            valueStyle = { color: "#f59e0b", fontWeight: 700 };
          } else if (isStatusTerminated) {
            valueStyle = { color: "#f43f5e", fontWeight: 700 };
          }

          return (
            <div key={label} className="info-chip">
              <div className="info-chip-icon-wrapper">
                {getFieldIcon(label)}
              </div>
              <div className="info-chip-content">
                <span className="info-chip-label">{label}</span>
                <span className="info-chip-value" style={valueStyle} title={value || "—"}>
                  {value || "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "profile";
  const [tab, setTab] = useState<Tab>(initialTab);
  const isHr = user?.role === "hr_admin";
  const [alertTab, setAlertTab] = useState<Tab | null>(null);

  const { data: emp, loading, error } = useApi(
    () => employeesApi.get(id!),
    [id],
    `employee:${id}`,
  );

  if (!id) return null;

  const tabs: Tab[] = isHr
    ? ["profile", "documents", "certifications", "salary", "performance", "permissions"]
    : ["profile", "documents", "certifications", "salary", "performance"];

  let initials = "EE";
  if (emp) {
    initials = emp.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "EE";
  }

  return (
    <div>
      <Breadcrumbs items={[
        { label: "Employees", to: "/employees" },
        { label: emp?.full_name ?? "Employee" },
      ]} />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          className="btn btn-outline btn-sm"
          style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      {loading && (
        <div className="stack">
          <Skeleton.Stat />
          <div className="grid grid-cards"><Skeleton.Card /><Skeleton.Card /></div>
          <Skeleton.Table rows={4} cols={3} />
        </div>
      )}

      <AsyncState loading={loading} error={error}>
        {emp && (
          <>
            {/* Profile Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "20px 0", marginBottom: 32, borderBottom: "1px solid hsl(var(--border) / 0.5)" }}>
              {emp.profile_photo ? (
                <img
                  src={emp.profile_photo}
                  alt={emp.full_name}
                  style={{
                    width: 80, height: 80, borderRadius: "50%", objectFit: "cover",
                    border: "2px solid hsl(220 70% 45% / 0.25)",
                    flexShrink: 0,
                    boxShadow: "0 4px 12px rgba(30, 64, 175, 0.08)"
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 80, height: 80, borderRadius: "50%",
                    background: "linear-gradient(135deg, hsl(220 70% 45% / 0.15) 0%, hsl(220 70% 45% / 0.05) 100%)",
                    border: "2px solid hsl(220 70% 45% / 0.25)",
                    color: "hsl(220 70% 45%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", flexShrink: 0,
                    boxShadow: "0 4px 12px rgba(30, 64, 175, 0.08)"
                  }}
                >
                  {initials}
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "var(--text)" }}>{emp.full_name}</h1>

                  {emp.employment_status === "Active" && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                      Active
                    </span>
                  )}
                  {emp.employment_status === "On Leave" && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
                      On Leave
                    </span>
                  )}
                  {emp.employment_status === "Terminated" && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: "rgba(244, 63, 94, 0.1)", color: "#f43f5e", border: "1px solid rgba(244, 63, 94, 0.2)" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f43f5e" }} />
                      Terminated
                    </span>
                  )}
                </div>

                <div style={{ color: "var(--text-secondary)", fontSize: 15, fontWeight: 500, marginTop: 4 }}>
                  {emp.designation ?? "—"} <span style={{ color: "hsl(var(--border) / 0.5)", margin: "0 8px" }}>|</span> {emp.department ?? "—"}
                </div>

                <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap", color: "var(--text-muted)", fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <User size={14} />
                    <span>ID: {emp.employee_code}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={14} />
                    <span>Joined {emp.date_of_joining ? emp.date_of_joining : "—"}</span>
                  </div>
                  {emp.work_location && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={14} />
                      <span>{emp.work_location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="premium-tabs-container">
              {tabs.map((t) => (
                <button
                  key={t}
                  className={`premium-tab-btn ${tab === t ? "premium-tab-btn-active" : ""}`}
                  onClick={() => setTab(t)}
                >
                  <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                  {isHr && (
                    <span
                      className="premium-tab-alert-badge"
                      title={`Send alert about ${t}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAlertTab(t);
                      }}
                    >
                      <BellRing size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Alert Modal */}
            {alertTab && emp && (
              <SendAlertModal
                employeeId={id}
                employeeName={emp.full_name}
                tab={alertTab}
                notifyManager={MANAGER_ALERT_TABS.includes(alertTab)}
                notifyEmployee={EMPLOYEE_ALERT_TABS.includes(alertTab)}
                onClose={() => setAlertTab(null)}
              />
            )}

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

// ------- Send Alert Modal -------
function SendAlertModal({
  employeeId,
  employeeName,
  tab,
  notifyManager,
  notifyEmployee,
  onClose,
}: {
  employeeId: string;
  employeeName: string;
  tab: Tab;
  notifyManager: boolean;
  notifyEmployee: boolean;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1);

  // For profile/documents/certifications: send to employee + manager
  // For salary/performance/permissions: send only to manager
  const recipientDesc = notifyEmployee && notifyManager
    ? `${employeeName} and their manager`
    : notifyEmployee
      ? employeeName
      : `${employeeName}'s manager`;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please enter a message.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await notificationsApi.sendAlert({
        employee_id: employeeId,
        title: `${tabLabel} Alert`,
        message: message.trim(),
        notify_manager: notifyManager,
      });
      if (res.sent_to.length > 0) {
        setSuccess(`Alert sent to: ${res.sent_to.join(", ")}`);
      } else {
        setSuccess("Alert created (no linked user accounts found to notify).");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send alert.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Send {tabLabel} Alert</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
            Send a notification about <strong style={{ color: "var(--text)" }}>{tabLabel.toLowerCase()}</strong> to <strong style={{ color: "var(--text)" }}>{recipientDesc}</strong>.
            This will appear in their dashboard notifications.
          </p>

          {success ? (
            <>
              <div style={{ padding: 16, background: "var(--primary-light)", borderRadius: "var(--radius)", marginBottom: 16 }}>
                <p style={{ color: "var(--text)", fontSize: 14 }}>✓ {success}</p>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-sm" onClick={onClose}>Done</button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Message</label>
                <textarea
                  className="input"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`e.g. Please update your ${tab} details by end of week.`}
                  style={{ resize: "vertical" }}
                />
              </div>
              {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-sm" disabled={submitting}>
                  {submitting ? "Sending…" : "Send Alert"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ emp }: { emp: Employee }) {
  const personalRows: [string, string][] = [
    ["Full Name", emp.full_name],
    ["Email", emp.email],
    ["Mobile", emp.mobile_number ?? "—"],
    ["Date of Birth", emp.date_of_birth ?? "—"],
    ["Gender", emp.gender ?? "—"],
    ["Marital Status", emp.marital_status ?? "—"],
    ["Location", emp.work_location ?? "—"],
  ];

  const employmentRows: [string, string][] = [
    ["Employee ID", emp.employee_code],
    ["Date of Joining", emp.date_of_joining ?? "—"],
    ["Department", emp.department ?? "—"],
    ["Designation", emp.designation ?? "—"],
    ["Employment Status", emp.employment_status ?? "—"],
  ];

  return (
    <div className="profile-info-grid">
      <Section
        title="Personal Information"
        icon={<User size={16} />}
        iconVariant="indigo"
        rows={personalRows}
      />
      <Section
        title="Employment Information"
        icon={<Briefcase size={16} />}
        iconVariant="blue"
        rows={employmentRows}
      />
    </div>
  );
}

function DocumentsTab({ empId, isHr }: { empId: string; isHr: boolean }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useApi(() => documentsApi.list(empId), [empId, refreshKey]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [viewUrl, setViewUrl] = useState<{ url: string; name: string } | null>(null);

  // Sync once loaded
  if (data && docs.length === 0 && data.length > 0) setDocs(data);
  const list = docs.length > 0 ? docs : data ?? [];

  const handleVerify = async (docId: string, status: VerificationStatus) => {
    const updated = await documentsApi.verify(docId, status);
    setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const isPdf = (url: string) => url.includes("application/pdf") || url.endsWith(".pdf");
  const isImage = (url: string) => url.startsWith("data:image") || /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={5} className="muted" style={{ textAlign: "center" }}>No documents.</td></tr>
            ) : (
              list.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.document_name ?? "Document"}</td>
                  <td className="muted" style={{ textTransform: "capitalize" }}>{doc.document_type}</td>
                  <td className="muted">{doc.created_at.slice(0, 10)}</td>
                  <td><StatusBadge status={doc.status} /></td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {doc.file_url && (
                      <button className="btn btn-outline btn-sm" style={{ marginRight: 4 }} onClick={() => setViewUrl({ url: doc.file_url, name: doc.document_name ?? "Document" })}>
                        View
                      </button>
                    )}
                    {isHr && doc.status === "uploaded" && (
                      <>
                        <button className="btn btn-sm" style={{ marginRight: 4 }} onClick={() => handleVerify(doc.id, "verified")}>Verify</button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleVerify(doc.id, "rejected")}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Document viewer modal */}
      {viewUrl && (
        <div className="modal-overlay" onClick={() => setViewUrl(null)}>
          <div className="modal-content" style={{ maxWidth: 800, maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{viewUrl.name}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewUrl(null)}>✕</button>
            </div>
            <div style={{ padding: 20, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300, overflow: "auto" }}>
              {isImage(viewUrl.url) && (
                <img src={viewUrl.url} alt={viewUrl.name} style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: "var(--radius)" }} />
              )}
              {isPdf(viewUrl.url) && (
                <iframe src={viewUrl.url} title={viewUrl.name} style={{ width: "100%", height: "70vh", border: "none", borderRadius: "var(--radius)" }} />
              )}
              {!isImage(viewUrl.url) && !isPdf(viewUrl.url) && (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Cannot preview this file type.</p>
                  <a href={viewUrl.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">Open in new tab</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AsyncState>
  );
}

function UploadDocForm({ employeeId, onSuccess }: { employeeId: string; onSuccess: () => void }) {
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("other");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file && !documentName) {
      setDocumentName(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!documentName) { setFormError("Document name is required."); return; }
    if (!selectedFile) { setFormError("Please select a file to upload."); return; }
    setSubmitting(true);
    setFormError("");
    try {
      const { uploadFile } = await import("../api/upload");
      const { url } = await uploadFile(selectedFile);
      await documentsApi.create({ employee_id: employeeId, document_name: documentName, document_type: documentType, file_url: url });
      onSuccess();
    } catch (err) { setFormError(err instanceof Error ? err.message : "Failed to upload document."); } finally { setSubmitting(false); }
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
          <div className="field"><label>File (PDF, JPG, PNG)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileChange} className="input" style={{ padding: "6px 10px" }} />
            {selectedFile && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{(selectedFile.size / 1024).toFixed(1)} KB</span>}
          </div>
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file && !certName) {
      setCertName(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!certName) { setFormError("Certificate name is required."); return; }
    setSubmitting(true);
    setFormError("");
    try {
      let fileUrl: string | undefined;
      if (selectedFile) {
        const { uploadFile } = await import("../api/upload");
        const res = await uploadFile(selectedFile);
        fileUrl = res.url;
      }
      await certificationsApi.create({
        employee_id: employeeId,
        certificate_name: certName,
        certificate_number: certNumber || undefined,
        category,
        issued_date: issuedDate || undefined,
        expiry_date: expiryDate || undefined,
        file_url: fileUrl,
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
              <option value="aws">AWS</option><option value="microsoft">Microsoft</option><option value="azure">Azure</option><option value="google">Google</option><option value="meta">Meta</option><option value="cisco">Cisco</option><option value="scrum">Scrum</option><option value="pmp">PMP</option><option value="other">Other</option>
            </select>
          </div>
          <div className="field"><label>Issued Date</label><input className="input" type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} /></div>
          <div className="field"><label>Expiry Date</label><input className="input" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></div>
          <div className="field"><label>Certificate File</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="input" style={{ padding: "6px 10px" }} />
            {selectedFile && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{(selectedFile.size / 1024).toFixed(1)} KB</span>}
          </div>
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
  const [revisedSalary, setRevisedSalary] = useState("");
  const [comments, setComments] = useState("");
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
        revised_salary: revisedSalary,
        comments: comments || undefined,
      });
      onSuccess();
    } catch (err) { setFormError(err instanceof Error ? err.message : "Failed to add salary revision."); } finally { setSubmitting(false); }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Add Salary Revision</h2>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Previous salary and increment % are auto-calculated from the current salary.</p>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field"><label>Effective Date *</label><input className="input" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} /></div>
          <div className="field"><label>New Salary (CTC) *</label><input className="input" type="number" value={revisedSalary} onChange={(e) => setRevisedSalary(e.target.value)} placeholder="e.g. 720000" /></div>
          <div className="field"><label>Reason / Comments</label><input className="input" value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Annual Appraisal" /></div>
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
    } catch (err) { setFormError(err instanceof Error ? err.message : "Failed to add review."); } finally { setSubmitting(false); }
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
