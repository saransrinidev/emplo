import { useEffect, useState, type FormEvent } from "react";
import { Plus, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { ticketsApi, type Ticket, type TicketType, type TicketStatus, type TicketPriority } from "../api/tickets";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import AsyncState from "../components/AsyncState";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import Skeleton from "../components/Skeleton";
import { useToast } from "../components/Toast";

const TYPE_LABELS: Record<TicketType, string> = {
  leave: "Leave Request",
  wfh: "Work From Home",
  document_update: "Document Update",
  profile_edit: "Profile Edit",
  certification: "Certification",
  salary_query: "Salary Query",
  general: "General",
};

const STATUS_ICONS: Record<TicketStatus, React.ReactNode> = {
  open: <AlertCircle size={14} color="var(--warning)" />,
  in_progress: <Clock size={14} color="var(--info)" />,
  resolved: <CheckCircle size={14} color="var(--success)" />,
  closed: <CheckCircle size={14} color="var(--text-tertiary)" />,
  rejected: <XCircle size={14} color="var(--danger)" />,
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: "var(--text-tertiary)",
  medium: "var(--warning)",
  high: "var(--danger)",
};

export default function MyRequests() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filter, setFilter] = useState<TicketStatus | "">("");
  const [tab, setTab] = useState<"my" | "team">("my");
  const toast = useToast();
  const { user } = useAuth();
  const isHr = user?.role === "hr_admin";
  const isManager = user?.role === "manager";

  const load = () => {
    setLoading(true);
    const params = filter ? { status: filter as TicketStatus } : undefined;
    const fetcher = tab === "team" ? ticketsApi.team(params) : ticketsApi.my(params);
    fetcher
      .then(setTickets)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load requests"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter, tab]);

  const openTicket = (ticket: Ticket) => {
    ticketsApi.get(ticket.id).then(setSelectedTicket).catch(() => setSelectedTicket(ticket));
  };

  return (
    <div>
      <PageHeader title={isHr && tab === "all" ? "All Tickets" : "My Requests"} subtitle={isHr && tab === "all" ? "Manage employee requests and tickets." : "Track all your requests and tickets in one place."} />

      {/* Tab toggle */}
      {(isHr || isManager) && (
        <div className="premium-tabs-container" style={{ marginBottom: 16 }}>
          <button className={`premium-tab-btn ${tab === "my" ? "premium-tab-btn-active" : ""}`} onClick={() => setTab("my")}>My Requests</button>
          <button className={`premium-tab-btn ${tab === "team" ? "premium-tab-btn-active" : ""}`} onClick={() => setTab("team")}>{isHr ? "All Employee Tickets" : "Team Tickets"}</button>
        </div>
      )}

      <div className="row" style={{ marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <button className="btn btn-sm" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New Request
        </button>
        <select
          className="input"
          style={{ width: "auto", minWidth: 140 }}
          value={filter}
          onChange={(e) => setFilter(e.target.value as TicketStatus | "")}
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <AsyncState loading={false} error={error}>
        {loading && (
          <div className="stack" style={{ gap: 8 }}>
            <Skeleton.Card />
            <Skeleton.Card />
            <Skeleton.Card />
          </div>
        )}
        {!loading && tickets.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={40} />}
            title="No requests yet"
            description="Create a new request for leave, document updates, profile edits, or any other HR queries."
            action={
              <button className="btn btn-sm" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> New Request
              </button>
            }
          />
        ) : !loading && (
          <div className="stack" style={{ gap: 8 }}>
            {tickets.map((t) => (
              <div
                key={t.id}
                className="card"
                style={{ padding: "12px 16px", cursor: "pointer" }}
                onClick={() => openTicket(t)}
              >
                <div className="row" style={{ alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 4 }}>
                      {STATUS_ICONS[t.status]}
                      <strong style={{ fontSize: 14 }}>{t.ticket_number}</strong>
                      <span className="badge" style={{ fontSize: 11, background: "var(--bg-secondary)" }}>
                        {TYPE_LABELS[t.ticket_type] || t.ticket_type}
                      </span>
                      <span style={{ fontSize: 11, color: PRIORITY_COLORS[t.priority] || "var(--text-muted)" }}>●</span>
                    </div>
                    <div style={{ fontSize: 14 }}>{t.subject}</div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
                      {t.employee_name && <span>{String(t.employee_name)} · </span>}
                      {new Date(t.created_at).toLocaleDateString()} · {String(t.status).replace("_", " ")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    {isHr && tab === "team" && t.status === "open" && (
                      <button className="btn btn-sm" style={{ fontSize: 11, padding: "4px 8px" }} onClick={async () => { await ticketsApi.updateStatus(t.id, "in_progress"); toast.success("Ticket accepted."); load(); }}>Accept</button>
                    )}
                    {isHr && tab === "team" && (t.status === "open" || t.status === "in_progress") && (
                      <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: "4px 8px", color: "hsl(var(--success))" }} onClick={async () => { await ticketsApi.updateStatus(t.id, "resolved", "Resolved by HR"); toast.success("Ticket resolved."); load(); }}>Resolve</button>
                    )}
                    {isHr && tab === "team" && t.status === "open" && (
                      <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: "4px 8px", color: "hsl(var(--destructive))" }} onClick={async () => { await ticketsApi.updateStatus(t.id, "rejected", "Rejected by HR"); toast.info("Ticket rejected."); load(); }}>Reject</button>
                    )}
                    <MessageSquare size={16} color="var(--text-tertiary)" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AsyncState>

      {showCreate && (
        <CreateTicketModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); toast.success("Request submitted successfully!"); load(); }} />
      )}

      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onUpdated={load} />
      )}
    </div>
  );
}

