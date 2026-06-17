import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { employeesApi, type Employee, type EmployeeCreate, type EmployeeWithRole, type BulkImportResult } from "../api/employees";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";

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
          {/* Search & Filters Bar */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className="input"
              style={{ maxWidth: 280, flex: 1 }}
              placeholder="Search by name, email, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {isHr && (
              <select className="input" style={{ maxWidth: 140 }} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                <option value="">All Roles</option>
                <option value="hr_admin">HR Admin</option>
                <option value="manager">Manager</option>
                <option value="employee">Employee</option>
              </select>
            )}
            <select className="input" style={{ maxWidth: 160 }} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="input" style={{ maxWidth: 140 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {isHr && selected.size > 0 && (
              <button className="btn btn-sm btn-destructive" onClick={() => setShowBulkConfirm(true)}>
                Delete ({selected.size})
              </button>
            )}
          </div>

          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  {isHr && (
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        onChange={toggleSelectAll}
                        style={{ cursor: "pointer" }}
                      />
                    </th>
                  )}
                  <th>Employee</th>
                  <th>Code</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Status</th>
                  <th></th>
                </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isHr ? 8 : 7} className="muted" style={{ textAlign: "center" }}>
                    {employees.length === 0 ? "No employees yet. Add one to get started." : "No employees match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id}>
                    {isHr && (
                      <td style={{ width: 40 }}>
                        <input
                          type="checkbox"
                          checked={selected.has(emp.id)}
                          onChange={() => toggleSelect(emp.id)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                    )}
                    <td>
                      <div>{emp.full_name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{emp.email}</div>
                    </td>
                    <td className="muted">{emp.employee_code}</td>
                    <td><RoleBadge role={emp.role} /></td>
                    <td className="muted">{emp.department ?? "—"}</td>
                    <td className="muted">{emp.designation ?? "—"}</td>
                    <td><span className="badge">{emp.employment_status ?? "—"}</span></td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {isHr && !emp.role && (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ marginRight: 6 }}
                          onClick={() => setLoginModal(emp)}
                        >
                          Create Login
                        </button>
                      )}
                      {isHr && emp.role && (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ marginRight: 6 }}
                          onClick={() => setChangeRoleTarget(emp)}
                        >
                          Change Role
                        </button>
                      )}
                      {isHr && (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ marginRight: 6 }}
                          onClick={() => setAssignManagerTarget(emp)}
                        >
                          Assign Manager
                        </button>
                      )}
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ marginRight: 6 }}
                        onClick={() => navigate(`/employees/${emp.id}`)}
                      >
                        View
                      </button>
                      {isHr && (
                        <button
                          className="btn btn-sm btn-destructive"
                          onClick={() => setTerminateTarget(emp)}
                        >
                          Terminate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

// ------- Role Badge -------

function RoleBadge({ role }: { role: string | null }) {
  if (!role) {
    return <span className="badge" style={{ opacity: 0.6, fontSize: 11 }}>No login</span>;
  }
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    hr_admin: { bg: "hsl(280 60% 94%)", color: "hsl(280 60% 40%)", label: "HR Admin" },
    manager: { bg: "hsl(210 80% 93%)", color: "hsl(210 80% 35%)", label: "Manager" },
    employee: { bg: "hsl(142 60% 93%)", color: "hsl(142 60% 30%)", label: "Employee" },
  };
  const s = styles[role] ?? styles.employee;
  return (
    <span className="badge" style={{ background: s.bg, color: s.color, borderColor: "transparent", fontSize: 12 }}>
      {s.label}
    </span>
  );
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
