import React, { Fragment } from 'react';
import {
  CheckCircle2, Search, ChevronDown, ChevronUp, Sparkles, Save, RotateCcw, Trash2
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

/**
 * Props for StudentAssessmentTable component.
 */
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
  selectedSubject?: Subject;
  maxMarks: number;
  expandedStudentId: string | null;
  onToggleExpandStudent: (studentId: string | null) => void;
  updateScore: (studentId: string, subjectId: number, value: number | '') => void;
  updateDiagnostic: (studentId: string, subjectId: number, field: 'understanding' | 'application' | 'interest', value: string) => void;
  updateStudentData: (studentId: string, updates: Partial<StudentAssessmentData>) => void;
  saveSingleStudent: (studentId: string) => Promise<void>;
  diagnostics: DiagnosticOptions | null;
  behaviours: LearningBehaviourOption[];
  getUnderstandingBadge: (studentId: string) => React.ReactNode;
}

/**
 * StudentAssessmentTable component.
 * Displays progress stats, search, quick action dropdown, and the main student marks entry table.
 */
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
  selectedSubject,
  maxMarks,
  expandedStudentId,
  onToggleExpandStudent,
  updateScore,
  updateDiagnostic,
  updateStudentData,
  saveSingleStudent,
  diagnostics,
  behaviours,
  getUnderstandingBadge,
}) => {
  return (
    <>
      {/* Sub-Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-1">
        {/* Progress & Centre Label */}
        <div className="flex items-center gap-3">
          <span className="p-1 rounded bg-slate-100 text-slate-500">
            <CheckCircle2 size={16} className="text-slate-600" />
          </span>
          <span className="text-xs font-semibold text-slate-700">
            {stats.completed} of {stats.total} students completed
          </span>
          <div className="w-32 bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-600">{stats.percentage}%</span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium hidden sm:inline-block">
            {currentCentre?.name}
          </span>
        </div>

        {/* Search, Filter, Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 shadow-2xs"
            />
          </div>

          {/* Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
              className="appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-7 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="All">Filter: All</option>
              <option value="Incomplete">Filter: Incomplete</option>
              <option value="Completed">Filter: Completed</option>
              <option value="Needs Attention">Filter: Needs Attention</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Quick Actions Dropdown */}
          <div className="relative">
            <button 
              onClick={onToggleQuickActions}
              className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50 transition shadow-2xs cursor-pointer"
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

      {/* Gradebook Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-white">
                <th className="py-3 px-3 w-8 text-center">#</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Marks ( / {maxMarks}) <span className="text-rose-500 font-bold">*</span></th>
                <th className="py-3 px-4">Understanding / Narrative <span className="text-rose-500 font-bold">*</span></th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-3 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStudents.map((student, index) => {
                const data = studentData[student.id] ?? {
                  scores: {},
                  diagnostics: {},
                  behaviour: 'INDEPENDENT',
                  keyImprovements: '',
                  subjectsNeedingSupport: '',
                  interventionPlan: '',
                  comments: '',
                };
                const score = selectedSubject ? (data.scores[selectedSubject.id] ?? '') : '';
                const isExpanded = expandedStudentId === student.id;

                return (
                  <Fragment key={student.id}>
                    <tr className={`hover:bg-slate-50/70 transition-colors ${isExpanded ? 'bg-slate-50/90' : ''}`}>
                      <td className="py-3.5 px-3 text-center text-xs text-slate-400 font-medium">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-amber-200">
                            {student.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-xs">
                              {student.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {student.centre || currentCentre?.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={maxMarks}
                            value={score}
                            onChange={(e) => {
                              if (selectedSubject) {
                                updateScore(student.id, selectedSubject.id, e.target.value === '' ? '' : Number(e.target.value));
                              }
                            }}
                            className="w-14 h-7 px-2 border border-slate-200 rounded-md text-xs font-semibold text-slate-800 text-center focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none bg-white"
                            placeholder="—"
                          />
                          <span className="text-xs text-slate-400 font-medium">/ {maxMarks}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {getUnderstandingBadge(student.id)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-normal whitespace-nowrap">
                        {data.lastUpdated || '—'}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => onToggleExpandStudent(isExpanded ? null : student.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Student Card Row */}
                    {isExpanded && selectedSubject && (
                      <tr>
                        <td colSpan={6} className="p-3 bg-indigo-50/20 border-y border-indigo-100">
                          <ExpandedStudentCard
                            student={student}
                            data={data}
                            subject={selectedSubject}
                            maxMarks={maxMarks}
                            diagnostics={diagnostics}
                            behaviours={behaviours}
                            onUpdate={(updates) => updateStudentData(student.id, updates)}
                            onScoreChange={(value) => updateScore(student.id, selectedSubject.id, value)}
                            onDiagnosticChange={(field, value) => updateDiagnostic(student.id, selectedSubject.id, field, value)}
                            onClose={() => onToggleExpandStudent(null)}
                            filteredStudents={filteredStudents}
                            currentStudentIndex={filteredStudents.findIndex((s) => s.id === student.id)}
                            onNavigateStudent={async (targetId) => {
                              await saveSingleStudent(student.id);
                              onToggleExpandStudent(targetId);
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs font-medium">
            No students found for {currentCentre?.name || 'this Centre'} matching your search or filters.
          </div>
        )}
      </div>
    </>
  );
};
