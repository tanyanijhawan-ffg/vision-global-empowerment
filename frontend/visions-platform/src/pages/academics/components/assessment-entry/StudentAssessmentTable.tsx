import React from 'react';
import {
  CheckCircle2, Search, ChevronDown, Sparkles, Save, RotateCcw, Trash2
} from 'lucide-react';
import {
  type StudentListItem,
  type Subject,
  type AttendanceCentre,
  type DiagnosticOptions,
  type LearningBehaviourOption,
} from '../../../../lib/api';
import { ExpandedStudentCard, type StudentAssessmentData } from './ExpandedStudentCard';

export type StatusFilter = 'All' | 'Incomplete' | 'Completed' | 'Needs Attention';

interface StudentAssessmentTableProps {
  stats: { total: number; completed: number; percentage: number };
  currentCentre?: AttendanceCentre;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (f: StatusFilter) => void;
  quickActionsOpen: boolean;
  onToggleQuickActions: () => void;
  onLoadLastDraft: () => void;
  onSaveDraft: () => void;
  onClearCurrentEntries: () => void;
  filteredStudents: StudentListItem[];
  studentData: Record<string, StudentAssessmentData>;
  subjects: Subject[];
  maxMarks: number;
  expandedStudentId: string | null;
  onToggleExpandStudent: (studentId: string | null) => void;
  updateScore: (studentId: string, subjectId: number, value: number | '') => void;
  updateDiagnostic: (studentId: string, subjectId: number, field: 'understanding' | 'application' | 'interest', value: string) => void;
  updateStudentData: (studentId: string, updates: Partial<StudentAssessmentData>) => void;
  saveSingleStudent: (studentId: string) => Promise<void>;
  diagnostics: DiagnosticOptions | null;
  behaviours: LearningBehaviourOption[];
  getUnderstandingBadge?: (studentId: string) => React.ReactNode;
}

