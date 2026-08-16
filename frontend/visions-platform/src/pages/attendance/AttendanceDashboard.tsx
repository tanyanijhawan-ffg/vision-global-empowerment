import { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Clock, ChevronDown } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { regions, districts, centres, students } from '../../data/mockData';
import { filterUserScopedRows, getCurrentUser } from '../../lib/auth';

const weekTrend = [
  { day: 'Mon', pct: 85 }, { day: 'Tue', pct: 82 }, { day: 'Wed', pct: 88 },
  { day: 'Thu', pct: 84 }, { day: 'Fri', pct: 89 }, { day: 'Sat', pct: 76 }, { day: 'Sun', pct: 0 },
];

const sel = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none shadow-sm';

type View = 'region' | 'district' | 'centre' | 'class';

export default function AttendanceDashboard() {
  const currentUser = getCurrentUser();
  const [view, setView] = useState<View>('region');
  const [filterRegion, setFilterRegion] = useState(currentUser?.role === 'FACILITATOR' ? currentUser.region : '');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterCentre, setFilterCentre] = useState(currentUser?.role === 'FACILITATOR' ? currentUser.centre : '');
  const [filterClass, setFilterClass] = useState('');

  const scopedStudents = useMemo(() => filterUserScopedRows(students, currentUser), [currentUser]);

  const filteredDistricts = useMemo(
    () => districts.filter(d => (!filterRegion || d.region === regions.find(r => r.id === filterRegion)?.name) && (!currentUser || currentUser.role === 'SUPER_ADMIN' || d.region === currentUser.region)),
    [filterRegion, currentUser]
  );
  const filteredCentres = useMemo(
    () => centres.filter(c =>
      (!filterRegion || c.region === regions.find(r => r.id === filterRegion)?.name) &&
      (!filterDistrict || c.district === districts.find(d => d.id === filterDistrict)?.name) &&
      (!currentUser || currentUser.role === 'SUPER_ADMIN' || c.region === currentUser.region) &&
      (currentUser?.role !== 'FACILITATOR' || c.name === currentUser.centre)
    ),
    [filterRegion, filterDistrict, currentUser]
  );
  const filteredStudents = useMemo(
    () => scopedStudents.filter(s =>
      (!filterRegion || s.region === regions.find(r => r.id === filterRegion)?.name) &&
      (!filterDistrict || s.district === districts.find(d => d.id === filterDistrict)?.name) &&
      (!filterCentre || s.centre === centres.find(c => c.id === filterCentre)?.name) &&
      (!filterClass || s.class === filterClass)
    ),
    [scopedStudents, filterRegion, filterDistrict, filterCentre, filterClass]
  );

  const avgAttendance = filteredStudents.length
    ? Math.round(filteredStudents.reduce((a, s) => a + s.attendancePercent, 0) / filteredStudents.length)
    : 0;
  const presentCount = Math.round(filteredStudents.length * avgAttendance / 100);
  const absentCount = filteredStudents.length - presentCount;
  const consecutiveAbsences = filteredStudents.filter(s => s.attendancePercent < 75).length;

  // breakdown bar chart data based on view
  const breakdownData = useMemo(() => {
    if (view === 'region') {
      return regions.map(r => {
        const s = students.filter(st => st.region === r.name);
        const avg = s.length ? Math.round(s.reduce((a, x) => a + x.attendancePercent, 0) / s.length) : 0;
        return { name: r.name.replace('Tamil Nadu ', 'TN '), pct: avg };
      });
    }
    if (view === 'district') {
      const pool = filteredDistricts.length ? filteredDistricts : districts;
      return pool.map(d => {
        const s = students.filter(st => st.district === d.name);
        const avg = s.length ? Math.round(s.reduce((a, x) => a + x.attendancePercent, 0) / s.length) : 0;
        return { name: d.name, pct: avg };
      });
    }
    if (view === 'centre') {
      const pool = filteredCentres.length ? filteredCentres : centres;
      return pool.slice(0, 10).map(c => {
        const s = students.filter(st => st.centre === c.name);
        const avg = s.length ? Math.round(s.reduce((a, x) => a + x.attendancePercent, 0) / s.length) : c.attendance;
        return { name: c.name.replace(' Centre', '').replace(' Hub', ''), pct: avg };
      });
    }
    // class
    const classes = ['3','4','5','6','7','8','9','10','11'];
    return classes.map(cl => {
      const s = filteredStudents.filter(st => st.class === cl);
      const avg = s.length ? Math.round(s.reduce((a, x) => a + x.attendancePercent, 0) / s.length) : 0;
      return { name: `Cl ${cl}`, pct: avg };
    }).filter(x => x.pct > 0);
  }, [view, filteredDistricts, filteredCentres, filteredStudents]);

  const viewTabs: { key: View; label: string }[] = [
    { key: 'region', label: 'Region-wise' },
    { key: 'district', label: 'District-wise' },
    { key: 'centre', label: 'Centre-wise' },
    { key: 'class', label: 'Class-wise' },
  ];

  const atRiskStudents = filteredStudents
    .filter(s => s.attendancePercent < 75)
    .sort((a, b) => a.attendancePercent - b.attendancePercent)
    .slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Attendance Dashboard" subtitle="Monitor student participation — filter by region, district, centre, or class." />

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Region</label>
            <div className="relative">
              <select className={sel} value={filterRegion} onChange={e => { setFilterRegion(e.target.value); setFilterDistrict(''); setFilterCentre(''); }}>
                <option value="">All Regions</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">District</label>
            <div className="relative">
              <select className={sel} value={filterDistrict} onChange={e => { setFilterDistrict(e.target.value); setFilterCentre(''); }} disabled={!filterRegion}>
                <option value="">All Districts</option>
                {filteredDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Centre</label>
            <div className="relative">
              <select className={sel} value={filterCentre} onChange={e => setFilterCentre(e.target.value)} disabled={!filterRegion}>
                <option value="">All Centres</option>
                {filteredCentres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Class</label>
            <div className="relative">
              <select className={sel} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                <option value="">All Classes</option>
                {['3','4','5','6','7','8','9','10','11'].map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
        {(filterRegion || filterDistrict || filterCentre || filterClass) && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">Showing <span className="font-semibold text-slate-700">{filteredStudents.length}</span> students</p>
            <button onClick={() => { setFilterRegion(''); setFilterDistrict(''); setFilterCentre(''); setFilterClass(''); }}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Clear filters</button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Present Today" value={presentCount.toLocaleString()} icon={CheckCircle2} trend={`${avgAttendance}%`} trendUp={avgAttendance >= 80} />
        <StatCard title="Absent Today" value={absentCount.toLocaleString()} icon={XCircle} trend={`${100 - avgAttendance}%`} trendUp={false} />
        <StatCard title="Consecutive Absences" value={consecutiveAbsences} icon={AlertCircle} trend="< 75% attendance" trendUp={false} />
        <StatCard title="Avg Attendance" value={`${avgAttendance}%`} icon={Clock} trend={avgAttendance >= 85 ? 'On track' : 'Below target'} trendUp={avgAttendance >= 85} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Trend */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-5">7-Day Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 13 }} formatter={(v) => [`${v}%`, 'Attendance']} />
                <Area type="monotone" dataKey="pct" stroke="#10B981" strokeWidth={2.5} fill="url(#attGrad)" dot={{ r: 3, fill: '#10B981' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* At-Risk Students */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col">
          <h3 className="text-base font-bold text-slate-900 mb-1">At-Risk Students</h3>
          <p className="text-xs text-slate-500 mb-4">Attendance below 75%</p>
          <div className="space-y-2 flex-1 overflow-auto">
            {atRiskStudents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No at-risk students in selection</p>
            ) : atRiskStudents.map(s => (
              <div key={s.id} className="flex items-center justify-between p-2.5 bg-red-50 text-red-900 rounded-lg border border-red-100">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-red-500">{s.centre}</p>
                </div>
                <span className="text-sm font-bold tabular-nums">{s.attendancePercent}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Breakdown Chart */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        {/* View Tabs */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h3 className="text-base font-bold text-slate-900">Attendance Breakdown</h3>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {viewTabs.map(t => (
              <button key={t.key} onClick={() => setView(t.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${view === t.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdownData} margin={{ top: 5, right: 5, left: -20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} dy={8} interval={0} angle={breakdownData.length > 6 ? -30 : 0} textAnchor={breakdownData.length > 6 ? 'end' : 'middle'} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 13 }} formatter={(v) => [`${v}%`, 'Avg Attendance']}
                cursor={{ fill: '#F1F5F9' }} />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={48}
                fill="#4F46E5"
                label={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2">
                  {view === 'region' ? 'Region' : view === 'district' ? 'District' : view === 'centre' ? 'Centre' : 'Class'}
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2">Avg Attendance</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {breakdownData.map(row => (
                <tr key={row.name} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 font-medium text-slate-700">{row.name}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${row.pct >= 85 ? 'bg-emerald-500' : row.pct >= 75 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${row.pct}%` }} />
                      </div>
                      <span className="tabular-nums font-semibold text-slate-700 w-10 text-right">{row.pct}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${row.pct >= 85 ? 'bg-emerald-50 text-emerald-700' : row.pct >= 75 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                      {row.pct >= 85 ? 'On Track' : row.pct >= 75 ? 'At Risk' : 'Critical'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
