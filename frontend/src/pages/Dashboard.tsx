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
} from "lucide-react";
import { dashboardApi } from "../api/dashboard";
import { notificationsApi, type NotificationItem } from "../api/notifications";
import { certificationsApi, type Certification } from "../api/certifications";
import { useAuth } from "../context/AuthContext";
import AsyncState from "../components/AsyncState";
import MissingDocumentsModal from "../components/MissingDocumentsModal";
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
  onClick?: () => void;
  variant?: "indigo" | "green" | "blue" | "amber" | "rose" | "orange" | "pink" | "yellow";
  bgClass?: string;
}

function Stat({ title, value, icon, subtitle, description, clickable, to, onClick, variant = "indigo", bgClass }: StatProps) {
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
  if (onClick) {
    return (
      <div onClick={onClick} style={{ cursor: "pointer" }} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}>
        {content}
      </div>
    );
  }
  if (to) return <Link to={to} style={{ textDecoration: "none" }}>{content}</Link>;
  return content;
}

function money(value: string | null): string {
  if (!value) return "—";
  const n = Number(value);
  return Number.isNaN(n) ? value : `₹${n.toLocaleString()}`;
}

const WelcomeIllustration = () => (
  <svg width="180" height="120" viewBox="0 0 180 120" fill="none" style={{ display: "block" }}>
    {/* Floor/desk base */}
    <path d="M30 100H150" stroke="var(--primary-color)" strokeWidth="3" strokeLinecap="round" opacity="0.4" />

    {/* Potted Plant */}
    <g className="welcome-svg-plant">
      <rect x="42" y="82" width="12" height="18" rx="2" fill="#f97316" />
      <path d="M40 82H56" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
      <path d="M48 82C44 74 41 78 43 70C45 62 48 66 48 82Z" fill="#22c55e" />
      <path d="M48 82C52 74 55 78 53 70C51 62 48 66 48 82Z" fill="#15803d" />
      <path d="M48 82C40 76 43 73 37 68C31 63 38 67 48 82Z" fill="#4ade80" />
    </g>

    {/* Laptop */}
    <rect x="110" y="82" width="32" height="18" rx="2" fill="#cbd5e1" />
    <path d="M104 100H148" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="114" y="85" width="24" height="12" rx="1" fill="#f8fafc" className="welcome-svg-screen-light" />
    <circle cx="126" cy="91" r="3" fill="#031273" opacity="0.8" />
    <line x1="117" y1="88" x2="127" y2="88" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="117" y1="94" x2="123" y2="94" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />

    {/* Person */}
    <g className="welcome-svg-person">
      <path d="M78 100C78 90 85 82 94 82H102C111 82 118 90 118 100V100H78V100Z" fill="var(--primary-color)" />
      <rect x="94" y="74" width="8" height="8" fill="#fed7aa" />
      <circle cx="98" cy="65" r="11" fill="#fed7aa" />
      <path d="M87 65C87 59 92 54 98 54C104 54 109 59 109 65C109 66 108 67 106 67C104 67 103 65 98 65C93 65 92 67 90 67C88 67 87 66 87 65Z" fill="#334155" />
      <rect x="94" y="52" width="8" height="6" rx="3" fill="#334155" />
      <path d="M84 97L106 91" stroke="#fed7aa" strokeWidth="3.5" strokeLinecap="round" />
    </g>
  </svg>
);

