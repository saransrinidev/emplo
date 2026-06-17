import type { ReactNode } from "react";
import { FileText, Users, Bell, Award, Calendar, Inbox, Search } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "search" | "compact";
}

const defaultIcons: Record<string, ReactNode> = {
  documents: <FileText size={40} />,
  employees: <Users size={40} />,
  notifications: <Bell size={40} />,
  certifications: <Award size={40} />,
  attendance: <Calendar size={40} />,
  search: <Search size={40} />,
  default: <Inbox size={40} />,
};

export default function EmptyState({ icon, title, description, action, variant = "default" }: EmptyStateProps) {
  return (
    <div className={`empty-state ${variant === "compact" ? "empty-state-compact" : ""}`}>
      <div className="empty-state-icon">
        {icon || defaultIcons.default}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

export { defaultIcons };
