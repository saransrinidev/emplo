import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../api/types";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  allowed: Role[];
}

/**
 * Route guard that restricts access based on user role.
 * If the user's role is not in the `allowed` list, redirects to dashboard.
 */
export default function RoleGuard({ children, allowed }: Props) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (!allowed.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