function WelcomeBanner({ taskCount }: { taskCount?: number }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    notificationsApi
      .list()
      .then((data) => setNotifications(data.slice(0, 2)))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const hours = new Date().getHours();
  let greetingWord = "Good morning";
  if (hours >= 12 && hours < 17) {
    greetingWord = "Good afternoon";
  } else if (hours >= 17 && hours < 22) {
    greetingWord = "Good evening";
  } else if (hours >= 22 || hours < 4) {
    greetingWord = "Good night";
  }

  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

  // Determine button target and text based on role
  let btnText = "View My Tasks";
  let btnTarget = "/notifications";
  if (user.role === "employee") {
    btnText = "View My Tasks";
    btnTarget = "/certifications";
  } else if (user.role === "hr_admin") {
    btnText = "View My Tasks";
    btnTarget = "/notifications";
  } else if (user.role === "manager") {
    btnText = "View Team Alerts";
    btnTarget = "/notifications";
  }

  const hasTasks = taskCount !== undefined && taskCount > 0;
  const subtitleText = hasTasks ? (
    <>
      Welcome back! You have <span className="welcome-subtitle-accent">{taskCount}</span> task{taskCount > 1 ? "s" : ""} to complete today.
    </>
  ) : (
    "Welcome back! Your portal is up to date and running fine."
  );

  return (
    <div className="welcome-banner">
      <div className="welcome-banner-content">
        <span className="welcome-banner-date">
          <span className="welcome-date-pulse" />
          {formattedDate}
        </span>
        <h1 className="welcome-banner-title" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {greetingWord}, <span className="welcome-name-highlight">{user.name}</span>! <span className="hand-wave-emoji">👋</span>
        </h1>
        <p className="welcome-banner-subtitle">
          {subtitleText}
        </p>
        <button
          className="welcome-banner-btn"
          onClick={() => navigate(btnTarget)}
        >
          {btnText} <ArrowRight size={14} style={{ marginLeft: 6 }} />
        </button>
      </div>

      <div className="welcome-banner-activity">
        <div className="welcome-banner-activity-header">
          <span className="welcome-banner-activity-title">Recent Activity</span>
          <Link to="/notifications" className="welcome-banner-activity-link">
            View all
          </Link>
        </div>
        <div className="welcome-banner-activity-list">
          {loading && <div className="welcome-banner-activity-loading">Loading activity...</div>}
          {!loading && notifications.length === 0 && (
            <div className="welcome-banner-activity-empty">No recent activity</div>
          )}
          {!loading && notifications.map((n) => {
            const cleanMsg = n.message.replace(/\s*\[employee:[a-f0-9-]+\]/i, "");
            return (
              <div key={n.id} className="welcome-banner-activity-item">
                <div className="welcome-banner-activity-item-title">{n.title}</div>
                <div className="welcome-banner-activity-item-desc" title={cleanMsg}>{cleanMsg}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
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
  const [showMissingDocs, setShowMissingDocs] = useState(false);
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
              <StaggerItem><Stat title="Missing Documents" value={String(data.missing_documents)} icon={<FileWarning />} clickable onClick={() => setShowMissingDocs(true)} variant="rose" bgClass="bg-document" description="Click to view who's missing documents" /></StaggerItem>
              <StaggerItem><Stat title="Work Anniversaries" value={String(data.upcoming_anniversaries)} subtitle="Next 30 days" icon={<Calendar />} variant="blue" bgClass="bg-calendar" description="Upcoming in next 30 days" /></StaggerItem>
            </StaggerContainer>

            <FadeIn delay={0.5} className="dashboard-columns">
              <UpcomingReminders />
            </FadeIn>
          </div>
          {showMissingDocs && <MissingDocumentsModal onClose={() => setShowMissingDocs(false)} />}
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
  const [showMissingDocs, setShowMissingDocs] = useState(false);
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
              <StaggerItem><Stat title="Missing Documents" value={String(data.employees_missing_documents)} icon={<FileWarning />} clickable onClick={() => setShowMissingDocs(true)} variant="rose" bgClass="bg-missing-documents" description="Click to view who's missing documents" /></StaggerItem>
              <StaggerItem><Stat title="Expired Certs" value={String(data.expired_certifications)} icon={<ShieldAlert />} variant="rose" bgClass="bg-expired-certs" description="Certificates already expired" /></StaggerItem>
              <StaggerItem><Stat title="Pending Verifications" value={String(data.pending_verifications)} icon={<Clock />} variant="amber" bgClass="bg-pending-verifications" description="Awaiting verification" /></StaggerItem>
              <StaggerItem><Stat title="Certifications Expiring in 30d" value={String(data.certs_expiring_30)} icon={<Timer />} variant="pink" bgClass="bg-certs-30" description="Certificates expiring soon" /></StaggerItem>
              <StaggerItem><Stat title="Recent Salary Revisions" value={String(data.recent_salary_revisions)} subtitle="Last 30 days" icon={<Banknote />} variant="blue" bgClass="bg-salary-revisions" description="Salary revisions in the last 30 days" /></StaggerItem>
            </StaggerContainer>

            {/* Recent Activity has been moved to the header welcome banner */}
          </div>
          {showMissingDocs && <MissingDocumentsModal onClose={() => setShowMissingDocs(false)} />}
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
