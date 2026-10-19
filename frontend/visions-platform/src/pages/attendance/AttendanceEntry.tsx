import { useEffect, useState } from 'react';
import { Info, Search, Save } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import {
  AttendanceCentre, AttendanceInput, AttentionLevel, Behaviour, LearningBehaviour, StudentListItem,
  fetchAttendance, fetchAttendanceCentres, fetchStudents, learningBehaviourOptions, saveAttendanceBulk,
} from '../../lib/api';

const attentionOptions: AttentionLevel[] = ['Focused', 'Distracted', 'Needs reminders'];
const behaviourOptions: Behaviour[] = ['Cooperative', 'Disruptive', 'Silent', 'Leadership behavior'];
const participationLabels: Record<string, string> = {
  '1': 'Passive', '2': 'Limited Participation', '3': 'Moderate Participation',
  '4': 'Active Participation', '5': 'Highly active',
};

function formatClassGrade(value: string): string {
  const grade = value.trim();
  if (!grade || grade === 'Not provided') return '';
  if (/^class\s/i.test(grade) || /(?:st|nd|rd|th)$/i.test(grade)) return grade;
  const numericGrade = Number(grade);
  if (!Number.isInteger(numericGrade) || numericGrade < 1) return grade;
  const lastTwoDigits = numericGrade % 100;
  const suffix = lastTwoDigits >= 11 && lastTwoDigits <= 13
    ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[numericGrade % 10] || 'th';
  return `${numericGrade}${suffix}`;
}

type AttendanceDraft = Omit<AttendanceInput, 'student_id' | 'attendance_date'>;
const emptyDraft = (): AttendanceDraft => ({
  status: 'Present', absence_reason: '', late_reason: '', participation_level: '',
  learning_behaviour: [], tutor_observation: '', what_was_different: '', any_concern: '', any_positive_change: '',
});

