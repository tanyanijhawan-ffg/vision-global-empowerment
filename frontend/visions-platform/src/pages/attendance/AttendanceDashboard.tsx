import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, CalendarDays, CheckCircle2, ChevronDown, Clock3, Mail, RefreshCw, Save, Users, XCircle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AttendanceAlertRecipients, AttendanceCentre, AttendanceIntelligenceSetting, AttendanceRecord, MasterCentre, MasterDistrict, MasterRegion, SchoolClass, StudentListItem, fetchAttendance, fetchAttendanceAlertRecipients, fetchAttendanceCentres, fetchAttendanceIntelligence, fetchMasterCentres, fetchMasterDistricts, fetchMasterRegions, fetchSchoolClasses, fetchStudents, sendAttendanceDefaultingEmail, saveAttendanceIntelligence } from '../../lib/api';
import { getCurrentUser } from '../../lib/auth';
import { getUserScopedCentres } from '../../lib/centreScope';

const selectClass = 'w-full appearance-none px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none shadow-sm';
type View = 'region' | 'district' | 'centre' | 'class';

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rateForStudent(studentId: string, records: AttendanceRecord[], throughDate: string): number | null {
  const history = records.filter(record => String(record.student_id) === studentId && record.attendance_date <= throughDate && record.status);
  if (!history.length) return null;
  return Math.round(history.filter(record => record.status === 'Present' || record.status === 'Late').length / history.length * 100);
}

function normalizeScopeValue(value?: string | null): string {
  return value?.trim().toLocaleLowerCase() ?? '';
}

function matchesScopeValue(left?: string | null, right?: string | null): boolean {
  return normalizeScopeValue(left) === normalizeScopeValue(right);
}

