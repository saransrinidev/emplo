import PageHeader from "../components/PageHeader";
import { useAuth } from "../auth/AuthContext";
import {
  certifications,
  profile,
  reviews,
  salaryHistory,
  teamMembers,
} from "../api/mockData";

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

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-value">{value}</div>
    </div>
  );
}

function EmployeeDashboard() {
  const currentSalary = salaryHistory[0];
  const latestReview = reviews[0];
  return (
    <div className="grid grid-cards">
      <Stat title="Designation" value={profile.designation} />
      <Stat title="Date of Joining" value={profile.dateOfJoining} />
      <Stat
        title="Current Salary"
        value={`$${currentSalary.revised.toLocaleString()}`}
      />
      <Stat title="Latest Rating" value={latestReview.rating} />
      <Stat title="Certifications" value={String(certifications.length)} />
      <Stat title="Expiring Soon" value="1" />
    </div>
  );
}

function ManagerDashboard() {
  return (
    <div className="grid grid-cards">
      <Stat title="Team Members" value={String(teamMembers.length)} />
      <Stat title="Avg Team Rating" value="4.1 / 5" />
      <Stat title="Cert Expiry Alerts" value="2" />
      <Stat title="Missing Documents" value="1" />
      <Stat title="Work Anniversaries" value="1" />
    </div>
  );
}

function HrDashboard() {
  return (
    <div className="grid grid-cards">
      <Stat title="Total Employees" value="128" />
      <Stat title="Active Employees" value="121" />
      <Stat title="New Joiners" value="4" />
      <Stat title="Missing Documents" value="9" />
      <Stat title="Expired Certifications" value="6" />
      <Stat title="Pending Verifications" value="11" />
    </div>
  );
}
