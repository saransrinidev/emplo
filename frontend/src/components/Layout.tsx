import { Outlet } from "react-router-dom";
import { Bell, Moon, Sun } from "lucide-react";
import Sidebar from "./Sidebar";
import { useTheme } from "../context/ThemeContext";

export default function Layout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <div className="top-bar">
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
        <Outlet />
      </main>
    </div>
  );
}
