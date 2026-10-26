import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import type { StudentListItem } from '../../../../lib/api';

export interface DisplaySubject {
  id: number;
  name: string;
  code?: string;
}

export interface StudentScoreRecord {
  percentage: number;
  scores: Record<number, number>;
}

export interface StudentGradebookTabProps {
  /** Currently selected class ID string */
  filterClass: string;
  /** List of subjects relevant to current class/assessment */
  displaySubjects: DisplaySubject[];
  /** Scoped list of students with computed scores */
  filteredStudentsWithScores: StudentListItem[];
  /** Map of student ID to score object containing subject breakdown */
  studentScoresMap: Map<number, StudentScoreRecord>;
  /** Diagnostics data containing understanding level per student/subject */
  diagnosticsData?: Array<{ studentId: number; subjectId?: number; understandingLevel?: string }>;
}

/**
 * Returns understanding badge label and styling based on diagnostic understanding level,
 * falling back to 75% total percentage if no diagnostic understanding level is entered.
 */
export const getUnderstandingBadge = (
  rawUnderstanding: string | undefined | null,
  percentage: number | string
) => {
  if (rawUnderstanding && rawUnderstanding.trim()) {
    const val = rawUnderstanding.trim();
    const upper = val.toUpperCase().replace(/\s+/g, '_');

    if (upper === 'CLEAR' || upper === 'UNDERSTANDS_CLEARLY' || upper === 'UNDERSTANDS') {
      return {
        label: 'Understands clearly',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      };
    }
    if (upper === 'REPETITION' || upper === 'NEEDS_REPETITION') {
      return {
        label: 'Needs repetition',
        className: 'bg-amber-50 text-amber-700 border border-amber-200/60',
      };
    }
    if (upper === 'NOT_UNDERSTAND' || upper === 'DOES_NOT_UNDERSTAND') {
      return {
        label: 'Does not understand',
        className: 'bg-rose-50 text-rose-700 border border-rose-200/60',
      };
    }

    return {
      label: val,
      className: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
    };
  }

  // Fallback: 75% method
  const isHigh = typeof percentage === 'number' && percentage >= 75;
  return {
    label: isHigh ? 'Understands' : 'Needs Support',
    className: isHigh ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700',
  };
};

/**
 * StudentGradebookTab Component
 *
 * Renders Tab 5 of the Academic Dashboard:
 * - Top-right search bar for filtering students by name or centre.
 * - Fixed height & scrollable subject-wise gradebook table.
 * - Maps individual student scores across all registered subjects.
 * - Displays understanding level from assessment diagnostic entry (with 75% threshold fallback).
 */
export const StudentGradebookTab: React.FC<StudentGradebookTabProps> = ({
  filterClass,
  displaySubjects,
  filteredStudentsWithScores,
  studentScoresMap,
  diagnosticsData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Map student ID to understanding level from diagnostics
  const studentUnderstandingMap = useMemo(() => {
    const map = new Map<number, string>();
    if (diagnosticsData && diagnosticsData.length > 0) {
      diagnosticsData.forEach((d) => {
        const sId = Number(d.studentId);
        if (sId && d.understandingLevel && d.understandingLevel.trim() && !map.has(sId)) {
          map.set(sId, d.understandingLevel.trim());
        }
      });
    }
    return map;
  }, [diagnosticsData]);

  // Filter gradebook students by search query (name or centre)
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return filteredStudentsWithScores;
    const query = searchQuery.toLowerCase().trim();
    return filteredStudentsWithScores.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        (s.centre && s.centre.toLowerCase().includes(query))
    );
  }, [filteredStudentsWithScores, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        {/* Header with Title & Top-Right Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Subject-Wise Student Gradebook
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredStudents.length} of {filteredStudentsWithScores.length} students in {/^class\b/i.test(String(filterClass || '').trim()) ? String(filterClass).trim() : `Class ${filterClass}`}
            </p>
          </div>

          {/* Top-Right Search Input */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search student or centre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
            {searchQuery ? `No students found matching "${searchQuery}"` : `No students found in ${/^class\b/i.test(String(filterClass || '').trim()) ? String(filterClass).trim() : `Class ${filterClass}`}`}
          </div>
        ) : (
          <>
            {/* Cards on small screens */}
            <div className="xl:hidden space-y-3">
              {filteredStudents.map((s) => {
                const scoreRecord = studentScoresMap.get(Number(s.id));
                const percentage = scoreRecord?.percentage ?? s.academicScore ?? '-';
                const understandingLevel = studentUnderstandingMap.get(Number(s.id));
                const understandingBadge = getUnderstandingBadge(understandingLevel, percentage);

                return (
                  <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{s.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{s.centre}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${understandingBadge.className}`}>
                        {understandingBadge.label}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                      {displaySubjects.map((sub) => {
                        const mark = scoreRecord?.scores[sub.id];
                        return (
                          <div key={sub.id}>
                            <span className="text-xs text-slate-400 block">{sub.name}</span>
                            <span className="font-medium text-slate-700">{mark !== undefined && mark !== null ? mark : '-'}</span>
                          </div>
                        );
                      })}
                      <div>
                        <span className="text-xs text-slate-400 block">Total</span>
                        <span className="font-extrabold text-indigo-700">{typeof percentage === 'number' ? `${percentage}%` : '-'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table on xl+ screens */}
            <div className="max-h-[500px] overflow-auto border border-slate-200/90 rounded-xl shadow-2xs hidden xl:block">
            <table className="w-full min-w-[640px] text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 shadow-2xs">
                <tr className="text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 bg-slate-50">Student</th>
                  <th className="py-3 px-4 bg-slate-50">Centre</th>
                  {displaySubjects.map((sub) => (
                    <th key={sub.id} className="py-3 px-3 text-center bg-slate-50">
                      {sub.name}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center bg-slate-50">Total %</th>
                  <th className="py-3 px-4 text-right bg-slate-50">Understanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm bg-white">
                {filteredStudents.map((s) => {
                  const scoreRecord = studentScoresMap.get(Number(s.id));
                  const percentage = scoreRecord?.percentage ?? s.academicScore ?? '-';
                  const understandingLevel = studentUnderstandingMap.get(Number(s.id));
                  const understandingBadge = getUnderstandingBadge(understandingLevel, percentage);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">{s.centre}</td>
                      {displaySubjects.map((sub) => {
                        const mark = scoreRecord?.scores[sub.id];
                        return (
                          <td key={sub.id} className="py-3.5 px-3 text-center font-medium text-slate-700">
                            {mark !== undefined && mark !== null ? mark : '-'}
                          </td>
                        );
                      })}
                      <td className="py-3.5 px-3 text-center font-extrabold text-indigo-700">
                        {typeof percentage === 'number' ? `${percentage}%` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${understandingBadge.className}`}
                        >
                          {understandingBadge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentGradebookTab;
