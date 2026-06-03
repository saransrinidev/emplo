import { useState } from "react";
import { employeesApi, type Employee } from "../api/employees";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import { useApi } from "../hooks/useApi";

interface TreeNode {
  employee: Employee;
  children: TreeNode[];
}

function buildTree(employees: Employee[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create nodes
  for (const emp of employees) {
    map.set(emp.id, { employee: emp, children: [] });
  }

  // Build parent-child relationships
  for (const emp of employees) {
    const node = map.get(emp.id)!;
    if (emp.manager_id && map.has(emp.manager_id)) {
      map.get(emp.manager_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export default function OrgChart() {
  const { data, loading, error } = useApi(() => employeesApi.list());
  const employees = data ?? [];
  const tree = buildTree(employees);

  return (
    <div>
      <PageHeader
        title="Organization Chart"
        subtitle="Employee reporting hierarchy."
      />
      <AsyncState loading={loading} error={error}>
        {tree.length === 0 ? (
          <p className="muted">No employees found.</p>
        ) : (
          <div className="org-tree">
            {tree.map((node) => (
              <TreeNodeComponent key={node.employee.id} node={node} level={0} />
            ))}
          </div>
        )}
      </AsyncState>
    </div>
  );
}

function TreeNodeComponent({ node, level }: { node: TreeNode; level: number }) {
  const [expanded, setExpanded] = useState(true);
  const emp = node.employee;
  const hasChildren = node.children.length > 0;

  return (
    <div className="tree-node" style={{ marginLeft: level * 24 }}>
      <div className="tree-card" onClick={() => hasChildren && setExpanded(!expanded)}>
        <div className="tree-connector">
          {level > 0 && <div className="tree-line" />}
          <div className="tree-dot" />
        </div>
        <div className="tree-info">
          <div className="tree-name">
            {hasChildren && (
              <span className="tree-toggle">{expanded ? "▾" : "▸"}</span>
            )}
            {emp.full_name}
          </div>
          <div className="tree-meta">
            <span>{emp.designation ?? "No designation"}</span>
            <span className="tree-sep">·</span>
            <span>{emp.department ?? "No department"}</span>
          </div>
          <div className="tree-meta">
            <span className="badge" style={{ fontSize: 11 }}>
              {emp.employee_code}
            </span>
            {hasChildren && (
              <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
                {node.children.length} direct report{node.children.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>
      {expanded && hasChildren && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.employee.id}
              node={child}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
