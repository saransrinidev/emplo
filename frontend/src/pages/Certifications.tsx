import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { certifications } from "../api/mockData";

export default function Certifications() {
  return (
    <div>
      <PageHeader
        title="Certifications"
        subtitle="Technical and professional certifications."
        actions={<button className="btn btn-sm">Add certification</button>}
      />
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Certificate</th>
              <th>Number</th>
              <th>Issued</th>
              <th>Expiry</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {certifications.map((cert) => (
              <tr key={cert.id}>
                <td>{cert.name}</td>
                <td className="muted">{cert.number}</td>
                <td className="muted">{cert.issued}</td>
                <td className="muted">{cert.expiry ?? "—"}</td>
                <td>
                  <StatusBadge status={cert.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
