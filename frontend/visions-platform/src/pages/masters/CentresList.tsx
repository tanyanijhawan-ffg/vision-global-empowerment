import { useEffect, useMemo, useState } from 'react';
import { Edit2, Filter, Search, Trash2, X } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import MasterDataActions from '../../components/MasterDataActions';
import StatusChip from '../../components/StatusChip';
import { getAuthHeaders, getCurrentUser } from '../../lib/auth';

type Centre = {
  id: number;
  region_name: string;
  district_name: string;
  centre_name: string;
  centre_type: string | null;
  block: string | null;
  village: string | null;
  facilitator_name: string | null;
  status: string | null;
};

const blankCentre = {
  region_name: '', district_name: '', centre_name: '', centre_type: '', block: '', village: '', facilitator_name: '', status: 'active',
};

export default function CentresList() {
  const canManage = getCurrentUser()?.role === 'SUPER_ADMIN';
  const [data, setData] = useState<Centre[]>([]);
  const [filterRegion, setFilterRegion] = useState('All');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(blankCentre);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const loadCentres = async () => {
    const response = await fetch('/api/masters/centres/', { headers: { ...getAuthHeaders(), Accept: 'application/json' } });
    if (!response.ok) throw new Error('Unable to load centres.');
    setData(await response.json());
  };

  useEffect(() => { loadCentres().catch(loadError => setError(loadError.message)); }, []);

  const regions = useMemo(() => [...new Set(data.map(centre => centre.region_name))].filter(Boolean).sort(), [data]);
  const filteredData = data.filter(centre =>
    (filterRegion === 'All' || centre.region_name === filterRegion) &&
    [centre.centre_name, centre.district_name, centre.village, centre.facilitator_name].join(' ').toLowerCase().includes(search.toLowerCase()),
  );

  const createCentre = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch(editingId ? `/api/masters/centres/${editingId}/` : '/api/masters/centres/', {
      method: editingId ? 'PATCH' : 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    if (!response.ok) {
      setError('Unable to create centre. Ensure region, district, and centre name are provided.');
      return;
    }
    await loadCentres();
    setForm(blankCentre);
    setIsFormOpen(false);
    setEditingId(null);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(blankCentre);
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(blankCentre);
    setIsFormOpen(true);
  };

  const deleteCentre = async (id: number) => {
    if (!window.confirm('Delete this centre and its linked students?')) return;
    const response = await fetch(`/api/masters/centres/${id}/`, { method: 'DELETE', headers: getAuthHeaders() });
    if (!response.ok) { setError('Unable to delete centre.'); return; }
    await loadCentres();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Learning Centres" subtitle="Manage individual learning and empowerment centres." action={canManage ? <MasterDataActions resource="centres" onAdd={openAddForm} onUploaded={() => loadCentres().catch(loadError => setError(loadError.message))} /> : undefined} />
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 min-w-[240px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search centres, villages, facilitators..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm" /></div>
          <div className="flex items-center gap-2"><Filter size={16} className="text-slate-400" /><select value={filterRegion} onChange={event => setFilterRegion(event.target.value)} className="py-2 pl-3 pr-8 bg-white border border-slate-300 rounded-lg text-sm"><option value="All">All Regions</option>{regions.map(region => <option key={region}>{region}</option>)}</select></div>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm text-slate-600 whitespace-nowrap"><thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200"><tr><th className="px-6 py-3">Centre Name</th><th className="px-6 py-3">Region</th><th className="px-6 py-3">District</th><th className="px-6 py-3">Centre Type</th><th className="px-6 py-3">Block</th><th className="px-6 py-3">Village</th><th className="px-6 py-3">Facilitator</th><th className="px-6 py-3">Status</th>{canManage ? <th className="px-6 py-3 text-right">Actions</th> : null}</tr></thead><tbody className="divide-y divide-slate-100">{filteredData.map(centre => <tr key={centre.id} className="hover:bg-slate-50/80"><td className="px-6 py-4 font-medium text-slate-900">{centre.centre_name}</td><td className="px-6 py-4">{centre.region_name}</td><td className="px-6 py-4">{centre.district_name}</td><td className="px-6 py-4">{centre.centre_type || '-'}</td><td className="px-6 py-4">{centre.block || '-'}</td><td className="px-6 py-4">{centre.village || '-'}</td><td className="px-6 py-4 text-slate-900">{centre.facilitator_name || '-'}</td><td className="px-6 py-4"><StatusChip status={centre.status || 'Active'} /></td>{canManage ? <td className="px-6 py-4 text-right"><button onClick={() => { setEditingId(centre.id); setForm({ region_name: centre.region_name, district_name: centre.district_name, centre_name: centre.centre_name, centre_type: centre.centre_type || '', block: centre.block || '', village: centre.village || '', facilitator_name: centre.facilitator_name || '', status: centre.status || 'active' }); setIsFormOpen(true); }} title="Edit centre" className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button><button onClick={() => deleteCentre(centre.id)} title="Delete centre" className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button></td> : null}</tr>)}</tbody></table></div>
        {!error && filteredData.length === 0 ? <p className="p-12 text-center text-slate-400">No centres found.</p> : null}
      </div>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {isFormOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={createCentre} className="w-full max-w-lg space-y-3 rounded-lg bg-white p-6 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId ? 'Edit Centre' : 'Add Centre'}</h2><button type="button" onClick={closeForm} aria-label="Close"><X size={18} /></button></div>{[['region_name', 'Region Name'], ['district_name', 'District Name'], ['centre_name', 'Centre Name'], ['centre_type', 'Centre Type'], ['block', 'Block'], ['village', 'Village'], ['facilitator_name', 'Facilitator Name']].map(([field, label]) => <label key={field} className="block text-sm font-medium text-slate-700">{label}{field === 'region_name' || field === 'district_name' || field === 'centre_name' ? ' *' : ''}<input required={field === 'region_name' || field === 'district_name' || field === 'centre_name'} value={form[field as keyof typeof form]} onChange={event => setForm({ ...form, [field]: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>)}<label className="block text-sm font-medium text-slate-700">Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option></select></label><button className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white">{editingId ? 'Save Centre' : 'Add Centre'}</button></form></div> : null}
    </div>
  );
}
