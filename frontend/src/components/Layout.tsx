import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Bell, Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import CommandPalette from "./CommandPalette";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { notificationsApi } from "../api/notifications";

export default function Layout() {

  const { mobileOpen, openMobile, closeMobile } = useSidebar();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    notificationsApi
      .unreadCount()
      .then((r) => setUnreadCount(r.count))
      .catch(() => { });
  }, [user]);



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


          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

