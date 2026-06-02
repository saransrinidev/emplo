import PageHeader from "../components/PageHeader";
import { salaryHistory } from "../api/mockData";

export default function Salary() {
  // "Current salary" is the latest revision — matches the requirement that
  // only the latest approved salary is shown as current.
  const current = salaryHistory[0];

  return (
    <div>
      <PageHeader title="Salary" subtitle="Your salary revision history." />

      <div className="grid grid-cards" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">Current Salary</div>
          <div className="card-value">${current.revised.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="card-title">Latest Revision</div>
          <div className="card-value">{current.effectiveDate}</div>
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
            {salaryHistory.map((row) => (
              <tr key={row.id}>
                <td>{row.effectiveDate}</td>
                <td className="muted">
                  {row.previous ? `$${row.previous.toLocaleString()}` : "—"}
                </td>
                <td>${row.revised.toLocaleString()}</td>
                <td className="muted">{row.percentage ? `+${row.percentage}%` : "—"}</td>
                <td className="muted">{row.comments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