// ─── Create Ticket Modal ─────────────────────────────────────────────────────

function CreateTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [ticketType, setTicketType] = useState<TicketType>("general");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) { setError("Subject is required"); return; }
    setSubmitting(true);
    setError("");
    try {
      await ticketsApi.create({ ticket_type: ticketType, subject, description: description || undefined, priority });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Request</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div className="field">
            <label>Request Type</label>
            <select className="input" value={ticketType} onChange={(e) => setTicketType(e.target.value as TicketType)}>
              <option value="leave">Leave Request</option>
              <option value="wfh">Work From Home</option>
              <option value="document_update">Document Update</option>
              <option value="profile_edit">Profile Edit</option>
              <option value="certification">Certification</option>
              <option value="salary_query">Salary Query</option>
              <option value="general">General</option>
            </select>
          </div>
          <div className="field">
            <label>Priority</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="field">
            <label>Subject</label>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of your request" />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description of what you need..." />
          </div>
          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-sm" disabled={submitting}>
              {submitting ? "Creating…" : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Ticket Detail Modal ─────────────────────────────────────────────────────

function TicketDetailModal({ ticket, onClose, onUpdated }: { ticket: Ticket; onClose: () => void; onUpdated: () => void }) {
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [comments, setComments] = useState(ticket.comments || []);

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    try {
      const newComment = await ticketsApi.addComment(ticket.id, comment);
      setComments([...comments, newComment]);
      setComment("");
      onUpdated();
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const isClosed = ["resolved", "closed", "rejected"].includes(ticket.status);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 600, maxHeight: "80vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ marginBottom: 4 }}>{ticket.ticket_number}</h2>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              {TYPE_LABELS[ticket.ticket_type] || ticket.ticket_type} · {String(ticket.status).replace("_", " ")} · {new Date(ticket.created_at).toLocaleDateString()}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
          <h3 style={{ marginBottom: 8 }}>{ticket.subject}</h3>
          {ticket.description && <p style={{ color: "var(--text-secondary)", marginBottom: 16, whiteSpace: "pre-wrap" }}>{ticket.description}</p>}

          {ticket.resolution_notes && (
            <div style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <strong>Resolution:</strong> {ticket.resolution_notes}
            </div>
          )}

          {/* Comments thread */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <h4 style={{ marginBottom: 12 }}>Updates</h4>
            {comments.length === 0 && <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>No updates yet.</p>}
            {comments.map((c) => (
              <div key={c.id} style={{ marginBottom: 12, padding: 10, background: "var(--bg-secondary)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>
                  <strong>{c.user_name || "Unknown"}</strong> · {new Date(c.created_at).toLocaleString()}
                </div>
                <div style={{ fontSize: 14 }}>{c.message}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Add comment */}
        {!isClosed && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
            <input
              className="input"
              style={{ flex: 1 }}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
            />
            <button className="btn btn-sm" onClick={handleAddComment} disabled={sending || !comment.trim()}>
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
