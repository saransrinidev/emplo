import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface Crumb {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to="/" className="breadcrumb-item breadcrumb-home">
        <Home size={14} />
      </Link>
      {items.map((item, idx) => (
        <span key={idx} className="breadcrumb-segment">
          <ChevronRight size={12} className="breadcrumb-separator" />
          {item.to ? (
            <Link to={item.to} className="breadcrumb-item">{item.label}</Link>
          ) : (
            <span className="breadcrumb-item breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
