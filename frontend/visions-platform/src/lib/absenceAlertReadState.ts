import type { AbsenceAlert } from './api';
import { getCurrentUser } from './auth';

const READ_STATE_EVENT = 'vge-absence-alerts-read';

function storageKey() {
  const user = getCurrentUser();
  return `vge_read_absence_alerts:${user?.id ?? user?.email ?? 'anonymous'}`;
}

export function getReadAbsenceAlertKeys(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey()) ?? '[]');
    return Array.isArray(value) ? value.filter((key): key is string => typeof key === 'string') : [];
  } catch {
    return [];
  }
}

export function getAbsenceAlertKey(alert: AbsenceAlert): string {
  return `${alert.student_id}:${alert.last_absent_date}`;
}

export function markAbsenceAlertsRead(alerts: AbsenceAlert[]) {
  const readKeys = new Set(getReadAbsenceAlertKeys());
  alerts.forEach(alert => readKeys.add(getAbsenceAlertKey(alert)));
  localStorage.setItem(storageKey(), JSON.stringify([...readKeys]));
  window.dispatchEvent(new Event(READ_STATE_EVENT));
}

export const absenceAlertReadStateEvent = READ_STATE_EVENT;