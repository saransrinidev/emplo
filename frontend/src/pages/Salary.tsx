import { DollarSign, Calendar, TrendingUp, History } from "lucide-react";
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

  // Calculate percentage increase if available
  const latestRevision = rows[0]; // history is usually sorted latest first
  const trendPercent = latestRevision?.revision_percentage;

  return (
    <div>
      <PageHeader title="Salary" subtitle="Your salary revision history." />
      <AsyncState loading={loading} error={error}>
        
        {/* Salary Stats Row */}
        <div className="salary-stats-row">
          <div className="salary-stat-card">
            <div className="docs-stat-icon" style={{ background: "hsl(var(--primary-light) / 0.15)", color: "var(--primary-color)" }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div className="docs-stat-val">{money(current.data?.current_salary ?? null)}</div>
              <div className="docs-stat-lbl">Current Base Salary</div>
            </div>
            {trendPercent && (
              <span className="salary-trend-badge">+{trendPercent}%</span>
            )}
          </div>

          <div className="salary-stat-card">
            <div className="docs-stat-icon" style={{ background: "hsl(142 60% 93%)", color: "hsl(142 71% 45%)" }}>
              <Calendar size={20} />
            </div>
            <div>
              <div className="docs-stat-val">{current.data?.latest_revision_date ?? "—"}</div>
              <div className="docs-stat-lbl">Latest Revision Date</div>
            </div>
          </div>

          <div className="salary-stat-card">
            <div className="docs-stat-icon" style={{ background: "hsl(45 90% 93%)", color: "hsl(45 90% 40%)" }}>
              <History size={20} />
            </div>
            <div>
              <div className="docs-stat-val">{rows.length}</div>
              <div className="docs-stat-lbl">Total Revisions</div>
            </div>
          </div>
        </div>

        {/* Visual Timeline Section */}
        {rows.length > 0 && (
          <div className="salary-timeline-container">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={18} style={{ color: "var(--primary-color)" }} />
              Revision Journey
            </h2>
            <div className="salary-timeline">
              {rows.map((row, index) => {
                const percent = row.revision_percentage;
                return (
                  <div key={row.id} className={`salary-timeline-item ${index === 0 ? "salary-timeline-item-active" : ""}`}>
                    <div className="salary-timeline-icon">
                      <DollarSign size={11} />
                    </div>
                    <div className="salary-timeline-content">
                      <div>
                        <span className="salary-timeline-title">
                          Revised to {money(row.revised_salary)}
                        </span>
                        {percent && (
                          <span style={{
                            marginLeft: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            color: "hsl(142 76% 36%)",
                            background: "hsl(142 76% 96%)",
                            padding: "2px 6px",
                            borderRadius: 6
                          }}>
                            +{percent}%
                          </span>
                        )}
                        <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 }}>
                          {row.comments ? `"${row.comments}"` : "Regular salary adjustment."}
                        </div>
                      </div>
                      <div className="salary-timeline-date">
                        Effective {row.effective_date}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* History Table */}
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Revision Ledger</h2>
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Effective Date</th>
                  <th>Previous Salary</th>
                  <th>Revised Salary</th>
                  <th>Change (%)</th>
                  <th>Comments / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted" style={{ textAlign: "center", padding: 24 }}>
                      No salary history ledger found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 600 }}>{row.effective_date}</td>
                      <td className="muted">{money(row.previous_salary)}</td>
                      <td style={{ fontWeight: 700, color: "var(--text)" }}>{money(row.revised_salary)}</td>
                      <td>
                        {row.revision_percentage ? (
                          <span style={{ color: "hsl(142 71% 40%)", fontWeight: 600 }}>
                            +{row.revision_percentage}%
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="muted" style={{ fontSize: 13 }}>{row.comments ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </AsyncState>
    </div>
  );
}
