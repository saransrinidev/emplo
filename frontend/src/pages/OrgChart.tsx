import { useState, useEffect, useRef } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  Users, 
  Briefcase, 
  User, 
  Search, 
  Maximize2, 
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  ExternalLink,
  Mail,
  Calendar,
  Hash,
  LayoutGrid,
  List,
  Copy,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { employeesApi, type Employee } from "../api/employees";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import { useApi } from "../hooks/useApi";

interface TreeNode {
  employee: Employee;
  children: TreeNode[];
}

function buildTree(employees: Employee[]): { 
  roots: TreeNode[]; 
  unassigned: Employee[]; 
  allManagers: string[]; 
  parentMap: Map<string, string> 
} {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  const parentMap = new Map<string, string>(); 

  for (const emp of employees) {
    map.set(emp.id, { employee: emp, children: [] });
  }

  for (const emp of employees) {
    const node = map.get(emp.id)!;
    if (emp.manager_id && map.has(emp.manager_id)) {
      map.get(emp.manager_id)!.children.push(node);
      parentMap.set(emp.id, emp.manager_id);
    } else {
      roots.push(node);
    }
  }

  const hierarchyRoots: TreeNode[] = [];
  const unassigned: Employee[] = [];
  const allManagers: string[] = [];

  for (const node of roots) {
    if (node.children.length > 0) {
      hierarchyRoots.push(node);
    } else {
      unassigned.push(node.employee);
    }
  }

  for (const [id, node] of map.entries()) {
    if (node.children.length > 0) {
      allManagers.push(id);
    }
  }

  return { roots: hierarchyRoots, unassigned, allManagers, parentMap };
}

