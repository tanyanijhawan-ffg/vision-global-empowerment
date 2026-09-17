import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface SubjectTrend {
  subject: string;
  currentScore: number;
  prevScore: number;
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
  previousAvgScore: number;
  /** Percentage points difference between current and previous average */
  ppChange: number;
  /** Currently selected class ID string */
  filterClass: string;
  /** Subject performance trends list */
  displaySubjectTrends: SubjectTrend[];
  /** Categorized diagnostic summary percentages */
  diagnosticSummary: DiagnosticSummary;
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
}) => {
  const highestSubject = displaySubjectTrends[0];
  const lowestSubject = displaySubjectTrends[displaySubjectTrends.length - 1];

  return (
    <div className="space-y-6">
      {/* Top 3 KPI Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Current vs Previous Term */}
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 shadow-2xs">
          <div className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">
            Current vs Previous Term
          </div>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-3xl font-extrabold text-indigo-950">{currentAvgScore}%</span>
            <span className="text-sm font-semibold text-slate-500">vs {previousAvgScore}%</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-indigo-700 bg-white/80 w-fit px-2.5 py-1 rounded-lg border border-indigo-200/80">
            <ArrowUpRight size={15} />
            {ppChange >= 0 ? `+${ppChange}` : ppChange} percentage points (
            {previousAvgScore
              ? `${ppChange >= 0 ? '+' : ''}${((ppChange / previousAvgScore) * 100).toFixed(1)}%`
              : 'N/A'}
            )
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
          Auto-generated comparative analysis across all mandatory subjects for Class {filterClass}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4 text-center">Previous Term</th>
                <th className="py-3 px-4 text-center">Current Term</th>
                <th className="py-3 px-4 text-center">Change (pp)</th>
                <th className="py-3 px-4 text-right">Progress Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {displaySubjectTrends.map((row) => (
                <tr key={row.subject} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{row.subject}</td>
                  <td className="py-3.5 px-4 text-center font-medium text-slate-500">
                    {row.prevScore}%
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                    {row.currentScore}%
                  </td>
                  <td className="py-3.5 px-4 text-center">
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
