import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { documents } from "../api/mockData";

export default function Documents() {
  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Educational documents and certificates."
        actions={<button className="btn btn-sm">Upload document</button>}
      />
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Uploaded</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.name}</td>
                <td className="muted">{doc.type}</td>
                <td className="muted">{doc.uploaded}</td>
                <td>
                  <StatusBadge status={doc.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
