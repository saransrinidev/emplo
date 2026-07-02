import { useEffect, useState, type FormEvent } from "react";
import { Plus, CheckCircle, Clock, AlertCircle, Circle, Send } from "lucide-react";
import { tasksApi, type Task, type TaskStatus, type TaskPriority } from "../api/tasks";
import { employeesApi } from "../api/employees";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../components/Toast";

const STATUS_CONFIG: Record<TaskStatus, { icon: React.ReactNode; color: string; label: string }> = {
  open: { icon: <Circle size={14} />, color: "#6b7280", label: "Open" },
  in_progress: { icon: <Clock size={14} />, color: "#3b82f6", label: "In Progress" },
  completed: { icon: <CheckCircle size={14} />, color: "#10b981", label: "Completed" },
  closed: { icon: <CheckCircle size={14} />, color: "#6b7280", label: "Closed" },
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "#6b7280", medium: "#f59e0b", high: "#f97316", urgent: "#ef4444",
};

export default function Tasks() {
  const { user } = useAuth();
  const toast = useToast();
  const isManagerOrHr = user?.role === "manager" || user?.role === "hr_admin";
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"my" | "assigned">("my");
  const [showCreate, setShowCreate] = useState(false);
  const [completeModal, setCompleteModal] = useState<Task | null>(null);
  const [filter, setFilter] = useState<TaskStatus | "">("");

  const load = () => {
    setLoading(true);
    const fetches: Promise<any>[] = [tasksApi.myTasks()];
    if (isManagerOrHr) fetches.push(tasksApi.assigned());
    Promise.all(fetches)
      .then(([my, assigned]) => { setMyTasks(my); if (assigned) setAssignedTasks(assigned); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const tasks = tab === "my" ? myTasks : assignedTasks;
  const filtered = filter ? tasks.filter(t => t.status === filter) : tasks;

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={tab === "my" ? "Tasks assigned to you." : "Tasks you've assigned to others."}
        actions={isManagerOrHr ? <button className="btn btn-sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Assign Task</button> : undefined}
      />

      {/* Tabs */}
      {isManagerOrHr && (
        <div className="premium-tabs-container" style={{ marginBottom: 16 }}>
          <button className={`premium-tab-btn ${tab === "my" ? "premium-tab-btn-active" : ""}`} onClick={() => setTab("my")}>My Tasks ({myTasks.length})</button>
          <button className={`premium-tab-btn ${tab === "assigned" ? "premium-tab-btn-active" : ""}`} onClick={() => setTab("assigned")}>Assigned by Me ({assignedTasks.length})</button>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select className="input" style={{ width: "auto", minWidth: 140 }} value={filter} onChange={(e) => setFilter(e.target.value as TaskStatus | "")}>
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {loading && <p className="muted">Loading...</p>}

      {!loading && filtered.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={40} />}
          title={tab === "my" ? "No tasks assigned to you" : "No tasks assigned yet"}
          description={tab === "my" ? "When your manager assigns tasks, they'll appear here." : "Click 'Assign Task' to create one for your team."}
        />
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {filtered.map((task) => (
            <div key={task.id} className="card" style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                {/* Status icon */}
                <div style={{ color: STATUS_CONFIG[task.status].color, marginTop: 2 }}>
                  {STATUS_CONFIG[task.status].icon}
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{task.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: `${PRIORITY_COLORS[task.priority]}15`, color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span>
                    <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, background: `${STATUS_CONFIG[task.status].color}15`, color: STATUS_CONFIG[task.status].color }}>{STATUS_CONFIG[task.status].label}</span>
                  </div>
                  {task.description && <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0", lineHeight: 1.4 }}>{task.description}</p>}
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}>
                    {tab === "my" && <span>From: {task.assigned_by_name ?? "—"}</span>}
                    {tab === "assigned" && <span>To: {task.assigned_to_name ?? "—"}</span>}
                    {task.due_date && <span>Due: {task.due_date}</span>}
                    <span>{new Date(task.created_at).toLocaleDateString()}</span>
                  </div>
                  {task.completion_note && (
                    <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 6, background: "hsl(142 60% 93%)", fontSize: 12, color: "hsl(142 60% 30%)" }}>
                      <strong>Closing note:</strong> {task.completion_note}
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {tab === "my" && task.status !== "completed" && task.status !== "closed" && (
                    <button className="btn btn-sm" onClick={() => setCompleteModal(task)}>Complete</button>
                  )}
                  {tab === "assigned" && task.status === "completed" && (
                    <button className="btn btn-outline btn-sm" onClick={async () => {
                      await tasksApi.updateStatus(task.id, "closed");
                      toast.success("Task closed.");
                      load();
                    }}>Close</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateTaskModal onClose={() => { setShowCreate(false); load(); }} />}
      {completeModal && <CompleteTaskModal task={completeModal} onClose={() => { setCompleteModal(null); load(); }} />}
    </div>
  );
}

// ─── Create Task Modal ─────────────────────────────────────────────────────

function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    employeesApi.list().then(setEmployees).catch(() => { });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assignedTo) { setError("Title and assignee are required."); return; }
    setSubmitting(true); setError("");
    try {
      await tasksApi.create({ title, description: description || undefined, assigned_to: assignedTo, due_date: dueDate || undefined, priority });
      toast.success("Task assigned!");
      onClose();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Failed to create task."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h2>Assign Task</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div className="field"><label>Title *</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" /></div>
          <div className="field"><label>Description</label><textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional details..." /></div>
          <div className="form-grid">
            <div className="field"><label>Assign To *</label>
              <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                <option value="">Select employee...</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
              </select>
            </div>
            <div className="field"><label>Due Date</label><input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div className="field"><label>Priority</label>
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-sm" disabled={submitting}>{submitting ? "Assigning…" : "Assign Task"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Complete Task Modal ────────────────────────────────────────────────────

function CompleteTaskModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      await tasksApi.complete(task.id, note.trim());
      toast.success("Task marked as completed!");
      onClose();
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h2>Complete Task</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            Completing: <strong>{task.title}</strong>
          </p>
          <div className="field">
            <label>Closing Statement *</label>
            <textarea className="input" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Describe what was done, results achieved, any notes..." />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-sm" disabled={submitting || !note.trim()}>{submitting ? "Completing…" : "Mark Complete"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
