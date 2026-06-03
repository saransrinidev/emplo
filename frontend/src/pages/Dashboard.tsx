import {
  Users,
  UserCheck,
  UserPlus,
  FileWarning,
  ShieldAlert,
  Clock,
  Briefcase,
  Calendar,
  DollarSign,
  Star,
  Award,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import { dashboardApi } from "../api/dashboard";
import { useAuth } from "../auth/AuthContext";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import { useApi } from "../hooks/useApi";

interface StatProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

function Stat({ title, value, icon }: StatProps) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-label">{title}</div>
        <div className="stat-value">{value}</div>
        <div className="stat-accent" />
      </div>
    </div>
  );
}

function money(value: string | null): string {
  if (!value) return "—";
  const n = Number(value);
  return Number.isNaN(n) ? value : `₹${n.toLocaleString()}`;
}

function EmployeeDashboard() {
  const { data, loading, error } = useApi(
    () => dashboardApi.employee(),
    [],
    "dashboard:employee",
  );
  return (
    <AsyncState loading={loading} error={error}>
      {data && (
        <div className="dashboard-grid">
          <div className="grid grid-cards">
            <Stat
              title="Designation"
              value={data.designation ?? "—"}
              icon={<Briefcase />}
            />
            <Stat
              title="Date of Joining"
              value={data.date_of_joining ?? "—"}
              icon={<Calendar />}
            />
            <Stat
              title="Current Salary"
              value={money(data.current_salary)}
              icon={<DollarSign />}
            />
            <Stat
              title="Latest Rating"
              value={data.latest_rating ? `${data.latest_rating} / 5` : "—"}
              icon={<Star />}
            />
          </div>
          <div className="grid grid-cards">
            <Stat
              title="Certifications"
              value={String(data.certification_count)}
              icon={<Award />}
            />
            <Stat
              title="Expiring Soon"
              value={String(data.expiring_soon)}
              icon={<AlertTriangle />}
            />
          </div>
        </div>
      )}
    </AsyncState>
  );
}

function ManagerDashboard() {
  const { data, loading, error } = useApi(
    () => dashboardApi.manager(),
    [],
    "dashboard:manager",
  );
  return (
    <AsyncState loading={loading} error={error}>
      {data && (
        <div className="dashboard-grid">
          <div className="grid grid-cards">
            <Stat
              title="Team Members"
              value={String(data.team_members)}
              icon={<Users />}
            />
            <Stat
              title="Avg Team Rating"
              value={data.avg_team_rating ?? "—"}
              icon={<Star />}
            />
            <Stat
              title="Cert Expiry Alerts"
              value={String(data.cert_expiry_alerts)}
              icon={<AlertTriangle />}
            />
            <Stat
              title="Missing Documents"
              value={String(data.missing_documents)}
              icon={<FileWarning />}
            />
          </div>
        </div>
      )}
    </AsyncState>
  );
}

function HrDashboard() {
  const { data, loading, error } = useApi(
    () => dashboardApi.hr(),
    [],
    "dashboard:hr",
  );
  return (
    <AsyncState loading={loading} error={error}>
      {data && (
        <div className="dashboard-grid">
          <div className="grid grid-cards">
            <Stat
              title="Total Employees"
              value={String(data.total_employees)}
              icon={<Users />}
            />
            <Stat
              title="Active Employees"
              value={String(data.active_employees)}
              icon={<UserCheck />}
            />
            <Stat
              title="New Joiners"
              value={String(data.new_joiners)}
              icon={<UserPlus />}
            />
            <Stat
              title="Missing Documents"
              value={String(data.employees_missing_documents)}
              icon={<FileWarning />}
            />
          </div>
          <div className="grid grid-cards">
            <Stat
              title="Expired Certifications"
              value={String(data.expired_certifications)}
              icon={<ShieldAlert />}
            />
            <Stat
              title="Pending Verifications"
              value={String(data.pending_verifications)}
              icon={<Clock />}
            />
          </div>
          <div className="dashboard-empty">
            <ClipboardList className="dashboard-empty-icon" />
            <h3>Stay informed, stay ahead</h3>
            <p>
              Your dashboard provides a quick summary of key HR insights and tasks that
              matter.
            </p>
          </div>
        </div>
      )}
    </AsyncState>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="dashboard-page">
      <PageHeader
        title={`Welcome back, ${user.name}`}
        subtitle="Here's an overview of your portal."
      />
      {user.role === "employee" && <EmployeeDashboard />}
      {user.role === "manager" && <ManagerDashboard />}
      {user.role === "hr_admin" && <HrDashboard />}
    </div>
  );
}
