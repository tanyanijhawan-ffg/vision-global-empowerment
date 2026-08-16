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

export const USER_MAP: Record<string, AppUser> = {
  'kavitha@visionsglobal.org': {
    id: 'U-001',
    name: 'Kavitha Mani',
    email: 'kavitha@visionsglobal.org',
    role: 'SUPER_ADMIN',
    region: 'All',
    centre: 'All',
    status: 'Active',
  },
  'rajan@visionsglobal.org': {
    id: 'U-002',
    name: 'Rajan Pillai',
    email: 'rajan@visionsglobal.org',
    role: 'REGIONAL_ADMIN',
    region: 'Tamil Nadu South',
    centre: 'All',
    status: 'Active',
  },
  'meera@visionsglobal.org': {
    id: 'U-004',
    name: 'Meera Nair',
    email: 'meera@visionsglobal.org',
    role: 'FACILITATOR',
    region: 'Tamil Nadu South',
    centre: 'Madurai Centre A',
    status: 'Active',
  },
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
};

export const clearCurrentUser = () => {
  localStorage.removeItem('vge_user');
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
    '/masters/regions': ['SUPER_ADMIN', 'REGIONAL_ADMIN'],
    '/masters/districts': ['SUPER_ADMIN', 'REGIONAL_ADMIN'],
    '/masters/centres': ['SUPER_ADMIN', 'REGIONAL_ADMIN'],
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
