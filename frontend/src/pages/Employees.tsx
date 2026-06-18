import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { employeesApi, type Employee, type EmployeeCreate, type EmployeeWithRole, type BulkImportResult } from "../api/employees";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import { Eye, Trash2, UserCheck, Shield, Key, Search, Grid, List, Briefcase, Activity, ChevronDown } from "lucide-react";

const EMPTY_FORM: EmployeeCreate = {
  employee_code: "",
  full_name: "",
  email: "",
  mobile_number: "",
  date_of_birth: "",
  gender: "",
  marital_status: "",
  date_of_joining: "",
  department: "",
  designation: "",
  employment_status: "Active",
  work_location: "",
  initial_salary: undefined,
};

function EmployeeAvatar({ name, email, photo, size = 36 }: { name: string; email: string; photo?: string | null; size?: number }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        style={{
          width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
          border: "1.5px solid hsl(var(--border))",
        }}
      />
    );
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "EE";

  // Hash email to get a consistent color variant
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    { bg: "rgba(3, 18, 115, 0.12)", color: "#031273" }, // indigo
    { bg: "rgba(59, 130, 246, 0.12)", color: "#3b82f6" },  // blue
    { bg: "rgba(16, 185, 129, 0.12)", color: "#10b981" },  // green
    { bg: "rgba(245, 158, 11, 0.12)", color: "#f59e0b" },  // amber
    { bg: "rgba(244, 63, 94, 0.12)", color: "#f43f5e" },   // rose
    { bg: "rgba(3, 18, 115, 0.12)", color: "#031273" },  // purple
  ];
  const { bg, color } = colors[Math.abs(hash) % colors.length];

  return (
    <div
      className="emp-avatar-circle"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.36,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export default function Employees() {
  const { user } = useAuth();
  const isHr = user?.role === "hr_admin";
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<EmployeeWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [loginModal, setLoginModal] = useState<EmployeeWithRole | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<EmployeeWithRole | null>(null);
  const [assignManagerTarget, setAssignManagerTarget] = useState<EmployeeWithRole | null>(null);
  const [changeRoleTarget, setChangeRoleTarget] = useState<EmployeeWithRole | null>(null);
  
  // Custom View Mode: Grid (default) or Table
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Search & filter
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Bulk select
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const loadEmployees = () => {
    setLoading(true);
    const fetcher = isHr ? employeesApi.listWithRoles() : employeesApi.list();
    fetcher
      .then((data) => setEmployees(data.map((e: any) => ({ ...e, role: e.role ?? null }))))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load."),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleAdded = (emp: Employee) => {
    setEmployees((prev) => [{ ...emp, role: null } as EmployeeWithRole, ...prev]);
    setShowAddModal(false);
  };

  const handleTerminated = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    setTerminateTarget(null);
  };

  // Filtered employees
  const filtered = employees.filter((emp) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      emp.full_name.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.employee_code.toLowerCase().includes(q) ||
      (emp.department ?? "").toLowerCase().includes(q) ||
      (emp.designation ?? "").toLowerCase().includes(q);
    const matchesRole = !filterRole || emp.role === filterRole;
    const matchesDept = !filterDept || emp.department === filterDept;
    const matchesStatus = !filterStatus || emp.employment_status === filterStatus;
    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  // Unique departments and statuses for filter dropdowns
  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))] as string[];
  const statuses = [...new Set(employees.map((e) => e.employment_status).filter(Boolean))] as string[];

  // Statistics
  const totalCount = employees.length;
  const activeCount = employees.filter((e) => e.employment_status === "Active").length;
  const leaveCount = employees.filter((e) => e.employment_status === "On Leave").length;
  const deptCount = departments.length;

  // Select/deselect
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((e) => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = Array.from(selected);
    for (const id of ids) {
      try {
        await employeesApi.terminate(id);
      } catch { /* skip failures */ }
    }
    setEmployees((prev) => prev.filter((e) => !selected.has(e.id)));
    setSelected(new Set());
    setBulkDeleting(false);
    setShowBulkConfirm(false);
  };

  return (
    <div>
      <PageHeader
        title={isHr ? "Employees" : "My Team"}
        subtitle={isHr ? "All employee records." : "Employees who report directly to you."}
        actions={
          isHr ? (
            <button className="btn btn-sm" onClick={() => setShowAddModal(true)}>
              + Add Employee
            </button>
          ) : undefined
        }
      />

      {/* Add Employee Modal */}
      {showAddModal && (
        <AddEmployeeModal
          onSuccess={handleAdded}
          onClose={() => setShowAddModal(false)}
          employees={employees}
        />
      )}

      {/* Create Login Modal */}
      {loginModal && (
        <CreateLoginModal
          employee={loginModal}
          onClose={() => setLoginModal(null)}
        />
      )}

      {/* Terminate Confirmation */}
      {terminateTarget && (
        <TerminateModal
          employee={terminateTarget}
          onConfirm={handleTerminated}
          onClose={() => setTerminateTarget(null)}
        />
      )}

      {/* Assign Manager Modal */}
      {assignManagerTarget && (
        <AssignManagerModal
          employee={assignManagerTarget}
          employees={employees}
          onSuccess={(updatedManagerId) => {
            setEmployees((prev) =>
              prev.map((e) =>
                e.id === assignManagerTarget.id ? { ...e, manager_id: updatedManagerId } : e
              )
            );
            setAssignManagerTarget(null);
          }}
          onClose={() => setAssignManagerTarget(null)}
        />
      )}

      {/* Change Role Modal */}
      {changeRoleTarget && (
        <ChangeRoleModal
          employee={changeRoleTarget}
          onSuccess={(newRole) => {
            setEmployees((prev) =>
              prev.map((e) =>
                e.id === changeRoleTarget.id ? { ...e, role: newRole } : e
              )
            );
            setChangeRoleTarget(null);
          }}
          onClose={() => setChangeRoleTarget(null)}
        />
      )}

      {/* Bulk Delete Confirmation */}
      {showBulkConfirm && (
        <div className="modal-overlay" onClick={() => setShowBulkConfirm(false)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Selected Employees</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowBulkConfirm(false)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ padding: 16, background: "hsl(0 84% 60% / 0.08)", borderRadius: "var(--radius)", marginBottom: 16 }}>
                <p style={{ color: "hsl(0 84% 45%)", fontSize: 13, fontWeight: 500 }}>
                  ⚠️ This action cannot be undone.
                </p>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 16 }}>
                Are you sure you want to delete <strong style={{ color: "var(--text)" }}>{selected.size} employee{selected.size > 1 ? "s" : ""}</strong>?
                Their records and linked login accounts will be permanently removed.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-outline btn-sm" onClick={() => setShowBulkConfirm(false)} disabled={bulkDeleting}>
                  Cancel
                </button>
                <button className="btn btn-sm btn-destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
                  {bulkDeleting ? "Deleting…" : `Delete ${selected.size} Employee${selected.size > 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && (
        <>
          {/* Quick Metrics summary widgets */}
          <div className="employee-stats-grid">
            <div className="emp-stat-mini-card">
              <span className="emp-stat-mini-label">Total Employees</span>
              <span className="emp-stat-mini-value">{totalCount}</span>
            </div>
            <div className="emp-stat-mini-card">
              <span className="emp-stat-mini-label">Active Staff</span>
              <span className="emp-stat-mini-value" style={{ color: "#10b981" }}>{activeCount}</span>
            </div>
            <div className="emp-stat-mini-card">
              <span className="emp-stat-mini-label">On Leave</span>
              <span className="emp-stat-mini-value" style={{ color: "#f59e0b" }}>{leaveCount}</span>
            </div>
            <div className="emp-stat-mini-card">
              <span className="emp-stat-mini-label">Departments</span>
              <span className="emp-stat-mini-value" style={{ color: "#031273" }}>{deptCount}</span>
            </div>
          </div>

          {/* Search & Filters Bar */}
          <div className="filter-bar-card">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon-inside" />
              <input
                className="input search-bar-input"
                placeholder="Search name, email, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="filters-right">
              {isHr && (
                <div className="filter-item-wrapper" title="Filter by Role">
                  <span className="filter-item-icon">
                    <Shield size={16} />
                  </span>
                  <span className="filter-item-label">Role:</span>
                  <span className="filter-item-value">
                    {filterRole === "hr_admin" ? "HR Admin" : filterRole === "manager" ? "Manager" : filterRole === "employee" ? "Employee" : "All"}
                  </span>
                  <ChevronDown size={14} style={{ color: "var(--text-muted)", marginLeft: 4 }} />
                  <select className="filter-native-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                    <option value="">All Roles</option>
                    <option value="hr_admin">HR Admin</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
              )}

              <div className="filter-item-wrapper" title="Filter by Department">
                <span className="filter-item-icon">
                  <Briefcase size={16} />
                </span>
                <span className="filter-item-label">Dept:</span>
                <span className="filter-item-value">
                  {filterDept || "All"}
                </span>
                <ChevronDown size={14} style={{ color: "var(--text-muted)", marginLeft: 4 }} />
                <select className="filter-native-select" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                  <option value="">All Departments</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="filter-item-wrapper" title="Filter by Status">
                <span className="filter-item-icon">
                  <Activity size={16} />
                </span>
                <span className="filter-item-label">Status:</span>
                <span className="filter-item-value">
                  {filterStatus || "All"}
                </span>
                <ChevronDown size={14} style={{ color: "var(--text-muted)", marginLeft: 4 }} />
                <select className="filter-native-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              {/* Grid/Table View Mode Selector Toggle */}
              <div className="view-mode-switcher">
                <button
                  className={`view-mode-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                >
                  <Grid size={16} />
                </button>
                <button
                  className={`view-mode-btn ${viewMode === "table" ? "active" : ""}`}
                  onClick={() => setViewMode("table")}
                  title="Table View"
                >
                  <List size={16} />
                </button>
              </div>

              {isHr && selected.size > 0 && (
                <button className="btn btn-destructive btn-sm" onClick={() => setShowBulkConfirm(true)}>
                  Delete ({selected.size})
                </button>
              )}
            </div>
          </div>

          {/* Table list or Grid Cards list based on viewMode selection */}
          {viewMode === "table" ? (
            <div className="card" style={{ padding: 0, overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {isHr && (
                      <th style={{ width: 40, paddingLeft: 20 }}>
                        <input
                          type="checkbox"
                          checked={filtered.length > 0 && selected.size === filtered.length}
                          onChange={toggleSelectAll}
                          style={{ cursor: "pointer" }}
                        />
                      </th>
                    )}
                    <th style={{ paddingLeft: isHr ? 0 : 20 }}>Employee</th>
                    <th>Code</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Status</th>
                    <th style={{ width: 180 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isHr ? 8 : 7} className="muted" style={{ textAlign: "center", padding: 32 }}>
                        {employees.length === 0 ? "No employees yet. Add one to get started." : "No employees match your filters."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((emp) => (
                      <tr key={emp.id}>
                        {isHr && (
                          <td style={{ width: 40, paddingLeft: 20 }}>
                            <input
                              type="checkbox"
                              checked={selected.has(emp.id)}
                              onChange={() => toggleSelect(emp.id)}
                              style={{ cursor: "pointer" }}
                            />
                          </td>
                        )}
                        <td style={{ paddingLeft: isHr ? 0 : 20 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <EmployeeAvatar name={emp.full_name} email={emp.email} photo={emp.profile_photo} />
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--text)" }}>{emp.full_name}</div>
                              <div className="muted" style={{ fontSize: 12 }}>{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="muted">{emp.employee_code}</td>
                        <td><RoleBadge role={emp.role} /></td>
                        <td className="muted">{emp.department ?? "—"}</td>
                        <td className="muted">{emp.designation ?? "—"}</td>
                        <td><StatusBadge status={emp.employment_status} /></td>
                        <td style={{ paddingRight: 20 }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                            {isHr && !emp.role && (
                              <button
                                className="btn btn-outline btn-icon-sm"
                                title="Create Login"
                                onClick={() => setLoginModal(emp)}
                              >
                                <Key size={14} />
                              </button>
                            )}
                            {isHr && emp.role && (
                              <button
                                className="btn btn-outline btn-icon-sm"
                                title="Change Role"
                                onClick={() => setChangeRoleTarget(emp)}
                              >
                                <Shield size={14} />
                              </button>
                            )}
                            {isHr && (
                              <button
                                className="btn btn-outline btn-icon-sm"
                                title="Assign Manager"
                                onClick={() => setAssignManagerTarget(emp)}
                              >
                                <UserCheck size={14} />
                              </button>
                            )}
                            <button
                              className="btn btn-outline btn-icon-sm"
                              title="View Profile"
                              onClick={() => navigate(`/employees/${emp.id}`)}
                            >
                              <Eye size={14} />
                            </button>
                            {isHr && (
                              <button
                                className="btn-destructive-light"
                                title="Terminate Employee"
                                onClick={() => setTerminateTarget(emp)}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            // Grid Cards View
            <div>
              {filtered.length === 0 ? (
                <div className="card muted" style={{ textAlign: "center", padding: 48 }}>
                  {employees.length === 0 ? "No employees yet. Add one to get started." : "No employees match your filters."}
                </div>
              ) : (
                <div className="employee-cards-grid">
                  {filtered.map((emp) => {
                    const isSelected = selected.has(emp.id);
                    return (
                      <div key={emp.id} className={`employee-card-item ${isSelected ? "employee-card-selected" : ""}`}>
                        {isHr && (
                          <div className="emp-card-checkbox-wrapper">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(emp.id)}
                              style={{ cursor: "pointer" }}
                            />
                          </div>
                        )}
                        <div className="emp-card-header" onClick={() => navigate(`/employees/${emp.id}`)} style={{ cursor: "pointer" }}>
                          <EmployeeAvatar name={emp.full_name} email={emp.email} photo={emp.profile_photo} size={48} />
                          <div className="emp-card-names">
                            <h3 className="emp-card-fullname">{emp.full_name}</h3>
                            <span className="emp-card-code">{emp.employee_code}</span>
                          </div>
                        </div>
                        <div className="emp-card-body" onClick={() => navigate(`/employees/${emp.id}`)} style={{ cursor: "pointer" }}>
                          <div className="emp-card-detail">
                            <span className="emp-card-label">Email</span>
                            <span className="emp-card-val text-truncate" title={emp.email}>{emp.email}</span>
                          </div>
                          <div className="emp-card-detail">
                            <span className="emp-card-label">Department</span>
                            <span className="emp-card-val">{emp.department ?? "—"}</span>
                          </div>
                          <div className="emp-card-detail">
                            <span className="emp-card-label">Designation</span>
                            <span className="emp-card-val text-truncate" title={emp.designation ?? ""}>{emp.designation ?? "—"}</span>
                          </div>
                          <div className="emp-card-badges-row">
                            <RoleBadge role={emp.role} />
                            <StatusBadge status={emp.employment_status} />
                          </div>
                        </div>
                        <div className="emp-card-footer">
                          <div style={{ display: "flex", justifyContent: "center", gap: 8, width: "100%" }}>
                            {isHr && !emp.role && (
                              <button
                                className="btn btn-outline btn-icon-sm"
                                title="Create Login"
                                onClick={() => setLoginModal(emp)}
                              >
                                <Key size={14} />
                              </button>
                            )}
                            {isHr && emp.role && (
                              <button
                                className="btn btn-outline btn-icon-sm"
                                title="Change Role"
                                onClick={() => setChangeRoleTarget(emp)}
                              >
                                <Shield size={14} />
                              </button>
                            )}
                            {isHr && (
                              <button
                                className="btn btn-outline btn-icon-sm"
                                title="Assign Manager"
                                onClick={() => setAssignManagerTarget(emp)}
                              >
                                <UserCheck size={14} />
                              </button>
                            )}
                            <button
                              className="btn btn-outline btn-icon-sm"
                              title="View Profile"
                              onClick={() => navigate(`/employees/${emp.id}`)}
                            >
                              <Eye size={14} />
                            </button>
                            {isHr && (
                              <button
                                className="btn-destructive-light"
                                title="Terminate Employee"
                                onClick={() => setTerminateTarget(emp)}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ------- Role Badge -------

function RoleBadge({ role }: { role: string | null }) {
  if (!role) {
    return <span className="badge" style={{ background: "rgba(255, 255, 255, 0.04)", color: "var(--text-muted)", fontSize: 11 }}>No login</span>;
  }
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    hr_admin: { bg: "rgba(3, 18, 115, 0.1)", color: "#031273", label: "HR Admin" },
    manager: { bg: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", label: "Manager" },
    employee: { bg: "rgba(16, 185, 129, 0.1)", color: "#10b981", label: "Employee" },
  };
  const s = styles[role] ?? styles.employee;
  return (
    <span className="badge" style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}2b`, fontSize: 12, fontWeight: 500 }}>
      {s.label}
    </span>
  );
}

// ------- Status Badge -------

function StatusBadge({ status }: { status: string | null }) {
  const val = status ?? "Active";
  let colorClass = "badge-status-active";
  if (val === "Inactive" || val === "Terminated") colorClass = "badge-status-terminated";
  if (val === "On Leave") colorClass = "badge-status-leave";

  return <span className={`badge ${colorClass}`}>{val}</span>;
}

// ------- Terminate Confirmation Modal -------

function TerminateModal({
  employee,
  onConfirm,
  onClose,
}: {
  employee: EmployeeWithRole;
  onConfirm: (id: string) => void;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setSubmitting(true);
    setError("");
    try {
      await employeesApi.terminate(employee.id);
      onConfirm(employee.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to terminate employee.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Terminate Employee</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ padding: 16, background: "hsl(0 84% 60% / 0.08)", borderRadius: "var(--radius)", marginBottom: 16 }}>
            <p style={{ color: "hsl(0 84% 45%)", fontSize: 13, fontWeight: 500 }}>
              ⚠️ This action cannot be undone.
            </p>
          </div>
          <p style={{ marginBottom: 16, color: "var(--text-secondary)", fontSize: 14 }}>
            Are you sure you want to terminate <strong style={{ color: "var(--text)" }}>{employee.full_name}</strong> ({employee.employee_code})?
            This will permanently delete their employee record and any linked login account.
          </p>
          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-outline btn-sm" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn-sm btn-destructive" onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Terminating…" : "Yes, Terminate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------- Change Role Modal -------

function ChangeRoleModal({
  employee,
  onSuccess,
  onClose,
}: {
  employee: EmployeeWithRole;
  onSuccess: (newRole: string) => void;
  onClose: () => void;
}) {
  const [role, setRole] = useState(employee.role ?? "employee");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === employee.role) {
      onClose();
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await employeesApi.changeRole(employee.id, role);
      onSuccess(role);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change role.");
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabel = (r: string) => ({
    employee: "Employee",
    manager: "Manager",
    hr_admin: "HR Administrator",
  }[r] ?? r);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Change Role</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
            Change role for <strong style={{ color: "var(--text)" }}>{employee.full_name}</strong>.
            Currently: <strong style={{ color: "var(--text)" }}>{roleLabel(employee.role ?? "")}</strong>
          </p>
          <div className="field">
            <label>New Role</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="hr_admin">HR Administrator</option>
            </select>
          </div>
          {role === "manager" && employee.role === "employee" && (
            <p style={{ fontSize: 12, color: "var(--primary-color)", marginBottom: 12 }}>
              ↑ Promoting to Manager — they'll be able to see their direct reports.
            </p>
          )}
          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-sm" disabled={submitting}>
              {submitting ? "Saving…" : "Update Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------- Assign Manager Modal -------

function AssignManagerModal({
  employee,
  employees,
  onSuccess,
  onClose,
}: {
  employee: EmployeeWithRole;
  employees: EmployeeWithRole[];
  onSuccess: (managerId: string | null) => void;
  onClose: () => void;
}) {
  const currentManager = employees.find((e) => e.id === employee.manager_id);
  const [managerId, setManagerId] = useState(employee.manager_id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Only show employees with manager or hr_admin role as manager options
  const managerOptions = employees.filter((e) => e.id !== employee.id && (e.role === "manager" || e.role === "hr_admin"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await employeesApi.update(employee.id, {
        manager_id: managerId || undefined,
      });
      onSuccess(managerId || null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to assign manager.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assign Manager</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
            Assign a reporting manager for <strong style={{ color: "var(--text)" }}>{employee.full_name}</strong>.
            {currentManager && (
              <> Currently reports to: <strong style={{ color: "var(--text)" }}>{currentManager.full_name}</strong>.</>
            )}
          </p>
          <div className="field">
            <label>Manager</label>
            <select className="input" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">— No Manager —</option>
              {managerOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.employee_code}) {m.role === "manager" ? "• Manager" : m.role === "hr_admin" ? "• HR" : ""}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-sm" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------- Add Employee Modal (with Bulk Import tab) -------

function AddEmployeeModal({
  onSuccess,
  onClose,
  employees,
}: {
  onSuccess: (emp: Employee) => void;
  onClose: () => void;
  employees: EmployeeWithRole[];
}) {
  const [tab, setTab] = useState<"single" | "bulk">("single");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Employee</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="tabs" style={{ padding: "0 20px" }}>
          <button className={`tab-btn ${tab === "single" ? "tab-btn-active" : ""}`} onClick={() => setTab("single")}>
            Single
          </button>
          <button className={`tab-btn ${tab === "bulk" ? "tab-btn-active" : ""}`} onClick={() => setTab("bulk")}>
            Bulk Import (CSV)
          </button>
        </div>
        {tab === "single" ? (
          <SingleEmployeeForm onSuccess={onSuccess} onClose={onClose} employees={employees} />
        ) : (
          <BulkImportForm onClose={onClose} />
        )}
      </div>
    </div>
  );
}

// ------- Single Employee Form -------

function SingleEmployeeForm({
  onSuccess,
  onClose,
  employees,
}: {
  onSuccess: (emp: Employee) => void;
  onClose: () => void;
  employees: EmployeeWithRole[];
}) {
  const [form, setForm] = useState<EmployeeCreate>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof EmployeeCreate, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.employee_code || !form.full_name || !form.email) {
      setError("Employee code, full name, and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: EmployeeCreate = { ...form };
      for (const key of Object.keys(payload) as (keyof EmployeeCreate)[]) {
        if (payload[key] === "") delete payload[key];
      }
      const emp = await employeesApi.create(payload);
      onSuccess(emp);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add employee.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: 20 }}>
      <div className="form-grid">
        <Field label="Employee Code *" value={form.employee_code} onChange={(v) => set("employee_code", v)} placeholder="EMP-XXXX" />
        <Field label="Full Name *" value={form.full_name} onChange={(v) => set("full_name", v)} placeholder="John Doe" />
        <Field label="Email *" value={form.email} onChange={(v) => set("email", v)} placeholder="john@company.com" type="email" />
        <Field label="Mobile Number" value={form.mobile_number ?? ""} onChange={(v) => set("mobile_number", v)} placeholder="+1 555 0100" />
        <Field label="Date of Birth" value={form.date_of_birth ?? ""} onChange={(v) => set("date_of_birth", v)} type="date" />
        <SelectField label="Gender" value={form.gender ?? ""} onChange={(v) => set("gender", v)} options={["", "Male", "Female", "Other"]} />
        <SelectField label="Marital Status" value={form.marital_status ?? ""} onChange={(v) => set("marital_status", v)} options={["", "Single", "Married", "Divorced"]} />
        <Field label="Date of Joining" value={form.date_of_joining ?? ""} onChange={(v) => set("date_of_joining", v)} type="date" />
        <Field label="Department" value={form.department ?? ""} onChange={(v) => set("department", v)} placeholder="Engineering" />
        <Field label="Designation" value={form.designation ?? ""} onChange={(v) => set("designation", v)} placeholder="Software Engineer" />
        <SelectField label="Employment Status" value={form.employment_status ?? ""} onChange={(v) => set("employment_status", v)} options={["Active", "Inactive", "On Leave", "Terminated"]} />
        <Field label="Work Location" value={form.work_location ?? ""} onChange={(v) => set("work_location", v)} placeholder="Remote" />
        <SelectField
          label="Manager"
          value={form.manager_id ?? ""}
          onChange={(v) => set("manager_id", v)}
          options={[
            { value: "", label: "— None —" },
            ...employees.map((e) => ({ value: e.id, label: `${e.full_name} (${e.employee_code})` })),
          ]}
        />
        <div className="field">
          <label>Initial Salary (CTC / year)</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 600, color: "var(--text-muted)", pointerEvents: "none" }}>₹</span>
            <input
              className="input"
              type="number"
              style={{ paddingLeft: 28 }}
              value={form.initial_salary ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, initial_salary: e.target.value ? Number(e.target.value) : undefined }))}
              placeholder="e.g. 720000"
              min="0"
            />
          </div>
        </div>
      </div>
      {error && <p className="error-text" style={{ marginTop: 12 }}>{error}</p>}
      <div style={{ marginTop: 20, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-sm" type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add Employee"}
        </button>
      </div>
    </form>
  );
}

// ------- Bulk Import Form -------

const CSV_TEMPLATE_HEADER = "employee_code,full_name,email,mobile_number,date_of_birth,gender,marital_status,date_of_joining,department,designation,employment_status,work_location";
const CSV_TEMPLATE_EXAMPLE = "EMP-2001,John Doe,john@company.com,+1 555 0200,1990-05-15,Male,Single,2024-01-10,Engineering,Software Engineer,Active,Remote";

function BulkImportForm({ onClose }: { onClose: () => void }) {
  const [csvData, setCsvData] = useState("");
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setCsvData(evt.target?.result as string ?? "");
    };
    reader.readAsText(file);
  };

  const parseCSV = (csv: string): Record<string, string | null>[] => {
    const lines = csv.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const rows: Record<string, string | null>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, string | null> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] && values[idx] !== "" ? values[idx] : null;
      });
      rows.push(row);
    }
    return rows;
  };

  const handleSubmit = async () => {
    setError("");
    setResult(null);

    if (!csvData.trim()) {
      setError("Please upload a CSV file or paste CSV data.");
      return;
    }

    const parsed = parseCSV(csvData);
    if (parsed.length === 0) {
      setError("No data rows found. Make sure the CSV has a header row and at least one data row.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await employeesApi.bulkImport(parsed);
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to import.");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const content = CSV_TEMPLATE_HEADER + "\n" + CSV_TEMPLATE_EXAMPLE + "\n";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>
          Upload a CSV file with employee data. The first row must be the header.
        </p>
        <button type="button" className="btn btn-outline btn-sm" onClick={downloadTemplate}>
          ↓ Download CSV Template
        </button>
      </div>

      {/* File Upload */}
      <div style={{ marginBottom: 16 }}>
        <label
          className="upload-box"
          style={{ display: "block", cursor: "pointer" }}
        >
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {fileName ? (
              <span>📄 <strong>{fileName}</strong> loaded</span>
            ) : (
              <span>Click to upload CSV file or drag & drop</span>
            )}
          </div>
        </label>
      </div>

      {/* Or paste directly */}
      <div className="field">
        <label>Or paste CSV data directly</label>
        <textarea
          className="input"
          rows={6}
          value={csvData}
          onChange={(e) => setCsvData(e.target.value)}
          placeholder={CSV_TEMPLATE_HEADER + "\n" + CSV_TEMPLATE_EXAMPLE}
          style={{ fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
        />
      </div>

      {/* Results */}
      {result && (
        <div style={{ marginBottom: 16, padding: 16, borderRadius: "var(--radius)", border: "1px solid hsl(var(--border))" }}>
          <p style={{ fontWeight: 500, marginBottom: 8, color: "var(--text)" }}>
            Import Complete: {result.created}/{result.total} employees added
          </p>
          {result.errors.length > 0 && (
            <div style={{ maxHeight: 120, overflow: "auto" }}>
              {result.errors.map((err, i) => (
                <p key={i} style={{ fontSize: 12, color: "hsl(var(--destructive))", marginTop: 4 }}>• {err}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
          {result ? "Done" : "Cancel"}
        </button>
        {!result && (
          <button className="btn btn-sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Importing…" : "Import Employees"}
          </button>
        )}
      </div>
    </div>
  );
}

// ------- Create Login Modal -------

function CreateLoginModal({
  employee,
  onClose,
}: {
  employee: EmployeeWithRole;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("Secret123");
  const [role, setRole] = useState("employee");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await employeesApi.createLogin(employee.id, { password, role });
      setSuccess(`Login created for ${employee.full_name} as ${role.replace("_", " ")}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create login.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Login Account</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ marginBottom: 16, color: "var(--text-secondary)", fontSize: 13 }}>
            Create a login account for <strong>{employee.full_name}</strong> ({employee.email}).
            This will allow them to sign into Emplo.
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
                <label>Role</label>
                <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="hr_admin">HR Administrator</option>
                </select>
              </div>
              <div className="field">
                <label>Initial Password</label>
                <input
                  className="input"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  The user can change this after first login.
                </span>
              </div>
              {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-sm" disabled={submitting}>
                  {submitting ? "Creating…" : "Create Login"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ------- Form field helpers -------

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => {
          const v = typeof opt === "string" ? opt : opt.value;
          const l = typeof opt === "string" ? (opt || "— Select —") : opt.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </div>
  );
}
