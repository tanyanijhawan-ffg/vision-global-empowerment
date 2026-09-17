import React from 'react';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
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

/**
 * Props for ExpandedStudentCard component.
 */
export interface ExpandedStudentCardProps {
  student: StudentListItem;
  data: StudentAssessmentData;
  subject: Subject;
  maxMarks: number;
  diagnostics: DiagnosticOptions | null;
  behaviours: LearningBehaviourOption[];
  onUpdate: (updates: Partial<StudentAssessmentData>) => void;
  onScoreChange: (value: number | '') => void;
  onDiagnosticChange: (field: 'understanding' | 'application' | 'interest', value: string) => void;
  onClose: () => void;
  filteredStudents: StudentListItem[];
  currentStudentIndex: number;
  onNavigateStudent: (studentId: string) => void;
}

/**
 * ExpandedStudentCard component.
 * Detailed entry card for student marks, understanding levels, behaviours, and narrative observations.
 */
export const ExpandedStudentCard: React.FC<ExpandedStudentCardProps> = ({
  student,
  data,
  subject,
  maxMarks,
  diagnostics,
  behaviours,
  onUpdate,
  onScoreChange,
  onDiagnosticChange,
  onClose,
  filteredStudents,
  currentStudentIndex,
  onNavigateStudent,
}) => {
  const score = data.scores[subject?.id] ?? '';
  const subjectDiagnostics = data.diagnostics[subject?.id] || {};
  const currentUnderstanding = subjectDiagnostics.understanding || '';
  const currentBehaviour = data.behaviour || 'INDEPENDENT';

  const pillCardClass = (isActive: boolean, activeColor = 'border-indigo-500 bg-indigo-50/70 text-indigo-800') =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
      isActive
        ? `${activeColor} shadow-2xs`
        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
    }`;

  return (
    <div className="bg-white border border-indigo-300 rounded-xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 border-2 border-amber-300 text-amber-900 font-bold flex items-center justify-center text-sm shadow-2xs">
            {student.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{student.name}</h3>
            <div className="text-xs text-slate-500 mt-0.5">
              Roll No. {student.id} &nbsp;•&nbsp; Class {student.class || '6'} &nbsp;•&nbsp; Student ID: STU{String(student.id).padStart(5, '0')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div className="text-xs text-slate-400">
            <div>{data.lastUpdated || 'Today, Just now'}</div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Row 1: Marks | Understanding / Diagnostics | Learning Behaviour */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
        {/* Col 1: Marks */}
        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
          <label className="text-xs font-semibold text-slate-700 block mb-2">
            Marks <span className="text-rose-500 font-bold">*</span> <span className="text-slate-400 font-normal">(Out of {maxMarks})</span>
          </label>
          <div className="flex items-baseline gap-2 mt-1">
            <input
              type="number"
              min="0"
              max={maxMarks}
              value={score}
              onChange={(e) => onScoreChange(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-24 h-11 px-3 border border-slate-300 rounded-lg text-lg font-bold text-slate-900 bg-white text-center focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none shadow-2xs"
              placeholder="0"
            />
            <span className="text-sm font-semibold text-slate-500">/ {maxMarks}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Enter a value between 0 and {maxMarks}</p>
        </div>

        {/* Col 2: Understanding Level */}
        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Understanding Level <span className="text-rose-500 font-bold">*</span>
            </label>
            <span className="text-slate-400 text-xs">ⓘ</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onDiagnosticChange('understanding', 'CLEAR')}
              className={pillCardClass(currentUnderstanding === 'CLEAR', 'border-emerald-500 bg-emerald-50 text-emerald-800')}
            >
              <span>👍</span> Understands
            </button>

            <button
              type="button"
              onClick={() => onDiagnosticChange('understanding', 'REPETITION')}
              className={pillCardClass(currentUnderstanding === 'REPETITION', 'border-amber-500 bg-amber-50 text-amber-800')}
            >
              <span>⚠️</span> Repetition
            </button>

            <button
              type="button"
              onClick={() => onDiagnosticChange('understanding', 'NOT_UNDERSTAND')}
              className={pillCardClass(currentUnderstanding === 'NOT_UNDERSTAND', 'border-rose-500 bg-rose-50 text-rose-800')}
            >
              <span>🚫</span> Needs Support
            </button>

            <button
              type="button"
              onClick={() => onDiagnosticChange('understanding', '')}
              className={pillCardClass(currentUnderstanding === '', 'border-slate-400 bg-slate-100 text-slate-700')}
            >
              <span>⊝</span> Not Assessed
            </button>
          </div>
        </div>

        {/* Col 3: Learning Behaviour */}
        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Learning Behaviour <span className="text-rose-500 font-bold">*</span>
            </label>
            <span className="text-slate-400 text-xs">👤</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onUpdate({ behaviour: 'INDEPENDENT' })}
              className={pillCardClass(currentBehaviour === 'INDEPENDENT', 'border-indigo-500 bg-indigo-50 text-indigo-800')}
            >
              <span>⭐</span> Independent
            </button>

            <button
              type="button"
              onClick={() => onUpdate({ behaviour: 'SUPERVISION' })}
              className={pillCardClass(currentBehaviour === 'SUPERVISION', 'border-amber-500 bg-amber-50 text-amber-800')}
            >
              <span>👀</span> Supervision
            </button>

            <button
              type="button"
              onClick={() => onUpdate({ behaviour: 'MOTIVATED' })}
              className={pillCardClass(currentBehaviour === 'MOTIVATED', 'border-indigo-500 bg-indigo-50 text-indigo-800')}
            >
              <span>🔥</span> Motivated
            </button>

            <button
              type="button"
              onClick={() => onUpdate({ behaviour: 'IRREGULAR' })}
              className={pillCardClass(currentBehaviour === 'IRREGULAR', 'border-rose-500 bg-rose-50 text-rose-800')}
            >
              <span>⏳</span> Irregular
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Strengths | Areas to Improve | Next Steps / Support Plan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
        {/* Strengths */}
        <div>
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">✓</span>
              <label className="text-xs font-bold text-slate-800">
                Strengths / Key Improvements <span className="text-rose-500 font-bold">*</span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => onUpdate({ keyImprovements: 'Active participation and strong concept retention' })}
              className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer underline"
            >
              Active learner
            </button>
          </div>
          <textarea
            value={data.keyImprovements}
            onChange={(e) => onUpdate({ keyImprovements: e.target.value })}
            placeholder="Good at problem solving, active class participation."
            rows={2}
            className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white resize-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 text-slate-700 placeholder-slate-400 shadow-2xs"
          />
        </div>

        {/* Areas to Improve */}
        <div>
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px]">○</span>
              <label className="text-xs font-bold text-slate-800">
                Areas to Improve <span className="text-rose-500 font-bold">*</span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => onUpdate({ subjectsNeedingSupport: 'No specific support needed' })}
              className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer underline"
            >
              No support needed
            </button>
          </div>
          <textarea
            value={data.subjectsNeedingSupport}
            onChange={(e) => onUpdate({ subjectsNeedingSupport: e.target.value })}
            placeholder="Needs practice in multi-step word problems..."
            rows={2}
            className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white resize-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 text-slate-700 placeholder-slate-400 shadow-2xs"
          />
        </div>

        {/* Next Steps / Support Plan */}
        <div>
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">✎</span>
              <label className="text-xs font-bold text-slate-800">
                Next Steps / Support Plan <span className="text-rose-500 font-bold">*</span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => onUpdate({ interventionPlan: 'Standard revision worksheets' })}
              className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer underline"
            >
              Standard practice
            </button>
          </div>
          <textarea
            value={data.interventionPlan}
            onChange={(e) => onUpdate({ interventionPlan: e.target.value })}
            placeholder="Provide extra practice worksheets on word problems and time conversions."
            rows={2}
            className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white resize-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 text-slate-700 placeholder-slate-400 shadow-2xs"
          />
        </div>
      </div>

      {/* Row 3: Teacher Comments */}
      <div className="bg-slate-50/40 p-3 rounded-xl border border-slate-100">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-slate-700">Teacher Comments <span className="text-slate-400 font-normal">(Optional general notes)</span></label>
          <span className="text-[11px] text-slate-400">{data.comments?.length || 0} / 300 characters</span>
        </div>
        <textarea
          value={data.comments}
          onChange={(e) => onUpdate({ comments: e.target.value.slice(0, 300) })}
          placeholder="Understands concepts well. Enthusiastic in classroom discussions..."
          rows={2}
          className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white resize-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 text-slate-700 placeholder-slate-400"
        />
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => {
            if (currentStudentIndex > 0) {
              onNavigateStudent(filteredStudents[currentStudentIndex - 1].id);
            }
          }}
          disabled={currentStudentIndex === 0}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
        >
          <ArrowLeft size={14} /> Previous Student
        </button>

        <div className="text-xs font-semibold text-slate-500">
          {currentStudentIndex + 1} of {filteredStudents.length} Students
        </div>

        <button
          type="button"
          onClick={() => {
            if (currentStudentIndex < filteredStudents.length - 1) {
              onNavigateStudent(filteredStudents[currentStudentIndex + 1].id);
            } else {
              onClose();
            }
          }}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-xs cursor-pointer"
        >
          Next Student <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
