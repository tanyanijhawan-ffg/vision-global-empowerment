import { useEffect, useState } from 'react';
import { PieChart as PieIcon, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { getAuthHeaders, getCurrentUser } from '../../lib/auth';
import { fetchMasterRegions, fetchMasterCentres, type MasterRegion, type MasterCentre } from '../../lib/api';

type Breakdown = { name: string; count: number }[];
type ReportData = {
  total_students: number;
  gender: Breakdown;
  caste_category: Breakdown;
  religion: Breakdown;
  tribe_name: Breakdown;
  housing_condition: Breakdown;
  housing_ownership: Breakdown;
  income_range: Breakdown;
  access: { electricity: Breakdown; drinking_water: Breakdown; toilet: Breakdown; study_space: Breakdown };
  class_grade: Breakdown;
  school_type: Breakdown;
  medium_of_instruction: Breakdown;
  attendance_pattern: Breakdown;
  father_education: Breakdown;
  mother_education: Breakdown;
  vulnerabilities: Breakdown;
  by_region: Breakdown;
  by_district: Breakdown;
  by_centre: Breakdown;
};

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#14B8A6'];

const classSort = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, undefined, { numeric: true });

// Estimate the Y-axis width from the longest label so there is no large
// empty gap between the chart boundary and the axis when labels are short.
const yAxisWidth = (rows: Breakdown) => {
  const longest = rows.reduce((max, row) => Math.max(max, row.name.length), 0);
  return Math.min(130, Math.max(20, Math.round(longest * 6)));
};

function PieCard({ title, data, donut = false }: { title: string; data: Breakdown; donut?: boolean }) {
  const filtered = data.filter(d => d.count > 0);
  const total = filtered.reduce((sum, d) => sum + d.count, 0);
  const top = filtered[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-600 mb-4 flex items-center gap-2"><PieIcon size={15} className="text-indigo-400" />{title}</h3>
      {filtered.length ? (
        <div className="h-64 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={filtered} dataKey="count" nameKey="name" cx="50%" cy="45%" outerRadius={75} innerRadius={donut ? 48 : 0} label={donut ? false : ({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {filtered.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [`${value} students`, name]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          {donut && top ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ transform: 'translateY(-12px)' }}>
              <span className="text-xl font-bold text-slate-600">{total ? Math.round((top.count / total) * 100) : 0}%</span>
              <span className="text-[11px] text-slate-500">{top.name}</span>
            </div>
          ) : null}
        </div>
      ) : <p className="h-64 flex items-center justify-center text-sm text-slate-400">No data recorded yet.</p>}
    </div>
  );
}

function BarCard({ title, data, sortNumeric = false, vertical = false }: { title: string; data: Breakdown; sortNumeric?: boolean; vertical?: boolean }) {
  const filtered = [...data.filter(d => d.count > 0)];
  if (sortNumeric) filtered.sort(classSort);
  const axisWidth = yAxisWidth(filtered);
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-600 mb-4 flex items-center gap-2"><BarChart3 size={15} className="text-indigo-400" />{title}</h3>
      {filtered.length ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {vertical ? (
              <BarChart data={filtered} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={filtered.some(d => d.name.length > 8) ? -30 : 0} textAnchor={filtered.some(d => d.name.length > 8) ? 'end' : 'middle'} height={filtered.some(d => d.name.length > 8) ? 60 : 30} />
                <YAxis type="number" allowDecimals={false} width={30} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => [`${value} students`]} />
                <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            ) : (
              <BarChart data={filtered} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" allowDecimals={false} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={axisWidth} mirror={false} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickMargin={2} />
                <Tooltip formatter={(value: number) => [`${value} students`]} />
                <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : <p className="h-64 flex items-center justify-center text-sm text-slate-400">No data recorded yet.</p>}
    </div>
  );
}

function Section({ id, title, children, open, onToggle }: { id: string; title: string; children: React.ReactNode; open: boolean; onToggle: (id: string) => void }) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>
      {open ? <div className="px-5 pb-5 pt-4 border-t border-slate-100 space-y-5">{children}</div> : null}
    </section>
  );
}

