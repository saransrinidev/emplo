import { dashboardApi } from "../api/dashboard";
import { useAuth } from "../auth/AuthContext";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import { useApi } from "../hooks/useApi";

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-value">{value}</div>
    </div>
  );
}

function money(value: string | null): string {
  if (!value) return "—";
  const n = Number(value);
  return Number.isNaN(n) ? value : `$${n.toLocaleString()}`;
}

function EmployeeDashboard() {
  const { data, loading, error } = useApi(() => dashboardApi.employee());
  return (
    <AsyncState loading={loading} error={error}>
      {data && (
        <div className="grid grid-cards">
          <Stat title="Designation" value={data.designation ?? "—"} />
          <Stat title="Date of Joining" value={data.date_of_joining ?? "—"} />
          <Stat title="Current Salary" value={money(data.current_salary)} />
          <Stat
            title="Latest Rating"
            value={data.latest_rating ? `${data.latest_rating} / 5` : "—"}
          />
          <Stat title="Certifications" value={String(data.certification_count)} />
          <Stat title="Expiring Soon" value={String(data.expiring_soon)} />
        </div>
      )}
    </AsyncState>
  );
}

function ManagerDashboard() {
  const { data, loading, error } = useApi(() => dashboardApi.manager());
  return (
    <AsyncState loading={loading} error={error}>
      {data && (
        <div className="grid grid-cards">
          <Stat title="Team Members" value={String(data.team_members)} />
          <Stat title="Avg Team Rating" value={data.avg_team_rating ?? "—"} />
          <Stat title="Cert Expiry Alerts" value={String(data.cert_expiry_alerts)} />
          <Stat title="Missing Documents" value={String(data.missing_documents)} />
        </div>
      )}
    </AsyncState>
  );
}

function HrDashboard() {
  const { data, loading, error } = useApi(() => dashboardApi.hr());
  return (
    <AsyncState loading={loading} error={error}>
      {data && (
        <div className="grid grid-cards">
          <Stat title="Total Employees" value={String(data.total_employees)} />
          <Stat title="Active Employees" value={String(data.active_employees)} />
          <Stat title="New Joiners" value={String(data.new_joiners)} />
          <Stat
            title="Missing Documents"
            value={String(data.employees_missing_documents)}
          />
          <Stat
            title="Expired Certifications"
            value={String(data.expired_certifications)}
          />
          <Stat
            title="Pending Verifications"
            value={String(data.pending_verifications)}
          />
        </div>
      )}
    </AsyncState>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.name}`}
        subtitle="Here's an overview of your portal."
      />
      {user.role === "employee" && <EmployeeDashboard />}
      {user.role === "manager" && <ManagerDashboard />}
      {user.role === "hr_admin" && <HrDashboard />}
    </div>
  );
}
