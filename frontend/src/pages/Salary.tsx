import { salaryApi } from "../api/salary";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import { useApi } from "../hooks/useApi";

function money(value: string | null): string {
  if (value === null) return "—";
  const n = Number(value);
  return Number.isNaN(n) ? value : `$${n.toLocaleString()}`;
}

export default function Salary() {
  const current = useApi(() => salaryApi.current());
  const history = useApi(() => salaryApi.history());

  const loading = current.loading || history.loading;
  const error = current.error || history.error;
  const rows = history.data ?? [];

  return (
    <div>
      <PageHeader title="Salary" subtitle="Your salary revision history." />
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
          </div>
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
    </div>
  );
}
