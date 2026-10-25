import React, { useMemo, useState, useCallback } from 'react';
import {
  ChevronUp, Info, CheckCircle2, UserCheck, Smile, GraduationCap, FileText, AlertTriangle
} from 'lucide-react';
import {
  type StudentListItem,
  type Subject,
  type DiagnosticOptions,
  type LearningBehaviourOption,
} from '../../../../lib/api';

export interface StudentAssessmentData {
  scores: Record<number, number | ''>;
  diagnostics: Record<number, { understanding: string; application: string; interest: string }>;
  behaviour: string;
  keyImprovements: string;
  subjectsNeedingSupport: string;
  interventionPlan: string;
  comments: string;
  lastUpdated?: string;
}

export interface ExpandedStudentCardProps {
  student: StudentListItem;
  data: StudentAssessmentData;
  subjects: Subject[];
  diagnostics: DiagnosticOptions | null;
  behaviours: LearningBehaviourOption[];
  onUpdate: (updates: Partial<StudentAssessmentData>) => void;
  onScoreChange: (subjectId: number, value: number | '') => void;
  onDiagnosticChange: (field: 'understanding' | 'application' | 'interest', value: string) => void;
  onClose: () => void;
  filteredStudents?: StudentListItem[];
  currentStudentIndex?: number;
  onNavigateStudent?: (studentId: string) => Promise<void> | void;
  onSaveStudent?: () => Promise<void> | void;
}

const subjectThemeMap: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  tamil: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', icon: '📖' },
  english: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '🌐' },
  mathematics: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '🔢' },
  maths: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '🔢' },
  science: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: '🧪' },
  'social science': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '🏛️' },
  social: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '🏛️' },
  hindi: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: '📝' },
};

function getSubjectTheme(name: string) {
  const key = name.toLowerCase();
  for (const k of Object.keys(subjectThemeMap)) {
    if (key.includes(k)) return subjectThemeMap[k];
  }
  return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: '📚' };
}

/** Returns an error string if the mark is invalid, or '' if it's fine. */
function validateMark(value: number | '', maxMarks: number): string {
  if (value === '') return '';
  if (!Number.isFinite(value)) return 'Must be a valid number';
  if (value < 0) return 'Cannot be negative';
  if (value > maxMarks) return `Cannot exceed max (${maxMarks})`;
  return '';
}

