import { useState } from 'react';
import { Search, Plus, Filter, Edit2, Trash2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatusChip from '../../components/StatusChip';
import ConfirmDialog from '../../components/ConfirmDialog';
import { centres, regions, districts } from '../../data/mockData';
import { getCurrentUser } from '../../lib/auth';

export default function CentresList() {
  const canManage = getCurrentUser()?.role === 'SUPER_ADMIN';
  const [data, setData] = useState(centres);
  const [filterRegion, setFilterRegion] = useState('All');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<string | null>(null);

  const filteredData = filterRegion === 'All' 
    ? data 
    : data.filter(c => c.region === filterRegion);

  const handleDelete = () => {
    if (selectedCentre) {
      setData(data.filter(c => c.id !== selectedCentre));
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader 
        title="Learning Centres" 
        subtitle="Manage individual learning and empowerment centres."
        action={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} />
            Add Centre
          </button>
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search centres, villages, facilitators..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select 
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="py-2 pl-3 pr-8 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm cursor-pointer"
            >
              <option value="All">All Regions</option>
              {regions.map(r => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Centre Name</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Facilitator</th>
                <th className="px-6 py-3">Students</th>
                <th className="px-6 py-3">Avg Attendance</th>
                <th className="px-6 py-3">Status</th>
                {canManage && <th className="px-6 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((centre) => (
                <tr key={centre.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{centre.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{centre.type}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900">{centre.district}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{centre.village}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-900">{centre.facilitator}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span>{centre.students}</span>
                      {centre.highRisk > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold" title={`${centre.highRisk} at risk`}>
                          {centre.highRisk}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${centre.attendance >= 90 ? 'bg-emerald-500' : centre.attendance >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} 
                          style={{ width: `${centre.attendance}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium">{centre.attendance}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusChip status={centre.status} />
                  </td>
                  {canManage && <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => { setSelectedCentre(centre.id); setIsDeleteOpen(true); }}
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
        title="Delete Centre"
        message="Are you sure you want to delete this centre? This will unassign all related students and facilitators."
      />
    </div>
  );
}