export default function AttendanceEntry() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [centres, setCentres] = useState<AttendanceCentre[]>([]);
  const [selectedCentre, setSelectedCentre] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, AttendanceDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([fetchStudents(), fetchAttendanceCentres()]).then(([records, centreRecords]) => {
      setStudents(records);
      setCentres(centreRecords);
      setSelectedCentre(String(centreRecords[0]?.id || ''));
      setDrafts(Object.fromEntries(records.map(student => [student.id, emptyDraft()])));
    }).catch(error => setMessage(error.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!date || !students.length) return;
    setDrafts(Object.fromEntries(students.map(student => [student.id, emptyDraft()])));
    let active = true;
    fetchAttendance({ date }).then(records => {
      if (!active) return;
      setDrafts(() => {
        const next = Object.fromEntries(students.map(student => [student.id, emptyDraft()]));
        records.forEach(record => {
          next[String(record.student_id)] = {
            status: record.status || 'Present', absence_reason: record.absence_reason || '', late_reason: record.late_reason || '',
            participation_level: record.participation_level || '', ...(record.attention_level ? { attention_level: record.attention_level } : {}),
            learning_behaviour: record.learning_behaviour || [], ...(record.behaviour ? { behaviour: record.behaviour } : {}),
            tutor_observation: record.tutor_observation || '', what_was_different: record.what_was_different || '',
            any_concern: record.any_concern || '', any_positive_change: record.any_positive_change || '',
          };
        });
        return next;
      });
    }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [date, students]);

  const filteredStudents = students.filter(student => student.centreId === Number(selectedCentre) && student.name.toLowerCase().includes(search.toLowerCase()));
  const updateDraft = (id: string, changes: Partial<AttendanceDraft>) => {
    setDrafts(previous => ({ ...previous, [id]: { ...previous[id], ...changes } }));
    setMessage('');
  };
  const toggleLearningBehaviour = (id: string, option: LearningBehaviour) => {
    const current = drafts[id]?.learning_behaviour || [];
    updateDraft(id, { learning_behaviour: current.includes(option) ? current.filter(value => value !== option) : [...current, option] });
  };
  const handleSave = async () => {
    setMessage('');
    const studentsMissingParticipation = filteredStudents.filter(student => !drafts[student.id]?.participation_level);
    if (studentsMissingParticipation.length) {
      setMessage(`Select a valid Participation Level for all students before saving. ${studentsMissingParticipation.length} student${studentsMissingParticipation.length === 1 ? '' : 's'} still need a selection.`);
      return;
    }
    setSaving(true);
    try {
      const centreId = Number(selectedCentre);
      if (!centreId) throw new Error('The selected centre has no database ID.');
      await saveAttendanceBulk(date, centreId, filteredStudents.map(student => ({ student_id: Number(student.id), attendance_date: date, ...drafts[student.id] })));
      setMessage('Attendance saved successfully.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save attendance.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Mark Attendance" subtitle="Record daily attendance, engagement, and tutor observations."
        action={<button onClick={handleSave} disabled={saving || loading || !filteredStudents.length} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"><Save size={16} />{saving ? 'Saving...' : 'Save Attendance'}</button>} />
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="space-y-1.5"><span className="block text-sm font-medium text-slate-700">Select Centre</span><select value={selectedCentre} onChange={event => setSelectedCentre(event.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"><option value="">Select a centre</option>{centres.map(centre => <option key={centre.id} value={centre.id}>{centre.name}</option>)}</select></label>
        <label className="space-y-1.5"><span className="block text-sm font-medium text-slate-700">Date</span><input type="date" value={date} onChange={event => setDate(event.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" /></label>
      </div></div>
      {message && <p className={`text-sm ${message.includes('successfully') ? 'text-emerald-600' : 'text-red-600'}`}>{message}</p>}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/50"><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search students..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm" /></div><span className="text-sm text-slate-500">Showing <b className="text-slate-900">{filteredStudents.length}</b> students</span></div>
        {loading ? <p className="p-8 text-center text-slate-500">Loading students...</p> : <div className="divide-y divide-slate-100">
          {filteredStudents.map(student => { const draft = drafts[student.id] || emptyDraft(); return <section key={student.id} className="p-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_280px] gap-6">
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Student Name</span><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{student.name}</p>{formatClassGrade(student.class) && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">Class {formatClassGrade(student.class)}</span>}</div></div><div><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Student ID</span><p className="font-semibold text-slate-900">{student.id}</p></div></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <label><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Status <b className="text-red-500">*</b></span><select required value={draft.status} onChange={event => updateDraft(student.id, { status: event.target.value as AttendanceInput['status'] })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"><option value="Present">Present</option><option value="Absent">Absent</option><option value="Late">Late</option></select></label>
                  {draft.status === 'Present' && <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700"><Info size={16} aria-label="Information" /><span>No Remarks required for Present.</span></div>}
                  {draft.status === 'Absent' && <label><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Reason for Absence <span className="normal-case font-normal text-slate-400">(optional)</span></span><input value={draft.absence_reason} onChange={event => updateDraft(student.id, { absence_reason: event.target.value })} placeholder="Add a reason if known" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></label>}
                  {draft.status === 'Late' && <label><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Reason for Late <span className="normal-case font-normal text-slate-400">(optional)</span></span><input value={draft.late_reason} onChange={event => updateDraft(student.id, { late_reason: event.target.value })} placeholder="Add a reason if known" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></label>}
                  <label><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Participation Level</span><select required value={draft.participation_level} onChange={event => updateDraft(student.id, { participation_level: event.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"><option value="" disabled>Select valid option</option>{Object.entries(participationLabels).map(([level, label]) => <option key={level} value={level}>{level} - {label}</option>)}</select></label>
                </div>
              </div>
              <aside className="border-t md:border-t-0 md:border-l border-slate-200 pt-5 md:pt-0 md:pl-6 space-y-6">
                <fieldset><legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Student Behavior</legend><div className="grid grid-cols-2 gap-3">{behaviourOptions.map(option => <label key={option} className="flex items-center gap-1.5 text-sm"><input type="radio" name={`behaviour-${student.id}`} checked={draft.behaviour === option} onChange={() => updateDraft(student.id, { behaviour: option })} />{option}</label>)}</div></fieldset>
                <fieldset><legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Learning Behavior</legend><div className="grid grid-cols-2 gap-3">{learningBehaviourOptions.map(option => <label key={option} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.learning_behaviour.includes(option)} onChange={() => toggleLearningBehaviour(student.id, option)} />{option}</label>)}</div></fieldset>
                <fieldset><legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Attention Level</legend><div className="grid grid-cols-2 gap-3">{attentionOptions.map(option => <label key={option} className="flex items-center gap-1.5 text-sm"><input type="radio" name={`attention-${student.id}`} checked={draft.attention_level === option} onChange={() => updateDraft(student.id, { attention_level: option })} />{option}</label>)}</div></fieldset>
              </aside>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><label><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">What was different today?</span><textarea value={draft.what_was_different} onChange={event => updateDraft(student.id, { what_was_different: event.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-y" /></label><label><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Any concern?</span><textarea value={draft.any_concern} onChange={event => updateDraft(student.id, { any_concern: event.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-y" /></label><label><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Any positive change?</span><textarea value={draft.any_positive_change} onChange={event => updateDraft(student.id, { any_positive_change: event.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-y" /></label></div>
          </section>; })}
          {!filteredStudents.length && <p className="p-8 text-center text-slate-500">No students found for this centre.</p>}
        </div>}
      </div>
    </div>
  );
}
