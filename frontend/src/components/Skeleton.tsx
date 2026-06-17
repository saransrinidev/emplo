/**
 * Skeleton loading placeholders.
 * Usage:
 *   <Skeleton.Card />          — full card shimmer
 *   <Skeleton.Table rows={5} /> — table placeholder
 *   <Skeleton.Text lines={3} /> — text block placeholder
 *   <Skeleton.Stat />          — dashboard stat card
 */

function Line({ width = "100%" }: { width?: string }) {
  return <div className="skeleton-line" style={{ width }} />;
}

function Card() {
  return (
    <div className="skeleton-card">
      <Line width="40%" />
      <Line width="70%" />
      <Line width="55%" />
    </div>
  );
}

function Stat() {
  return (
    <div className="skeleton-stat">
      <div className="skeleton-circle" />
      <div style={{ flex: 1 }}>
        <Line width="60%" />
        <Line width="40%" />
      </div>
    </div>
  );
}

function Table({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {Array.from({ length: cols }).map((_, i) => (
          <Line key={i} width={`${60 + Math.random() * 30}%`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Line key={colIdx} width={`${50 + Math.random() * 40}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Text({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-text">
      {Array.from({ length: lines }).map((_, i) => (
        <Line key={i} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

function PageHeader() {
  return (
    <div className="skeleton-page-header">
      <Line width="30%" />
      <Line width="50%" />
    </div>
  );
}

const Skeleton = { Line, Card, Stat, Table, Text, PageHeader };
export default Skeleton;
