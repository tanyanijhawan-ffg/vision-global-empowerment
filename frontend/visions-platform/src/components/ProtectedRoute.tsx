import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser, type Role, hasRoleAccess } from '../lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  minimumRole?: Role;
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  minimumRole = 'FACILITATOR',
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!hasRoleAccess(user, minimumRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
