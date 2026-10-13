import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, BookOpen, FileText, Pencil, Trash2 } from 'lucide-react';
import StatusChip from '../../components/StatusChip';
import { deleteStudent, fetchStudent, type StudentRecord } from '../../lib/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const attendanceData = [
  { month: 'Jan', percent: 95 }, { month: 'Feb', percent: 92 }, { month: 'Mar', percent: 88 },
  { month: 'Apr', percent: 96 }, { month: 'May', percent: 90 },
];
const academicData = [
  { subject: 'Tamil', score: 85 }, { subject: 'English', score: 72 }, { subject: 'Math', score: 90 },
  { subject: 'Science', score: 88 }, { subject: 'Social', score: 82 },
];

function Detail({ label, value }: { label: string; value: unknown }) {
  const displayValue = value === null || value === undefined || value === '' ? 'Not provided' : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value);
  return <div className="rounded-lg bg-slate-50 px-4 py-3"><dt className="text-xs text-slate-500 capitalize">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-900 break-words">{displayValue}</dd></div>;
}
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-4">{title}</h3>{children}</section>;
}

export default function StudentProfile() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchStudent(id).then(setStudent).catch(err => setError(err instanceof Error ? err.message : 'Unable to load student.')); }, [id]);
  const handleDelete = async () => {
    if (!student || !window.confirm(`Delete ${student.full_name}? This cannot be undone.`)) return;
    setDeleting(true);
    try { await deleteStudent(id); navigate('/students'); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete student.'); setDeleting(false); }
  };
  if (error) return <div className="max-w-5xl mx-auto p-8 text-red-600">{error}</div>;
  if (!student) return <div className="max-w-5xl mx-auto p-8 text-slate-500">Loading student...</div>;

  const tabs = [
    { id: 'overview', name: 'Overview', icon: User }, { id: 'attendance', name: 'Attendance', icon: Calendar },
    { id: 'academics', name: 'Academics', icon: BookOpen }, { id: 'notes', name: 'Notes', icon: FileText },
  ];
  const family = student.family;
  const socio = student.socio_economic;
  const aspiration = student.aspirations?.[0];
  const motivationReasons = student.motivations?.filter(item => item.category !== 'Narrative') ?? [];
  const motivationNarratives = student.motivations?.filter(item => item.category === 'Narrative') ?? [];

  return <div className="max-w-5xl mx-auto pb-12">
    <div className="mb-6 flex items-center gap-4"><button onClick={() => navigate('/students')} className="p-2 -ml-2 rounded-full hover:bg-slate-200 transition-colors text-slate-500"><ArrowLeft size={20} /></button><span className="text-slate-500">Back to Students</span></div>
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 mb-6">
      {student.photo ? <img src={student.photo} alt={student.full_name} className="h-24 w-24 rounded-full object-cover border-2 border-indigo-100 shrink-0" /> : <div className="h-24 w-24 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-600 shrink-0">{student.full_name.charAt(0)}</div>}
      <div className="flex-1 text-center md:text-left"><div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">{student.full_name}</h1><p className="text-sm text-slate-500 mt-1">Student ID: {student.id} &bull; {student.centre.name}</p></div><div className="flex items-center justify-center gap-2"><StatusChip status="Active" /><button onClick={() => navigate(`/students/${id}/edit`)} className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50"><Pencil size={15} /> Edit</button><button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"><Trash2 size={15} /> Delete</button></div></div></div>
    </div>
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="flex border-b border-slate-200 overflow-x-auto">{tabs.map(tab => { const Icon = tab.icon; return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}><Icon size={16} />{tab.name}</button>; })}</div>
      <div className="p-6 md:p-8">
        {activeTab === 'overview' && <div className="space-y-8">
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-5 py-4"><h2 className="text-lg font-bold text-slate-900">Profile Overview</h2><p className="mt-1 text-sm text-slate-600">Complete registration details for {student.full_name}.</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><DetailSection title="Identification Details"><dl className="space-y-3"><Detail label="Student ID" value={student.id} /><Detail label="Full Name" value={student.full_name} /><Detail label="Nickname" value={student.nick_name} /><Detail label="Gender" value={student.gender} /><Detail label="Date of Birth" value={student.dob} /><Detail label="Age" value={student.age ? `${student.age} years` : null} /></dl></DetailSection><DetailSection title="Educational Context"><dl className="space-y-3"><Detail label="School Name" value={student.school_name} /><Detail label="Type" value={student.school_type} /><Detail label="Class / Grade" value={student.class_grade} /><Detail label="Medium" value={student.medium_of_instruction} /><Detail label="Attendance Pattern" value={student.attendance_pattern} /><Detail label="Previous Academic Performance" value={student.previous_academic_performance} /></dl></DetailSection></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><DetailSection title="Family Structure"><dl className="space-y-3">{Object.entries(family ?? {}).map(([key, value]) => <Detail key={key} label={key.replaceAll('_', ' ')} value={value} />)}</dl></DetailSection><DetailSection title="Socio-Economic Conditions"><dl className="space-y-3">{Object.entries(socio ?? {}).map(([key, value]) => <Detail key={key} label={key.replaceAll('_', ' ')} value={value} />)}</dl></DetailSection></div>
          <DetailSection title="Vulnerability Assessment"><div className="flex flex-wrap gap-2">{student.vulnerabilities?.length ? student.vulnerabilities.map(item => <span key={item.name} className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-sm">{item.name}{item.remarks ? `: ${item.remarks}` : ''}</span>) : <span className="text-sm text-slate-500">None recorded</span>}</div></DetailSection>
          <DetailSection title="Motivation for Joining"><div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{motivationReasons.map(item => <div key={`${item.category}-${item.reason}`} className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs font-semibold text-slate-500">{item.category}</p><p className="mt-1 text-sm font-medium text-slate-900">{item.reason}</p></div>)}</div><div><h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Facilitator Narratives</h4><div className="grid gap-3">{motivationNarratives.map(item => <div key={item.reason} className="rounded-lg bg-slate-50 px-4 py-3"><p className="text-sm font-semibold text-slate-800">{item.reason}</p><p className="mt-1 text-sm leading-6 text-slate-600">{item.narrative || 'Not provided'}</p></div>)}</div></div></div></DetailSection>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><DetailSection title="Aspirations & Interests"><dl className="space-y-3"><Detail label="What do you want to become?" value={aspiration?.career_goal} /><Detail label="Interests" value={aspiration?.interests} /><Detail label="Strengths Observed" value={aspiration?.strengths} /></dl></DetailSection><DetailSection title="Location Tagging"><dl className="space-y-3"><Detail label="Region" value={student.centre.region} /><Detail label="District" value={student.centre.district} /><Detail label="Centre" value={student.centre.name} /></dl></DetailSection></div>
        </div>}
        {activeTab === 'attendance' && <div><div className="mb-6"><h3 className="text-lg font-bold text-slate-900">Attendance History</h3><p className="text-sm text-slate-500">Current average: <span className="font-bold text-indigo-600">{student.attendancePercent ?? 0}%</span></p></div><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={attendanceData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Area type="monotone" dataKey="percent" stroke="#4F46E5" strokeWidth={3} fill="#E0E7FF" /></AreaChart></ResponsiveContainer></div></div>}
        {activeTab === 'academics' && <div><div className="mb-6"><h3 className="text-lg font-bold text-slate-900">Latest Assessment</h3><p className="text-sm text-slate-500">Overall Score: <span className="font-bold text-indigo-600">{student.academicScore ?? 0}%</span></p></div><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={academicData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" /><XAxis dataKey="subject" axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="score" fill="#4F46E5" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>}
        {activeTab === 'notes' && <div className="text-center py-12"><div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"><FileText size={24} /></div><h3 className="text-slate-900 font-medium mb-1">No notes yet</h3><p className="text-slate-500 text-sm mb-4">Add qualitative observations about the student.</p><button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50">Add Note</button></div>}
      </div>
    </div>
  </div>;
}
