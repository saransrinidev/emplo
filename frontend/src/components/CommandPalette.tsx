import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, LayoutDashboard, User, FileText, Award, DollarSign,
  TrendingUp, CalendarDays, Bell, Users, GitBranch, Shield,
  Ticket, ArrowRight, Command
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { employeesApi, type Employee } from "../api/employees";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  category: "navigation" | "employee" | "action";
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadedEmployees, setLoadedEmployees] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
      // Load employees for search
      if (!loadedEmployees) {
        employeesApi.list().then((data) => {
          setEmployees(data);
          setLoadedEmployees(true);
        }).catch(() => { });
      }
    }
  }, [open]);

  // Navigation items
  const navItems: SearchResult[] = [
    { id: "nav-dashboard", title: "Dashboard", subtitle: "Overview & analytics", icon: <LayoutDashboard size={16} />, action: () => navigate("/"), category: "navigation" },
    { id: "nav-profile", title: "My Profile", subtitle: "View and edit your profile", icon: <User size={16} />, action: () => navigate("/profile"), category: "navigation" },
    { id: "nav-requests", title: "My Requests", subtitle: "Tickets & requests", icon: <Ticket size={16} />, action: () => navigate("/my-requests"), category: "navigation" },
    { id: "nav-documents", title: "Documents", subtitle: "Upload & manage documents", icon: <FileText size={16} />, action: () => navigate("/documents"), category: "navigation" },
    { id: "nav-certifications", title: "Certifications", subtitle: "Professional certificates", icon: <Award size={16} />, action: () => navigate("/certifications"), category: "navigation" },
    { id: "nav-salary", title: "Salary & Compensation", subtitle: "Revision history", icon: <DollarSign size={16} />, action: () => navigate("/salary"), category: "navigation" },
    { id: "nav-performance", title: "Performance", subtitle: "Reviews & ratings", icon: <TrendingUp size={16} />, action: () => navigate("/performance"), category: "navigation" },
    { id: "nav-attendance", title: "Attendance & Leave", subtitle: "Apply leave, view requests", icon: <CalendarDays size={16} />, action: () => navigate("/attendance"), category: "navigation" },
    { id: "nav-notifications", title: "Notifications", subtitle: "View all alerts", icon: <Bell size={16} />, action: () => navigate("/notifications"), category: "navigation" },
  ];

  // HR/Manager only
  if (user?.role === "hr_admin" || user?.role === "manager") {
    navItems.push(
      { id: "nav-employees", title: "Employees", subtitle: "Manage employee records", icon: <Users size={16} />, action: () => navigate("/employees"), category: "navigation" },
    );
  }
  if (user?.role === "hr_admin") {
    navItems.push(
      { id: "nav-orgchart", title: "Org Chart", subtitle: "Organization structure", icon: <GitBranch size={16} />, action: () => navigate("/org-chart"), category: "navigation" },
      { id: "nav-audit", title: "Audit Logs", subtitle: "System activity logs", icon: <Shield size={16} />, action: () => navigate("/audit-logs"), category: "navigation" },
    );
  }

  // Search logic
  useEffect(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      setResults(navItems.slice(0, 6));
      setSelectedIndex(0);
      return;
    }

    const matched: SearchResult[] = [];

    // Search navigation
    for (const item of navItems) {
      if (item.title.toLowerCase().includes(q) || (item.subtitle && item.subtitle.toLowerCase().includes(q))) {
        matched.push(item);
      }
    }

    // Search employees
    if (employees.length > 0) {
      const empMatches = employees.filter((emp) =>
        emp.full_name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.employee_code.toLowerCase().includes(q) ||
        (emp.department && emp.department.toLowerCase().includes(q))
      ).slice(0, 5);

      for (const emp of empMatches) {
        matched.push({
          id: `emp-${emp.id}`,
          title: emp.full_name,
          subtitle: `${emp.employee_code} · ${emp.department ?? ""} · ${emp.designation ?? ""}`,
          icon: emp.profile_photo
            ? <img src={emp.profile_photo} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
            : <User size={16} />,
          action: () => navigate(`/employees/${emp.id}`),
          category: "employee",
        });
      }
    }

    setResults(matched.slice(0, 10));
    setSelectedIndex(0);
  }, [query, employees]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].action();
        setOpen(false);
      }
    }
  };

  const handleSelect = (result: SearchResult) => {
    result.action();
    setOpen(false);
  };

  if (!user) return null;

  return (
    <>
      {/* Trigger hint button (optional — shows in navbar) */}
      <button className="cmd-k-trigger" onClick={() => setOpen(true)} title="Search (⌘K)">
        <Search size={14} />
        <span className="cmd-k-text">Search...</span>
        <kbd className="cmd-k-kbd">
          <Command size={10} />K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="cmd-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="cmd-palette"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Search input */}
              <div className="cmd-input-wrapper">
                <Search size={16} className="cmd-search-icon" />
                <input
                  ref={inputRef}
                  className="cmd-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages, employees, actions..."
                />
                <kbd className="cmd-esc-hint">ESC</kbd>
              </div>

              {/* Results */}
              <div className="cmd-results">
                {results.length === 0 && query && (
                  <div className="cmd-empty">No results for "{query}"</div>
                )}
                {results.map((result, idx) => (
                  <button
                    key={result.id}
                    className={`cmd-result-item ${idx === selectedIndex ? "cmd-result-active" : ""}`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <span className="cmd-result-icon">{result.icon}</span>
                    <div className="cmd-result-text">
                      <span className="cmd-result-title">{result.title}</span>
                      {result.subtitle && <span className="cmd-result-sub">{result.subtitle}</span>}
                    </div>
                    <ArrowRight size={12} className="cmd-result-arrow" />
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="cmd-footer">
                <span><kbd>↑↓</kbd> Navigate</span>
                <span><kbd>↵</kbd> Open</span>
                <span><kbd>ESC</kbd> Close</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
