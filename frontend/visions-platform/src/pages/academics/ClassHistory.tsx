import { useEffect, useState } from 'react';
import { Search, GraduationCap, Calendar, Users } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { fetchAcademicYears, fetchSchoolClasses, fetchAttendanceCentres, type AcademicYear, type SchoolClass, type AttendanceCentre } from '../../lib/api';
import { getCurrentUser } from '../../lib/auth';
import { getUserScopedCentres } from '../../lib/centreScope';

interface ClassHistoryRecord {
  student_id: number;
  student_name: string;
  centre_name: string;
  academic_year: string;
  class_name: string;
  is_active: boolean;
  promoted: boolean | null;
  status: 'current' | 'promoted' | 'retained' | 'completed';
}

export default function ClassHistory() {
  const currentUser = getCurrentUser();
  const [records, setRecords] = useState<ClassHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  
  // Filters
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [centres, setCentres] = useState<AttendanceCentre[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedCentre, setSelectedCentre] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const availableCentres = getUserScopedCentres(centres, currentUser);

  useEffect(() => {
    Promise.all([
      fetchAcademicYears().catch(() => []),
      fetchSchoolClasses().catch(() => []),
      fetchAttendanceCentres().catch(() => []),
    ]).then(([years, classList, centreList]) => {
      setAcademicYears(years);
      setClasses(classList);
      setCentres(centreList);
      // Default to current year
      const current = years.find(y => y.isCurrent) || years[0];
      if (current) setSelectedYear(current.name);
      if (currentUser?.role === 'FACILITATOR' && centreList.length) {
        const scoped = getUserScopedCentres(centreList, currentUser);
        if (scoped[0]) setSelectedCentre(String(scoped[0].id));
        else {
          setError('No centre is assigned to this account. Contact an administrator.');
          setLoading(false);
        }
      } else if (currentUser?.role === 'FACILITATOR') {
        setError('No centre is assigned to this account. Contact an administrator.');
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'FACILITATOR' && !selectedCentre) return;
    fetchClassHistory();
  }, [selectedYear, selectedClass, selectedCentre, currentUser?.role]);

  const fetchClassHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('academicYear', selectedYear);
      if (selectedClass) params.append('classId', selectedClass);
      if (selectedCentre) params.append('centreId', selectedCentre);
      
      const res = await fetch(`/api/v1/students/class-history/?${params.toString()}`, {
        headers: { 'Authorization': `Token ${localStorage.getItem('vge_auth_token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch class history');
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load class history');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.student_name.toLowerCase().includes(search.toLowerCase()) ||
      r.centre_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !selectedStatus || r.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (record: ClassHistoryRecord) => {
    switch (record.status) {
      case 'current':
        return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Current</span>;
      case 'promoted':
        return <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Promoted</span>;
      case 'retained':
        return <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Retained</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">Completed</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="Class History" 
        subtitle="View student class assignments and promotion history across academic years."
      />

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <label className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-700 flex items-center gap-2">
              <Calendar size={16} /> Academic Year
            </span>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All Academic Years</option>
              {academicYears.map(y => (
                <option key={y.id} value={y.name}>{y.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-700 flex items-center gap-2">
              <GraduationCap size={16} /> Class
            </span>
            <select 
              value={selectedClass} 
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-700 flex items-center gap-2">
              <Users size={16} /> Centre
            </span>
            <select 
              value={selectedCentre} 
              onChange={e => setSelectedCentre(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
            >
              {currentUser?.role !== 'FACILITATOR' && <option value="">All Centres</option>}
              {availableCentres.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-700">Status</span>
            <select 
              value={selectedStatus} 
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All Statuses</option>
              <option value="current">Current</option>
              <option value="promoted">Promoted</option>
              <option value="retained">Retained</option>
              <option value="completed">Completed</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-700">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                placeholder="Search students..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Results */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <span className="text-sm text-slate-500">
            Showing <b className="text-slate-900">{filteredRecords.length}</b> records
          </span>
        </div>

        {loading ? (
          <p className="p-8 text-center text-slate-500">Loading class history...</p>
        ) : filteredRecords.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No class history records found for the selected filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Centre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Academic Year</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredRecords.map((record, idx) => (
                  <tr key={`${record.student_id}-${record.academic_year}-${idx}`} className={record.is_active ? '' : 'bg-slate-50'}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{record.student_name}</div>
                      <div className="text-xs text-slate-500">ID: {record.student_id}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{record.centre_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{record.academic_year}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{record.class_name}</td>
                    <td className="px-6 py-4">{getStatusBadge(record)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
