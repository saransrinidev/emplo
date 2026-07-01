import { useState } from "react";
import { 
  User, 
  Search, 
  Activity, 
  FileText, 
  Award, 
  Shield, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  ChevronRight, 
  Copy, 
  Check, 
  Eye, 
  X, 
  Inbox, 
  Filter,
  ExternalLink,
  ClipboardList
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auditApi, type AuditLogItem } from "../api/audit";
import { useAuth } from "../context/AuthContext";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import { useApi } from "../hooks/useApi";

const ENTITY_TYPES = [
  "",
  "employee",
  "salary",
  "performance",
  "document",
  "certification",
  "permission",
];

export default function AuditLogs() {
  const { user: currentUser } = useAuth();
  const [entityType, setEntityType] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const [rawJsonExpanded, setRawJsonExpanded] = useState(false);

  const { data, loading, error } = useApi(
    () => auditApi.list(entityType ? { entity_type: entityType } : undefined),
    [entityType],
  );
  const logs = data ?? [];

  // Filter logs on client side for search query and action category
  const filteredLogs = logs.filter((log) => {
    // Action category filter
    if (actionFilter !== "all") {
      const act = log.action.toLowerCase();
      if (actionFilter === "create" && !(act.includes("create") || act.includes("add") || act.includes("register"))) return false;
      if (actionFilter === "update" && !(act.includes("update") || act.includes("edit") || act.includes("revision") || act.includes("change"))) return false;
      if (actionFilter === "delete" && !(act.includes("delete") || act.includes("terminate") || act.includes("remove"))) return false;
      if (actionFilter === "approval" && !log.approval_status) return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchActor = log.actor_id?.toLowerCase().includes(query);
      const matchEntity = log.entity_id?.toLowerCase().includes(query);
      const matchAction = log.action.toLowerCase().includes(query);
      const matchType = log.entity_type.toLowerCase().includes(query);
      
      let matchChanges = false;
      if (log.changes) {
        matchChanges = JSON.stringify(log.changes).toLowerCase().includes(query);
      }

      if (!matchActor && !matchEntity && !matchAction && !matchType && !matchChanges) return false;
    }

    return true;
  });

  // Calculate dynamic insights based on CURRENT logs
  const totalEvents = filteredLogs.length;
  
  const creationCount = filteredLogs.filter(log => {
    const act = log.action.toLowerCase();
    return act.includes("create") || act.includes("add") || act.includes("register");
  }).length;

  const updateCount = filteredLogs.filter(log => {
    const act = log.action.toLowerCase();
    return act.includes("update") || act.includes("edit") || act.includes("revision") || act.includes("change");
  }).length;

  const deletionCount = filteredLogs.filter(log => {
    const act = log.action.toLowerCase();
    return act.includes("delete") || act.includes("terminate") || act.includes("remove");
  }).length;

  const handleCopyId = (id: string, type: string) => {
    navigator.clipboard.writeText(id);
    setIsCopied(`${type}-${id}`);
    setTimeout(() => setIsCopied(null), 2000);
  };

  const getEntityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "employee":
        return <User size={15} />;
      case "salary":
        return <DollarSign size={15} />;
      case "performance":
        return <TrendingUp size={15} />;
      case "document":
        return <FileText size={15} />;
      case "certification":
        return <Award size={15} />;
      case "permission":
        return <Shield size={15} />;
      default:
        return <Activity size={15} />;
    }
  };

  const getActionBadgeClass = (actionName: string) => {
    const act = actionName.toLowerCase();
    if (act.includes("create") || act.includes("add") || act.includes("register")) return "action-badge action-create";
    if (act.includes("update") || act.includes("edit") || act.includes("revision") || act.includes("change")) return "action-badge action-update";
    if (act.includes("delete") || act.includes("terminate") || act.includes("remove")) return "action-badge action-delete";
    return "action-badge action-other";
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) + " at " + date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString.slice(0, 16).replace("T", " ");
    }
  };

  const renderChangesSummary = (changes: Record<string, any> | null) => {
    if (!changes) return <span className="muted">—</span>;
    const keys = Object.keys(changes);
    if (keys.length === 0) return <span className="muted">Empty payload</span>;
    
    return (
      <div className="changes-preview-container">
        {keys.slice(0, 3).map((key) => {
          const val = changes[key];
          let displayVal = "";
          
          if (val && typeof val === "object" && !Array.isArray(val)) {
            if ("new" in val) {
              displayVal = String(val.new);
            } else {
              displayVal = JSON.stringify(val);
            }
          } else {
            displayVal = String(val);
          }

          if (displayVal.length > 20) {
            displayVal = displayVal.slice(0, 18) + "...";
          }

          return (
            <span key={key} className="changes-chip">
              <span className="changes-chip-key">{key}</span>: {displayVal}
            </span>
          );
        })}
        {keys.length > 3 && (
          <span className="changes-chip" style={{ background: "transparent", borderStyle: "dashed" }}>
            +{keys.length - 3} more
          </span>
        )}
      </div>
    );
  };

  const getActorAvatar = (actorId: string | null) => {
    if (!actorId) return { initials: "SY", gradient: "linear-gradient(135deg, #64748b 0%, #475569 100%)" };
    
    const initials = actorId.slice(0, 2).toUpperCase();
    let hash = 0;
    for (let i = 0; i < actorId.length; i++) {
      hash = actorId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
      "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
      "linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)",
    ];
    const gradient = gradients[Math.abs(hash) % gradients.length];
    return { initials, gradient };
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          <PageHeader 
            title="Audit Logs" 
            subtitle="System auditing records and data change tracking." 
          />
        </div>
      </div>

      <AsyncState loading={loading} error={error}>
        {/* KPI insights metric cards */}
        <div className="audit-metrics-row">
          <div className="audit-metric-card">
            <div className="audit-metric-icon audit-variant-indigo">
              <ClipboardList size={20} />
            </div>
            <div className="audit-metric-info">
              <span className="audit-metric-label">Logged Actions</span>
              <span className="audit-metric-value">{totalEvents}</span>
            </div>
          </div>

          <div className="audit-metric-card">
            <div className="audit-metric-icon audit-variant-green">
              <User size={20} />
            </div>
            <div className="audit-metric-info">
              <span className="audit-metric-label">Creations / Additions</span>
              <span className="audit-metric-value">{creationCount}</span>
            </div>
          </div>

          <div className="audit-metric-card">
            <div className="audit-metric-icon audit-variant-amber">
              <Activity size={20} />
            </div>
            <div className="audit-metric-info">
              <span className="audit-metric-label">Updates & Edits</span>
              <span className="audit-metric-value">{updateCount}</span>
            </div>
          </div>

          <div className="audit-metric-card">
            <div className="audit-metric-icon audit-variant-rose">
              <Shield size={20} />
            </div>
            <div className="audit-metric-info">
              <span className="audit-metric-label">Deletions & Security</span>
              <span className="audit-metric-value">{deletionCount}</span>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="filter-bar-card" style={{ marginBottom: 24, padding: 0, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div className="search-input-wrapper" style={{ flex: 1, minWidth: 220 }}>
            <Search size={15} className="search-icon-inside" />
            <input
              className="input search-bar-input"
              placeholder="Search by actor UUID, entity, actions, fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ height: 38 }}
            />
          </div>

          {/* Entity Type Filter Capsule */}
          <div className="premium-tabs-container" style={{ margin: 0, padding: 3, gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", padding: "0 8px", gap: 4, color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
              <Filter size={13} />
              <span>Entity:</span>
            </div>
            <select
              className="input"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              style={{
                height: 32,
                fontSize: 12.5,
                fontWeight: 600,
                border: "none",
                background: "transparent",
                padding: "0 28px 0 8px",
                width: "auto"
              }}
            >
              <option value="">All Types</option>
              {ENTITY_TYPES.filter(Boolean).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Action Filter Capsule */}
          <div className="premium-tabs-container" style={{ margin: 0, padding: 3, gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", padding: "0 8px", gap: 4, color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
              <Activity size={13} />
              <span>Action:</span>
            </div>
            <select
              className="input"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{
                height: 32,
                fontSize: 12.5,
                fontWeight: 600,
                border: "none",
                background: "transparent",
                padding: "0 28px 0 8px",
                width: "auto"
              }}
            >
              <option value="all">All Actions</option>
              <option value="create">Creations</option>
              <option value="update">Updates</option>
              <option value="delete">Deletions</option>
              <option value="approval">Has Approvals</option>
            </select>
          </div>

          {(searchQuery || entityType || actionFilter !== "all") && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearchQuery("");
                setEntityType("");
                setActionFilter("all");
              }}
              style={{ color: "var(--primary-color)", fontWeight: 600 }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Audit Log Table */}
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", tableLayout: "auto" }}>
            <thead>
              <tr>
                <th style={{ width: "20%" }}>Timestamp</th>
                <th style={{ width: "18%" }}>Actor</th>
                <th style={{ width: "18%" }}>Event Details</th>
                <th style={{ width: "10%" }}>Approval</th>
                <th style={{ width: "26%" }}>Changes Preview</th>
                <th style={{ width: "8%", textAlign: "center" }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 24px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
                      <Inbox size={32} className="muted" style={{ strokeWidth: 1.5 }} />
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>No matching audit logs found</div>
                      <span className="muted" style={{ fontSize: 13, maxWidth: 300 }}>Try altering your search query, selecting another entity type, or resetting the filter parameters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isActorCurrent = currentUser && log.actor_id === currentUser.id;
                  const { initials, gradient } = getActorAvatar(log.actor_id);
                  
                  return (
                    <tr 
                      key={log.id} 
                      className="log-row-interactive"
                      onClick={() => {
                        setSelectedLog(log);
                        setRawJsonExpanded(false);
                      }}
                    >
                      <td className="muted" style={{ whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                           <Clock size={13} className="tree-sep" />
                           <span>{formatTimestamp(log.created_at)}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="actor-avatar" style={{ background: gradient }}>
                            {initials}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                              {isActorCurrent ? "You" : (log.actor_name ?? `Actor: ${log.actor_id?.slice(0, 8) ?? "System"}`)}
                            </span>
                            <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                              {isActorCurrent ? "HR Administrator" : "User Account"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span className={getActionBadgeClass(log.action)}>
                            {log.action}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--text-secondary)", fontWeight: 500 }}>
                            {getEntityIcon(log.entity_type)}
                            <span>{log.entity_type}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        {log.approval_status ? (
                          <span className="badge badge-solid" style={{
                            background: log.approval_status === "approved" ? "rgba(16, 185, 129, 0.1)" : log.approval_status === "pending" ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: log.approval_status === "approved" ? "#10b981" : log.approval_status === "pending" ? "#f59e0b" : "#ef4444",
                            border: "1px solid currentColor",
                            fontSize: 10.5,
                            borderRadius: 6,
                            padding: "2px 6px"
                          }}>
                            {log.approval_status}
                          </span>
                        ) : (
                          <span className="muted" style={{ fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        {renderChangesSummary(log.changes)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button 
                          className="btn btn-outline btn-ghost" 
                          style={{ padding: 6, borderRadius: 6, display: "inline-flex" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                            setRawJsonExpanded(false);
                          }}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </AsyncState>

      {/* AUDIT LOG INSPECT DRAWER */}
      <AnimatePresence>
        {selectedLog && (
          <>
            <motion.div
              className="drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
            />
            <motion.div
              className="drawer-content"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              style={{ width: 440 }} // slightly wider for JSON / diff comparative layout
            >
              <div className="drawer-header">
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-secondary)" }}>
                  Audit Log Details
                </h3>
                <button className="drawer-close" onClick={() => setSelectedLog(null)}>
                  <X size={16} />
                </button>
              </div>

              {(() => {
                const log = selectedLog;
                const isActorCurrent = currentUser && log.actor_id === currentUser.id;
                const { initials, gradient } = getActorAvatar(log.actor_id);
                
                return (
                  <div className="drawer-info-grid">
                    {/* Header Info Block */}
                    <div className="drawer-profile-header" style={{ marginBottom: 16, paddingBottom: 16 }}>
                      <div className="drawer-avatar" style={{ background: gradient, width: 48, height: 48, fontSize: 16 }}>
                        {initials}
                      </div>
                      <div className="drawer-name" style={{ fontSize: 16 }}>
                        {isActorCurrent ? "You (HR Admin)" : "System Actor"}
                      </div>
                      <span className={getActionBadgeClass(log.action)} style={{ marginTop: 6 }}>
                        {log.action}
                      </span>
                    </div>

                    {/* Metadata Items */}
                    <div className="drawer-info-item">
                      <div className="drawer-info-icon-box">
                        <Clock size={15} />
                      </div>
                      <div className="drawer-info-text">
                        <span className="drawer-info-label">Event Timestamp</span>
                        <span className="drawer-info-value">{formatTimestamp(log.created_at)}</span>
                      </div>
                    </div>

                    <div className="drawer-info-item">
                      <div className="drawer-info-icon-box">
                        <ClipboardList size={15} />
                      </div>
                      <div className="drawer-info-text" style={{ flex: 1 }}>
                        <span className="drawer-info-label">Event Log UUID</span>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {log.id}
                          </span>
                          <button 
                            onClick={() => handleCopyId(log.id, "log")}
                            style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", display: "inline-flex", padding: 4 }}
                            title="Copy ID"
                          >
                            {isCopied === `log-${log.id}` ? <Check size={14} style={{ color: "#10b981" }} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="drawer-info-item">
                      <div className="drawer-info-icon-box">
                        <User size={15} />
                      </div>
                      <div className="drawer-info-text" style={{ flex: 1 }}>
                        <span className="drawer-info-label">Actor User UUID</span>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {log.actor_id ?? "System Process"}
                          </span>
                          {log.actor_id && (
                            <button 
                              onClick={() => handleCopyId(log.actor_id!, "actor")}
                              style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", display: "inline-flex", padding: 4 }}
                              title="Copy ID"
                            >
                              {isCopied === `actor-${log.actor_id}` ? <Check size={14} style={{ color: "#10b981" }} /> : <Copy size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="drawer-info-item">
                      <div className="drawer-info-icon-box">
                        {getEntityIcon(log.entity_type)}
                      </div>
                      <div className="drawer-info-text" style={{ flex: 1 }}>
                        <span className="drawer-info-label">Target Entity details</span>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {log.entity_type} : {log.entity_id ?? "—"}
                          </span>
                          <div style={{ display: "flex", gap: 4 }}>
                            {log.entity_id && (
                              <button 
                                onClick={() => handleCopyId(log.entity_id!, "entity")}
                                style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", display: "inline-flex", padding: 4 }}
                                title="Copy ID"
                              >
                                {isCopied === `entity-${log.entity_id}` ? <Check size={14} style={{ color: "#10b981" }} /> : <Copy size={14} />}
                              </button>
                            )}
                            {log.entity_type.toLowerCase() === "employee" && log.entity_id && (
                              <a 
                                href={`/employees/${log.entity_id}`} 
                                style={{ color: "var(--primary-color)", display: "inline-flex", padding: 4 }}
                                title="View Employee details"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed changes comparisons */}
                    <div style={{ marginTop: 12 }}>
                      <span className="drawer-section-title">Changes Comparison Diffs</span>
                      {log.changes ? (
                        (() => {
                          const entries = Object.entries(log.changes);
                          if (entries.length === 0) return <p className="muted" style={{ fontSize: 13, margin: "8px 0" }}>No keys altered.</p>;
                          
                          return (
                            <div className="diff-comparison-box">
                              <table className="diff-table">
                                <thead>
                                  <tr>
                                    <th>Field Name</th>
                                    <th>Old Value</th>
                                    <th>New Value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {entries.map(([key, val]) => {
                                    let oldVal: React.ReactNode = "—";
                                    let newVal: React.ReactNode = "—";

                                    if (val && typeof val === "object" && !Array.isArray(val)) {
                                      if ("old" in val || "new" in val) {
                                        oldVal = (val as any).old !== undefined && (val as any).old !== null ? String((val as any).old) : "—";
                                        newVal = (val as any).new !== undefined && (val as any).new !== null ? String((val as any).new) : "—";
                                      } else {
                                        newVal = JSON.stringify(val);
                                      }
                                    } else {
                                      newVal = val !== undefined && val !== null ? String(val) : "—";
                                    }

                                    return (
                                      <tr key={key}>
                                        <td className="diff-field-name" style={{ fontSize: 12 }}>{key.replace(/_/g, " ")}</td>
                                        <td>
                                          {oldVal !== "—" ? (
                                            <span className="diff-val-removed" style={{ fontSize: 11.5 }}>{String(oldVal)}</span>
                                          ) : (
                                            <span className="muted">—</span>
                                          )}
                                        </td>
                                        <td>
                                          {newVal !== "—" ? (
                                            <span className="diff-val-added" style={{ fontSize: 11.5 }}>{String(newVal)}</span>
                                          ) : (
                                            <span className="muted">—</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()
                      ) : (
                        <p className="muted" style={{ fontSize: 13, margin: "8px 0" }}>No changes payload recorded.</p>
                      )}
                    </div>

                    {/* Raw JSON Accordion */}
                    <div style={{ marginTop: 8 }}>
                      <div 
                        className="drawer-relation-card" 
                        onClick={() => setRawJsonExpanded(!rawJsonExpanded)}
                        style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10 }}
                      >
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>
                          Raw Telemetry Data (JSON)
                        </span>
                        <ChevronRight 
                          size={16} 
                          style={{ 
                            transform: rawJsonExpanded ? "rotate(90deg)" : "none",
                            transition: "transform 0.2s ease",
                            color: "var(--text-muted)"
                          }} 
                        />
                      </div>
                      
                      {rawJsonExpanded && (
                        <pre className="json-raw-tree">
                          {JSON.stringify(log, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


