import { useState } from 'react';
import { Search, Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatusChip from '../../components/StatusChip';
import ConfirmDialog from '../../components/ConfirmDialog';
import { regions } from '../../data/mockData';
import { getCurrentUser } from '../../lib/auth';

export default function RegionsList() {
  const canManage = getCurrentUser()?.role === 'SUPER_ADMIN';
  const [data, setData] = useState(regions);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const handleDelete = () => {
    if (selectedRegion) {
      setData(data.filter(r => r.id !== selectedRegion));
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader 
        title="Regions" 
        subtitle="Manage geographic regions and their assigned states."
        action={
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Region
          </button>
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
                <th className="px-6 py-3">Districts</th>
                <th className="px-6 py-3">Centres</th>
                <th className="px-6 py-3">Students</th>
                <th className="px-6 py-3">Status</th>
                {canManage && <th className="px-6 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((region) => (
                <tr key={region.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{region.name}</td>
                  <td className="px-6 py-4">{region.state}</td>
                  <td className="px-6 py-4">{region.districts}</td>
                  <td className="px-6 py-4">{region.centres}</td>
                  <td className="px-6 py-4">{region.students}</td>
                  <td className="px-6 py-4">
                    <StatusChip status={region.status} />
                  </td>
                  {canManage && <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => { setSelectedRegion(region.id); setIsDeleteOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Region"
        message="Are you sure you want to delete this region? This action cannot be undone and will affect linked districts and centres."
      />
    </div>
  );
}