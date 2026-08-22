export type Role = 'SUPER_ADMIN' | 'REGIONAL_ADMIN' | 'FACILITATOR';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  region: string;
  centre: string;
  status: 'Active' | 'Inactive';
}

export type BackendRoleName = 'super_admin' | 'regional_admin' | 'facilitator';

const AUTH_TOKEN_KEY = 'vge_auth_token';

export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Token ${token}` } : {};
};

export const setAuthToken = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

export function normalizeRole(role?: string | null): Role {
  switch (role) {
    case 'super_admin':
      return 'SUPER_ADMIN';
    case 'regional_admin':
      return 'REGIONAL_ADMIN';
    case 'facilitator':
      return 'FACILITATOR';
    default:
      return 'FACILITATOR';
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  REGIONAL_ADMIN: 'Regional Admin',
  FACILITATOR: 'Facilitator',
};

export const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 3,
  REGIONAL_ADMIN: 2,
  FACILITATOR: 1,
};

export const getCurrentUser = (): AppUser | null => {
  try {
    const raw = localStorage.getItem('vge_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppUser;
    return parsed && parsed.email ? parsed : null;
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: AppUser) => {
  localStorage.setItem('vge_user', JSON.stringify(user));
  window.dispatchEvent(new Event('vge-auth-change'));
};

export const setCurrentUserFromApi = (payload: {
  id?: number | string;
  username?: string;
  email?: string;
  full_name?: string;
  role?: string;
  region_id?: number | null;
  region_name?: string | null;
}) => {
  const backendUser = payload ?? {};
  const user: AppUser = {
    id: String(backendUser.id ?? backendUser.username ?? 'unknown'),
    name: backendUser.full_name || backendUser.username || 'User',
    email: backendUser.email || backendUser.username || '',
    role: normalizeRole(backendUser.role),
    region: backendUser.region_name || 'All',
    centre: 'All',
    status: 'Active',
  };

  setCurrentUser(user);
  return user;
};

export const clearCurrentUser = () => {
  localStorage.removeItem('vge_user');
  clearAuthToken();
  window.dispatchEvent(new Event('vge-auth-change'));
};

export const getUserInitials = (user: AppUser | null) => {
  if (!user?.name) return 'U';
  return user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export const hasRoleAccess = (user: AppUser | null, minimumRole: Role): boolean => {
  if (!user) return false;
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minimumRole];
};

export const isUserAllowedForRegion = (user: AppUser | null, region: string | null | undefined) => {
  if (!user || !region) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'REGIONAL_ADMIN') return user.region === 'All' || user.region === region;
  return user.region === region && user.centre !== 'All';
};

export const isUserAllowedForCentre = (user: AppUser | null, region: string | null | undefined, centre: string | null | undefined) => {
  if (!user || !region || !centre) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'REGIONAL_ADMIN') return user.region === 'All' || user.region === region;
  return user.region === region && user.centre === centre;
};

export const filterUserScopedRows = <T extends { region?: string | null; centre?: string | null }>(rows: T[], user: AppUser | null): T[] => {
  if (!user) return rows;

  if (user.role === 'SUPER_ADMIN') return rows;

  return rows.filter((row) => {
    const region = row.region ?? 'Unknown';
    const centre = row.centre ?? 'Unknown';

    if (user.role === 'REGIONAL_ADMIN') {
      return user.region === 'All' || user.region === region;
    }

    return user.region === region && user.centre === centre;
  });
};

export const getRouteAccess = (role: Role, path: string) => {
  const routeRules: Record<string, Role[]> = {
    '/dashboard': ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'FACILITATOR'],
    '/masters/regions': ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'FACILITATOR'],
    '/masters/centres': ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'FACILITATOR'],
    '/students': ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'FACILITATOR'],
    '/students/new': ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'FACILITATOR'],
    '/attendance': ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'FACILITATOR'],
    '/attendance/entry': ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'FACILITATOR'],
    '/academics': ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'FACILITATOR'],
    '/academics/entry': ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'FACILITATOR'],
    '/academics/tracking': ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'FACILITATOR'],
    '/leadership': ['SUPER_ADMIN', 'REGIONAL_ADMIN'],
    '/leadership/training': ['SUPER_ADMIN', 'REGIONAL_ADMIN'],
    '/reports': ['SUPER_ADMIN', 'REGIONAL_ADMIN'],
    '/users': ['SUPER_ADMIN'],
    '/settings': ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'FACILITATOR'],
  };

  const allowedRoles = routeRules[path] ?? ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'FACILITATOR'];
  return allowedRoles.includes(role);
};
