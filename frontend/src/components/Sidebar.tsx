import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  FileText,
  Award,
  DollarSign,
  TrendingUp,
  CalendarDays,
  Bell,
  Users,
  GitBranch,
  Shield,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Ticket,
} from "lucide-react";
import { useAuth, type Role } from "../context/AuthContext";
import { notificationsApi } from "../api/notifications";
import { useSidebar } from "../context/SidebarContext";

interface NavItem {
  to: string;
  label: string;
  
  icon: React.ReactNode;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    icon: <LayoutDashboard />,
    roles: ["employee", "manager", "hr_admin"],
  },
  {
    to: "/profile",
    label: "Profile",
    icon: <User />,
    roles: ["employee", "manager", "hr_admin"],
  },
  {
    to: "/my-requests",
    label: "My Requests",
    icon: <Ticket />,
    roles: ["employee", "manager"],
  },
  {
    to: "/documents",
    label: "Documents",
    icon: <FileText />,
    roles: ["employee", "manager"],
  },
  {
    to: "/certifications",
    label: "Certifications",
    icon: <Award />,
    roles: ["employee", "manager"],
  },
  {
    to: "/salary",
    label: "Salary",
    icon: <DollarSign />,
    roles: ["employee", "manager"],
  },
  {
    to: "/performance",
    label: "Performance",
    icon: <TrendingUp />,
    roles: ["employee", "manager"],
  },
  {
    to: "/attendance",
    label: "Attendance",
    icon: <CalendarDays />,
    roles: ["employee", "manager", "hr_admin"],
  },
  {
    to: "/notifications",
    label: "Notifications",
    icon: <Bell />,
    roles: ["employee", "manager", "hr_admin"],
  },
  {
    to: "/employees",
    label: "Employees",
    icon: <Users />,
    roles: ["manager", "hr_admin"],
  },
  {
    to: "/org-chart",
    label: "Org Chart",
    icon: <GitBranch />,
    roles: ["hr_admin"],
  },
  {
    to: "/audit-logs",
    label: "Audit Logs",
    icon: <Shield />,
    roles: ["hr_admin"],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { collapsed, mobileOpen, toggleSidebar, closeMobile } = useSidebar();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    notificationsApi.unreadCount().then((r) => setUnreadCount(r.count)).catch(() => {});
  }, [user]);

  // Close mobile sidebar on route change
  useEffect(() => {
    closeMobile();
  }, [location.pathname]);

  if (!user) return null;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebarClasses = [
    "sidebar",
    collapsed ? "sidebar-collapsed" : "",
    mobileOpen ? "sidebar-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={sidebarClasses}>
      <div className="sidebar-brand">
        <span className="sidebar-brand-text">Emplo</span>
        {/* Desktop: collapse toggle. Mobile: close button */}
        <button
          className="sidebar-toggle sidebar-toggle-desktop"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
        <button
          className="sidebar-toggle sidebar-toggle-mobile"
          onClick={closeMobile}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              isActive ? "nav-link nav-link-active" : "nav-link"
            }
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            <span className="nav-link-label">{item.label}</span>
            {item.to === "/notifications" && unreadCount > 0 && (
              <span className="nav-badge" />
            )}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-role">{roleLabel(user.role)}</div>
          </div>
          <button className="sidebar-user-toggle" aria-label="User menu">
            <ChevronDown size={16} />
          </button>
        </div>
        <button
          className="sidebar-logout"
          onClick={logout}
          title={collapsed ? "Log out" : undefined}
        >
          <LogOut size={18} />
          <span className="sidebar-logout-label">Log out</span>
        </button>
      </div>
    </aside>
  );
}

function roleLabel(role: Role): string {
  return {
    employee: "Employee",
    manager: "Manager",
    hr_admin: "HR Administrator",
  }[role];
}
