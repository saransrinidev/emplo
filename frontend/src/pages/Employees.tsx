import PageHeader from "../components/PageHeader";
import { useAuth } from "../auth/AuthContext";
import { teamMembers } from "../api/mockData";

export default function Employees() {
  const { user } = useAuth();
  const isHr = user?.role === "hr_admin";

  return (
    <div>
      <PageHeader
        title={isHr ? "Employees" : "My Team"}
        subtitle={
          isHr
            ? "All employee records."
            : "Employees who report directly to you."
        }
        actions={isHr ? <button className="btn btn-sm">Add employee</button> : undefined}
      />
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Designation</th>
              <th>Latest Rating</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member) => (
              <tr key={member.id}>
                <td>{member.name}</td>
                <td className="muted">{member.designation}</td>
                <td>{member.rating}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-outline btn-sm">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
