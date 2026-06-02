import PageHeader from "../components/PageHeader";
import { profile } from "../api/mockData";

function Section({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="card">
      <h2 style={{ marginBottom: 16 }}>{title}</h2>
      <div className="detail-grid">
        {rows.map(([label, value]) => (
          <div key={label} className="detail-item">
            <div className="detail-label">{label}</div>
            <div className="detail-value">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Profile() {
  return (
    <div>
      <PageHeader title="Profile" subtitle="Your personal and employment details." />
      <div className="stack">
        <Section
          title="Personal Information"
          rows={[
            ["Employee ID", profile.employeeCode],
            ["Full Name", profile.fullName],
            ["Email", profile.email],
            ["Mobile", profile.mobile],
            ["Date of Birth", profile.dateOfBirth],
            ["Gender", profile.gender],
            ["Marital Status", profile.maritalStatus],
          ]}
        />
        <Section
          title="Employment Information"
          rows={[
            ["Date of Joining", profile.dateOfJoining],
            ["Department", profile.department],
            ["Designation", profile.designation],
            ["Manager", profile.manager],
            ["Employment Status", profile.employmentStatus],
            ["Work Location", profile.workLocation],
          ]}
        />
        <Section
          title="Address & Emergency Contact"
          rows={[
            ["Current Address", profile.currentAddress],
            ["Permanent Address", profile.permanentAddress],
            ["Emergency Contact", profile.emergencyContact.name],
            ["Relationship", profile.emergencyContact.relationship],
            ["Contact Number", profile.emergencyContact.number],
          ]}
        />
      </div>
    </div>
  );
}
