import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Bell, Menu, Moon, Sun, Search, ChevronDown } from "lucide-react";
import Sidebar from "./Sidebar";
import { useTheme } from "../context/ThemeContext";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { notificationsApi } from "../api/notifications";

export default function Layout() {
  const { theme, toggleTheme } = useTheme();
  const { mobileOpen, openMobile, closeMobile } = useSidebar();

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
            <button className="top-bar-btn" aria-label="Notifications">
              <Bell size={20} />
              <span className="notification-dot" />
            </button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

