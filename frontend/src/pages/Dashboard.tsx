import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  ArrowRight,
  FileText,
  Bell,
  CheckCircle2,
  XCircle,
  Info,
  UserPlus2,
  FolderOpen,
  BarChart3,
  ChevronRight,
  User,
  CalendarClock,
  BellRing,
} from "lucide-react";
import { dashboardApi } from "../api/dashboard";
import {
  notificationsApi,
  certificationsApi,
  type NotificationItem,
  type Certification,
} from "../api/features";
import { useAuth } from "../auth/AuthContext";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import { useApi } from "../hooks/useApi";

interface StatProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
  clickable?: boolean;
  to?: string;
}

function Stat({ title, value, icon, subtitle, clickable, to }: StatProps) {
  const content = (
    <div className={`stat-card ${clickable ? "stat-card-clickable" : ""}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-label">{title}</div>
        <div className="stat-value">{value}</div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
        <div className="stat-accent" />
      </div>
      {clickable && <ChevronRight size={18} className="stat-chevron" />}
    </div>
  );
  if (to) return <Link to={to} style={{ textDecoration: "none" }}>{content}</Link>;
  return content;
}

function money(value: string | null): string {
  if (!value) return "—";
  const n = Number(value);
  return Number.isNaN(n) ? value : `₹${n.toLocaleString()}`;
}

/* Quick Link card (grid style) */
interface QuickLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}

function QuickLink({ to, icon, label, description }: QuickLinkProps) {
  return (
    <Link to={to} className="quick-link-card">
      <div className="quick-link-icon">{icon}</div>
      <div className="quick-link-text">
        <div className="quick-link-label">{label}</div>
        <div className="quick-link-desc">{description}</div>
      </div>
      <ChevronRight size={16} className="quick-link-arrow" />
    </Link>
  );
}

/* Quick action card (list style) */
interface QuickActionProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}

function QuickAction({ to, icon, label, description }: QuickActionProps) {
  return (
    <Link to={to} className="quick-action">
      <div className="quick-action-icon">{icon}</div>
      <div className="quick-action-content">
        <div className="quick-action-label">{label}</div>
        <div className="quick-action-desc">{description}</div>
      </div>
      <ArrowRight size={16} className="quick-action-arrow" />
    </Link>
  );
}

/* Upcoming Reminders */
function UpcomingReminders() {
  const [certs, setCerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    certificationsApi
      .list()
      .then((data) => {
        // Show certs with expiry dates, sorted by nearest
        const withExpiry = data
          .filter((c) => c.expiry_date)
          .sort(
            (a, b) =>
              new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime(),
          )
          .slice(0, 4);
        setCerts(withExpiry);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function daysUntil(dateStr: string): string {
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return "Expired";
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `Expires in ${days} days`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }

  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h3 className="panel-title">
          <CalendarClock size={18} />
          Upcoming Reminders
        </h3>
        <Link to="/certifications" className="panel-link">
          View all
        </Link>
      </div>
      <div className="panel-body">
        {loading && <p className="muted" style={{ padding: 16 }}>Loading...</p>}
        {!loading && certs.length === 0 && (
          <div className="panel-empty">
            <CalendarClock size={24} />
            <p>No upcoming reminders</p>
          </div>
        )}
        {certs.map((cert) => (
          <div key={cert.id} className="reminder-item">
            <div className="reminder-dot" />
            <div className="reminder-content">
              <div className="reminder-title">{cert.certificate_name}</div>
              <div className="reminder-sub">{daysUntil(cert.expiry_date!)}</div>
            </div>
            <div className="reminder-date">{formatDate(cert.expiry_date!)}</div>
          </div>
        ))}
        {!loading && certs.length > 0 && (
          <Link to="/certifications" className="panel-footer-link">
            View all reminders
          </Link>
        )}
      </div>
    </div>
  );
}

/* Recent notifications panel */
function RecentNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsApi
      .list()
      .then((data) => setNotifications(data.slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function getIcon(title: string) {
    const lower = title.toLowerCase();
    if (lower.includes("approved") || lower.includes("verified"))
      return <CheckCircle2 size={16} className="notif-icon notif-icon-success" />;
    if (lower.includes("rejected") || lower.includes("expired"))
      return <XCircle size={16} className="notif-icon notif-icon-danger" />;
    return <Info size={16} className="notif-icon notif-icon-info" />;
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h3 className="panel-title">
          <Bell size={18} />
          Recent Activity
        </h3>
        <Link to="/notifications" className="panel-link">
          View all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="panel-body">
        {loading && <p className="muted" style={{ padding: 16 }}>Loading...</p>}
        {!loading && notifications.length === 0 && (
          <div className="panel-empty">
            <Bell size={24} />
            <p>No recent activity</p>
          </div>
        )}
        {notifications.map((n) => (
          <div key={n.id} className={`notif-item ${n.is_read ? "" : "notif-unread"}`}>
            {getIcon(n.title)}
            <div className="notif-content">
              <div className="notif-title">{n.title}</div>
              <div className="notif-message">{n.message}</div>
            </div>
            <div className="notif-time">{timeAgo(n.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Greeting based on time of day - currently unused but available */

function todayFormatted(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

/* Employee Dashboard */
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
          {/* Top stat cards row */}
          <div className="grid grid-cards">
            <Stat title="Designation" value={data.designation ?? "—"} icon={<Briefcase />} />
            <Stat title="Date of Joining" value={data.date_of_joining ?? "—"} icon={<Calendar />} />
            <Stat title="Current Salary" value={money(data.current_salary)} icon={<DollarSign />} />
            <Stat
              title="Latest Rating"
              value={data.latest_rating ? `${data.latest_rating} / 5` : "—"}
              icon={<Star />}
            />
          </div>

          {/* Second row — clickable summary cards */}
          <div className="grid grid-cards">
            <Stat
              title="Certifications"
              value={String(data.certification_count)}
              subtitle="Total"
              icon={<Award />}
              clickable
              to="/certifications"
            />
            <Stat
              title="Expiring Soon"
              value={String(data.expiring_soon)}
              subtitle="Needs Attention"
              icon={<AlertTriangle />}
              clickable
              to="/certifications"
            />
          </div>

          {/* Two column: Reminders + Quick Links */}
          <div className="dashboard-columns">
            <UpcomingReminders />

            <div className="dashboard-panel">
              <div className="panel-header">
                <h3 className="panel-title">
                  <Star size={18} />
                  Quick Links
                </h3>
              </div>
              <div className="panel-body">
                <div className="quick-links-grid">
                  <QuickLink
                    to="/profile"
                    icon={<User size={20} />}
                    label="My Profile"
                    description="View and update your profile"
                  />
                  <QuickLink
                    to="/documents"
                    icon={<FileText size={20} />}
                    label="My Documents"
                    description="Upload and manage documents"
                  />
                  <QuickLink
                    to="/certifications"
                    icon={<Award size={20} />}
                    label="My Certifications"
                    description="View your certifications"
                  />
                  <QuickLink
                    to="/salary"
                    icon={<DollarSign size={20} />}
                    label="Salary Details"
                    description="View salary and payslips"
                  />
                </div>
                <Link to="/performance" className="panel-footer-link">
                  Explore all features
                </Link>
              </div>
            </div>
          </div>

          {/* Stay Informed Banner */}
          <div className="info-banner">
            <div className="info-banner-icon">
              <BellRing size={32} />
            </div>
            <div className="info-banner-content">
              <h4>Stay Informed</h4>
              <p>
                Enable notifications to stay updated on important announcements,
                policy changes, and deadlines.
              </p>
            </div>
            <Link to="/notifications" className="btn info-banner-btn">
              Enable Notifications
            </Link>
          </div>
        </div>
      )}
    </AsyncState>
  );
}

/* Manager Dashboard */
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
            <Stat title="Team Members" value={String(data.team_members)} icon={<Users />} />
            <Stat title="Avg Team Rating" value={data.avg_team_rating ?? "—"} icon={<Star />} />
            <Stat title="Cert Expiry Alerts" value={String(data.cert_expiry_alerts)} icon={<AlertTriangle />} />
            <Stat title="Missing Documents" value={String(data.missing_documents)} icon={<FileWarning />} />
          </div>

          <div className="dashboard-columns">
            <div className="dashboard-panel">
              <div className="panel-header">
                <h3 className="panel-title">Quick Actions</h3>
              </div>
              <div className="panel-body panel-actions">
                <QuickAction
                  to="/employees"
                  icon={<Users size={20} />}
                  label="View Team"
                  description="See all team members"
                />
                <QuickAction
                  to="/performance"
                  icon={<BarChart3 size={20} />}
                  label="Performance Reviews"
                  description="Review team performance"
                />
                <QuickAction
                  to="/documents"
                  icon={<FolderOpen size={20} />}
                  label="Documents"
                  description="Check team documents"
                />
                <QuickAction
                  to="/certifications"
                  icon={<Award size={20} />}
                  label="Certifications"
                  description="Monitor cert expiries"
                />
              </div>
            </div>
            <RecentNotifications />
          </div>
        </div>
      )}
    </AsyncState>
  );
}

/* HR Dashboard */
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
            <Stat title="Total Employees" value={String(data.total_employees)} icon={<Users />} />
            <Stat title="Active Employees" value={String(data.active_employees)} icon={<UserCheck />} />
            <Stat title="New Joiners" value={String(data.new_joiners)} icon={<UserPlus />} />
            <Stat title="Missing Documents" value={String(data.employees_missing_documents)} icon={<FileWarning />} />
          </div>
          <div className="grid grid-cards">
            <Stat title="Expired Certifications" value={String(data.expired_certifications)} icon={<ShieldAlert />} />
            <Stat title="Pending Verifications" value={String(data.pending_verifications)} icon={<Clock />} />
          </div>

          <div className="dashboard-columns">
            <div className="dashboard-panel">
              <div className="panel-header">
                <h3 className="panel-title">Quick Actions</h3>
              </div>
              <div className="panel-body panel-actions">
                <QuickAction
                  to="/employees"
                  icon={<UserPlus2 size={20} />}
                  label="Manage Employees"
                  description="Add or edit employee records"
                />
                <QuickAction
                  to="/documents"
                  icon={<FileText size={20} />}
                  label="Verify Documents"
                  description="Review pending uploads"
                />
                <QuickAction
                  to="/certifications"
                  icon={<Award size={20} />}
                  label="Certifications"
                  description="Track and verify certs"
                />
                <QuickAction
                  to="/org-chart"
                  icon={<Users size={20} />}
                  label="Org Chart"
                  description="View organization structure"
                />
                <QuickAction
                  to="/audit-logs"
                  icon={<ShieldAlert size={20} />}
                  label="Audit Logs"
                  description="Review system activity"
                />
                <QuickAction
                  to="/salary"
                  icon={<DollarSign size={20} />}
                  label="Salary Management"
                  description="Manage salary revisions"
                />
              </div>
            </div>
            <RecentNotifications />
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
        title={`Welcome back, ${user.name} 👋`}
        subtitle="Here's an overview of your portal."
        actions={<span className="muted" style={{ fontSize: 13 }}>{todayFormatted()}</span>}
      />
      {user.role === "employee" && <EmployeeDashboard />}
      {user.role === "manager" && <ManagerDashboard />}
      {user.role === "hr_admin" && <HrDashboard />}
    </div>
  );
}
