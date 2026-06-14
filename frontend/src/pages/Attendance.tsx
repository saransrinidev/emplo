import { useEffect, useState, type FormEvent } from "react";
import {
  CalendarDays,
  CalendarPlus,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  Inbox,
  ChevronLeft,
  ChevronRight,
  X,
  CalendarRange,
} from "lucide-react";
import {
  attendanceApi,
  type LeaveRequest,
  type LeaveStatus,
  type LeaveType,
} from "../api/attendance";
import { useAuth } from "../context/AuthContext";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import { useApi } from "../hooks/useApi";

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "casual", label: "Casual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "earned", label: "Earned Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
];

const STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "Pending",
  forwarded_to_hr: "With HR",
  approved: "Approved",
  rejected: "Rejected",
};

function dayCount(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

export default function Attendance() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const isManager = user?.role === "manager";
  const isHR = user?.role === "hr_admin";

  const { data: myLeaves, loading: loadingMy, error: errorMy } = useApi(
    () => attendanceApi.myRequests(),
    [refreshKey],
  );

  const { data: teamLeaves, loading: loadingTeam, error: errorTeam } = useApi(
    () => (isManager || isHR ? attendanceApi.teamRequests() : Promise.resolve([])),
    [refreshKey, user?.role],
  );

  const refresh = () => setRefreshKey((k) => k + 1);

  // Merge for the calendar (own + team, deduped)
  const calendarLeaves = (() => {
    const map = new Map<string, LeaveRequest>();
    [...(myLeaves ?? []), ...(teamLeaves ?? [])].forEach((l) => map.set(l.id, l));
    return Array.from(map.values());
  })();

  const my = myLeaves ?? [];
  const stats = {
    pending: my.filter((l) => l.status === "pending").length,
    withHr: my.filter((l) => l.status === "forwarded_to_hr").length,
    approved: my.filter((l) => l.status === "approved").length,
    rejected: my.filter((l) => l.status === "rejected").length,
  };

  const pendingTeam = teamLeaves ?? [];

  return (
    <div>
      <PageHeader
        title="Attendance & Leave"
        subtitle="Apply for leave, track approvals, and view the team calendar."
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-outline btn-sm att-cal-btn"
              onClick={() => setShowCalendar(true)}
              title="Open leave calendar"
            >
              <CalendarDays size={16} />
              Calendar
            </button>
            {!isHR && (
              <button className="btn btn-sm" onClick={() => setShowForm((v) => !v)}>
                <CalendarPlus size={16} />
                {showForm ? "Cancel" : "Apply Leave"}
              </button>
            )}
          </div>
        }
      />

      {showForm && !isHR && (
        <ApplyLeaveForm
          onSuccess={() => {
            setShowForm(false);
            refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <AsyncState loading={loadingMy || loadingTeam} error={errorMy || errorTeam}>
        {/* Summary stats (employee + manager personal view) */}
        {!isHR && (
          <div className="att-stats">
            <StatCard kind="pending" icon={<Clock />} value={stats.pending} label="Pending" />
            <StatCard kind="hr" icon={<Send />} value={stats.withHr} label="With HR" />
            <StatCard kind="approved" icon={<CheckCircle2 />} value={stats.approved} label="Approved" />
            <StatCard kind="rejected" icon={<XCircle />} value={stats.rejected} label="Rejected" />
          </div>
        )}

        {/* Pending action queue for Manager / HR */}
        {(isManager || isHR) && (
          <section className="att-section">
            <div className="att-section-head">
              <span className="att-section-title">
                <Inbox />
                {isHR ? "Awaiting HR Approval" : "Team Requests to Review"}
              </span>
              {pendingTeam.length > 0 && (
                <span className="att-section-count">{pendingTeam.length}</span>
              )}
            </div>
            {pendingTeam.length === 0 ? (
              <div className="att-empty">
                <Inbox />
                <p>Nothing waiting on you right now.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingTeam.map((lr) => (
                      <tr key={lr.id}>
                        <td style={{ fontWeight: 500 }}>{lr.employee_name ?? "—"}</td>
                        <td className="muted">{lr.department ?? "—"}</td>
                        <td>
                          <span className="leave-type-pill">{lr.leave_type}</span>
                        </td>
                        <td className="muted" style={{ whiteSpace: "nowrap" }}>
                          {lr.start_date} → {lr.end_date}
                        </td>
                        <td className="muted">{dayCount(lr.start_date, lr.end_date)}</td>
                        <td className="muted" style={{ maxWidth: 200 }}>
                          {lr.reason || "—"}
                        </td>
                        <td>
                          <LeaveChip status={lr.status} />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <ActionButtons leave={lr} role={user!.role} onDone={refresh} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* My requests */}
        {!isHR && (
          <section className="att-section">
            <div className="att-section-head">
              <span className="att-section-title">
                <CalendarRange />
                My Leave Requests
              </span>
              {my.length > 0 && <span className="att-section-count">{my.length}</span>}
            </div>
            {my.length === 0 ? (
              <div className="att-empty">
                <CalendarDays />
                <p>No leave requests yet. Click “Apply Leave” to get started.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {my.map((lr) => (
                      <tr key={lr.id}>
                        <td>
                          <span className="leave-type-pill">{lr.leave_type}</span>
                        </td>
                        <td className="muted" style={{ whiteSpace: "nowrap" }}>
                          {lr.start_date} → {lr.end_date}
                        </td>
                        <td className="muted">{dayCount(lr.start_date, lr.end_date)}</td>
                        <td className="muted">{lr.reason || "—"}</td>
                        <td>
                          <LeaveChip status={lr.status} />
                        </td>
                        <td className="muted">
                          {lr.hr_remarks || lr.manager_remarks || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </AsyncState>

      {showCalendar && (
        <CalendarModal leaves={calendarLeaves} onClose={() => setShowCalendar(false)} />
      )}
    </div>
  );
}

/* ─── Stat Card ───────────────────────────────────────────────────────────── */

function StatCard({
  kind,
  icon,
  value,
  label,
}: {
  kind: "pending" | "hr" | "approved" | "rejected";
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="att-stat">
      <div className={`att-stat-icon is-${kind}`}>{icon}</div>
      <div>
        <div className="att-stat-value">{value}</div>
        <div className="att-stat-label">{label}</div>
      </div>
    </div>
  );
}

/* ─── Status Chip ─────────────────────────────────────────────────────────── */

function LeaveChip({ status }: { status: LeaveStatus }) {
  return <span className={`leave-chip is-${status}`}>{STATUS_LABELS[status]}</span>;
}

/* ─── Apply Leave Form ────────────────────────────────────────────────────── */

function ApplyLeaveForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const start = fd.get("start_date") as string;
    const end = fd.get("end_date") as string;
    if (end < start) {
      setError("End date must be on or after the start date.");
      setSubmitting(false);
      return;
    }
    try {
      await attendanceApi.apply({
        leave_type: fd.get("leave_type") as LeaveType,
        start_date: start,
        end_date: end,
        reason: (fd.get("reason") as string) || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CalendarPlus size={18} style={{ color: "var(--primary-color)" }} />
          Apply for Leave
        </h2>
      </div>

      {error && <div className="error-text" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="att-form-row">
        <div className="field">
          <label htmlFor="leave_type">Leave Type</label>
          <select id="leave_type" name="leave_type" className="input" required defaultValue="casual">
            {LEAVE_TYPES.map((lt) => (
              <option key={lt.value} value={lt.value}>
                {lt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="start_date">Start Date</label>
          <input id="start_date" type="date" name="start_date" className="input" required />
        </div>
        <div className="field">
          <label htmlFor="end_date">End Date</label>
          <input id="end_date" type="date" name="end_date" className="input" required />
        </div>
      </div>

      <div className="field">
        <label htmlFor="reason">Reason (optional)</label>
        <textarea
          id="reason"
          name="reason"
          className="input"
          rows={3}
          placeholder="Add a short note for your manager…"
          style={{ resize: "vertical", fontFamily: "inherit" }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="submit" className="btn" disabled={submitting}>
          <Send size={16} />
          {submitting ? "Submitting…" : "Submit Request"}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ─── Action Buttons (Manager / HR) ───────────────────────────────────────── */

function ActionButtons({
  leave,
  role,
  onDone,
}: {
  leave: LeaveRequest;
  role: string;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [open, setOpen] = useState(false);

  const canManagerAct = role === "manager" && leave.status === "pending";
  const canHrAct = role === "hr_admin" && leave.status === "forwarded_to_hr";

  if (!canManagerAct && !canHrAct) {
    return <span className="muted" style={{ fontSize: 12 }}>—</span>;
  }

  const run = async (action: string) => {
    setLoading(true);
    try {
      if (canManagerAct) {
        await attendanceApi.managerAction(leave.id, action as "forward" | "reject", remarks || undefined);
      } else if (canHrAct) {
        await attendanceApi.hrAction(leave.id, action as "approve" | "reject", remarks || undefined);
      }
      onDone();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const positiveLabel = canManagerAct ? "Forward to HR" : "Approve";
  const positiveAction = canManagerAct ? "forward" : "approve";

  if (!open) {
    return (
      <button className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>
        Review
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220, marginLeft: "auto" }}>
      <input
        type="text"
        className="input"
        placeholder="Remarks (optional)"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        style={{ padding: "6px 10px", fontSize: 13 }}
      />
      <div className="att-actions" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-sm" disabled={loading} onClick={() => run(positiveAction)}>
          {positiveLabel}
        </button>
        <button
          className="btn btn-destructive btn-sm"
          disabled={loading}
          onClick={() => run("reject")}
        >
          Reject
        </button>
        <button className="btn btn-ghost btn-sm" disabled={loading} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── Calendar Modal ──────────────────────────────────────────────────────── */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarModal({
  leaves,
  onClose,
}: {
  leaves: LeaveRequest[];
  onClose: () => void;
}) {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const monthLabel = new Date(view.year, view.month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const leavesForDay = (day: number): LeaveRequest[] => {
    const dateStr = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return leaves.filter((lr) => dateStr >= lr.start_date && dateStr <= lr.end_date);
  };

  const isToday = (day: number) =>
    view.year === now.getFullYear() &&
    view.month === now.getMonth() &&
    day === now.getDate();

  const move = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content cal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarDays size={18} style={{ color: "var(--primary-color)" }} />
            Leave Calendar
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close calendar">
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <div className="cal-head">
            <button className="cal-nav-btn" onClick={() => move(-1)} aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <span className="cal-month-label">{monthLabel}</span>
            <button className="cal-nav-btn" onClick={() => move(1)} aria-label="Next month">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="cal-grid">
            {WEEKDAYS.map((d) => (
              <div key={d} className="cal-weekday">
                {d}
              </div>
            ))}
            {cells.map((day, idx) => {
              if (day === null) return <div key={`e-${idx}`} className="cal-cell is-empty" />;
              const dayLeaves = leavesForDay(day);
              const weekday = (firstDay + day - 1) % 7;
              const weekend = weekday === 0 || weekday === 6;
              return (
                <div
                  key={day}
                  className={[
                    "cal-cell",
                    isToday(day) ? "is-today" : "",
                    weekend ? "is-weekend" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="cal-daynum">{day}</span>
                  {dayLeaves.slice(0, 3).map((lr) => (
                    <div
                      key={lr.id}
                      className={`cal-event is-${lr.status}`}
                      title={`${lr.employee_name ?? "You"} · ${lr.leave_type} · ${STATUS_LABELS[lr.status]}`}
                    >
                      {(lr.employee_name?.split(" ")[0] ?? "You")}
                    </div>
                  ))}
                  {dayLeaves.length > 3 && (
                    <span className="cal-more">+{dayLeaves.length - 3} more</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="cal-legend">
            <span className="cal-legend-item">
              <span className="cal-legend-dot is-pending" /> Pending
            </span>
            <span className="cal-legend-item">
              <span className="cal-legend-dot is-forwarded_to_hr" /> With HR
            </span>
            <span className="cal-legend-item">
              <span className="cal-legend-dot is-approved" /> Approved
            </span>
            <span className="cal-legend-item">
              <span className="cal-legend-dot is-rejected" /> Rejected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
