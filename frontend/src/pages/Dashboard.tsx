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
  Bell,
  CheckCircle2,
  XCircle,
  Info,
  ChevronRight,
  CalendarClock,
  BellRing,
  Timer,
  Banknote,
} from "lucide-react";
import { dashboardApi } from "../api/dashboard";
import { notificationsApi, type NotificationItem } from "../api/notifications";
import { certificationsApi, type Certification } from "../api/certifications";
import { useAuth } from "../context/AuthContext";
import AsyncState from "../components/AsyncState";
import { StaggerContainer, StaggerItem, FadeIn, PageTransition } from "../components/Motion";
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

/* Upcoming Reminders */
function UpcomingReminders() {
  const [certs, setCerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    certificationsApi
      .list()
      .then((data) => {
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
              <div className="notif-message">{n.message.replace(/\s*\[employee:[a-f0-9-]+\]/i, "")}</div>
            </div>
            <div className="notif-time">{timeAgo(n.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
          <StaggerContainer className="grid grid-cards">
            <StaggerItem><Stat title="Designation" value={data.designation ?? "—"} icon={<Briefcase />} /></StaggerItem>
            <StaggerItem><Stat title="Date of Joining" value={data.date_of_joining ?? "—"} icon={<Calendar />} /></StaggerItem>
            <StaggerItem><Stat title="Current Salary" value={money(data.current_salary)} icon={<DollarSign />} /></StaggerItem>
            <StaggerItem>
              <Stat
                title="Latest Rating"
                value={data.latest_rating ? `${data.latest_rating} / 5` : "—"}
                icon={<Star />}
              />
            </StaggerItem>
          </StaggerContainer>

          <StaggerContainer className="grid grid-cards" delay={0.3}>
            <StaggerItem>
              <Stat title="Reporting To" value={data.manager_name ?? "None"} icon={<Users />} />
            </StaggerItem>
            <StaggerItem>
              <Stat
                title="Certifications"
                value={String(data.certification_count)}
                subtitle="Total"
                icon={<Award />}
                clickable
                to="/certifications"
              />
            </StaggerItem>
            <StaggerItem>
              <Stat
                title="Expiring Soon"
                value={String(data.expiring_soon)}
                subtitle="Within 90 days"
                icon={<AlertTriangle />}
                clickable
                to="/certifications"
              />
            </StaggerItem>
          </StaggerContainer>

          <FadeIn delay={0.5} className="dashboard-columns">
            <UpcomingReminders />
            <RecentNotifications />
          </FadeIn>

          <FadeIn delay={0.7}>
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
          </FadeIn>
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
          <StaggerContainer className="grid grid-cards">
            <StaggerItem><Stat title="Team Members" value={String(data.team_members)} icon={<Users />} /></StaggerItem>
            <StaggerItem><Stat title="Avg Team Rating" value={data.avg_team_rating ?? "—"} icon={<Star />} /></StaggerItem>
            <StaggerItem><Stat title="Cert Expiry Alerts" value={String(data.cert_expiry_alerts)} icon={<AlertTriangle />} /></StaggerItem>
            <StaggerItem><Stat title="Missing Documents" value={String(data.missing_documents)} icon={<FileWarning />} /></StaggerItem>
          </StaggerContainer>

          <StaggerContainer className="grid grid-cards" delay={0.3}>
            <StaggerItem>
              <Stat
                title="Work Anniversaries"
                value={String(data.upcoming_anniversaries)}
                subtitle="Next 30 days"
                icon={<Calendar />}
              />
            </StaggerItem>
          </StaggerContainer>

          <FadeIn delay={0.5} className="dashboard-columns">
            <UpcomingReminders />
            <RecentNotifications />
          </FadeIn>
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
          <StaggerContainer className="grid grid-cards">
            <StaggerItem><Stat title="Total Employees" value={String(data.total_employees)} icon={<Users />} /></StaggerItem>
            <StaggerItem><Stat title="Active Employees" value={String(data.active_employees)} icon={<UserCheck />} /></StaggerItem>
            <StaggerItem><Stat title="New Joiners" value={String(data.new_joiners)} subtitle="Last 90 days" icon={<UserPlus />} /></StaggerItem>
            <StaggerItem><Stat title="Missing Documents" value={String(data.employees_missing_documents)} icon={<FileWarning />} /></StaggerItem>
          </StaggerContainer>

          <StaggerContainer className="grid grid-cards" delay={0.3}>
            <StaggerItem><Stat title="Expired Certs" value={String(data.expired_certifications)} icon={<ShieldAlert />} /></StaggerItem>
            <StaggerItem><Stat title="Pending Verifications" value={String(data.pending_verifications)} icon={<Clock />} /></StaggerItem>
            <StaggerItem><Stat title="Expiring in 30d" value={String(data.certs_expiring_30)} subtitle="Certifications" icon={<Timer />} /></StaggerItem>
            <StaggerItem><Stat title="Expiring in 90d" value={String(data.certs_expiring_90)} subtitle="Certifications" icon={<AlertTriangle />} /></StaggerItem>
          </StaggerContainer>

          <StaggerContainer className="grid grid-cards" delay={0.5}>
            <StaggerItem><Stat title="Recent Salary Revisions" value={String(data.recent_salary_revisions)} subtitle="Last 30 days" icon={<Banknote />} /></StaggerItem>
          </StaggerContainer>

          <FadeIn delay={0.6} className="dashboard-columns">
            <RecentNotifications />
          </FadeIn>
        </div>
      )}
    </AsyncState>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <PageTransition>
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
    </PageTransition>
  );
}
