import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Bell, Menu, Moon, Sun, ChevronDown } from "lucide-react";
import Sidebar from "./Sidebar";
import CommandPalette from "./CommandPalette";
import { useTheme } from "../context/ThemeContext";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { notificationsApi } from "../api/notifications";

export default function Layout() {
  const { theme, toggleTheme } = useTheme();
  const { mobileOpen, openMobile, closeMobile } = useSidebar();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    notificationsApi
      .unreadCount()
      .then((r) => setUnreadCount(r.count))
      .catch(() => {});
  }, [user]);

  function roleLabel(role: string): string {
    return {
      employee: "Employee",
      manager: "Manager",
      hr_admin: "HR Administrator",
    }[role] || role;
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  // Use actual profile photo from auth context
  const avatarUrl = user?.profile_photo || null;

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? "active" : ""}`}
        onClick={closeMobile}
      />
      <Sidebar />
      <main className="app-main">
        <div className="top-bar">
          <button
            className="mobile-menu-btn"
            onClick={openMobile}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          
          {/* Command palette trigger in navbar */}
          <CommandPalette />

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
            <button className="top-bar-btn" aria-label="Notifications">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="notification-badge-count">{unreadCount}</span>
              )}
            </button>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            
            {user && (
              <div className="profile-dropdown">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user.name}
                    className="profile-avatar-img"
                  />
                ) : (
                  <div className="profile-avatar-placeholder">{initials}</div>
                )}
                <div className="profile-meta">
                  <span className="profile-name">{user.name}</span>
                  <span className="profile-role">{roleLabel(user.role)}</span>
                </div>
                <ChevronDown size={14} className="profile-chevron" />
              </div>
            )}
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

