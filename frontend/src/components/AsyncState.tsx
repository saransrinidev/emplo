import type { ReactNode } from "react";

interface Props {
  loading: boolean;
  error: string | null;
  children: ReactNode;
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cards" style={{ opacity: 0.5 }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="stat-card skeleton-card">
          <div className="skeleton-circle" />
          <div className="skeleton-lines">
            <div className="skeleton-line skeleton-line-sm" />
            <div className="skeleton-line skeleton-line-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AsyncState({ loading, error, children }: Props) {
  if (loading) return <LoadingSkeleton />;
  if (error) return <p className="error-text">{error}</p>;
  return <>{children}</>;
}
