import { useEffect, useState } from 'react';
import { getAuthHeaders, getCurrentUser, getRoleLabel, setCurrentUserFromApi } from '../../lib/auth';

interface UserProfileResponse {
  id: number | string;
  username: string;
  email: string;
  full_name: string;
  mobile_number?: string | null;
  role: string;
  region_id?: number | null;
  region_name?: string | null;
}

export default function ProfileSettings() {
  const currentUser = getCurrentUser();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    fetch(`/api/users/${currentUser.id}/`, { headers: { Accept: 'application/json', ...getAuthHeaders() } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to load profile.')))
      .then((data: UserProfileResponse) => {
        setProfile(data);
        setFullName(data.full_name || '');
        setEmail(data.email || '');
        setMobileNumber(data.mobile_number || '');
      })
      .catch(error => setStatus(error instanceof Error ? error.message : 'Unable to load profile.'));
  }, [currentUser?.id]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setStatus('');
    try {
      const digits = mobileNumber.replace(/\D/g, '');
      const normalizedMobile = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
      if (!/^\d{10}$/.test(normalizedMobile)) {
        throw new Error('Mobile number must be a valid 10-digit number.');
      }

      const response = await fetch(`/api/users/${profile.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ full_name: fullName, email, mobile_number: mobileNumber }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.detail || 'Unable to save profile.');
      setProfile(payload);
      setCurrentUserFromApi(payload);
      setStatus('Profile saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const initials = (fullName || currentUser?.name || 'User').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="p-6 md:p-8">
      <h2 className="mb-6 text-lg font-bold text-slate-900">Profile Settings</h2>
      <div className="max-w-lg space-y-6">
        <div className="flex items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-indigo-200 bg-indigo-100 text-2xl font-bold text-indigo-600">{initials}</div>
          <div><p className="font-medium text-slate-900">{profile?.username || currentUser?.email}</p><p className="text-xs text-slate-500">{getRoleLabel(profile?.role)}</p></div>
        </div>
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <label className="block text-sm font-medium text-slate-700">Full name<input value={fullName} onChange={event => setFullName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="block text-sm font-medium text-slate-700">Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="block text-sm font-medium text-slate-700">Mobile number<input type="tel" value={mobileNumber} onChange={event => setMobileNumber(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" inputMode="numeric" pattern="[0-9]{10}" /></label>
          <div className="text-sm text-slate-500">Region: {profile?.region_name || 'Not assigned'}</div>
        </div>
        {status && <p className="text-sm text-slate-600">{status}</p>}
        <div className="flex justify-end"><button type="button" disabled={saving || !profile} onClick={save} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save changes'}</button></div>
      </div>
    </div>
  );
}
