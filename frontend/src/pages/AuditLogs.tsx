import { useState } from "react";
import { auditApi } from "../api/features";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import { useApi } from "../hooks/useApi";

const ENTITY_TYPES = [
  "",
  "employee",
  "salary",
  "performance",
  "document",
  "certification",
  "permission",
];

export default function AuditLogs() {
  const [entityType, setEntityType] = useState("");
  const { data, loading, error } = useApi(
    () => auditApi.list(entityType || undefined),
    [entityType],
  );
  const logs = data ?? [];

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="System activity log." />
      <div style={{ marginBottom: 16 }}>
        <div className="field" style={{ maxWidth: 240, marginBottom: 0 }}>
          <label>Filter by entity type</label>
          <select
            className="input"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            <option value="">All</option>
            {ENTITY_TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      <AsyncState loading={loading} error={error}>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity Type</th>
                <th>Entity ID</th>
                <th>Changes</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: "center" }}>
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>
                      {log.created_at.slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="muted">{log.actor_id?.slice(0, 8) ?? "—"}</td>
                    <td>{log.action}</td>
                    <td>{log.entity_type}</td>
                    <td className="muted">{log.entity_id?.slice(0, 8) ?? "—"}</td>
                    <td className="muted" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.changes ? JSON.stringify(log.changes) : "—"}
                    </td>
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
