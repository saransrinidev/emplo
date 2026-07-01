import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
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
  Moon,
  Sun,
} from "lucide-react";
import { useAuth, type Role } from "../context/AuthContext";
import { notificationsApi } from "../api/notifications";
import { useSidebar } from "../context/SidebarContext";
import { useTheme } from "../context/ThemeContext";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
  group: "workspace" | "documents_finance" | "administration";
}

const NAV_GROUPS = [
  { id: "workspace", label: "Workspace" },
  { id: "documents_finance", label: "Documents & Finance" },
  { id: "administration", label: "Administration" },
] as const;

const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    icon: <LayoutDashboard />,
    roles: ["employee", "manager", "hr_admin"],
    group: "workspace",
  },
  {
    to: "/profile",
    label: "Profile",
    icon: <User />,
    roles: ["employee", "manager", "hr_admin"],
    group: "workspace",
  },
  {
    to: "/my-requests",
    label: "My Requests",
    icon: <Ticket />,
    roles: ["employee", "manager", "hr_admin"],
    group: "workspace",
  },
  {
    to: "/messages",
    label: "Messages",
    icon: <Users />,
    roles: ["employee", "manager", "hr_admin"],
    group: "workspace",
  },
  {
    to: "/tasks",
    label: "Tasks",
    icon: <FileText />,
    roles: ["employee", "manager", "hr_admin"],
    group: "workspace",
  },
  {
    to: "/documents",
    label: "Documents",
    icon: <FileText />,
    roles: ["employee", "manager"],
    group: "documents_finance",
  },
  {
    to: "/certifications",
    label: "Certifications",
    icon: <Award />,
    roles: ["employee", "manager"],
    group: "documents_finance",
  },
  {
    to: "/salary",
    label: "Salary",
    icon: <DollarSign />,
    roles: ["employee", "manager"],
    group: "documents_finance",
  },
  {
    to: "/performance",
    label: "Performance",
    icon: <TrendingUp />,
    roles: ["employee", "manager"],
    group: "documents_finance",
  },
  {
    to: "/attendance",
    label: "Attendance",
    icon: <CalendarDays />,
    roles: ["employee", "manager", "hr_admin"],
    group: "workspace",
  },
  {
    to: "/notifications",
    label: "Notifications",
    icon: <Bell />,
    roles: ["employee", "manager", "hr_admin"],
    group: "workspace",
  },
  {
    to: "/employees",
    label: "Employees",
    icon: <Users />,
    roles: ["manager", "hr_admin"],
    group: "administration",
  },
  {
    to: "/org-chart",
    label: "Org Chart",
    icon: <GitBranch />,
    roles: ["hr_admin"],
    group: "administration",
  },
  {
    to: "/audit-logs",
    label: "Audit Logs",
    icon: <Shield />,
    roles: ["hr_admin"],
    group: "administration",
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { collapsed, mobileOpen, toggleSidebar, closeMobile } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    notificationsApi.unreadCount().then((r) => setUnreadCount(r.count)).catch(() => { });
  }, [user]);

  // Close mobile sidebar on route change
  useEffect(() => {
    closeMobile();
  }, [location.pathname]);

  if (!user) return null;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  // Group elements based on metadata
  const groupedItems = NAV_GROUPS.map((group) => {
    return {
      ...group,
      items: items.filter((item) => item.group === group.id),
    };
  }).filter((group) => group.items.length > 0);

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
      <div
        className="sidebar-brand"
        onClick={() => collapsed && toggleSidebar()}
        style={{ cursor: collapsed ? "pointer" : "default" }}
        title={collapsed ? "Expand sidebar" : undefined}
      >
        <div className="sidebar-brand-logo-wrapper">
          <svg className="sidebar-logo-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="6" fill="url(#logo-grad)" />
            <path d="M8 7H16M8 12H14M8 17H12" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            <defs>
              <linearGradient id="logo-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop stopColor="hsl(262, 83%, 65%)" />
                <stop offset="1" stopColor="hsl(262, 83%, 48%)" />
              </linearGradient>
            </defs>
          </svg>
          <span className="sidebar-brand-text">Emplo</span>
        </div>

        {!collapsed && (
          <button
            className="sidebar-toggle sidebar-toggle-desktop"
            onClick={(e) => {
              e.stopPropagation();
              toggleSidebar();
            }}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
        <button
          className="sidebar-toggle sidebar-toggle-mobile"
          onClick={(e) => {
            e.stopPropagation();
            closeMobile();
          }}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {groupedItems.map((group) => (
          <div key={group.id} className="sidebar-nav-group">
            {!collapsed && (
              <div className="sidebar-nav-group-title">{group.label}</div>
            )}
            {group.items.map((item) => {
              const isActive = item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className="nav-link"
                  title={collapsed ? item.label : undefined}
                >
                  {isActive && (
                    <motion.div
                      className="nav-active-indicator"
                      layoutId="sidebar-active"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="nav-link-icon">{item.icon}</span>
                  <span className="nav-link-label">{item.label}</span>
                  {item.to === "/notifications" && unreadCount > 0 && (
                    <span className="nav-badge" />
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed ? (
          <div className="theme-switcher">
            <button
              className={`theme-switcher-btn ${theme === "light" ? "active" : ""}`}
              onClick={() => theme !== "light" && toggleTheme()}
              aria-label="Light Mode"
            >
              <Sun size={14} />
              <span>Light</span>
            </button>
            <button
              className={`theme-switcher-btn ${theme === "dark" ? "active" : ""}`}
              onClick={() => theme !== "dark" && toggleTheme()}
              aria-label="Dark Mode"
            >
              <Moon size={14} />
              <span>Dark</span>
            </button>
          </div>
        ) : (
          <button
            className="sidebar-action-btn sidebar-theme-toggle"
            onClick={toggleTheme}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        )}

        <NavLink
          to="/profile"
          className="sidebar-user"
          title={user.name}
        >
          {user.profile_photo ? (
            <img src={user.profile_photo} alt={user.name} className="sidebar-avatar sidebar-avatar-img" />
          ) : (
            <div className="sidebar-avatar">{initials}</div>
          )}
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-role">{roleLabel(user.role)}</div>
          </div>
        </NavLink>

        <button
          className="sidebar-action-btn sidebar-logout"
          onClick={logout}
          title={collapsed ? "Log out" : undefined}
        >
          <LogOut size={16} />
          <span className="sidebar-action-btn-label">Log out</span>
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
