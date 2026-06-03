import { useState } from "react";
import { notificationsApi } from "../api/features";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import { useApi } from "../hooks/useApi";

export default function Notifications() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useApi(
    () => notificationsApi.list(),
    [refreshKey],
  );
  const notifications = data ?? [];
  const [marking, setMarking] = useState(false);

  const handleMarkAllRead = async () => {
    setMarking(true);
    try {
      await notificationsApi.markAllRead();
      setRefreshKey((k) => k + 1);
    } finally {
      setMarking(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        actions={
          <button
            className="btn btn-outline btn-sm"
            onClick={handleMarkAllRead}
            disabled={marking || unreadCount === 0}
          >
            Mark all read
          </button>
        }
      />
      <AsyncState loading={loading} error={error}>
        {notifications.length === 0 ? (
          <p className="muted">No notifications.</p>
        ) : (
          <div className="stack">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="card"
                style={{ opacity: n.is_read ? 0.6 : 1 }}
              >
                <div className="row">
                  <h2>{n.title}</h2>
                  {!n.is_read && <span className="badge badge-solid">New</span>}
                </div>
                <p style={{ marginTop: 6 }}>{n.message}</p>
                <p className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                  {n.created_at.slice(0, 16).replace("T", " ")}
                </p>
              </div>
            ))}
          </div>
        )}
      </AsyncState>
    </div>
  );
}