export default function OrgChart() {
  const { data, loading, error } = useApi(() => employeesApi.list());
  const employees = data ?? [];
  const { roots, unassigned, allManagers, parentMap } = buildTree(employees);

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"flow" | "tree">("flow");
  const [zoom, setZoom] = useState<number>(1.0);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (allManagers.length > 0 && !hasInitializedRef.current) {
      setExpandedNodes(new Set(allManagers));
      hasInitializedRef.current = true;
    }
  }, [allManagers]);

  useEffect(() => {
    if (!searchQuery.trim()) return;

    const matchedEmpIds = employees.filter(emp => 
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.designation && emp.designation.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (emp.department && emp.department.toLowerCase().includes(searchQuery.toLowerCase()))
    ).map(emp => emp.id);

    const toExpand = new Set(expandedNodes);
    
    for (const empId of matchedEmpIds) {
      let currentId = empId;
      while (parentMap.has(currentId)) {
        const managerId = parentMap.get(currentId)!;
        toExpand.add(managerId);
        currentId = managerId;
      }
    }
    
    setExpandedNodes(toExpand);
  }, [searchQuery]);

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => setExpandedNodes(new Set(allManagers));
  const handleCollapseAll = () => setExpandedNodes(new Set());
  const handleSelectEmployee = (emp: Employee) => setSelectedEmployee(emp);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewportRef.current) {
      setIsDragging(true);
      setStartX(e.pageX - viewportRef.current.offsetLeft);
      setStartY(e.pageY - viewportRef.current.offsetTop);
      setScrollLeft(viewportRef.current.scrollLeft);
      setScrollTop(viewportRef.current.scrollTop);
    }
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !viewportRef.current) return;
    e.preventDefault();
    const x = e.pageX - viewportRef.current.offsetLeft;
    const y = e.pageY - viewportRef.current.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    viewportRef.current.scrollLeft = scrollLeft - walkX;
    viewportRef.current.scrollTop = scrollTop - walkY;
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const totalEmployees = employees.length;
  const totalManagers = allManagers.length;
  const totalUnassigned = unassigned.length;
  const avgReports = totalManagers > 0 
    ? (employees.filter(e => e.manager_id).length / totalManagers).toFixed(1) 
    : "0.0";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <PageHeader
            title="Organization Chart"
            subtitle="Interactive employee reporting structure and insights."
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div className="premium-tabs-container" style={{ marginBottom: 0 }}>
            <button className={`premium-tab-btn ${viewMode === "flow" ? "premium-tab-btn-active" : ""}`} onClick={() => setViewMode("flow")}>
              <LayoutGrid size={15} /> Flowchart Canvas
            </button>
            <button className={`premium-tab-btn ${viewMode === "tree" ? "premium-tab-btn-active" : ""}`} onClick={() => setViewMode("tree")}>
              <List size={15} /> Compact Tree
            </button>
          </div>
          <div className="search-input-wrapper" style={{ maxWidth: 240 }}>
            <Search size={15} className="search-icon-inside" />
            <input className="input search-bar-input" placeholder="Search by name, role, dept..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ height: 38 }} />
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleExpandAll} style={{ height: 38, borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Maximize2 size={13} /> Expand All
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleCollapseAll} style={{ height: 38, borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Minimize2 size={13} /> Collapse All
          </button>
        </div>
      </div>

      <AsyncState loading={loading} error={error}>
        {employees.length > 0 && (
          <div className="org-metrics-row">
            <div className="metric-pill-card">
              <div className="metric-pill-icon metric-variant-indigo"><Users size={20} /></div>
              <div className="metric-pill-info"><span className="metric-pill-label">Total Hierarchy Members</span><span className="metric-pill-value">{totalEmployees}</span></div>
            </div>
            <div className="metric-pill-card">
              <div className="metric-pill-icon metric-variant-blue"><Briefcase size={20} /></div>
              <div className="metric-pill-info"><span className="metric-pill-label">Active Managers</span><span className="metric-pill-value">{totalManagers}</span></div>
            </div>
            <div className="metric-pill-card">
              <div className="metric-pill-icon metric-variant-green"><User size={20} /></div>
              <div className="metric-pill-info"><span className="metric-pill-label">Average Direct Reports</span><span className="metric-pill-value">{avgReports}</span></div>
            </div>
            <div className="metric-pill-card">
              <div className="metric-pill-icon metric-variant-amber"><Users size={20} /></div>
              <div className="metric-pill-info"><span className="metric-pill-label">Unassigned Personnel</span><span className="metric-pill-value">{totalUnassigned}</span></div>
            </div>
          </div>
        )}

        {roots.length === 0 && unassigned.length === 0 ? (
          <p className="muted">No employees found.</p>
        ) : (
          <>
            {viewMode === "flow" ? (
              <div className="org-canvas-viewport" ref={viewportRef} onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
                <div className="org-canvas-inner" style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: isDragging ? "none" : "transform 0.15s ease-out" }}>
                  {roots.map((node) => (
                    <FlowTreeNodeComponent key={node.employee.id} node={node} expandedNodes={expandedNodes} toggleNode={toggleNode} searchQuery={searchQuery} onSelectEmployee={handleSelectEmployee} isRoot={true} />
                  ))}
                </div>
                <div className="canvas-controls">
                  <button className="control-btn" onClick={() => setZoom(prev => Math.min(prev + 0.1, 1.5))}><ZoomIn size={16} /></button>
                  <button className="control-btn" onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}><ZoomOut size={16} /></button>
                  <div className="zoom-indicator">{Math.round(zoom * 100)}%</div>
                  <div className="control-divider" />
                  <button className="control-btn" onClick={() => setZoom(1.0)}><RotateCcw size={14} /></button>
                </div>
              </div>
            ) : (
              roots.length > 0 && (
                <div className="org-tree">
                  {roots.map((node) => (
                    <TreeNodeComponent key={node.employee.id} node={node} level={0} expandedNodes={expandedNodes} toggleNode={toggleNode} searchQuery={searchQuery} onSelectEmployee={handleSelectEmployee} />
                  ))}
                </div>
              )
            )}

            {unassigned.length > 0 && (
              <div style={{ marginTop: 44 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Not Assigned in Tree</h2>
                  <span className="badge" style={{ fontSize: 11, padding: "2px 6px", borderRadius: 12 }}>{unassigned.length}</span>
                </div>
                <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>These employees don't have a reporting manager assigned yet.</p>
                <div className="unassigned-grid">
                  {unassigned.map((emp) => {
                    const initials = emp.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "EE";
                    let hash = 0;
                    for (let i = 0; i < emp.email.length; i++) hash = emp.email.charCodeAt(i) + ((hash << 5) - hash);
                    const gradients = ["linear-gradient(135deg, #031273 0%, #041890 100%)", "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)", "linear-gradient(135deg, #10b981 0%, #059669 100%)", "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)", "linear-gradient(135deg, #031273 0%, #031273 100%)"];
                    const gradient = gradients[Math.abs(hash) % gradients.length];
                    const matchesSearch = searchQuery && (emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || (emp.designation && emp.designation.toLowerCase().includes(searchQuery.toLowerCase())) || (emp.department && emp.department.toLowerCase().includes(searchQuery.toLowerCase())));
                    return (
                      <div key={emp.id} className={`unassigned-card ${matchesSearch ? "tree-card-highlighted" : ""}`} onClick={() => handleSelectEmployee(emp)} style={{ cursor: "pointer" }}>
                        <div className="flow-avatar" style={{ background: gradient }}>{initials}</div>
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.full_name}</span>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.designation ?? "—"} · {emp.department ?? "—"}</span>
                        </div>
                        <div className="tree-card-badge">{emp.employee_code}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </AsyncState>

      <AnimatePresence>
        {selectedEmployee && (
          <>
            <motion.div className="drawer-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedEmployee(null)} />
            <motion.div className="drawer-content" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 220 }}>
              <div className="drawer-header">
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-secondary)" }}>Employee Details</h3>
                <button className="drawer-close" onClick={() => setSelectedEmployee(null)}><X size={16} /></button>
              </div>
              {(() => {
                const emp = selectedEmployee;
                const initials = emp.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "EE";
                let hash = 0;
                for (let i = 0; i < emp.email.length; i++) hash = emp.email.charCodeAt(i) + ((hash << 5) - hash);
                const gradients = ["linear-gradient(135deg, #031273 0%, #041890 100%)", "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)", "linear-gradient(135deg, #10b981 0%, #059669 100%)", "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)", "linear-gradient(135deg, #031273 0%, #031273 100%)"];
                const gradient = gradients[Math.abs(hash) % gradients.length];
                const managerNode = emp.manager_id ? employees.find(e => e.id === emp.manager_id) : null;
                const directReports = employees.filter(e => e.manager_id === emp.id);
                return (
                  <>
                    <div className="drawer-profile-header">
                      <div className="drawer-avatar" style={{ background: gradient }}>{initials}</div>
                      <div className="drawer-name">{emp.full_name}</div>
                      <div className="drawer-title">{emp.designation ?? "Employee"} · {emp.department ?? "N/A"}</div>
                      <span className="badge badge-solid" style={{ background: emp.employment_status === "Active" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", color: emp.employment_status === "Active" ? "#10b981" : "#ef4444", border: "1px solid currentColor", fontSize: 10.5, padding: "3px 8px", borderRadius: 8 }}>{emp.employment_status}</span>
                    </div>
                    <div className="drawer-info-grid">
                      <div className="drawer-info-item">
                        <div className="drawer-info-icon-box"><Hash size={15} /></div>
                        <div className="drawer-info-text"><span className="drawer-info-label">Employee Code</span><span className="drawer-info-value">{emp.employee_code}</span></div>
                      </div>
                      <div className="drawer-info-item">
                        <div className="drawer-info-icon-box"><Mail size={15} /></div>
                        <div className="drawer-info-text" style={{ flex: 1 }}>
                          <span className="drawer-info-label">Email Address</span>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.email}</span>
                            <button onClick={() => copyEmail(emp.email)} style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", display: "inline-flex", padding: 4 }} title="Copy Email">{isCopied ? <Check size={14} style={{ color: "#10b981" }} /> : <Copy size={14} />}</button>
                          </div>
                        </div>
                      </div>
                      <div className="drawer-info-item">
                        <div className="drawer-info-icon-box"><Briefcase size={15} /></div>
                        <div className="drawer-info-text"><span className="drawer-info-label">Department & Title</span><span className="drawer-info-value">{emp.department ?? "N/A"} · {emp.designation ?? "N/A"}</span></div>
                      </div>
                      <div className="drawer-info-item">
                        <div className="drawer-info-icon-box"><Calendar size={15} /></div>
                        <div className="drawer-info-text"><span className="drawer-info-label">Joining Date</span><span className="drawer-info-value">{emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}</span></div>
                      </div>
                      {managerNode && (
                        <div style={{ marginTop: 8 }}>
                          <span className="drawer-section-title">Direct Manager</span>
                          <div className="drawer-relation-card" onClick={() => { setSelectedEmployee(managerNode); const nextExpanded = new Set(expandedNodes); let cur = managerNode.id; while (parentMap.has(cur)) { const par = parentMap.get(cur)!; nextExpanded.add(par); cur = par; } setExpandedNodes(nextExpanded); }}>
                            <div className="drawer-relation-avatar" style={{ background: gradients[Array.from(managerNode.email).reduce((acc, c) => acc + c.charCodeAt(0), 0) % gradients.length] }}>{managerNode.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}</div>
                            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{managerNode.full_name}</span>
                              <span style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{managerNode.designation ?? "Manager"}</span>
                            </div>
                            <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                          </div>
                        </div>
                      )}
                      {directReports.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <span className="drawer-section-title">Direct Reports ({directReports.length})</span>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto", paddingRight: 4 }}>
                            {directReports.map(report => {
                              const rInit = report.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                              const rGrad = gradients[Array.from(report.email).reduce((acc, c) => acc + c.charCodeAt(0), 0) % gradients.length];
                              return (
                                <div key={report.id} className="drawer-relation-card" onClick={() => { setSelectedEmployee(report); const nextExpanded = new Set(expandedNodes); nextExpanded.add(emp.id); setExpandedNodes(nextExpanded); }}>
                                  <div className="drawer-relation-avatar" style={{ background: rGrad }}>{rInit}</div>
                                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{report.full_name}</span>
                                    <span style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{report.designation ?? "Employee"}</span>
                                  </div>
                                  <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="drawer-footer">
                      <a className="btn btn-sm" href={`/employees/${emp.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", textDecoration: "none" }}><ExternalLink size={13} /> View Full Profile</a>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function FlowTreeNodeComponent({ node, expandedNodes, toggleNode, searchQuery, onSelectEmployee, isRoot = false }: { node: TreeNode; expandedNodes: Set<string>; toggleNode: (id: string) => void; searchQuery: string; onSelectEmployee: (emp: Employee) => void; isRoot?: boolean; }) {
  const emp = node.employee;
  const hasChildren = node.children.length > 0;
  const expanded = expandedNodes.has(emp.id);
  const initials = emp.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "EE";
  let hash = 0;
  for (let i = 0; i < emp.email.length; i++) hash = emp.email.charCodeAt(i) + ((hash << 5) - hash);
  const gradients = ["linear-gradient(135deg, #031273 0%, #041890 100%)", "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)", "linear-gradient(135deg, #10b981 0%, #059669 100%)", "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)", "linear-gradient(135deg, #031273 0%, #031273 100%)"];
  const gradient = gradients[Math.abs(hash) % gradients.length];
  const matchesSearch = searchQuery && (emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || (emp.designation && emp.designation.toLowerCase().includes(searchQuery.toLowerCase())) || (emp.department && emp.department.toLowerCase().includes(searchQuery.toLowerCase())));
  return (
    <div className="flow-node-wrapper">
      <div className={`flow-card-container ${!expanded ? "collapsed" : ""} ${!hasChildren ? "no-children" : ""}`}>
        <div className={`flow-card ${isRoot ? "flow-card-root" : ""} ${matchesSearch ? "flow-card-highlighted" : ""}`} onClick={() => onSelectEmployee(emp)}>
          <div className="flow-avatar" style={{ background: gradient }}>{initials}</div>
          <div className="flow-details">
            <span className="flow-name">{emp.full_name}</span>
            <span className="flow-sub">{emp.designation ?? "Employee"}</span>
          </div>
          {hasChildren && <div className="flow-reports-badge" onClick={(e) => { e.stopPropagation(); toggleNode(emp.id); }} style={{ cursor: "pointer" }} title={expanded ? "Collapse team" : "Expand team"}>{node.children.length}</div>}
        </div>
      </div>
      {hasChildren && expanded && (
        <div className="flow-children-row">
          {node.children.map((child) => (
            <FlowTreeNodeComponent key={child.employee.id} node={child} expandedNodes={expandedNodes} toggleNode={toggleNode} searchQuery={searchQuery} onSelectEmployee={onSelectEmployee} isRoot={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeNodeComponent({ node, level, expandedNodes, toggleNode, searchQuery, onSelectEmployee }: { node: TreeNode; level: number; expandedNodes: Set<string>; toggleNode: (id: string) => void; searchQuery: string; onSelectEmployee: (emp: Employee) => void; }) {
  const emp = node.employee;
  const hasChildren = node.children.length > 0;
  const expanded = expandedNodes.has(emp.id);
  const initials = emp.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "EE";
  let hash = 0;
  for (let i = 0; i < emp.email.length; i++) hash = emp.email.charCodeAt(i) + ((hash << 5) - hash);
  const gradients = ["linear-gradient(135deg, #031273 0%, #041890 100%)", "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)", "linear-gradient(135deg, #10b981 0%, #059669 100%)", "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)", "linear-gradient(135deg, #031273 0%, #031273 100%)"];
  const gradient = gradients[Math.abs(hash) % gradients.length];
  const matchesSearch = searchQuery && (emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || (emp.designation && emp.designation.toLowerCase().includes(searchQuery.toLowerCase())) || (emp.department && emp.department.toLowerCase().includes(searchQuery.toLowerCase())));
  return (
    <div className="tree-node">
      <div className={`tree-card ${level === 0 ? "tree-card-root" : ""} ${matchesSearch ? "tree-card-highlighted" : ""}`} onClick={() => onSelectEmployee(emp)}>
        <div className="tree-card-left">
          <div className="tree-card-avatar" style={{ background: gradient, color: "#ffffff" }}>{initials}</div>
          <div className="tree-card-info">
            <span className="tree-card-name">{emp.full_name}</span>
            <span className="tree-card-sub">{emp.designation ?? "—"} · {emp.department ?? "—"}</span>
          </div>
        </div>
        <div className="tree-card-right">
          <span className="tree-card-badge">{emp.employee_code}</span>
          {hasChildren && <span className="badge badge-solid" style={{ fontSize: 10, background: "rgba(3, 18, 115, 0.12)", color: "#031273", border: "1px solid rgba(3, 18, 115, 0.2)", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); toggleNode(emp.id); }}>{node.children.length} report{node.children.length > 1 ? "s" : ""}</span>}
          {hasChildren && <div className="tree-card-toggle" onClick={(e) => { e.stopPropagation(); toggleNode(emp.id); }} style={{ cursor: "pointer" }}>{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</div>}
        </div>
      </div>
      {expanded && hasChildren && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNodeComponent key={child.employee.id} node={child} level={level + 1} expandedNodes={expandedNodes} toggleNode={toggleNode} searchQuery={searchQuery} onSelectEmployee={onSelectEmployee} />
          ))}
        </div>
      )}
    </div>
  );
}
