import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { clearCurrentUser, getAuthHeaders, getCurrentUser, setCurrentUserFromApi, type AppUser, type Role, hasRoleAccess } from '../lib/auth';

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
  const cachedUserId = getCurrentUser()?.id;
  const [user, setUser] = useState<AppUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    if (!cachedUserId) {
      setUser(null);
      setCheckingSession(false);
      return () => { active = false; };
    }

    fetch(`/api/users/${encodeURIComponent(cachedUserId)}/`, {
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Session verification failed.')))
      .then(payload => {
        if (!active) return;
        setUser(setCurrentUserFromApi(payload));
        setCheckingSession(false);
      })
      .catch(() => {
        if (!active) return;
        clearCurrentUser();
        setUser(null);
        setCheckingSession(false);
      });

    return () => { active = false; };
  }, [cachedUserId]);

  if (checkingSession) {
    return <div className="p-6 text-sm text-slate-500">Verifying your session…</div>;
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!hasRoleAccess(user, minimumRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
