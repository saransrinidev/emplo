import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  LogIn,
  LogOut,
} from "lucide-react";
import { dashboardApi } from "../api/dashboard";
import { notificationsApi, type NotificationItem } from "../api/notifications";
import { certificationsApi, type Certification } from "../api/certifications";
import { useAuth } from "../context/AuthContext";
import AsyncState from "../components/AsyncState";
import { StaggerContainer, StaggerItem, FadeIn, PageTransition } from "../components/Motion";
import { useApi } from "../hooks/useApi";

interface StatProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
  description?: string;
  clickable?: boolean;
  to?: string;
  variant?: "indigo" | "green" | "blue" | "amber" | "rose" | "orange" | "pink" | "yellow";
  bgClass?: string;
}

function Stat({ title, value, icon, subtitle, description, clickable, to, variant = "indigo", bgClass }: StatProps) {
  const content = (
    <div className={`stat-card-new stat-variant-${variant} ${bgClass || ""} ${clickable ? "stat-card-new-clickable" : ""}`}>
      <div className="stat-icon-wrapper">{icon}</div>
      <div className="stat-info-container">
        <div className="stat-label-row">
          <span className="stat-label-new">{title}</span>
          {subtitle && <span className="stat-badge-new">{subtitle}</span>}
        </div>
        <div className="stat-value-row">
          <span className="stat-value-new">{value}</span>
        </div>
        {description && <span className="stat-subtitle-new">{description}</span>}
      </div>
      {clickable && <ChevronRight size={18} className="stat-chevron-new" />}
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
      .catch(() => { })
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
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  function getAccent(title: string): { color: string; icon: React.ReactNode } {
    const lower = title.toLowerCase();
    if (lower.includes("approved") || lower.includes("verified") || lower.includes("confirmed"))
      return { color: "hsl(var(--success))", icon: <CheckCircle2 size={16} /> };
    if (lower.includes("rejected") || lower.includes("expired") || lower.includes("reverted"))
      return { color: "hsl(var(--destructive))", icon: <XCircle size={16} /> };
    if (lower.includes("submitted") || lower.includes("request") || lower.includes("forwarded"))
      return { color: "hsl(var(--warning, 45 93% 47%))", icon: <Clock size={16} /> };
    return { color: "var(--primary-color)", icon: <Bell size={16} /> };
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
        {!loading && notifications.length > 0 && (
          <div className="activity-timeline">
            {notifications.map((n, idx) => {
              const { color, icon } = getAccent(n.title);
              const cleanMsg = n.message.replace(/\s*\[employee:[a-f0-9-]+\]/i, "");
              return (
                <div key={n.id} className={`activity-item ${!n.is_read ? "activity-unread" : ""}`}>
                  <div className="activity-indicator">
                    <div className="activity-dot" style={{ background: color, boxShadow: `0 0 0 3px ${color}20` }}>
                      {icon}
                    </div>
                    {idx < notifications.length - 1 && <div className="activity-line" />}
                  </div>
                  <div className="activity-content">
                    <div className="activity-header">
                      <span className="activity-title">{n.title}</span>
                      <span className="activity-time">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="activity-message">{cleanMsg}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
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
        <>
          <WelcomeBanner taskCount={data.expiring_soon} />
          <div className="dashboard-grid">
            <StaggerContainer className="grid grid-cards">
              <StaggerItem><Stat title="Designation" value={data.designation ?? "—"} icon={<Briefcase />} variant="indigo" bgClass="bg-briefcase" description="Your current role" /></StaggerItem>
              <StaggerItem><Stat title="Date of Joining" value={data.date_of_joining ?? "—"} icon={<Calendar />} variant="blue" bgClass="bg-calendar" description="When you joined the company" /></StaggerItem>
              <StaggerItem><Stat title="Current Salary" value={money(data.current_salary)} icon={<DollarSign />} variant="green" bgClass="bg-salary" description="Your current compensation" /></StaggerItem>
              <StaggerItem><Stat title="Latest Rating" value={data.latest_rating ? `${data.latest_rating} / 5` : "—"} icon={<Star />} variant="yellow" bgClass="bg-star" description="From your last performance review" /></StaggerItem>
              <StaggerItem><Stat title="Reporting To" value={data.manager_name ?? "None"} icon={<Users />} variant="indigo" bgClass="bg-users" description="Your manager" /></StaggerItem>
              <StaggerItem><Stat title="Certifications" value={String(data.certification_count)} subtitle="Total" icon={<Award />} clickable to="/certifications" variant="pink" bgClass="bg-award" description="Total certificates earned" /></StaggerItem>
              <StaggerItem><Stat title="Expiring Soon" value={String(data.expiring_soon)} subtitle="Within 90 days" icon={<AlertTriangle />} clickable to="/certifications" variant="amber" bgClass="bg-alert" description="Certificates requiring renewal" /></StaggerItem>
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
        </>
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
        <>
          <WelcomeBanner taskCount={data.cert_expiry_alerts + data.missing_documents} />
          <div className="dashboard-grid">
            <StaggerContainer className="grid grid-cards">
              <StaggerItem><Stat title="Team Members" value={String(data.team_members)} icon={<Users />} variant="indigo" bgClass="bg-users" description="Employees reporting to you" /></StaggerItem>
              <StaggerItem><Stat title="Avg Team Rating" value={data.avg_team_rating ?? "—"} icon={<Star />} variant="yellow" bgClass="bg-star" description="Average rating of direct reports" /></StaggerItem>
              <StaggerItem><Stat title="Cert Expiry Alerts" value={String(data.cert_expiry_alerts)} icon={<AlertTriangle />} variant="amber" bgClass="bg-alert" description="Certs expiring in next 90 days" /></StaggerItem>
              <StaggerItem><Stat title="Missing Documents" value={String(data.missing_documents)} icon={<FileWarning />} variant="rose" bgClass="bg-document" description="Documents requiring attention" /></StaggerItem>
              <StaggerItem><Stat title="Work Anniversaries" value={String(data.upcoming_anniversaries)} subtitle="Next 30 days" icon={<Calendar />} variant="blue" bgClass="bg-calendar" description="Upcoming in next 30 days" /></StaggerItem>
            </StaggerContainer>

            <FadeIn delay={0.5} className="dashboard-columns">
              <UpcomingReminders />
              <RecentNotifications />
            </FadeIn>
          </div>
        </>
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
        <>
          <WelcomeBanner taskCount={data.pending_verifications + data.employees_missing_documents} />
          <div className="dashboard-grid">
            <StaggerContainer className="grid grid-cards">
              <StaggerItem><Stat title="Total Employees" value={String(data.total_employees)} icon={<Users />} variant="indigo" bgClass="bg-total-employees" description="All employees in the organization" /></StaggerItem>
              <StaggerItem><Stat title="Active Employees" value={String(data.active_employees)} icon={<UserCheck />} variant="green" bgClass="bg-active-employees" description="Currently active employees" /></StaggerItem>
              <StaggerItem><Stat title="New Joiners" value={String(data.new_joiners)} subtitle="Last 90 days" icon={<UserPlus />} variant="blue" bgClass="bg-new-joiners" description="New employees joined recently" /></StaggerItem>
              <StaggerItem><Stat title="Missing Documents" value={String(data.employees_missing_documents)} icon={<FileWarning />} variant="rose" bgClass="bg-missing-documents" description="Documents require attention" /></StaggerItem>
              <StaggerItem><Stat title="Expired Certs" value={String(data.expired_certifications)} icon={<ShieldAlert />} variant="rose" bgClass="bg-expired-certs" description="Certificates already expired" /></StaggerItem>
              <StaggerItem><Stat title="Pending Verifications" value={String(data.pending_verifications)} icon={<Clock />} variant="amber" bgClass="bg-pending-verifications" description="Awaiting verification" /></StaggerItem>
              <StaggerItem><Stat title="Certifications Expiring in 30d" value={String(data.certs_expiring_30)} icon={<Timer />} variant="pink" bgClass="bg-certs-30" description="Certificates expiring soon" /></StaggerItem>
              <StaggerItem><Stat title="Certifications Expiring in 90d" value={String(data.certs_expiring_90)} icon={<AlertTriangle />} variant="yellow" bgClass="bg-certs-90" description="Certifications expiring soon" /></StaggerItem>
              <StaggerItem><Stat title="Recent Salary Revisions" value={String(data.recent_salary_revisions)} subtitle="Last 30 days" icon={<Banknote />} variant="blue" bgClass="bg-salary-revisions" description="Salary revisions in the last 30 days" /></StaggerItem>
            </StaggerContainer>

            <FadeIn delay={0.6} className="dashboard-columns">
              <RecentNotifications />
            </FadeIn>
          </div>
        </>
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
        {user.role === "employee" && <EmployeeDashboard />}
        {user.role === "manager" && <ManagerDashboard />}
        {user.role === "hr_admin" && <HrDashboard />}
      </div>
    </PageTransition>
  );
}