export const ExpandedStudentCard: React.FC<ExpandedStudentCardProps> = ({
  student,
  data,
  subjects,
  diagnostics,
  behaviours,
  onUpdate,
  onScoreChange,
  onDiagnosticChange,
  onClose,
  filteredStudents,
  currentStudentIndex,
  onNavigateStudent,
  onSaveStudent,
}) => {
  const defaultSubjects: Subject[] = subjects || [];

  // Track per-subject validation errors
  const [scoreErrors, setScoreErrors] = useState<Record<number, string>>({});
  const [saveError, setSaveError] = useState('');

  const { totalObtained, totalMax, percentage } = useMemo(() => {
    let obtained = 0;
    let max = 0;
    defaultSubjects.forEach((s) => {
      const mark = data.scores[s.id];
      if (typeof mark === 'number') obtained += mark;
      max += s.maxMarks || 100;
    });
    const pct = max > 0 ? Math.round((obtained / max) * 100) : 0;
    return { totalObtained: obtained, totalMax: max, percentage: pct };
  }, [defaultSubjects, data.scores]);

  const firstSubId = defaultSubjects[0]?.id;
  const currentUnderstanding =
    (firstSubId && data?.diagnostics?.[firstSubId]?.understanding) ??
    Object.values(data?.diagnostics || {})[0]?.understanding ??
    'CLEAR';
  const currentApplication =
    (firstSubId && data?.diagnostics?.[firstSubId]?.application) ??
    Object.values(data?.diagnostics || {})[0]?.application ??
    'APPLIES';
  const currentInterest =
    (firstSubId && data?.diagnostics?.[firstSubId]?.interest) ??
    Object.values(data?.diagnostics || {})[0]?.interest ??
    'INTERESTED';
  const currentBehaviour = data?.behaviour ?? 'INDEPENDENT';

  const narrativeText = data.keyImprovements || data.comments || '';

  const handleScoreChange = useCallback(
    (subjectId: number, rawValue: string, maxMarks: number) => {
      const parsed = rawValue === '' ? '' : Number(rawValue);
      const err = validateMark(parsed, maxMarks);
      setScoreErrors((prev) => ({ ...prev, [subjectId]: err }));
      // Always update state so UI reflects what user typed — clamping happens on save
      onScoreChange(subjectId, parsed);
    },
    [onScoreChange]
  );

  const hasAnyError = Object.values(scoreErrors).some((e) => !!e);

  const handleSave = async () => {
    setSaveError('');
    // Re-validate all subjects before saving
    const errors: Record<number, string> = {};
    defaultSubjects.forEach((s) => {
      const val = data.scores[s.id];
      const err = validateMark(val ?? '', s.maxMarks || 100);
      if (err) errors[s.id] = err;
    });
    if (Object.keys(errors).length > 0) {
      setScoreErrors(errors);
      const errorList = defaultSubjects
        .filter((s) => errors[s.id])
        .map((s) => `${s.name}: ${errors[s.id]}`)
        .join('; ');
      setSaveError(`Fix marks before saving — ${errorList}`);
      return;
    }
    if (onSaveStudent) await onSaveStudent();
  };

  const handleSaveAndNext = async () => {
    setSaveError('');
    const errors: Record<number, string> = {};
    defaultSubjects.forEach((s) => {
      const val = data.scores[s.id];
      const err = validateMark(val ?? '', s.maxMarks || 100);
      if (err) errors[s.id] = err;
    });
    if (Object.keys(errors).length > 0) {
      setScoreErrors(errors);
      const errorList = defaultSubjects
        .filter((s) => errors[s.id])
        .map((s) => `${s.name}: ${errors[s.id]}`)
        .join('; ');
      setSaveError(`Fix marks before saving — ${errorList}`);
      return;
    }
    if (
      filteredStudents &&
      currentStudentIndex !== undefined &&
      currentStudentIndex >= 0 &&
      currentStudentIndex < filteredStudents.length - 1 &&
      onNavigateStudent
    ) {
      await onNavigateStudent(filteredStudents[currentStudentIndex + 1].id);
    } else {
      if (onSaveStudent) await onSaveStudent();
      onClose();
    }
  };

  return (
    <div className="bg-white border border-indigo-200/80 rounded-2xl p-5 shadow-xs space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold flex items-center justify-center text-xs shadow-2xs">
            {student.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              {student.name} {student.centre ? `(${student.centre})` : ''}
            </h3>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Roll No. {student.id} &nbsp;•&nbsp; Class {student.class || '5'} &nbsp;•&nbsp; Student ID: STU{String(student.id).padStart(5, '0')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
            {data.lastUpdated || 'Today, 10:24 AM'}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Collapse card"
          >
            <ChevronUp size={18} />
          </button>
        </div>
      </div>

      {/* Validation error banner */}
      {saveError && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 text-xs text-rose-700 font-medium">
          <AlertTriangle size={14} className="text-rose-500 mt-0.5 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Section 1: Subject-wise Marks */}
      <div className="bg-slate-50/50 border border-slate-200/70 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <span>Subject-wise Marks</span>
            <Info size={13} className="text-slate-400" />
          </div>

          <div className="text-xs font-semibold text-slate-600">
            Total Marks: <span className="font-bold text-slate-900">{totalObtained} / {totalMax}</span>
            <span className="mx-2 text-slate-300">|</span>
            Percentage: <span className="font-bold text-indigo-600">{percentage}%</span>
          </div>
        </div>

        {defaultSubjects.length === 0 ? (
          <div className="py-4 text-center text-slate-400 text-xs font-medium">
            No subjects configured for this class and exam combination.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {defaultSubjects.map((subject) => {
              const theme = getSubjectTheme(subject.name);
              const scoreVal = data.scores[subject.id] ?? '';
              const maxMarks = subject.maxMarks || 100;
              const err = scoreErrors[subject.id];
              const hasErr = !!err;

              return (
                <div
                  key={subject.id}
                  className={`bg-white border rounded-xl p-3 flex flex-col justify-between shadow-2xs space-y-2 transition ${
                    hasErr ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-6 h-6 rounded-md ${theme.bg} ${theme.border} border text-xs flex items-center justify-center shrink-0`}>
                      {theme.icon}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 truncate" title={subject.name}>
                      {subject.name}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max={maxMarks}
                        step="0.5"
                        value={scoreVal}
                        onChange={(e) => handleScoreChange(subject.id, e.target.value, maxMarks)}
                        onBlur={(e) => {
                          // Re-validate on blur for cleaner UX
                          const parsed = e.target.value === '' ? '' : Number(e.target.value);
                          const err = validateMark(parsed, maxMarks);
                          setScoreErrors((prev) => ({ ...prev, [subject.id]: err }));
                        }}
                        placeholder="—"
                        className={`w-full h-8 px-2 border rounded-lg text-xs font-bold text-slate-900 bg-white text-center outline-none shadow-2xs transition ${
                          hasErr
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 bg-rose-50/30'
                            : 'border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200'
                        }`}
                      />
                      <span className="text-[11px] font-medium text-slate-400 shrink-0">
                        / {maxMarks}
                      </span>
                    </div>
                    {/* Inline error message */}
                    {hasErr && (
                      <p className="text-[10px] text-rose-600 font-semibold leading-tight flex items-center gap-0.5">
                        <AlertTriangle size={9} className="shrink-0" />
                        {err}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Overall Learning & Behaviour */}
      <div className="bg-slate-50/50 border border-slate-200/70 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <span>Overall Learning &amp; Behaviour</span>
          <Info size={13} className="text-slate-400" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Understanding Level */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              Understanding Level <span className="text-rose-500">*</span>
            </label>
            <div className="relative inline-flex items-center">
              <CheckCircle2 size={14} className="absolute left-3 text-emerald-500 pointer-events-none" />
              <select
                value={currentUnderstanding}
                onChange={(e) => onDiagnosticChange('understanding', e.target.value)}
                className="w-full h-9 appearance-none bg-white border border-slate-200 text-slate-800 pl-8 pr-7 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs cursor-pointer"
              >
                <option value="">Select Understanding</option>
                <option value="CLEAR">Understands clearly</option>
                <option value="REPETITION">Needs repetition</option>
                <option value="NOT_UNDERSTAND">Does not understand</option>
              </select>
            </div>
          </div>

          {/* Application Ability */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              Application Ability <span className="text-rose-500">*</span>
            </label>
            <div className="relative inline-flex items-center">
              <UserCheck size={14} className="absolute left-3 text-indigo-500 pointer-events-none" />
              <select
                value={currentApplication}
                onChange={(e) => onDiagnosticChange('application', e.target.value)}
                className="w-full h-9 appearance-none bg-white border border-slate-200 text-slate-800 pl-8 pr-7 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs cursor-pointer"
              >
                <option value="">Select Application</option>
                <option value="APPLIES">Applies concepts</option>
                <option value="MEMORISES">Memorises only</option>
                <option value="CANNOT_APPLY">Cannot apply</option>
              </select>
            </div>
          </div>

          {/* Interest Level */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              Interest Level <span className="text-rose-500">*</span>
            </label>
            <div className="relative inline-flex items-center">
              <Smile size={14} className="absolute left-3 text-emerald-500 pointer-events-none" />
              <select
                value={currentInterest}
                onChange={(e) => onDiagnosticChange('interest', e.target.value)}
                className="w-full h-9 appearance-none bg-white border border-slate-200 text-slate-800 pl-8 pr-7 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs cursor-pointer"
              >
                <option value="">Select Interest</option>
                <option value="INTERESTED">Interested</option>
                <option value="NEUTRAL">Neutral</option>
                <option value="DISINTERESTED">Disinterested</option>
              </select>
            </div>
          </div>

          {/* Learning Behaviour */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              Learning Behaviour <span className="text-rose-500">*</span>
            </label>
            <div className="relative inline-flex items-center">
              <GraduationCap size={14} className="absolute left-3 text-indigo-500 pointer-events-none" />
              <select
                value={currentBehaviour}
                onChange={(e) => onUpdate({ behaviour: e.target.value })}
                className="w-full h-9 appearance-none bg-white border border-slate-200 text-slate-800 pl-8 pr-7 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs cursor-pointer"
              >
                <option value="">Select Learning Behaviour</option>
                <option value="INDEPENDENT">Studies independently</option>
                <option value="SUPERVISION">Needs supervision</option>
                <option value="MOTIVATED">Motivated</option>
                <option value="NEEDS_SUPPORT">Needs support</option>
              </select>
            </div>
          </div>
        </div>

        {/* Narrative Observation Block */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <FileText size={14} className="text-indigo-600" />
            <span>Narrative Observation <span className="text-rose-600 font-semibold">* (Mandatory to Publish)</span></span>
          </div>

          <textarea
            value={narrativeText}
            onChange={(e) => {
              const val = e.target.value.slice(0, 500);
              onUpdate({ keyImprovements: val, comments: val });
            }}
            placeholder="Enter key improvements, subjects needing support and intervention plan..."
            rows={3}
            className="w-full text-xs p-3 border border-slate-200 rounded-lg bg-slate-50/50 resize-none outline-none focus:border-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400 shadow-2xs"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Provide detailed observations and intervention plans if needed.</span>
            <span>{narrativeText.length} / 500</span>
          </div>

        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={hasAnyError}
          className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Update
        </button>

        <button
          type="button"
          onClick={handleSaveAndNext}
          disabled={hasAnyError}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Update &amp; Next</span>
        </button>
      </div>
    </div>
  );
};
