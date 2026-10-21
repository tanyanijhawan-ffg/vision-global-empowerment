import { useEffect, useState } from 'react';
import { Users, Building2, Map, CalendarCheck, Trophy, AlertTriangle, UserPlus, Activity, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';
import { getAuthHeaders, getCurrentUser } from '../lib/auth';
import { fetchMasterRegions, fetchMasterCentres, type MasterRegion, type MasterCentre } from '../lib/api';

type DashboardData = {
  stats: {
    total_students: number;
    active_centres: number;
    regions: number;
    districts: number;
    attendance_today: number;
    avg_academic_score: number;
    high_risk_students: number;
    new_registrations: number;
  };
  student_growth: { month: string; students: number }[];
  attendance_trend: { week: string; percent: number }[];
  academics_by_subject: { name: string; score: number }[];
  students_by_region: { name: string; students: number }[];
  activities: { id: string; icon: string; text: string; timestamp: string }[];
};

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-64 w-full flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
      {message}
    </div>
  );
}

function timeAgo(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

type DrilldownItem = { id: number; name: string; class?: string; centre?: string; region?: string; state?: string; attendance?: string; url?: string };
type DrilldownPayload = { title: string; kind: string; items: DrilldownItem[] };

export default function Dashboard() {
  const currentUser = getCurrentUser();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [regions, setRegions] = useState<MasterRegion[]>([]);
  const [centres, setCentres] = useState<MasterCentre[]>([]);
  const [filterRegion, setFilterRegion] = useState('');
  const [filterCentre, setFilterCentre] = useState('');

  const [drilldown, setDrilldown] = useState<DrilldownPayload | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // Load master lists for the filter dropdowns
  useEffect(() => {
    fetchMasterRegions().then(setRegions).catch(() => setRegions([]));
    fetchMasterCentres().then(setCentres).catch(() => setCentres([]));
  }, []);

  const filteredCentres = centres.filter(c => !filterRegion || c.region_name === regions.find(r => String(r.id) === filterRegion)?.region_name);

  // Load dashboard summary, refetching whenever the filters change
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterRegion) params.append('region_id', filterRegion);
    if (filterCentre) params.append('centre_id', filterCentre);
    const qs = params.toString() ? `?${params.toString()}` : '';
    fetch(`/api/dashboard/summary/${qs}`, { headers: { ...getAuthHeaders(), Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load dashboard data.');
        setData(await response.json());
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load dashboard data.'))
      .finally(() => setLoading(false));
  }, [filterRegion, filterCentre]);

  const openDrilldown = (metric: string) => {
    setDrilldownLoading(true);
    const params = new URLSearchParams({ metric });
    if (filterRegion) params.append('region_id', filterRegion);
    if (filterCentre) params.append('centre_id', filterCentre);
    fetch(`/api/dashboard/drilldown/?${params.toString()}`, { headers: { ...getAuthHeaders(), Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load details.');
        setDrilldown(await response.json());
      })
      .catch(() => setDrilldown(null))
      .finally(() => setDrilldownLoading(false));
  };

  if (loading && !data) return <div className="max-w-7xl mx-auto p-8 text-slate-500">Loading dashboard...</div>;
  if (error || !data) return <div className="max-w-7xl mx-auto p-8 text-red-600">{error || 'No dashboard data available.'}</div>;

  const { stats } = data;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back, {currentUser?.name ?? 'there'}. Here is what's happening{filterRegion || filterCentre ? ' in your selection' : ' across all regions'}.</p>
        </div>
        {/* Region / Centre filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterRegion}
            onChange={(e) => { setFilterRegion(e.target.value); setFilterCentre(''); }}
            className="py-2 pl-3 pr-8 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm cursor-pointer"
          >
            <option value="">All Regions</option>
            {regions.map(r => <option key={r.id} value={String(r.id)}>{r.region_name}</option>)}
          </select>
          <select
            value={filterCentre}
            onChange={(e) => setFilterCentre(e.target.value)}
            className="py-2 pl-3 pr-8 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm cursor-pointer"
          >
            <option value="">All Centres</option>
            {filteredCentres.map(c => <option key={c.id} value={String(c.id)}>{c.centre_name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={stats.total_students.toLocaleString()} icon={Users} trend={`+${stats.new_registrations} this month`} trendUp={stats.new_registrations > 0} />
        <button type="button" onClick={() => openDrilldown('active_centres')} className="text-left"><StatCard title="Active Centres" value={String(stats.active_centres)} icon={Building2} /></button>
        <StatCard title="Regions & Districts" value={`${stats.regions} / ${stats.districts}`} icon={Map} />
        <StatCard title="Attendance Today" value={`${stats.attendance_today}%`} icon={CalendarCheck} />
        <StatCard title="Avg Academic Score" value={`${stats.avg_academic_score}%`} icon={Trophy} />
        <button type="button" onClick={() => openDrilldown('high_risk_students')} className="text-left"><StatCard title="High Risk Students" value={String(stats.high_risk_students)} icon={AlertTriangle} trend={stats.high_risk_students ? 'Needs review' : 'None'} trendUp={!stats.high_risk_students} /></button>
        <StatCard title="New Registrations" value={String(stats.new_registrations)} icon={UserPlus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-6">Student Growth Trend</h3>
          {data.student_growth.length ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.student_growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="students" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorStudents)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChart message="No student registrations yet." />}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-6">Attendance Trend (8 Weeks)</h3>
          {data.attendance_trend.length ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.attendance_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="percent" stroke="#10B981" strokeWidth={3} dot={{r: 4}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChart message="No attendance records in the last 8 weeks." />}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-6">Academic Performance by Subject</h3>
          {data.academics_by_subject.length ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.academics_by_subject} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} domain={[0, 100]} />
                  <Tooltip cursor={{fill: '#F1F5F9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="score" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChart message="No assessment scores recorded yet." />}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-6">Students by Region</h3>
          {data.students_by_region.length ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.students_by_region} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={140} tick={{fill: '#475569', fontSize: 12, fontWeight: 500}} />
                  <Tooltip cursor={{fill: '#F1F5F9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="students" fill="#6366F1" radius={[0, 4, 4, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChart message="No students assigned to regions yet." />}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Recent Activities</h3>
        </div>
        {data.activities.length ? (
          <div className="divide-y divide-slate-100">
            {data.activities.map(act => (
              <div key={act.id} className="p-4 px-6 hover:bg-slate-50 transition-colors flex items-start gap-4">
                <div className={`p-2 rounded-full shrink-0 ${
                  act.icon === 'attendance' ? 'bg-emerald-100 text-emerald-600' :
                  act.icon === 'student' ? 'bg-indigo-100 text-indigo-600' :
                  act.icon === 'assessment' ? 'bg-amber-100 text-amber-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  <Activity size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{act.text}</p>
                  <p className="text-xs text-slate-500 mt-1">{timeAgo(act.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-slate-400">No recent activity yet.</p>
        )}
      </div>

      {/* Drill-down modal */}
      {(drilldown || drilldownLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setDrilldown(null)}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">{drilldownLoading ? 'Loading...' : drilldown?.title}</h2>
              <button type="button" onClick={() => setDrilldown(null)} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto divide-y divide-slate-100">
              {drilldownLoading ? (
                <p className="p-8 text-center text-sm text-slate-400">Loading details...</p>
              ) : drilldown && drilldown.items.length ? (
                drilldown.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { if (item.url) { setDrilldown(null); navigate(item.url); } }}
                    className="w-full text-left px-6 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{item.name}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {[item.class, item.centre, item.region, item.state].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    {item.attendance ? <span className="shrink-0 text-xs font-semibold text-red-600">{item.attendance}</span> : null}
                  </button>
                ))
              ) : (
                <p className="p-8 text-center text-sm text-slate-400">No records found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
