import { salaryApi } from "../api/salary";
import AsyncState from "../components/AsyncState";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import Skeleton from "../components/Skeleton";
import { useToast } from "../components/Toast";
import { useApi } from "../hooks/useApi";

function formatCurrency(value: string | null | undefined): string {
  if (!value) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatCurrencyFull(value: string | null | undefined): string {
  if (!value) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getYear(dateStr: string): string {
  return new Date(dateStr).getFullYear().toString();
}

export default function Salary() {
  const { user } = useAuth();
  const isHr = user?.role === "hr_admin";
  const toast = useToast();

  const current = useApi(() => salaryApi.current());
  const history = useApi(() => salaryApi.history());
  const [showModal, setShowModal] = useState(false);

  const loading = current.loading || history.loading;
  const error = current.error || history.error;
  const rows = history.data ?? [];

  return (
    <div>
      <PageHeader
        title="Compensation"
        subtitle="Salary history and growth timeline."
        actions={isHr ? (
          <button className="btn btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={14} /> New Revision
          </button>
        ) : undefined}
      />

      {loading && (
        <div className="stack">
          <div className="grid grid-cards">
            <Skeleton.Stat />
            <Skeleton.Stat />
            <Skeleton.Stat />
          </div>
          <Skeleton.Card />
        </div>
      )}

      <AsyncState loading={loading} error={error}>
        <div className="grid grid-cards" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-title">Current Salary</div>
            <div className="card-value">
              {money(current.data?.current_salary ?? null)}
            </div>
          </div>
          <div className="card">
            <div className="card-title">Latest Revision</div>
            <div className="card-value">
              {current.data?.latest_revision_date ?? "—"}
            </div>
            {lastIncrement ? (
              <div className="compensation-growth-badge">
                <ArrowUpRight size={16} />
                +{lastIncrement}%
              </div>
            ) : (
              <div className="compensation-growth-badge compensation-growth-neutral">—</div>
            )}
            <div className="compensation-growth-date">{formatDate(latestDate)}</div>
          </div>

          {/* Monthly Breakdown */}
          {currentCtc && (
            <div className="compensation-monthly-card">
              <div className="compensation-monthly-label">
                <Briefcase size={16} />
                Monthly Gross
              </div>
              <div className="compensation-monthly-amount">
                {formatCurrencyFull(String(Math.round(Number(currentCtc) / 12)))}
              </div>
              <div className="compensation-monthly-sub">per month</div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Effective Date</th>
                <th>Previous</th>
                <th>Revised</th>
                <th>Change</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted" style={{ textAlign: "center" }}>
                    No salary history yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.effective_date}</td>
                    <td className="muted">{money(row.previous_salary)}</td>
                    <td>{money(row.revised_salary)}</td>
                    <td className="muted">
                      {row.revision_percentage
                        ? `+${row.revision_percentage}%`
                        : "—"}
                    </td>
                    <td className="muted">{row.comments ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AsyncState>

      {showModal && (
        <NewRevisionModal
          currentCtc={currentCtc}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

/* ─── Pending Revision Card (HR) ─── */

function PendingRevisionCard({ revision, onAction }: { revision: SalaryRevision; onAction: () => void }) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleApprove = async () => {
    setLoading(true);
    try {
      await salaryApi.approve(revision.id);
      toast.success("Salary revision approved!");
      onAction();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to approve");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await salaryApi.reject(revision.id);
      toast.warning("Salary revision rejected.");
      onAction();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to reject");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="compensation-pending-card">
      <div className="compensation-pending-info">
        <div className="compensation-pending-amounts">
          {formatCurrencyFull(revision.previous_salary)} → <strong>{formatCurrencyFull(revision.revised_salary)}</strong>
          {revision.revision_percentage && (
            <span className="compensation-increment-badge" style={{ marginLeft: 8 }}>
              +{revision.revision_percentage}%
            </span>
          )}
        </div>
        <div className="compensation-pending-meta">
          Effective: {formatDate(revision.effective_date)} · {revision.comments || "No comments"}
        </div>
      </div>
      <div className="compensation-pending-actions">
        <button className="btn btn-sm btn-outline" onClick={handleReject} disabled={loading}>Reject</button>
        <button className="btn btn-sm" onClick={handleApprove} disabled={loading}>Approve</button>
      </div>
    </div>
  );
}

/* ─── New Revision Modal ─── */

function NewRevisionModal({
  currentCtc,
  onClose,
  onCreated,
}: {
  currentCtc: string | null | undefined;
  onClose: () => void;
  onCreated: () => void;
}) {
  const currentNum = currentCtc ? Number(currentCtc) : 0;
  const [newCtc, setNewCtc] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason, setReason] = useState("Annual Appraisal");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const toast = useToast();

  // Auto-calculate increment
  const newNum = Number(newCtc) || 0;
  const increment = newNum - currentNum;
  const percentage = currentNum > 0 ? ((increment / currentNum) * 100).toFixed(2) : "0.00";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCtc || !effectiveDate) {
      setError("New CTC and effective date are required");
      return;
    }
    if (newNum <= 0) {
      setError("New CTC must be greater than zero");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await salaryApi.addRevision({
        employee_id: employeeId || undefined as any, // HR should select employee
        effective_date: effectiveDate,
        revised_salary: newCtc,
        previous_salary: currentCtc || undefined,
        comments: `${reason}${remarks ? ` — ${remarks}` : ""}`,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create revision");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content compensation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Salary Revision</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {/* Current CTC display */}
          <div className="compensation-modal-current">
            <span className="compensation-modal-current-label">Current CTC</span>
            <span className="compensation-modal-current-value">{formatCurrencyFull(currentCtc)}</span>
          </div>

          <div className="field">
            <label>Employee ID</label>
            <input
              className="input"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="UUID of the employee"
            />
          </div>

          <div className="field">
            <label>New CTC *</label>
            <div className="input-with-prefix">
              <span className="input-prefix">₹</span>
              <input
                className="input"
                type="number"
                value={newCtc}
                onChange={(e) => setNewCtc(e.target.value)}
                placeholder="8,00,000"
                min="1"
              />
            </div>
          </div>

          <div className="field">
            <label>Effective Date *</label>
            <input className="input" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
          </div>

          <div className="field">
            <label>Reason</label>
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option>Annual Appraisal</option>
              <option>Promotion</option>
              <option>Role Change</option>
              <option>Market Correction</option>
              <option>Retention</option>
              <option>Other</option>
            </select>
          </div>

          <div className="field">
            <label>Remarks</label>
            <textarea className="input" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Additional notes..." />
          </div>

          {/* Auto-calculated increment */}
          {newNum > 0 && (
            <div className="compensation-modal-calc">
              <div className="compensation-modal-calc-row">
                <span>Increment</span>
                <span className={increment >= 0 ? "text-success" : "text-danger"}>
                  {increment >= 0 ? "+" : ""}₹{Math.abs(increment).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="compensation-modal-calc-row">
                <span>Change</span>
                <span className={increment >= 0 ? "text-success" : "text-danger"}>
                  {increment >= 0 ? "+" : ""}{percentage}%
                </span>
              </div>
            </div>
          )}

          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-sm" disabled={submitting}>
              {submitting ? "Saving…" : "Save Revision"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
