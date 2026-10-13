import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getAuthHeaders } from '../lib/auth';

interface EditableUser {
  id: number | string;
  username: string;
  email: string;
  full_name: string;
  mobile_number?: string | null;
  role: string;
  region_id?: number | null;
}

interface UserEditDialogProps {
  user: EditableUser | null;
  onClose: () => void;
  onSaved: () => void;
}

interface RegionOption {
  id: number;
  name: string;
}

export default function UserEditDialog({ user, onClose, onSaved }: UserEditDialogProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [role, setRole] = useState('community_educator');
  const [regionId, setRegionId] = useState('');
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      setFullName(user.full_name);
      setMobileNumber(user.mobile_number || '');
      setRole(user.role === 'facilitator' ? 'community_educator' : user.role || 'community_educator');
      setRegionId(user.region_id ? String(user.region_id) : '');
      setError('');
      fetch('/api/regions/', { headers: { Accept: 'application/json', ...getAuthHeaders() } })
        .then(response => response.ok ? response.json() : [])
        .then(setRegions)
        .catch(() => setRegions([]));
    }
  }, [user]);

  if (!user) return null;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const digits = mobileNumber.replace(/\D/g, '');
      const normalizedMobile = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
      if (!/^\d{10}$/.test(normalizedMobile)) {
        throw new Error('Mobile number must be a valid 10-digit number.');
      }

      const response = await fetch(`/api/users/${user.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ username, email, full_name: fullName, mobile_number: mobileNumber, role: role === 'facilitator' ? 'community_educator' : role, region_id: regionId ? Number(regionId) : null }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.detail || 'Unable to update user.');
      onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Edit user</h2>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
          <label className="text-sm text-slate-700">Username<input value={username} onChange={e => setUsername(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
          <label className="text-sm text-slate-700">Email<input value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
          <label className="text-sm text-slate-700 sm:col-span-2">Full name<input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
          <label className="text-sm text-slate-700 sm:col-span-2">Mobile number<input value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" inputMode="numeric" pattern="[0-9]{10}" /></label>
          <label className="text-sm text-slate-700">Role<select value={role} onChange={e => setRole(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="super_admin">Super Admin</option><option value="regional_admin">Regional Admin</option><option value="community_educator">Community Educator</option></select></label>
          <label className="text-sm text-slate-700">Region<select value={regionId} onChange={e => setRegionId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">No region</option>{regions.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}</select></label>
        </div>
        {error && <p className="px-6 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4"><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button><button type="button" disabled={saving} onClick={save} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save changes'}</button></div>
      </div>
    </div>
  );
}