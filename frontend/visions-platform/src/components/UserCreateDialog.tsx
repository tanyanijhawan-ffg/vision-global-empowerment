import { useEffect, useMemo, useState } from 'react';
import { X, ShieldCheck, UserPlus } from 'lucide-react';
import { getAuthHeaders } from '../lib/auth';

interface RegionOption {
  id: number;
  name: string;
}

interface UserCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  currentUserRole: 'SUPER_ADMIN' | 'REGIONAL_ADMIN' | 'FACILITATOR';
  currentUserRegion?: string;
}

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'regional_admin', label: 'Regional Admin' },
  { value: 'community_educator', label: 'Community Educator' },
] as const;

export default function UserCreateDialog({
  open,
  onClose,
  onCreated,
  currentUserRole,
  currentUserRegion,
}: UserCreateDialogProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'super_admin' | 'regional_admin' | 'community_educator'>('community_educator');
  const [region, setRegion] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [regionOptions, setRegionOptions] = useState<RegionOption[]>([]);

  useEffect(() => {
    if (!open) return;

    fetch('/api/regions/', {
      headers: {
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((regions: RegionOption[]) => setRegionOptions(regions))
      .catch(() => setRegionOptions([]));
  }, [open]);

  const filteredRegionOptions = useMemo(() => {
    if (currentUserRole === 'REGIONAL_ADMIN') {
      return regionOptions.filter((candidate) => candidate.name === currentUserRegion);
    }

    return regionOptions;
  }, [currentUserRole, currentUserRegion, regionOptions]);

  useEffect(() => {
    if (!open) return;

    if (currentUserRole === 'REGIONAL_ADMIN') {
      setRole('community_educator');
      const firstRegion = filteredRegionOptions[0]?.id ?? '';
      setRegion(firstRegion);
    } else if (currentUserRole === 'SUPER_ADMIN') {
      setRole('regional_admin');
      setRegion(filteredRegionOptions[0]?.id ?? '');
    } else {
      setRole('community_educator');
      setRegion('');
    }
  }, [open, currentUserRole, filteredRegionOptions]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!fullName.trim() || !username.trim() || !email.trim() || !mobileNumber.trim() || !password || !region) {
      setError('Full name, username, email, mobile number, password, and region are required.');
      return;
    }

    const digits = mobileNumber.replace(/\D/g, '');
    const normalizedMobile = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
    if (!/^\d{10}$/.test(normalizedMobile)) {
      setError('Mobile number must be a valid 10-digit number.');
      return;
    }

    if (currentUserRole === 'REGIONAL_ADMIN' && role !== 'community_educator') {
      setError('Regional admins can only create community educators.');
      return;
    }

    if (currentUserRole === 'REGIONAL_ADMIN' && (!region || String(region) !== String(filteredRegionOptions[0]?.id ?? ''))) {
      setError('Regional admins can only create community educators in their own region.');
      return;
    }

    if (currentUserRole === 'FACILITATOR') {
      setError('Community educators cannot create users.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          username,
          email,
          password,
          full_name: fullName,
          mobile_number: mobileNumber,
          role,
          region: Number(region),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.detail || payload?.non_field_errors?.[0] || payload?.role?.[0] || 'Unable to create user.';
        throw new Error(message);
      }

      onCreated();
      onClose();
      setFullName('');
      setUsername('');
      setEmail('');
      setMobileNumber('');
      setPassword('');
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to create user.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Create User</h3>
              <p className="text-sm text-slate-500">Add a new access user</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              Full name
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                placeholder="Enter full name"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                placeholder="username"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                placeholder="name@company.com"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Mobile number
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                placeholder="e.g. 9876543210"
                inputMode="numeric"
                pattern="[0-9]{10}"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                placeholder="Create strong password"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'super_admin' | 'regional_admin' | 'community_educator')}
                disabled={currentUserRole !== 'SUPER_ADMIN'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Region
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value ? Number(e.target.value) : '')}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                disabled={currentUserRole === 'FACILITATOR'}
              >
                {filteredRegionOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <ShieldCheck size={16} />
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
