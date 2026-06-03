import { useEffect, useState } from "react";
import { employeesApi, type Employee } from "../api/employees";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import PageHeader from "../components/PageHeader";

export default function Employees() {
  const { user } = useAuth();
  const isHr = user?.role === "hr_admin";

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    employeesApi
      .list()
      .then((data) => {
        if (active) setEmployees(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.message : "Failed to load employees.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <PageHeader
        title={isHr ? "Employees" : "My Team"}
        subtitle={
          isHr ? "All employee records." : "Employees who report directly to you."
        }
        actions={isHr ? <button className="btn btn-sm">Add employee</button> : undefined}
      />

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
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted" style={{ textAlign: "center" }}>
                    No employees yet. Add one to get started.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.full_name}</td>
                    <td className="muted">{emp.employee_code}</td>
                    <td className="muted">{emp.department ?? "—"}</td>
                    <td className="muted">{emp.designation ?? "—"}</td>
                    <td>
                      <span className="badge">{emp.employment_status ?? "—"}</span>
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
