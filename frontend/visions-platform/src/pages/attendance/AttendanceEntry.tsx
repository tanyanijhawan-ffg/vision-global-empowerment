import { useEffect, useState } from 'react';
import { Bell, Info, Search, Save } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import {
  AttendanceCentre, AttendanceInput, AttendanceIntelligenceSetting, AttentionLevel, Behaviour, LearningBehaviour, StudentListItem,
  fetchAttendance, fetchAttendanceCentres, fetchAttendanceIntelligence, fetchStudents, learningBehaviourOptions, saveAttendanceBulk, saveAttendanceIntelligence,
} from '../../lib/api';

const attentionOptions: AttentionLevel[] = ['Focused', 'Distracted', 'Needs reminders'];
const behaviourOptions: Behaviour[] = ['Cooperative', 'Disruptive', 'Silent', 'Leadership behavior'];
const participationLabels: Record<string, string> = {
  '1': 'Passive', '2': 'Limited Participation', '3': 'Moderate Participation',
  '4': 'Active Participation', '5': 'Highly active',
};

type AttendanceDraft = Omit<AttendanceInput, 'student_id' | 'attendance_date'>;
const emptyDraft = (): AttendanceDraft => ({
  status: 'Present', absence_reason: '', late_reason: '', participation_level: '3', attention_level: 'Focused',
  learning_behaviour: [], behaviour: 'Cooperative', tutor_observation: '', what_was_different: '', any_concern: '', any_positive_change: '',
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
  const [intelligence, setIntelligence] = useState<AttendanceIntelligenceSetting | null>(null);
  const [savingIntelligence, setSavingIntelligence] = useState(false);

  useEffect(() => {
    Promise.all([fetchStudents(), fetchAttendanceCentres()]).then(([records, centreRecords]) => {
      setStudents(records);
      setCentres(centreRecords);
      setSelectedCentre(String(centreRecords[0]?.id || ''));
      setDrafts(Object.fromEntries(records.map(student => [student.id, emptyDraft()])));
    }).catch(error => setMessage(error.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAttendanceIntelligence().then(setIntelligence).catch(error => setMessage(error.message));
  }, []);

  useEffect(() => {
    if (!date || !students.length) return;
    fetchAttendance({ date }).then(records => setDrafts(previous => {
      const next = { ...previous };
      records.forEach(record => {
        next[String(record.student_id)] = {
          status: record.status || 'Present', absence_reason: record.absence_reason || '', late_reason: record.late_reason || '',
          participation_level: record.participation_level || '3', attention_level: record.attention_level || 'Focused',
          learning_behaviour: record.learning_behaviour || [], behaviour: record.behaviour || 'Cooperative',
          tutor_observation: record.tutor_observation || '', what_was_different: record.what_was_different || '',
          any_concern: record.any_concern || '', any_positive_change: record.any_positive_change || '',
        };
      });
      return next;
    })).catch(error => setMessage(error.message));
  }, [date, students.length]);

  const filteredStudents = students.filter(student => student.centreId === Number(selectedCentre) && student.name.toLowerCase().includes(search.toLowerCase()));
  const centreStudents = students.filter(student => student.centreId === Number(selectedCentre));
  const updateDraft = (id: string, changes: Partial<AttendanceDraft>) => {
    setDrafts(previous => ({ ...previous, [id]: { ...previous[id], ...changes } }));
    setMessage('');
  };
  const toggleLearningBehaviour = (id: string, option: LearningBehaviour) => {
    const current = drafts[id]?.learning_behaviour || [];
    updateDraft(id, { learning_behaviour: current.includes(option) ? current.filter(value => value !== option) : [...current, option] });
  };
  const updateIntelligence = (changes: Partial<AttendanceIntelligenceSetting>) => {
    setIntelligence(previous => previous ? { ...previous, ...changes } : previous);
  };
  const toggleIntelligenceValue = (field: 'notification_channels' | 'absence_alert_recipients' | 'engagement_alert_recipients', value: string) => {
    if (!intelligence) return;
    const current = intelligence[field];
    updateIntelligence({ [field]: current.includes(value) ? current.filter(item => item !== value) : [...current, value] });
  };
  const handleIntelligenceSave = async () => {
    if (!intelligence) return;
    setSavingIntelligence(true); setMessage('');
    try { setIntelligence(await saveAttendanceIntelligence(intelligence)); setMessage('System Intelligence settings saved successfully.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save intelligence settings.'); }
    finally { setSavingIntelligence(false); }
  };
  const handleSave = async () => {
    const invalid = filteredStudents.find(student => {
      const draft = drafts[student.id];
      return (draft?.status === 'Absent' && !draft.absence_reason?.trim()) || (draft?.status === 'Late' && !draft.late_reason?.trim());
    });
    if (invalid) {
      const draft = drafts[invalid.id];
      setMessage(`Add a ${draft?.status === 'Late' ? 'late' : 'absence'} reason for ${invalid.name}.`);
      return;
    }
    setSaving(true); setMessage('');
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
      {intelligence && <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-4"><div><h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><Bell size={18} className="text-indigo-600" />System Intelligence</h2><p className="text-sm text-slate-500 mt-1">Configure Attendance alerts for absence and engagement changes.</p></div><button onClick={handleIntelligenceSave} disabled={savingIntelligence} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"><Save size={16} />{savingIntelligence ? 'Saving...' : 'Save Settings'}</button></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <label><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Notification format</span><select value={intelligence.notification_mode} onChange={event => updateIntelligence({ notification_mode: event.target.value as AttendanceIntelligenceSetting['notification_mode'] })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"><option value="separate">Separate notifications</option><option value="combined">Combined notification</option></select></label>
          <fieldset><legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notification medium</legend><div className="flex flex-wrap gap-3">{[['email', 'Email'], ['sms', 'SMS'], ['whatsapp', 'WhatsApp']].map(([value, label]) => <label key={value} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={intelligence.notification_channels.includes(value)} onChange={() => toggleIntelligenceValue('notification_channels', value)} />{label}</label>)}</div></fieldset>
          <div className="text-sm text-slate-500 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">Alerts are configured here; delivery requires the corresponding email, SMS, or WhatsApp provider.</div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 border-t border-slate-100 pt-5">
          <fieldset><legend className="text-sm font-semibold text-slate-800 mb-2"><label className="flex items-center gap-2"><input type="checkbox" checked={intelligence.absence_alert_enabled} onChange={event => updateIntelligence({ absence_alert_enabled: event.target.checked })} />Alert after {intelligence.absence_alert_days} consecutive absent days</label></legend><div className="flex flex-wrap gap-3 pl-6">{[['facilitator', 'Facilitator'], ['admin', 'Admin']].map(([value, label]) => <label key={value} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={intelligence.absence_alert_recipients.includes(value)} onChange={() => toggleIntelligenceValue('absence_alert_recipients', value)} />{label}</label>)}</div></fieldset>
          <fieldset><legend className="text-sm font-semibold text-slate-800 mb-2"><label className="flex items-center gap-2"><input type="checkbox" checked={intelligence.engagement_alert_enabled} onChange={event => updateIntelligence({ engagement_alert_enabled: event.target.checked })} />Alert when participation drops below level {intelligence.engagement_alert_level}</label></legend><div className="flex flex-wrap gap-3 pl-6">{[['facilitator', 'Facilitator'], ['admin', 'Admin']].map(([value, label]) => <label key={value} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={intelligence.engagement_alert_recipients.includes(value)} onChange={() => toggleIntelligenceValue('engagement_alert_recipients', value)} />{label}</label>)}</div></fieldset>
        </div>
      </section>}
      {message && <p className={`text-sm ${message.includes('successfully') ? 'text-emerald-600' : 'text-red-600'}`}>{message}</p>}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/50"><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search students..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm" /></div><span className="text-sm text-slate-500">Showing <b className="text-slate-900">{filteredStudents.length}</b> students</span></div>
        {loading ? <p className="p-8 text-center text-slate-500">Loading students...</p> : <div className="divide-y divide-slate-100">
          {filteredStudents.map(student => { const draft = drafts[student.id] || emptyDraft(); return <section key={student.id} className="p-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_280px] gap-6">
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Student Name</span><p className="font-semibold text-slate-900">{student.name}</p></div><div><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Student ID</span><p className="font-semibold text-slate-900">{student.id}</p></div></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <label><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Status</span><select value={draft.status} onChange={event => updateDraft(student.id, { status: event.target.value as AttendanceInput['status'] })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"><option value="Present">Present</option><option value="Absent">Absent</option><option value="Late">Late</option></select></label>
                  {draft.status === 'Present' && <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700"><Info size={16} aria-label="Information" /><span>No Remarks required for Present.</span></div>}
                  {draft.status === 'Absent' && <label><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Reason for Absence <b className="text-red-500">*</b></span><input value={draft.absence_reason} onChange={event => updateDraft(student.id, { absence_reason: event.target.value })} placeholder="Required when absent" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></label>}
                  {draft.status === 'Late' && <label><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Reason for Late <b className="text-red-500">*</b></span><input value={draft.late_reason} onChange={event => updateDraft(student.id, { late_reason: event.target.value })} placeholder="Required when late" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></label>}
                  <label><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Participation Level</span><select value={draft.participation_level} onChange={event => updateDraft(student.id, { participation_level: event.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">{Object.entries(participationLabels).map(([level, label]) => <option key={level} value={level}>{level} - {label}</option>)}</select></label>
                </div>
                {intelligence && <fieldset className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3"><legend className="text-xs font-semibold text-indigo-700 uppercase tracking-wide px-1">Alert students</legend><div className="flex gap-4 mb-3 text-sm">{(['individual', 'combined'] as const).map(mode => <label key={mode} className="flex items-center gap-1.5"><input type="radio" name={`alert-mode-${student.id}`} checked={intelligence.alert_student_mode === mode} onChange={() => updateIntelligence({ alert_student_mode: mode })} />{mode === 'individual' ? 'Individual Student' : 'Combined Students'}</label>)}</div>{intelligence.alert_student_mode === 'individual' ? <select value={String(intelligence.alert_student_ids[0] || '')} onChange={event => updateIntelligence({ alert_student_ids: event.target.value ? [Number(event.target.value)] : [] })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"><option value="">Select a student</option>{centreStudents.map(option => <option key={option.id} value={option.id}>{option.name} ({option.id})</option>)}</select> : <div className="grid grid-cols-2 gap-2">{centreStudents.map(option => <label key={option.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={intelligence.alert_student_ids.includes(Number(option.id))} onChange={() => updateIntelligence({ alert_student_ids: intelligence.alert_student_ids.includes(Number(option.id)) ? intelligence.alert_student_ids.filter(id => id !== Number(option.id)) : [...intelligence.alert_student_ids, Number(option.id)] })} />{option.name}</label>)}</div>}</fieldset>}
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
