import { useEffect, useState } from 'react';
import { Edit2, Filter, Search, Trash2, X } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { getAuthHeaders, getCurrentUser } from '../../lib/auth';

type District = { id: number; district_name: string; region_name: string };
type Region = { id: number; region_name: string };

const blankDistrict = { district_name: '', region_name: '' };

export default function DistrictsList() {
  const canManage = getCurrentUser()?.role === 'SUPER_ADMIN';
  const [data, setData] = useState<District[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [filterRegion, setFilterRegion] = useState('All');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(blankDistrict);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    const headers = { ...getAuthHeaders(), Accept: 'application/json' };
    const [districtsResponse, regionsResponse] = await Promise.all([
      fetch('/api/masters/districts/', { headers }),
      fetch('/api/masters/regions/', { headers }),
    ]);
    if (!districtsResponse.ok) throw new Error('Unable to load districts.');
    if (!regionsResponse.ok) throw new Error('Unable to load regions.');
    setData(await districtsResponse.json());
    setRegions(await regionsResponse.json());
  };

  useEffect(() => { loadData().catch(loadError => setError(loadError.message)); }, []);

  const filteredData = data.filter(district =>
    (filterRegion === 'All' || district.region_name === filterRegion) &&
    district.district_name.toLowerCase().includes(search.toLowerCase()),
  );
  const regionsWithDistricts = [...new Set(data.map(district => district.region_name).filter(Boolean))].sort();

  const closeForm = () => { setIsFormOpen(false); setEditingId(null); setForm(blankDistrict); };
  const openAddForm = () => { setEditingId(null); setForm(blankDistrict); setIsFormOpen(true); };

  const saveDistrict = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch(editingId ? `/api/masters/districts/${editingId}/` : '/api/masters/districts/', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!response.ok) { setError('Unable to save district.'); return; }
    await loadData();
    closeForm();
  };

  const deleteDistrict = async (id: number) => {
    if (!window.confirm('Delete this district and its linked centres?')) return;
    const response = await fetch(`/api/masters/districts/${id}/`, { method: 'DELETE', headers: getAuthHeaders() });
    if (!response.ok) { setError('Unable to delete district.'); return; }
    await loadData();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Districts"
        subtitle="Manage operating districts within each region."
        action={canManage ? (
          <button onClick={openAddForm} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Add District
          </button>
        ) : undefined}
      />

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search districts..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select value={filterRegion} onChange={event => setFilterRegion(event.target.value)} className="py-2 pl-3 pr-8 bg-white border border-slate-300 rounded-lg text-sm">
              <option value="All">All Regions</option>
              {regionsWithDistricts.map(region => <option key={region} value={region}>{region}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">District Name</th>
                <th className="px-6 py-3">Region</th>
                {canManage && <th className="px-6 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map(district => (
                <tr key={district.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{district.district_name}</td>
                  <td className="px-6 py-4">{district.region_name}</td>
                  {canManage && (
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => { setEditingId(district.id); setForm({ district_name: district.district_name, region_name: district.region_name }); setIsFormOpen(true); }} title="Edit district" className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                        <button onClick={() => deleteDistrict(district.id)} title="Delete district" className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!error && filteredData.length === 0 && <p className="p-12 text-center text-slate-400">No districts found.</p>}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form onSubmit={saveDistrict} className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit District' : 'Add District'}</h2>
              <button type="button" onClick={closeForm} aria-label="Close"><X size={18} /></button>
            </div>
            <label className="block text-sm font-medium text-slate-700">District Name *
              <input required value={form.district_name} onChange={event => setForm({ ...form, district_name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Region *
              <select required value={form.region_name} onChange={event => setForm({ ...form, region_name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select region</option>
                {regions.map(region => <option key={region.id} value={region.region_name}>{region.region_name}</option>)}
              </select>
            </label>
            <button className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white">{editingId ? 'Save District' : 'Add District'}</button>
          </form>
        </div>
      )}
    </div>
  );
}