export const StudentAssessmentTable: React.FC<StudentAssessmentTableProps> = ({
  stats,
  currentCentre,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  quickActionsOpen,
  onToggleQuickActions,
  onLoadLastDraft,
  onSaveDraft,
  onClearCurrentEntries,
  filteredStudents,
  studentData,
  subjects,
  maxMarks,
  expandedStudentId,
  onToggleExpandStudent,
  updateScore,
  updateDiagnostic,
  updateStudentData,
  saveSingleStudent,
  diagnostics,
  behaviours,
}) => {
  return (
    <div className="space-y-4">
      {/* Sub-Header Progress & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-1">
        {/* Progress & Stats */}
        <div className="flex items-center gap-3">
          <span className="p-1 rounded bg-slate-100 text-slate-500">
            <CheckCircle2 size={16} className="text-slate-600" />
          </span>
          <span className="text-xs font-semibold text-slate-700">
            {stats.completed} of {stats.total} students completed
          </span>
          <div className="w-48 bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700">{stats.percentage}%</span>
          {currentCentre && (
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium hidden sm:inline-block">
              {currentCentre.name}
            </span>
          )}
        </div>

        {/* Search, Filter, Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 shadow-2xs"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
              className="appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-7 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="All">Filter: All</option>
              <option value="Incomplete">Filter: Incomplete</option>
              <option value="Completed">Filter: Completed</option>
              <option value="Needs Attention">Filter: Needs Attention</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Quick Actions Dropdown */}
          <div className="relative">
            <button
              onClick={onToggleQuickActions}
              className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-medium hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            >
              <Sparkles size={13} className="text-slate-600" />
              Quick Actions
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {quickActionsOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20 text-xs font-medium text-slate-700">
                <button
                  onClick={onLoadLastDraft}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-800 cursor-pointer"
                >
                  <RotateCcw size={14} className="text-indigo-600" />
                  Load Last Saved Draft
                </button>
                <button
                  onClick={onSaveDraft}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-800 cursor-pointer"
                >
                  <Save size={14} className="text-indigo-600" />
                  Save Draft Now
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={onClearCurrentEntries}
                  className="w-full text-left px-3.5 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-600 cursor-pointer"
                >
                  <Trash2 size={14} className="text-rose-500" />
                  Reset Current Entries
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Cards List */}
      <div className="space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center text-slate-500 text-xs font-medium">
            No students found matching current filters.
          </div>
        ) : (
          filteredStudents.map((student, index) => {
            const data = studentData[student.id] ?? {
              scores: {},
              diagnostics: {},
              behaviour: 'INDEPENDENT',
              keyImprovements: '',
              subjectsNeedingSupport: '',
              interventionPlan: '',
              comments: '',
            };
            const isExpanded = expandedStudentId === student.id;

            // Compute total obtained marks for collapsed card readout
            const totalObtained = (subjects || []).reduce((sum, s) => {
              const val = data?.scores?.[s.id];
              return sum + (typeof val === 'number' ? val : 0);
            }, 0);
            const allScoresFilled = (subjects || []).length > 0 && (subjects || []).every((s) => {
              const val = data?.scores?.[s.id];
              return typeof val === 'number' && val >= 0;
            });
            const firstSubId = (subjects || [])[0]?.id;
            const diag = (firstSubId && data?.diagnostics?.[firstSubId]) || Object.values(data?.diagnostics || {})[0];
            const understandingVal = diag?.understanding !== undefined ? diag.understanding : 'CLEAR';
            const applicationVal = diag?.application !== undefined ? diag.application : 'APPLIES';
            const interestVal = diag?.interest !== undefined ? diag.interest : 'INTERESTED';
            const behaviourVal = data?.behaviour !== undefined ? data.behaviour : 'INDEPENDENT';

            const hasUnderstanding = understandingVal.trim() !== '';
            const hasApplication = applicationVal.trim() !== '';
            const hasInterest = interestVal.trim() !== '';
            const hasBehaviour = behaviourVal.trim() !== '';
            const hasRemarks = Boolean((data?.keyImprovements || data?.comments || '').trim());
            const isComplete = allScoresFilled && hasUnderstanding && hasApplication && hasInterest && hasBehaviour && hasRemarks;
            const hasAnyData = Object.values(data?.scores || {}).some((v) => typeof v === 'number' && v >= 0);

            const displaySubjects: Subject[] = subjects || [];
            const visibleSubjects = displaySubjects.slice(0, 5);
            const extraSubjectsCount = displaySubjects.length > 5 ? displaySubjects.length - 5 : 0;

            return (
              <div key={student.id}>
                {isExpanded ? (
                  <ExpandedStudentCard
                    student={student}
                    data={data}
                    subjects={subjects}
                    diagnostics={diagnostics}
                    behaviours={behaviours}
                    onUpdate={(updates) => updateStudentData(student.id, updates)}
                    onScoreChange={(subId, val) => updateScore(student.id, subId, val)}
                    onDiagnosticChange={(field, val) => updateDiagnostic(student.id, subjects[0]?.id || 1, field, val)}
                    onClose={() => onToggleExpandStudent(null)}
                    onSaveStudent={() => saveSingleStudent(student.id)}
                    filteredStudents={filteredStudents}
                    currentStudentIndex={index}
                    onNavigateStudent={async (targetId) => {
                      await saveSingleStudent(student.id);
                      onToggleExpandStudent(targetId);
                    }}
                  />
                ) : (
                  <div
                    onClick={() => onToggleExpandStudent(student.id)}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-indigo-300 hover:shadow-md hover:bg-indigo-50/30 transition-all duration-200 cursor-pointer space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Index + Avatar + Name */}
                      <div className="flex items-center gap-3.5">
                        <span className="text-xs font-semibold text-slate-400 w-4 text-center">
                          {index + 1}
                        </span>
                        <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                          {student.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {student.name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Student ID: {student.id}
                          </div>
                        </div>
                      </div>

                      {/* Right: Total Score + Percentage + Status */}
                      <div className="flex items-center gap-4 sm:justify-end">
                        <div className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl">
                          {hasAnyData ? totalObtained : '-'} <span className="font-medium text-slate-400">/ {maxMarks}</span>
                        </div>

                        {hasAnyData && (
                          <div className="text-xs font-bold bg-indigo-50 border border-indigo-200/80 text-indigo-700 px-3 py-1.5 rounded-xl">
                            {maxMarks > 0 ? Math.round((totalObtained / maxMarks) * 100) : 0}%
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <span className={`w-2 h-2 rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className={isComplete ? 'text-emerald-700' : 'text-rose-600'}>
                            {isComplete ? 'Complete' : 'Incomplete'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Subject-wise marks row */}
                    <div className="flex flex-wrap items-center gap-2 pl-[3.75rem]">
                      {visibleSubjects.map((sub) => {
                        const val = data?.scores?.[sub.id];
                        const filled = typeof val === 'number' && val >= 0;
                        return (
                          <div
                            key={sub.id}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border ${
                              filled
                                ? 'bg-slate-50 border-slate-200 text-slate-700 font-medium'
                                : 'bg-slate-50/50 border-dashed border-slate-200 text-slate-400'
                            }`}
                          >
                            <span className="font-semibold">{sub.name}:</span>{' '}
                            <span className="font-bold">{filled ? val : '-'}</span>
                            <span className="font-normal text-slate-400">/{sub.maxMarks || 100}</span>
                          </div>
                        );
                      })}
                      {extraSubjectsCount > 0 && (
                        <div className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold shadow-2xs">
                          +{extraSubjectsCount}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
