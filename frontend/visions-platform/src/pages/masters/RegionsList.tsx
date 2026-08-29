import { useEffect, useState } from 'react';
import { Edit2, Search, Trash2, X } from 'lucide-react';
import StatusChip from '../../components/StatusChip';
import PageHeader from '../../components/PageHeader';
import MasterDataActions from '../../components/MasterDataActions';
import { getAuthHeaders, getCurrentUser } from '../../lib/auth';

type Region = { id: number; region_name: string; state: string | null; status: string | null };
const blankRegion = { region_name: '', state: '', status: 'active' };

export default function RegionsList() {
  const canManage = getCurrentUser()?.role === 'SUPER_ADMIN';
  const [data, setData] = useState<Region[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(blankRegion);
  const [error, setError] = useState('');

  const loadRegions = async () => {
    const response = await fetch('/api/masters/regions/', { headers: { ...getAuthHeaders(), Accept: 'application/json' } });
    if (!response.ok) throw new Error('Unable to load regions.');
    setData(await response.json());
  };

  useEffect(() => { loadRegions().catch(error => setError(error.message)); }, []);

  const createRegion = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch(editingId ? `/api/masters/regions/${editingId}/` : '/api/masters/regions/', { method: editingId ? 'PATCH' : 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!response.ok) { setError('Unable to create region.'); return; }
    await loadRegions();
    setIsFormOpen(false);
    setEditingId(null);
    setForm(blankRegion);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(blankRegion);
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(blankRegion);
    setIsFormOpen(true);
  };

  const deleteRegion = async (id: number) => {
    if (!window.confirm('Delete this region and its linked records?')) return;
    const response = await fetch(`/api/masters/regions/${id}/`, { method: 'DELETE', headers: getAuthHeaders() });
    if (!response.ok) { setError('Unable to delete region.'); return; }
    await loadRegions();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader 
        title="Regions" 
        subtitle="Manage geographic regions and their assigned states."
        action={
          canManage ? <MasterDataActions resource="regions" onAdd={openAddForm} onUploaded={() => loadRegions().catch(error => setError(error.message))} /> : undefined
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search regions..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Region Name</th>
                <th className="px-6 py-3">State</th>
                <th className="px-6 py-3">Status</th>
                {canManage ? <th className="px-6 py-3 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((region) => (
                <tr key={region.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{region.region_name}</td>
                  <td className="px-6 py-4">{region.state || '-'}</td>
                  <td className="px-6 py-4">{region.status ? <StatusChip status={region.status} /> : '-'}</td>
                  {canManage ? <td className="px-6 py-4 text-right"><button onClick={() => { setEditingId(region.id); setForm({ region_name: region.region_name, state: region.state || '', status: region.status || 'active' }); setIsFormOpen(true); }} title="Edit region" className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button><button onClick={() => deleteRegion(region.id)} title="Delete region" className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {isFormOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={createRegion} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId ? 'Edit Region' : 'Add Region'}</h2><button type="button" onClick={closeForm} aria-label="Close"><X size={18} /></button></div><label className="block text-sm font-medium text-slate-700">Region Name *<input required value={form.region_name} onChange={event => setForm({ ...form, region_name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><label className="block text-sm font-medium text-slate-700">State<input value={form.state} onChange={event => setForm({ ...form, state: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><label className="block text-sm font-medium text-slate-700">Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option></select></label><button className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white">{editingId ? 'Save Region' : 'Add Region'}</button></form></div> : null}
    </div>
  );
}