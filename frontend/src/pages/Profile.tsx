import { profileApi, type Address } from "../api/profile";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import { useApi } from "../hooks/useApi";

function Section({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="card">
      <h2 style={{ marginBottom: 16 }}>{title}</h2>
      <div className="detail-grid">
        {rows.map(([label, value]) => (
          <div key={label} className="detail-item">
            <div className="detail-label">{label}</div>
            <div className="detail-value">{value || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatAddress(a: Address | undefined): string {
  if (!a) return "—";
  return [a.address_line, a.city, a.state, a.postal_code, a.country]
    .filter(Boolean)
    .join(", ");
}

export default function Profile() {
  const { data: profile, loading, error } = useApi(() => profileApi.get());

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your personal and employment details." />
      <AsyncState loading={loading} error={error}>
        {profile && (
          <div className="stack">
            <Section
              title="Personal Information"
              rows={[
                ["Employee ID", profile.employee_code],
                ["Full Name", profile.full_name],
                ["Email", profile.email],
                ["Mobile", profile.mobile_number ?? ""],
                ["Date of Birth", profile.date_of_birth ?? ""],
                ["Gender", profile.gender ?? ""],
                ["Marital Status", profile.marital_status ?? ""],
              ]}
            />
            <Section
              title="Employment Information"
              rows={[
                ["Date of Joining", profile.date_of_joining ?? ""],
                ["Department", profile.department ?? ""],
                ["Designation", profile.designation ?? ""],
                ["Manager", profile.manager_name ?? ""],
                ["Employment Status", profile.employment_status ?? ""],
                ["Work Location", profile.work_location ?? ""],
              ]}
            />
            <Section
              title="Address & Emergency Contact"
              rows={[
                [
                  "Current Address",
                  formatAddress(
                    profile.addresses.find((a) => a.address_type === "current"),
                  ),
                ],
                [
                  "Permanent Address",
                  formatAddress(
                    profile.addresses.find((a) => a.address_type === "permanent"),
                  ),
                ],
                [
                  "Emergency Contact",
                  profile.emergency_contacts[0]?.contact_name ?? "",
                ],
                [
                  "Relationship",
                  profile.emergency_contacts[0]?.relationship_to ?? "",
                ],
                [
                  "Contact Number",
                  profile.emergency_contacts[0]?.contact_number ?? "",
                ],
              ]}
            />
          </div>
        )}
      </AsyncState>
    </div>
  );
}
