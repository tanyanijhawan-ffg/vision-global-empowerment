import { useEffect, useState } from 'react';
import { Search, Plus, Edit2, ShieldAlert } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatusChip from '../../components/StatusChip';
import UserCreateDialog from '../../components/UserCreateDialog';
import UserEditDialog from '../../components/UserEditDialog';
import { getAuthHeaders, getCurrentUser, normalizeRole } from '../../lib/auth';

interface UserRow {
  id: number | string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  region_id?: number | null;
  region_name?: string | null;
}

export default function UsersList() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const currentUser = getCurrentUser();
  const activeRole = currentUser?.role ?? 'FACILITATOR';

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users/', {
        headers: {
          Accept: 'application/json',
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load users (${response.status})`);
      }

      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : payload.results ?? [];
      setUsers(rows);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;

    return [user.full_name, user.username, user.email, user.role].join(' ').toLowerCase().includes(q);
  });

  const canCreateUser = activeRole === 'SUPER_ADMIN' || activeRole === 'REGIONAL_ADMIN';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="System Users" 
        subtitle="Manage platform access, roles, and permissions."
        action={
          canCreateUser ? (
            <button
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add User
            </button>
          ) : null
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-10 text-sm text-slate-500">Loading users...</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Region</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const roleLabel = normalizeRole(user.role);
                    return (
                      <tr key={String(user.id)} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 text-sm border border-indigo-100 shrink-0">
                              {(user.full_name || user.username || 'U').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{user.full_name || user.username}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                            roleLabel === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            roleLabel === 'REGIONAL_ADMIN' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {roleLabel === 'SUPER_ADMIN' && <ShieldAlert size={12} />}
                            {roleLabel === 'SUPER_ADMIN' ? 'Super Admin' : roleLabel === 'REGIONAL_ADMIN' ? 'Regional Admin' : 'Facilitator'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-900">{user.region_name ?? '—'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusChip status="Active" />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setEditingUser(user)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors" title="Edit user">
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <UserCreateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={fetchUsers}
        currentUserRole={activeRole}
        currentUserRegion={currentUser?.region || undefined}
      />
      <UserEditDialog user={editingUser} onClose={() => setEditingUser(null)} onSaved={fetchUsers} />
    </div>
  );
}