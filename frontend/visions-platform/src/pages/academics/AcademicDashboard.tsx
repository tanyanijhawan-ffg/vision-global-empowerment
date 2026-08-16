import { useState, useMemo } from 'react';
import { Trophy, BookOpen, TrendingUp, AlertTriangle, ChevronDown } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { regions, districts, centres, students } from '../../data/mockData';
import { filterUserScopedRows, getCurrentUser } from '../../lib/auth';

const sel = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none shadow-sm';

// Derive synthetic subject scores from academic score (realistic spread)
function subjectScores(avgScore: number) {
  return [
    { name: 'Tamil',   score: Math.min(100, Math.round(avgScore * 1.05)) },
    { name: 'English', score: Math.min(100, Math.round(avgScore * 0.88)) },
    { name: 'Math',    score: Math.min(100, Math.round(avgScore * 0.95)) },
    { name: 'Science', score: Math.min(100, Math.round(avgScore * 0.98)) },
    { name: 'Social',  score: Math.min(100, Math.round(avgScore * 1.04)) },
  ];
}

type View = 'region' | 'district' | 'centre' | 'class';

export default function AcademicDashboard() {
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

  const avgScore = filteredStudents.length
    ? Math.round(filteredStudents.reduce((a, s) => a + s.academicScore, 0) / filteredStudents.length)
    : 0;
  const topPerformers = filteredStudents.filter(s => s.academicScore >= 80).length;
  const improving = filteredStudents.filter(s => s.academicScore >= 65).length;
  const needsIntervention = filteredStudents.filter(s => s.academicScore < 60).length;

  const subjects = subjectScores(avgScore);

  // Breakdown by view
  const breakdownData = useMemo(() => {
    if (view === 'region') {
      return regions.map(r => {
        const s = students.filter(st => st.region === r.name);
        const avg = s.length ? Math.round(s.reduce((a, x) => a + x.academicScore, 0) / s.length) : 0;
        return { name: r.name.replace('Tamil Nadu ', 'TN '), score: avg, students: s.length };
      });
    }
    if (view === 'district') {
      const pool = filteredDistricts.length ? filteredDistricts : districts;
      return pool.map(d => {
        const s = students.filter(st => st.district === d.name);
        const avg = s.length ? Math.round(s.reduce((a, x) => a + x.academicScore, 0) / s.length) : 0;
        return { name: d.name, score: avg, students: s.length };
      });
    }
    if (view === 'centre') {
      const pool = filteredCentres.length ? filteredCentres : centres;
      return pool.slice(0, 10).map(c => {
        const s = students.filter(st => st.centre === c.name);
        const avg = s.length ? Math.round(s.reduce((a, x) => a + x.academicScore, 0) / s.length) : c.avgScore;
        return { name: c.name.replace(' Centre', '').replace(' Hub', ''), score: avg, students: s.length };
      });
    }
    // class
    const classes = ['3','4','5','6','7','8','9','10','11'];
    return classes.map(cl => {
      const s = filteredStudents.filter(st => st.class === cl);
      const avg = s.length ? Math.round(s.reduce((a, x) => a + x.academicScore, 0) / s.length) : 0;
      return { name: `Class ${cl}`, score: avg, students: s.length };
    }).filter(x => x.students > 0);
  }, [view, filteredDistricts, filteredCentres, filteredStudents]);

  // Term trend (simulated)
  const trendData = useMemo(() => [
    { term: 'Term 1', score: Math.max(0, avgScore - 8) },
    { term: 'Term 2', score: Math.max(0, avgScore - 3) },
    { term: 'Term 3', score: avgScore },
  ], [avgScore]);

  const viewTabs: { key: View; label: string }[] = [
    { key: 'region', label: 'Region-wise' },
    { key: 'district', label: 'District-wise' },
    { key: 'centre', label: 'Centre-wise' },
    { key: 'class', label: 'Class-wise' },
  ];

  const bottomStudents = filteredStudents
    .filter(s => s.academicScore < 65)
    .sort((a, b) => a.academicScore - b.academicScore)
    .slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Academic Dashboard" subtitle="Monitor assessment performance — filter by region, district, centre, or class." />

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
        <StatCard title="Avg Academic Score" value={`${avgScore}%`} icon={Trophy} trend="Current term" trendUp={avgScore >= 70} />
        <StatCard title="Top Performers (≥80%)" value={topPerformers} icon={BookOpen} trend={`${filteredStudents.length ? Math.round(topPerformers / filteredStudents.length * 100) : 0}% of students`} trendUp={true} />
        <StatCard title="On Track (≥65%)" value={improving} icon={TrendingUp} trendUp={true} />
        <StatCard title="Needs Intervention" value={needsIntervention} icon={AlertTriangle} trend="Score < 60%" trendUp={false} />
      </div>

      {/* Subject + Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-5">Subject Averages</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjects} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 13 }} formatter={v => [`${v}%`, 'Avg Score']} cursor={{ fill: '#F1F5F9' }} />
                <Bar dataKey="score" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-5">Term-on-Term Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="term" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} domain={[40, 100]} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 13 }} formatter={v => [`${v}%`, 'Avg Score']} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />
                <Line type="monotone" dataKey="score" name="Avg Score" stroke="#4F46E5" strokeWidth={3} dot={{ r: 5, fill: '#4F46E5' }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Breakdown + Intervention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h3 className="text-base font-bold text-slate-900">Score Breakdown</h3>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {viewTabs.map(t => (
                <button key={t.key} onClick={() => setView(t.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${view === t.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2">
                    {view === 'region' ? 'Region' : view === 'district' ? 'District' : view === 'centre' ? 'Centre' : 'Class'}
                  </th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2">Students</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2">Avg Score</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {breakdownData.map(row => (
                  <tr key={row.name} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 font-medium text-slate-700">{row.name}</td>
                    <td className="py-2.5 text-right text-slate-500">{row.students}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${row.score >= 80 ? 'bg-emerald-500' : row.score >= 65 ? 'bg-indigo-500' : row.score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${row.score}%` }} />
                        </div>
                        <span className="tabular-nums font-semibold text-slate-700 w-10 text-right">{row.score}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.score >= 80 ? 'bg-emerald-50 text-emerald-700' :
                        row.score >= 65 ? 'bg-indigo-50 text-indigo-700' :
                        row.score >= 50 ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {row.score >= 80 ? 'A' : row.score >= 65 ? 'B' : row.score >= 50 ? 'C' : 'D'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Intervention List */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col">
          <h3 className="text-base font-bold text-slate-900 mb-1">Needs Intervention</h3>
          <p className="text-xs text-slate-500 mb-4">Academic score below 65%</p>
          <div className="space-y-2 flex-1 overflow-auto">
            {bottomStudents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No intervention-needed in selection</p>
            ) : bottomStudents.map(s => (
              <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border border-amber-100 bg-amber-50">
                <div>
                  <p className="text-sm font-medium text-amber-900">{s.name}</p>
                  <p className="text-xs text-amber-600">{s.centre} · Cl {s.class}</p>
                </div>
                <span className="text-sm font-bold text-amber-700 tabular-nums">{s.academicScore}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
