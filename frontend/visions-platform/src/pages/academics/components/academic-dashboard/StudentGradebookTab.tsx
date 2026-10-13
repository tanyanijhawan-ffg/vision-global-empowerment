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
}

/**
 * StudentGradebookTab Component
 *
 * Renders Tab 5 of the Academic Dashboard:
 * - Top-right search bar for filtering students by name or centre.
 * - Fixed height & scrollable subject-wise gradebook table.
 * - Maps individual student scores across all registered subjects.
 * - Computes total score percentage and assigns understanding badges ('Understands' vs 'Needs Support').
 */
export const StudentGradebookTab: React.FC<StudentGradebookTabProps> = ({
  filterClass,
  displaySubjects,
  filteredStudentsWithScores,
  studentScoresMap,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

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
              Showing {filteredStudents.length} of {filteredStudentsWithScores.length} students in Class {filterClass}
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
            {searchQuery ? `No students found matching "${searchQuery}"` : `No students found in Class ${filterClass}`}
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto border border-slate-200/90 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
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
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            typeof percentage === 'number' && percentage >= 75
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {typeof percentage === 'number' && percentage >= 75
                            ? 'Understands'
                            : 'Needs Support'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentGradebookTab;
