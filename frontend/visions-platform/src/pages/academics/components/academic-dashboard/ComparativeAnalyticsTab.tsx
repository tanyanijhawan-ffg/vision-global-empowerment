import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface SubjectTrend {
  subject: string;
  currentScore: number;
  prevScore: number | null;
  ppChange: number;
  trend: string;
}

export interface DiagnosticCategoryItem {
  name: string;
  value: number;
  color: string;
}

export interface DiagnosticSummary {
  understanding: DiagnosticCategoryItem[];
  application: DiagnosticCategoryItem[];
  interest: DiagnosticCategoryItem[];
}

export interface ComparativeAnalyticsTabProps {
  /** Average academic score for the current selected assessment/term */
  currentAvgScore: number;
  /** Average academic score for the previous term */
  previousAvgScore: number | null;
  /** Percentage points difference between current and previous average */
  ppChange: number;
  /** Currently selected class ID string */
  filterClass: string;
  /** Subject performance trends list */
  displaySubjectTrends: SubjectTrend[];
  /** Categorized diagnostic summary percentages */
  diagnosticSummary: DiagnosticSummary;
  /** Name of the previous assessment/term (e.g. "QUARTER 1") */
  previousTermName?: string | null;
  /** Name of the current assessment/term (e.g. "HALF-YEARLY") */
  currentTermName?: string | null;
}

/**
 * ComparativeAnalyticsTab Component
 *
 * Renders Tab 1 of the Academic Dashboard:
 * - Summary comparison cards (Current vs Previous term, Highest Subject, Lowest Subject)
 * - Subject-wise comparative analysis matrix table with trend icons & progress bars
 * - Diagnostic and behavioural insights grid (Understanding, Application, Interest)
 */