export default function StudentReports() {
  const currentUser = getCurrentUser();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [regions, setRegions] = useState<MasterRegion[]>([]);
  const [centres, setCentres] = useState<MasterCentre[]>([]);
  const [filterRegion, setFilterRegion] = useState('');
  const [filterCentre, setFilterCentre] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ demographics: true });

  const toggleSection = (id: string) => setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    fetchMasterRegions().then(setRegions).catch(() => setRegions([]));
    fetchMasterCentres().then(setCentres).catch(() => setCentres([]));
  }, []);

  const filteredCentres = centres.filter(c => !filterRegion || c.region_name === regions.find(r => String(r.id) === filterRegion)?.region_name);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterRegion) params.append('region_id', filterRegion);
    if (filterCentre) params.append('centre_id', filterCentre);
    const qs = params.toString() ? `?${params.toString()}` : '';
    fetch(`/api/dashboard/student-report/${qs}`, { headers: { ...getAuthHeaders(), Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load student report.');
        setData(await response.json());
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load student report.'))
      .finally(() => setLoading(false));
  }, [filterRegion, filterCentre]);

  const filterBar = (
    <div className="flex flex-wrap items-center gap-2">
      <select value={filterRegion} onChange={(e) => { setFilterRegion(e.target.value); setFilterCentre(''); }} className="py-2 pl-3 pr-8 bg-white border border-slate-300 rounded-lg text-sm shadow-sm cursor-pointer">
        <option value="">All Regions</option>
        {regions.map(r => <option key={r.id} value={String(r.id)}>{r.region_name}</option>)}
      </select>
      <select value={filterCentre} onChange={(e) => setFilterCentre(e.target.value)} className="py-2 pl-3 pr-8 bg-white border border-slate-300 rounded-lg text-sm shadow-sm cursor-pointer">
        <option value="">All Centres</option>
        {filteredCentres.map(c => <option key={c.id} value={String(c.id)}>{c.centre_name}</option>)}
      </select>
    </div>
  );

  if (loading && !data) return <div className="max-w-7xl mx-auto p-8 text-slate-500">Loading student reports...</div>;
  if (error || !data) return <div className="max-w-7xl mx-auto p-8 text-red-600">{error || 'No report data available.'}</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Student Reports"
        subtitle={`Demographic, socio-economic, and education breakdowns for ${data.total_students} student${data.total_students === 1 ? '' : 's'}.`}
        action={filterBar}
      />

      <Section id="demographics" title="Demographics" open={!!openSections.demographics} onToggle={toggleSection}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <PieCard title="Tribal Communities / Sub-Castes" data={data.tribe_name} />
          <PieCard title="Caste Category" data={data.caste_category} />
          <PieCard title="Religion" data={data.religion} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <BarCard title="Gender" data={data.gender} />
          <BarCard title="Top Vulnerabilities" data={data.vulnerabilities} />
        </div>
      </Section>

      <Section id="socio" title="Socio-Economic Conditions" open={!!openSections.socio} onToggle={toggleSection}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <PieCard title="Housing Condition" data={data.housing_condition} />
          <PieCard title="Housing Ownership" data={data.housing_ownership} />
          <PieCard title="Monthly Household Income" data={data.income_range} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <PieCard title="Electricity Access" data={data.access.electricity} donut />
          <PieCard title="Clean Water Access" data={data.access.drinking_water} donut />
          <PieCard title="Toilet Access" data={data.access.toilet} donut />
          <PieCard title="Study Space at Home" data={data.access.study_space} donut />
        </div>
      </Section>

      <Section id="education" title="Education Profile" open={!!openSections.education} onToggle={toggleSection}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <BarCard title="School Attendance Pattern" data={data.attendance_pattern} />
          <PieCard title="School Type" data={data.school_type} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <PieCard title="Medium of Instruction" data={data.medium_of_instruction} />
          <BarCard title="Father's Education" data={data.father_education} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <BarCard title="Mother's Education" data={data.mother_education} />
        </div>
      </Section>

      <Section id="geography" title="Geography" open={!!openSections.geography} onToggle={toggleSection}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <BarCard title="Students by Region" data={data.by_region} vertical />
          <BarCard title="Students by District" data={data.by_district} vertical />
          <BarCard title="Students by Centre" data={data.by_centre} vertical />
        </div>
      </Section>
    </div>
  );
}
