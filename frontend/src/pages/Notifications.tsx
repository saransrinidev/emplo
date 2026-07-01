import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ExternalLink,
  Bell,
  FileText,
  ShieldAlert,
  Award,
  CreditCard,
  X
} from "lucide-react";
import { notificationsApi, type NotificationItem } from "../api/notifications";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import { useApi } from "../hooks/useApi";

// Extract employee ID from notification message if present: [employee:UUID]
function extractEmployeeId(message: string): string | null {
  const match = message.match(/\[employee:([a-f0-9-]+)\]/i);
  return match ? match[1] : null;
}

// Map notification to a route — for HR/manager it navigates to the employee's detail tab
function getNotificationRoute(notification: NotificationItem): string | null {
  const title = notification.title.toLowerCase();
  const message = notification.message.toLowerCase();
  const employeeId = extractEmployeeId(notification.message);

  // If has employee context, navigate to their detail page with correct tab
  if (employeeId) {
    if (title.includes("document")) return `/employees/${employeeId}?tab=documents`;
    if (title.includes("certification") || title.includes("certificate")) return `/employees/${employeeId}?tab=certifications`;
    if (title.includes("salary")) return `/employees/${employeeId}?tab=salary`;
    if (title.includes("performance") || title.includes("review")) return `/employees/${employeeId}?tab=performance`;
    return `/employees/${employeeId}`;
  }

  // No employee context — navigate to own pages
  if (title.includes("document") || message.includes("document")) return "/documents";
  if (title.includes("certification") || title.includes("certificate") || message.includes("certif")) return "/certifications";
  if (title.includes("salary") || message.includes("salary")) return "/salary";
  if (title.includes("performance") || title.includes("review") || message.includes("performance")) return "/performance";
  if (title.includes("profile") || message.includes("profile")) return "/profile";
  if (title.includes("permission") || message.includes("permission")) return "/profile";
  if (title.includes("edit access")) return "/profile";

  return null;
}

// Map notification to a visual category (icon + color theme)
function getNotificationCategory(notification: NotificationItem) {
  const title = notification.title.toLowerCase();
  const message = notification.message.toLowerCase();

  if (title.includes("document") || message.includes("document")) {
    return {
      icon: <FileText size={18} />,
      colorClass: "doc-notif",
      label: "Document"
    };
  }
  if (title.includes("certification") || title.includes("certificate") || message.includes("certif")) {
    return {
      icon: <Award size={18} />,
      colorClass: "cert-notif",
      label: "Certification"
    };
  }
  if (title.includes("salary") || message.includes("salary") || title.includes("payroll")) {
    return {
      icon: <CreditCard size={18} />,
      colorClass: "salary-notif",
      label: "Salary"
    };
  }
  if (title.includes("permission") || title.includes("edit access") || message.includes("permission") || message.includes("access")) {
    return {
      icon: <ShieldAlert size={18} />,
      colorClass: "access-notif",
      label: "Security"
    };
  }
  return {
    icon: <Bell size={18} />,
    colorClass: "general-notif",
    label: "Alert"
  };
}

