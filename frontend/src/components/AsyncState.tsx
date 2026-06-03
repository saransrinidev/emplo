import type { ReactNode } from "react";

interface Props {
  loading: boolean;
  error: string | null;
  children: ReactNode;
}

// Renders a loading line or an error line, otherwise the children.
export default function AsyncState({ loading, error, children }: Props) {
  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="error-text">{error}</p>;
  return <>{children}</>;
}