export default function AttendanceDashboard() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const [view, setView] = useState<View>('region');
  const [selectedDate, setSelectedDate] = useState(() => localDateString(new Date()));
  const [filterRegion, setFilterRegion] = useState(currentUser?.region && currentUser.region !== 'All' ? currentUser.region : '');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterCentre, setFilterCentre] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [centres, setCentres] = useState<AttendanceCentre[]>([]);
  const [masterCentres, setMasterCentres] = useState<MasterCentre[]>([]);
  const [masterDistricts, setMasterDistricts] = useState<MasterDistrict[]>([]);
  const [masterRegions, setMasterRegions] = useState<MasterRegion[]>([]);
  const [masterClasses, setMasterClasses] = useState<SchoolClass[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [intelligence, setIntelligence] = useState<AttendanceIntelligenceSetting | null>(null);
  const [savingIntelligence, setSavingIntelligence] = useState(false);
  const [intelligenceMessage, setIntelligenceMessage] = useState('');
  const [alertRecipients, setAlertRecipients] = useState<AttendanceAlertRecipients | null>(null);
  const [selectedEducatorId, setSelectedEducatorId] = useState('');
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sendingDefaultingEmail, setSendingDefaultingEmail] = useState(false);
  const [defaultingEmailMessage, setDefaultingEmailMessage] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([fetchStudents(), fetchAttendanceCentres(), fetchAttendance(), fetchMasterCentres(), fetchMasterDistricts(), fetchMasterRegions(), fetchSchoolClasses()])
      .then(([studentRows, centreRows, attendanceRows, masterCentreRows, districtRows, regionRows, classRows]) => {
        if (!active) return;
        setStudents(studentRows);
        setCentres(centreRows);
        setMasterCentres(masterCentreRows);
        setMasterDistricts(districtRows);
        setMasterRegions(regionRows);
        setMasterClasses(classRows);
        setRecords(attendanceRows);
        setError('');
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load attendance dashboard.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentUser?.centre, currentUser?.role]);

  useEffect(() => {
    fetchAttendanceIntelligence().then(setting => setIntelligence({
      ...setting,
      notification_channels: setting.notification_channels.includes('email') ? ['email'] : [],
    })).catch(reason => setIntelligenceMessage(reason instanceof Error ? reason.message : 'Unable to load system intelligence settings.'));
  }, []);

  const canSendAttendanceEmail = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'REGIONAL_ADMIN';
  useEffect(() => {
    if (!canSendAttendanceEmail || !filterCentre) {
      setAlertRecipients(null);
      setSelectedEducatorId('');
      return;
    }
    let active = true;
    setLoadingRecipients(true);
    setAlertRecipients(null);
    setSelectedEducatorId('');
    setDefaultingEmailMessage('');
    fetchAttendanceAlertRecipients(Number(filterCentre)).then(recipients => {
      if (!active) return;
      setAlertRecipients(recipients);
      setSelectedEducatorId(String(recipients.community_educators[0]?.id || ''));
    }).catch(reason => {
      if (active) setDefaultingEmailMessage(reason instanceof Error ? reason.message : 'Unable to load email addresses.');
    }).finally(() => { if (active) setLoadingRecipients(false); });
    return () => { active = false; };
  }, [canSendAttendanceEmail, filterCentre]);

  const scopedMasterCentres = useMemo(() => getUserScopedCentres(masterCentres, currentUser), [masterCentres, currentUser]);
  const scopedCentres = useMemo(() => centres.filter(centre => scopedMasterCentres.some(masterCentre => masterCentre.id === centre.id)), [centres, scopedMasterCentres]);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isCommunityEducator = currentUser?.role === 'FACILITATOR';
  const regions = useMemo(() => {
    const assignedRegion = normalizeScopeValue(currentUser?.region);
    return masterRegions.map(region => region.region_name).filter(region =>
      isSuperAdmin || (assignedRegion && assignedRegion !== 'all' && normalizeScopeValue(region) === assignedRegion),
    ).sort();
  }, [masterRegions, currentUser, isSuperAdmin]);
  const activeRegionFilter = isSuperAdmin ? filterRegion : regions[0] || '';
  const educatorDistrictNames = useMemo(() => new Set(scopedMasterCentres.map(centre => centre.district_name)), [scopedMasterCentres]);
  const scopedDistricts = useMemo(() => masterDistricts.filter(district => {
    if (isSuperAdmin) return true;
    const sameRegion = matchesScopeValue(district.region_name, currentUser?.region);
    if (!sameRegion) return false;
    return !isCommunityEducator || educatorDistrictNames.has(district.district_name);
  }), [masterDistricts, currentUser, isSuperAdmin, isCommunityEducator, educatorDistrictNames]);
  const districts = useMemo(() => [...new Set(scopedDistricts
    .filter(district => !activeRegionFilter || matchesScopeValue(district.region_name, activeRegionFilter))
    .map(district => district.district_name))].sort(), [scopedDistricts, activeRegionFilter]);
  const activeDistrictFilter = filterDistrict;
  const filteredCentres = useMemo(() => scopedMasterCentres.filter(centre =>
    (!activeRegionFilter || matchesScopeValue(centre.region_name, activeRegionFilter)) &&
    (!activeDistrictFilter || matchesScopeValue(centre.district_name, activeDistrictFilter)),
  ), [scopedMasterCentres, activeRegionFilter, activeDistrictFilter]);
  const activeCentreFilter = filterCentre;
  const scopedCentreIds = useMemo(() => new Set(scopedCentres.map(centre => centre.id)), [scopedCentres]);
  const scopedStudents = useMemo(() => students.filter(student => scopedCentreIds.has(Number(student.centreId))), [students, scopedCentreIds]);
  const filteredStudents = useMemo(() => scopedStudents.filter(student =>
    (!activeRegionFilter || student.region === activeRegionFilter) &&
    (!activeDistrictFilter || student.district === activeDistrictFilter) &&
    (!activeCentreFilter || String(student.centreId) === activeCentreFilter) &&
    (!filterClass || student.class === filterClass),
  ), [scopedStudents, activeRegionFilter, activeDistrictFilter, activeCentreFilter, filterClass]);
  const classOptions = useMemo(() => {
    const availableInScope = new Set(scopedStudents.map(student => student.class).filter(Boolean));
    const classes = masterClasses.map(schoolClass => schoolClass.name).filter(Boolean);
    const scopedClasses = isSuperAdmin ? classes : classes.filter(className => availableInScope.has(className));
    return [...new Set(scopedClasses)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [masterClasses, scopedStudents, isSuperAdmin]);

  const selectedStudentIds = useMemo(() => new Set(filteredStudents.map(student => Number(student.id))), [filteredStudents]);
  const selectedRecords = useMemo(() => records.filter(record =>
    record.attendance_date === selectedDate && selectedStudentIds.has(Number(record.student_id)),
  ), [records, selectedDate, selectedStudentIds]);
  const presentCount = selectedRecords.filter(record => record.status === 'Present').length;
  const absentCount = selectedRecords.filter(record => record.status === 'Absent').length;
  const lateCount = selectedRecords.filter(record => record.status === 'Late').length;
  const markedCount = presentCount + absentCount + lateCount;
  const attendanceRate = markedCount ? Math.round((presentCount + lateCount) / markedCount * 100) : 0;
  const unmarkedCount = Math.max(0, filteredStudents.length - markedCount);

  const trendData = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date(`${selectedDate}T12:00:00`);
    day.setDate(day.getDate() - (6 - index));
    const dateKey = localDateString(day);
    const dayRecords = records.filter(record => record.attendance_date === dateKey && selectedStudentIds.has(Number(record.student_id)) && record.status);
    const attended = dayRecords.filter(record => record.status === 'Present' || record.status === 'Late').length;
    return { day: day.toLocaleDateString('en', { weekday: 'short' }), date: dateKey, rate: dayRecords.length ? Math.round(attended / dayRecords.length * 100) : null };
  }), [records, selectedDate, selectedStudentIds]);

  const historicalRates = useMemo(() => new Map(filteredStudents.map(student => [
    student.id,
    rateForStudent(student.id, records, selectedDate),
  ])), [filteredStudents, records, selectedDate]);
  const atRiskStudents = useMemo(() => filteredStudents
    .map(student => ({ ...student, rate: historicalRates.get(student.id) }))
    .filter((student): student is typeof student & { rate: number } => student.rate !== null && student.rate !== undefined && student.rate < 75)
    .sort((left, right) => left.rate - right.rate)
  , [filteredStudents, historicalRates]);
  const displayedAtRiskStudents = atRiskStudents.slice(0, 6);

  const breakdownData = useMemo(() => {
    const keyFor = (student: StudentListItem) => view === 'region' ? student.region
      : view === 'district' ? student.district
        : view === 'centre' ? student.centre
          : student.class;
    const groups = new Map<string, { total: number; rates: number[] }>();
    filteredStudents.forEach(student => {
      const name = keyFor(student) || 'Unassigned';
      const group = groups.get(name) || { total: 0, rates: [] };
      group.total += 1;
      const rate = historicalRates.get(student.id);
      if (rate !== null && rate !== undefined) group.rates.push(rate);
      groups.set(name, group);
    });
    return [...groups.entries()].map(([name, group]) => ({
      name,
      students: group.total,
      rate: group.rates.length ? Math.round(group.rates.reduce((total, value) => total + value, 0) / group.rates.length) : 0,
    })).sort((left, right) => left.name.localeCompare(right.name));
  }, [filteredStudents, historicalRates, view]);

  const clearFilters = () => {
    if (isSuperAdmin) setFilterRegion('');
    setFilterDistrict('');
    setFilterCentre('');
    setFilterClass('');
  };
  const updateIntelligence = (changes: Partial<AttendanceIntelligenceSetting>) => {
    setIntelligence(previous => previous ? { ...previous, ...changes } : previous);
    setIntelligenceMessage('');
  };
  useEffect(() => {
    if (intelligence?.alert_student_mode === 'combined') {
      const allStudentIds = scopedStudents.map(student => Number(student.id));
      setIntelligence(previous => previous?.alert_student_mode === 'combined'
        ? { ...previous, alert_student_ids: allStudentIds }
        : previous);
    }
  }, [intelligence?.alert_student_mode, scopedStudents]);
  const handleIntelligenceSave = async () => {
    if (!intelligence) return;
    setSavingIntelligence(true);
    setIntelligenceMessage('');
    try {
      const saved = await saveAttendanceIntelligence(intelligence);
      setIntelligence({ ...saved, notification_channels: saved.notification_channels.includes('email') ? ['email'] : [] });
      setIntelligenceMessage('System Intelligence settings saved successfully.');
    } catch (reason) {
      setIntelligenceMessage(reason instanceof Error ? reason.message : 'Unable to save system intelligence settings.');
    } finally {
      setSavingIntelligence(false);
    }
  };
  const handleSendDefaultingEmail = async () => {
    if (!filterCentre || !selectedEducatorId || !atRiskStudents.length) return;
    setSendingDefaultingEmail(true);
    setDefaultingEmailMessage('');
    try {
      const result = await sendAttendanceDefaultingEmail({
        centre_id: Number(filterCentre),
        attendance_date: selectedDate,
        educator_id: Number(selectedEducatorId),
        class_grade: filterClass,
        student_ids: atRiskStudents.map(student => Number(student.id)),
      });
      setDefaultingEmailMessage(`Email sent to ${result.recipient} for ${result.student_count} defaulting students.`);
    } catch (reason) {
      setDefaultingEmailMessage(reason instanceof Error ? reason.message : 'Unable to send attendance email.');
    } finally {
      setSendingDefaultingEmail(false);
    }
  };
  const hasFilters = Boolean((isSuperAdmin && filterRegion) || filterDistrict || filterCentre || filterClass);
  const views: { key: View; label: string }[] = [
    { key: 'region', label: 'Region-wise' }, { key: 'district', label: 'District-wise' },
    { key: 'centre', label: 'Centre-wise' }, { key: 'class', label: 'Class-wise' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Attendance Dashboard" subtitle="Monitor daily attendance and trends across regions, districts, centres, and classes." />

      <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Attendance date
            <span className="relative mt-1 block"><CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /><input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} className={`${selectClass} pl-9`} /></span>
          </label>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Region
            <span className="relative mt-1 block"><select className={selectClass} value={isSuperAdmin ? filterRegion : activeRegionFilter} disabled={!isSuperAdmin} onChange={event => { setFilterRegion(event.target.value); setFilterDistrict(''); setFilterCentre(''); }}>{isSuperAdmin && <option value="">All Regions</option>}{regions.map(region => <option key={region} value={region}>{region}</option>)}</select><ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /></span>
          </label>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">District
            <span className="relative mt-1 block"><select className={selectClass} value={activeDistrictFilter} onChange={event => { setFilterDistrict(event.target.value); setFilterCentre(''); }}><option value="">All Districts</option>{districts.map(district => <option key={district} value={district}>{district}</option>)}</select><ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /></span>
          </label>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Centre
            <span className="relative mt-1 block"><select className={selectClass} value={activeCentreFilter} onChange={event => setFilterCentre(event.target.value)}><option value="">All Centres</option>{filteredCentres.map(centre => <option key={centre.id} value={centre.id}>{centre.centre_name}</option>)}</select><ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /></span>
          </label>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Class
            <span className="relative mt-1 block"><select className={selectClass} value={filterClass} onChange={event => setFilterClass(event.target.value)}><option value="">All Classes</option>{classOptions.map(className => <option key={className} value={className}>{className}</option>)}</select><ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /></span>
          </label>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Showing <span className="font-semibold text-slate-700">{filteredStudents.length}</span> students · {markedCount} attendance records for {new Date(`${selectedDate}T12:00:00`).toLocaleDateString()}</p>
          {hasFilters && <button onClick={clearFilters} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Clear filters</button>}
        </div>
      </section>

      {intelligence && <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><Bell size={18} className="text-indigo-600" />System Intelligence</h2><p className="text-sm text-slate-500 mt-1">Configure attendance alerts and notification preferences.</p></div>
          <button onClick={handleIntelligenceSave} disabled={savingIntelligence} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"><Save size={16} />{savingIntelligence ? 'Saving...' : 'Save Settings'}</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <fieldset><legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Alert students</legend><div className="flex flex-wrap gap-4 mb-3 text-sm">{(['individual', 'combined'] as const).map(mode => <label key={mode} className="flex items-center gap-1.5"><input type="radio" name="dashboard-alert-mode" checked={intelligence.alert_student_mode === mode} onChange={() => updateIntelligence({ alert_student_mode: mode, ...(mode === 'combined' ? { alert_student_ids: filteredStudents.map(student => Number(student.id)) } : {}) })} />{mode === 'individual' ? 'Individual student' : 'All students'}</label>)}</div>{intelligence.alert_student_mode === 'individual' ? <select value={String(intelligence.alert_student_ids[0] || '')} onChange={event => updateIntelligence({ alert_student_ids: event.target.value ? [Number(event.target.value)] : [] })} className={selectClass}><option value="">Select a student</option>{filteredStudents.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}</select> : <p className="text-sm text-slate-600">All {filteredStudents.length} students are selected.</p>}</fieldset>
        </div>
        <div className="grid grid-cols-1 gap-5 border-t border-slate-100 pt-5">
          <fieldset><legend className="text-sm font-semibold text-slate-800 mb-2"><label className="flex items-center gap-2"><input type="checkbox" checked={intelligence.absence_alert_enabled} onChange={event => updateIntelligence({ absence_alert_enabled: event.target.checked })} />Alert after</label></legend><div className="flex flex-wrap items-center gap-3 pl-6"><input type="number" min={1} max={30} value={intelligence.absence_alert_days} onChange={event => updateIntelligence({ absence_alert_days: Number(event.target.value) })} className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm" aria-label="Consecutive absent days" /><span className="text-sm text-slate-600">consecutive absent days</span></div></fieldset>
        </div>
        {intelligenceMessage && <p role="status" className={`text-sm ${intelligenceMessage.includes('successfully') ? 'text-emerald-600' : 'text-red-600'}`}>{intelligenceMessage}</p>}
      </section>}

      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>{error}</span><button onClick={() => window.location.reload()} className="inline-flex items-center gap-1 font-medium"><RefreshCw size={14} />Retry</button></div>}
      {loading && <p className="text-sm text-slate-500">Loading live attendance records...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Present Today" value={presentCount.toLocaleString()} icon={CheckCircle2} trend={`${filteredStudents.length ? Math.round(presentCount / filteredStudents.length * 100) : 0}% of students`} trendUp />
        <StatCard title="Absent Today" value={absentCount.toLocaleString()} icon={XCircle} trend={absentCount ? 'Follow-up may be needed' : 'No absences recorded'} trendUp={!absentCount} />
        <StatCard title="Late Today" value={lateCount.toLocaleString()} icon={Clock3} trend={`${unmarkedCount.toLocaleString()} not yet marked`} trendUp={!unmarkedCount} />
        <StatCard title="Attendance Rate" value={`${attendanceRate}%`} icon={Users} trend={markedCount ? `${markedCount} of ${filteredStudents.length} marked` : 'No records for this date'} trendUp={attendanceRate >= 85} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <div className="flex items-start justify-between gap-3 mb-5"><div><h2 className="text-base font-bold text-slate-900">7-Day Attendance Trend</h2><p className="text-xs text-slate-500 mt-1">Present and late students as a share of recorded attendance</p></div><span className="rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-1 text-xs font-semibold">Daily rate</span></div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <defs><linearGradient id="attendanceTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} /><stop offset="95%" stopColor="#4F46E5" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} domain={[0, 100]} tickFormatter={value => `${value}%`} />
                <Tooltip labelFormatter={label => trendData.find(item => item.day === label)?.date || label} formatter={value => [value == null ? 'No records' : `${value}%`, 'Attendance rate']} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 13 }} />
                <Area type="monotone" dataKey="rate" stroke="#4F46E5" strokeWidth={2.5} fill="url(#attendanceTrend)" connectNulls={false} dot={{ r: 3, fill: '#4F46E5' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-2"><AlertTriangle size={17} className="text-amber-500" /><h2 className="text-base font-bold text-slate-900">At-Risk Students</h2></div>
          <p className="text-xs text-slate-500 mt-1 mb-4">Historical attendance below 75%</p>
          <div className="space-y-2 flex-1 overflow-auto">
            {!atRiskStudents.length ? <p className="text-sm text-slate-400 text-center py-6">No at-risk students in this selection</p> : displayedAtRiskStudents.map(student => (
              <div key={student.id} className="flex items-center justify-between gap-3 p-2.5 bg-amber-50 text-amber-950 rounded-lg border border-amber-100">
                <div className="min-w-0"><p className="text-sm font-medium truncate">{student.name}</p><p className="text-xs text-amber-700 truncate">{student.centre}</p></div><span className="text-sm font-bold tabular-nums">{student.rate}%</span>
              </div>
            ))}
          </div>
          {canSendAttendanceEmail && <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Notify Community Educator</h3>
            {!filterCentre ? <p className="text-xs text-slate-500">Select a centre above to load its Community Educator email.</p> : loadingRecipients ? <p className="text-xs text-slate-500">Loading email addresses…</p> : alertRecipients && <>
              <label className="block text-xs font-medium text-slate-600">Community Educator
                <select value={selectedEducatorId} onChange={event => setSelectedEducatorId(event.target.value)} className={`${selectClass} mt-1`}>
                  <option value="">Select a Community Educator</option>
                  {alertRecipients.community_educators.map(educator => <option key={educator.id} value={educator.id}>{educator.name} — {educator.email}</option>)}
                </select>
              </label>
              {selectedEducatorId && <p className="text-xs text-slate-500">To: {alertRecipients.community_educators.find(educator => String(educator.id) === selectedEducatorId)?.email}</p>}
              <p className="text-xs text-slate-500">CC Admin: {alertRecipients.admin.email || 'No email address configured'}</p>
              <button onClick={handleSendDefaultingEmail} disabled={sendingDefaultingEmail || !selectedEducatorId || !atRiskStudents.length || !alertRecipients.admin.email} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                <Mail size={15} />{sendingDefaultingEmail ? 'Sending…' : `Send ${atRiskStudents.length} defaulting student${atRiskStudents.length === 1 ? '' : 's'}`}
              </button>
            </>}
            {alertRecipients && !alertRecipients.community_educators.length && <p className="text-xs text-amber-700">No Community Educator email is configured for this centre’s region.</p>}
            {defaultingEmailMessage && <p role="status" className={`text-xs ${defaultingEmailMessage.startsWith('Email sent') ? 'text-emerald-700' : 'text-red-600'}`}>{defaultingEmailMessage}</p>}
          </div>}
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3"><div><h2 className="text-base font-bold text-slate-900">Attendance Breakdown</h2><p className="text-xs text-slate-500 mt-1">Average historical attendance rate for students in each group</p></div><div className="flex gap-1 bg-slate-100 p-1 rounded-lg">{views.map(tab => <button key={tab.key} onClick={() => setView(tab.key)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${view === tab.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{tab.label}</button>)}</div></div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdownData} margin={{ top: 5, right: 8, left: -18, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} dy={8} interval={0} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} domain={[0, 100]} tickFormatter={value => `${value}%`} />
              <Tooltip formatter={(value, _name, item) => [`${value}% · ${item.payload.students} students`, 'Attendance rate']} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 13 }} cursor={{ fill: '#F1F5F9' }} />
              <Bar dataKey="rate" name="Attendance rate" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-slate-100"><th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2">{view === 'region' ? 'Region' : view === 'district' ? 'District' : view === 'centre' ? 'Centre' : 'Class'}</th><th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2">Students</th><th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2">Avg Attendance</th><th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2">Status</th></tr></thead><tbody className="divide-y divide-slate-50">{breakdownData.map(row => <tr key={row.name} className="hover:bg-slate-50/60"><td className="py-2.5 font-medium text-slate-700">{row.name}</td><td className="py-2.5 text-right text-slate-500">{row.students}</td><td className="py-2.5 text-right"><div className="inline-flex items-center justify-end gap-2"><div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${row.rate >= 85 ? 'bg-emerald-500' : row.rate >= 75 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${row.rate}%` }} /></div><span className="tabular-nums font-semibold text-slate-700 w-10 text-right">{row.rate}%</span></div></td><td className="py-2.5 text-right"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${row.rate >= 85 ? 'bg-emerald-50 text-emerald-700' : row.rate >= 75 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{row.rate >= 85 ? 'On Track' : row.rate >= 75 ? 'At Risk' : 'Critical'}</span></td></tr>)}{!breakdownData.length && <tr><td colSpan={4} className="py-8 text-center text-slate-400">No student data in this selection.</td></tr>}</tbody></table></div>
      </section>
    </div>
  );
}
