import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth, type Role } from "../auth/AuthContext";
import { notificationsApi } from "../api/features";

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", roles: ["employee", "manager", "hr_admin"] },
  { to: "/profile", label: "Profile", roles: ["employee", "manager", "hr_admin"] },
  { to: "/documents", label: "Documents", roles: ["employee", "manager", "hr_admin"] },
  {
    to: "/certifications",
    label: "Certifications",
    roles: ["employee", "manager", "hr_admin"],
  },
  { to: "/salary", label: "Salary", roles: ["employee", "manager", "hr_admin"] },
  {
    to: "/performance",
    label: "Performance",
    roles: ["employee", "manager", "hr_admin"],
  },
  {
    to: "/notifications",
    label: "Notifications",
    roles: ["employee", "manager", "hr_admin"],
  },
  { to: "/employees", label: "Employees", roles: ["manager", "hr_admin"] },
  { to: "/audit-logs", label: "Audit Logs", roles: ["hr_admin"] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    notificationsApi.unreadCount().then((r) => setUnreadCount(r.count)).catch(() => {});
  }, [user]);

  if (!user) return null;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">HR Portal</div>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              isActive ? "nav-link nav-link-active" : "nav-link"
            }
          >
            {item.label}
            {item.to === "/notifications" && unreadCount > 0 && (
              <span className="badge badge-solid" style={{ marginLeft: 8, fontSize: 11 }}>
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-name">{user.name}</div>
          <div className="muted sidebar-user-role">{roleLabel(user.role)}</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={logout}>
          Log out
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