export const ComparativeAnalyticsTab: React.FC<ComparativeAnalyticsTabProps> = ({
  currentAvgScore,
  previousAvgScore,
  ppChange,
  filterClass,
  displaySubjectTrends,
  diagnosticSummary,
  previousTermName,
  currentTermName,
}) => {
  const sortedSubjectTrends = React.useMemo(() => {
    if (!displaySubjectTrends || displaySubjectTrends.length === 0) return [];
    return [...displaySubjectTrends].sort((a, b) => b.currentScore - a.currentScore);
  }, [displaySubjectTrends]);

  const highestSubject = sortedSubjectTrends[0];
  const lowestSubject = sortedSubjectTrends[sortedSubjectTrends.length - 1];

  return (
    <div className="space-y-6">
      {/* Top 3 KPI Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Current vs Previous Term */}
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 shadow-2xs">
          <div className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">
            Current vs Previous Term {previousTermName ? `(${previousTermName})` : ''}
          </div>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-3xl font-extrabold text-indigo-950">{currentAvgScore}%</span>
            <span className="text-sm font-semibold text-slate-500">
              {previousAvgScore != null ? `vs ${previousAvgScore}% ${previousTermName ? `(${previousTermName})` : ''}` : 'vs —'}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-indigo-700 bg-white/80 w-fit px-2.5 py-1 rounded-lg border border-indigo-200/80">
            {previousAvgScore != null ? (
              <>
                {ppChange >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                {ppChange >= 0 ? `+${ppChange}` : ppChange} percentage points (
                {previousAvgScore > 0
                  ? `${ppChange >= 0 ? '+' : ''}${((ppChange / previousAvgScore) * 100).toFixed(1)}%`
                  : 'N/A'}
                )
              </>
            ) : (
              <span>Baseline term (no prior exam)</span>
            )}
          </div>
        </div>

        {/* Card 2: Highest Average Subject */}
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 shadow-2xs">
          <div className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">
            Highest Average Subject
          </div>
          <div className="text-3xl font-extrabold text-indigo-950 mt-2">
            {highestSubject?.subject || 'Mathematics'}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-indigo-700 bg-white/80 w-fit px-2.5 py-1 rounded-lg border border-indigo-200/80">
            <span>{highestSubject?.currentScore || 0}% Avg Score</span>
             {/* &nbsp;&bull;&nbsp;{' '} */}
            {/* <span>
              {highestSubject?.ppChange >= 0 ? '↑' : '↓'} {Math.abs(highestSubject?.ppChange || 0)}{' '}
              pp
            </span> */}
          </div>
        </div>

        {/* Card 3: Priority Subject Needing Support */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-2xs">
          <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
            Priority Subject Needing Support
          </div>
          <div className="text-3xl font-extrabold text-amber-950 mt-2">
            {lowestSubject?.subject || 'Science'}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-700 bg-white/80 w-fit px-2.5 py-1 rounded-lg border border-amber-200/80">
            <span>{lowestSubject?.currentScore || 0}% Avg</span> 
            {/* &nbsp;&bull;&nbsp;{' '}
            <span>
              {lowestSubject?.ppChange >= 0 ? '↑' : '↓'} {Math.abs(lowestSubject?.ppChange || 0)}{' '}
              pp
            </span> */}
          </div>
        </div>
      </div>

      {/* Subject-Wise Performance & Trends Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Subject-Wise Performance & Trends
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Auto-generated comparative analysis across all mandatory subjects for {filterClass}
        </p>

        {/* Cards on small screens */}
        <div className="xl:hidden space-y-3">
          {displaySubjectTrends.map((row) => (
            <div key={row.subject} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between gap-3">
                <div className="font-bold text-slate-800">{row.subject}</div>
                <div className="text-sm font-bold text-slate-900">{row.currentScore}%</div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">Previous: {row.prevScore != null ? `${row.prevScore}%` : '—'}</span>
                {row.prevScore != null ? (
                  <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg ${row.ppChange >= 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'}`}>
                    {row.ppChange >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {row.ppChange >= 0 ? `+${row.ppChange}` : row.ppChange} pp
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">—</span>
                )}
              </div>
              <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${row.currentScore >= 75 ? 'bg-indigo-500' : 'bg-amber-400'}`}
                  style={{ width: `${Math.min(100, row.currentScore)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Table on xl+ screens */}
        <div className="overflow-x-auto hidden xl:block">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4 text-center">
                  <span>Previous Term</span>
                  {previousTermName && (
                    <span className="block text-[10px] normal-case font-semibold text-indigo-600 tracking-normal mt-0.5">
                      ({previousTermName})
                    </span>
                  )}
                </th>
                <th className="py-3 px-4 text-center">
                  <span>Current Term</span>
                  {currentTermName && (
                    <span className="block text-[10px] normal-case font-semibold text-slate-500 tracking-normal mt-0.5">
                      ({currentTermName})
                    </span>
                  )}
                </th>
                <th className="py-3 px-4 text-center">Change (pp)</th>
                <th className="py-3 px-4 text-right">Progress Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {displaySubjectTrends.map((row) => (
                <tr key={row.subject} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{row.subject}</td>
                  <td className="py-3.5 px-4 text-center font-medium text-slate-500">
                    {row.prevScore != null ? `${row.prevScore}%` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                    {row.currentScore}%
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {row.prevScore != null ? (
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-lg ${
                          row.ppChange >= 0
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {row.ppChange >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {row.ppChange >= 0 ? `+${row.ppChange}` : row.ppChange} pp
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="w-32 bg-slate-100 rounded-full h-2 ml-auto overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          row.currentScore >= 75 ? 'bg-indigo-500' : 'bg-amber-400'
                        }`}
                        style={{ width: `${Math.min(100, row.currentScore)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diagnostic & Behaviour Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Understanding Levels */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            Understanding Levels
          </h4>
          <div className="space-y-2.5">
            {diagnosticSummary.understanding.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                  <span>{item.name}</span>
                  <span className="font-bold">{item.value}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Application Ability */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            Application Ability
          </h4>
          <div className="space-y-2.5">
            {diagnosticSummary.application.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                  <span>{item.name}</span>
                  <span className="font-bold">{item.value}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interest Level */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            Interest Level
          </h4>
          <div className="space-y-2.5">
            {diagnosticSummary.interest.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                  <span>{item.name}</span>
                  <span className="font-bold">{item.value}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparativeAnalyticsTab;