export default function Notifications() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useApi(
    () => notificationsApi.list(),
    [refreshKey],
  );
  const [notifications, setNotifications] = useState<NotificationItem[] | null>(null);
  const [marking, setMarking] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");

  // Use local state once loaded to avoid flicker on mark
  const list = notifications ?? data ?? [];

  const handleMarkAllRead = async () => {
    setMarking(true);
    try {
      await notificationsApi.markAllRead();
      setNotifications(list.map((n) => ({ ...n, is_read: true })));
      setRefreshKey((k) => k + 1);
    } finally {
      setMarking(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Clear all notifications? This cannot be undone.")) return;
    setMarking(true);
    try {
      await notificationsApi.clearAll();
      setNotifications([]);
      setRefreshKey((k) => k + 1);
    } finally {
      setMarking(false);
    }
  };

  const handleDeleteOne = async (id: string) => {
    try {
      await notificationsApi.deleteOne(id);
      const updated = (notifications ?? data ?? []).filter((n) => n.id !== id);
      setNotifications(updated);
    } catch { /* ignore */ }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await notificationsApi.markOneRead(id);
      const updated = (notifications ?? data ?? []).map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      );
      setNotifications(updated);
    } catch { /* ignore */ }
  };

  const handleClick = (notification: NotificationItem) => {
    // Mark as read when clicked
    if (!notification.is_read) {
      handleMarkOneRead(notification.id);
    }
    // Navigate to corresponding page
    const route = getNotificationRoute(notification);
    if (route) {
      navigate(route);
    }
  };

  const unreadCount = list.filter((n) => !n.is_read).length;

  const filteredNotifications = list.filter((n) => {
    if (activeTab === "unread") return !n.is_read;
    if (activeTab === "read") return n.is_read;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleMarkAllRead}
              disabled={marking || unreadCount === 0}
            >
              Mark all read
            </button>
            <button
              className="btn btn-outline btn-sm"
              style={{ color: "hsl(var(--destructive))", borderColor: "hsl(var(--destructive) / 0.3)" }}
              onClick={handleClearAll}
              disabled={marking || list.length === 0}
            >
              Clear all
            </button>
          </div>
        }
      />

      <div className="notifications-tabs">
        <button
          className={`notif-tab-btn ${activeTab === "all" ? "notif-tab-btn-active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All <span className="tab-count-badge">{list.length}</span>
        </button>
        <button
          className={`notif-tab-btn ${activeTab === "unread" ? "notif-tab-btn-active" : ""}`}
          onClick={() => setActiveTab("unread")}
        >
          Unread <span className="tab-count-badge">{unreadCount}</span>
        </button>
        <button
          className={`notif-tab-btn ${activeTab === "read" ? "notif-tab-btn-active" : ""}`}
          onClick={() => setActiveTab("read")}
        >
          Read <span className="tab-count-badge">{list.length - unreadCount}</span>
        </button>
      </div>

      <AsyncState loading={loading} error={error}>
        {filteredNotifications.length === 0 ? (
          <div className="notif-empty-state">
            <Bell size={40} className="notif-empty-icon" />
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              No {activeTab === "all" ? "" : activeTab} notifications.
            </p>
          </div>
        ) : (
          <div className="stack">
            {filteredNotifications.map((n) => {
              const route = getNotificationRoute(n);
              const { icon, colorClass } = getNotificationCategory(n);
              return (
                <div
                  key={n.id}
                  className={`notification-card ${n.is_read ? "notification-read" : "notification-unread"}`}
                  onClick={() => handleClick(n)}
                  style={{ cursor: route ? "pointer" : "default" }}
                >
                  <div className={`notif-icon-wrapper ${colorClass}`}>
                    {icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="notification-card-title">
                      {n.title}
                      {!n.is_read && <span className="badge badge-solid" style={{ marginLeft: 8, fontSize: 10 }}>New</span>}
                    </div>
                    <p className="notification-card-message">{n.message.replace(/\s*\[employee:[a-f0-9-]+\]/i, "")}</p>
                    <p className="notification-card-time">
                      {formatTime(n.created_at)}
                    </p>
                  </div>
                  <div className="notification-card-actions" onClick={(e) => e.stopPropagation()}>
                    {!n.is_read && (
                      <button
                        className="notification-mark-btn"
                        title="Mark as read"
                        onClick={() => handleMarkOneRead(n.id)}
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    <button
                      className="notification-mark-btn"
                      title="Delete notification"
                      onClick={() => handleDeleteOne(n.id)}
                      style={{ color: "var(--text-muted)" }}
                    >
                      <X size={14} />
                    </button>
                    {route && (
                      <span className="notification-link-icon" title="Go to section">
                        <ExternalLink size={14} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AsyncState>
    </div>
  );
}

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
