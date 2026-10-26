import { useEffect, useState } from 'react';
import { Edit2, Search, Trash2, X } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { getAuthHeaders, getCurrentUser } from '../../lib/auth';

type TribalCommunity = { id: number; name: string };

export default function TribalCommunitiesList() {
  const canManage = getCurrentUser()?.role === 'SUPER_ADMIN';
  const [data, setData] = useState<TribalCommunity[]>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const response = await fetch('/api/masters/tribal-communities/', { headers: { ...getAuthHeaders(), Accept: 'application/json' } });
    if (!response.ok) throw new Error('Unable to load tribal communities.');
    setData(await response.json());
  };

  useEffect(() => { load().catch(loadError => setError(loadError.message)); }, []);

  const filteredData = data.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch(editingId ? `/api/masters/tribal-communities/${editingId}/` : '/api/masters/tribal-communities/', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) { setError('Unable to save community.'); return; }
    await load();
    setIsFormOpen(false);
    setEditingId(null);
    setName('');
  };

  const closeForm = () => { setIsFormOpen(false); setEditingId(null); setName(''); };
  const openAddForm = () => { setEditingId(null); setName(''); setIsFormOpen(true); };

  const remove = async (id: number) => {
    if (!window.confirm('Delete this community?')) return;
    const response = await fetch(`/api/masters/tribal-communities/${id}/`, { method: 'DELETE', headers: getAuthHeaders() });
    if (!response.ok) { setError('Unable to delete community.'); return; }
    await load();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Tribal Communities / Sub-Castes"
        subtitle="Configurable community and sub-caste names used in student registration."
        action={canManage ? (
          <button onClick={openAddForm} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">Add Community</button>
        ) : undefined}
      />

      <div className="xl:bg-white xl:border xl:border-slate-200 xl:rounded-xl xl:shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search communities..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Cards on small screens */}
        <div className="xl:hidden space-y-3 p-3">
          {filteredData.map(item => (
            <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-start justify-between gap-3">
              <div className="font-medium text-slate-900 truncate">{item.name}</div>
              {canManage ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { setEditingId(item.id); setName(item.name); setIsFormOpen(true); }} title="Edit" className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                  <button onClick={() => remove(item.id)} title="Delete" className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Table on lg+ screens */}
        <div className="overflow-x-auto hidden xl:block">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Community / Sub-Caste Name</th>
                {canManage ? <th className="px-6 py-3 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                  {canManage ? (
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => { setEditingId(item.id); setName(item.name); setIsFormOpen(true); }} title="Edit" className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                        <button onClick={() => remove(item.id)} title="Delete" className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!error && filteredData.length === 0 ? <p className="p-12 text-center text-slate-400">No communities found.</p> : null}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form onSubmit={save} className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Community' : 'Add Community'}</h2>
              <button type="button" onClick={closeForm} aria-label="Close"><X size={18} /></button>
            </div>
            <label className="block text-sm font-medium text-slate-700"><span className="text-red-600">Community / Sub-Caste Name</span><span className="text-red-500"> *</span>
              <input required value={name} onChange={event => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
            </label>
            <button className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white">{editingId ? 'Save Community' : 'Add Community'}</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
