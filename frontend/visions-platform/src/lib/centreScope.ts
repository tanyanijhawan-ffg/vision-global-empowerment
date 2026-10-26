import type { AppUser } from './auth';

export interface CentreScopeRow {
  id: number;
  name?: string | null;
  centre_name?: string | null;
  region?: string | null;
  region_name?: string | null;
  facilitator_name?: string | null;
  centre_id?: number;
}

const normalized = (value?: string | number | null) => String(value ?? '').trim().toLocaleLowerCase();

export function getUserScopedCentres<T extends CentreScopeRow>(centres: T[], user: AppUser | null): T[] {
  if (!user) return [];
  if (user.role === 'SUPER_ADMIN') return centres;

  const region = normalized(user.region);
  if (!region || region === 'all') return [];

  return centres.filter(centre => {
    if (normalized(centre.region || centre.region_name) !== region) return false;
    if (user.role === 'REGIONAL_ADMIN') return true;

    if (user.centreId != null) return Number(centre.id ?? centre.centre_id) === user.centreId;
    const assignedCentre = normalized(user.centre);
    return Boolean(assignedCentre && assignedCentre !== 'all') && normalized(centre.name || centre.centre_name) === assignedCentre;
  });
}
