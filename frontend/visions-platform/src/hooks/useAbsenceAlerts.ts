import { useEffect, useState } from 'react';
import { fetchAbsenceAlerts, type AbsenceAlertSummary } from '../lib/api';

export default function useAbsenceAlerts() {
  const [summary, setSummary] = useState<AbsenceAlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await fetchAbsenceAlerts();
        if (!active) return;
        setSummary(result);
        setError('');
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Unable to load notifications.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    window.addEventListener('vge-attendance-change', load);
    const refreshTimer = window.setInterval(() => { void load(); }, 5 * 60 * 1000);
    return () => {
      active = false;
      window.removeEventListener('vge-attendance-change', load);
      window.clearInterval(refreshTimer);
    };
  }, []);

  return { summary, alerts: summary?.alerts ?? [], loading, error };
}