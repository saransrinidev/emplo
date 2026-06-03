import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { employeesApi, type Employee, type EmployeeCreate } from "../api/employees";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
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
};

export default function Employees() {
  const { user } = useAuth();
  const isHr = user?.role === "hr_admin";
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const loadEmployees = () => {
    setLoading(true);
    employeesApi
      .list()
      .then(setEmployees)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load."),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleAdded = (emp: Employee) => {
    setEmployees((prev) => [emp, ...prev]);
    setShowForm(false);
  };

  return (
    <div>
      <PageHeader
        title={isHr ? "Employees" : "My Team"}
        subtitle={
          isHr ? "All employee records." : "Employees who report directly to you."
        }
        actions={
          isHr ? (
            <button className="btn btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "Add employee"}
            </button>
          ) : undefined
        }
      />

      {showForm && <AddEmployeeForm onSuccess={handleAdded} employees={employees} />}

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Code</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Location</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: "center" }}>
                    No employees yet. Add one to get started.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div>{emp.full_name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{emp.email}</div>
                    </td>
                    <td className="muted">{emp.employee_code}</td>
                    <td className="muted">{emp.department ?? "—"}</td>
                    <td className="muted">{emp.designation ?? "—"}</td>
                    <td className="muted">{emp.work_location ?? "—"}</td>
                    <td>
                      <span className="badge">{emp.employment_status ?? "—"}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/employees/${emp.id}`)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ------- Add Employee Form -------

interface FormProps {
  onSuccess: (emp: Employee) => void;
  employees: Employee[];
}

function AddEmployeeForm({ onSuccess, employees }: FormProps) {
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
      // Clean empty strings to undefined so the backend doesn't store them.
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
    <form className="card" style={{ marginBottom: 24 }} onSubmit={handleSubmit}>
      <h2 style={{ marginBottom: 16 }}>Add New Employee</h2>
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
      </div>
      {error && <p className="error-text" style={{ marginTop: 12 }}>{error}</p>}
      <div style={{ marginTop: 16 }}>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add Employee"}
        </button>
      </div>
    </form>
  );
}

// ------- Form field components -------

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
