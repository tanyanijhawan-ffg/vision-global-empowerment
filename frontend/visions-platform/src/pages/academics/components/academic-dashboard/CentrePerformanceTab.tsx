import React from 'react';

export interface CentrePerformanceReportItem {
  id: number;
  name: string;
  region: string;
  district: string;
  studentsCount: number;
  avgScore: number | null;
  passRate: number | null;
  topSubject: string;
  status: string;
  hasData: boolean;
  rank: number;
}

export interface CentrePerformanceTabProps {
  /** Array of centre performance report items */
  centrePerformanceReport: CentrePerformanceReportItem[];
  /** Currently selected class ID string */
  filterClass: string;
}

/**
 * CentrePerformanceTab Component
 *
 * Renders Tab 2 of the Academic Dashboard:
 * - Aggregated performance table across learning centres for the selected class.
 * - Displays rank, centre name, region, district, total students, avg score, pass rate, top subject, and status.
 * - Properly formats N/A for centres without submitted assessment data.
 */
export const CentrePerformanceTab: React.FC<CentrePerformanceTabProps> = ({
  centrePerformanceReport,
  filterClass,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Centre-Wise Performance Ranking
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregated academic performance across {centrePerformanceReport.length} learning
              centres for {/^class\b/i.test(String(filterClass || '').trim()) ? String(filterClass).trim() : `Class ${filterClass}`}
            </p>
          </div>
        </div>

        {/* Cards on small screens */}
        <div className="xl:hidden space-y-3">
          {centrePerformanceReport.map((c) => (
            <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">#{c.rank} {c.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{c.district}, {c.region}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${!c.hasData ? 'bg-slate-100 text-slate-500' : c.avgScore! >= 60 ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                  {c.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div><span className="text-xs text-slate-400 block">Students</span><span className="font-semibold text-slate-700">{c.studentsCount}</span></div>
                <div><span className="text-xs text-slate-400 block">Avg Score</span><span className="font-bold text-indigo-700">{c.avgScore !== null ? `${c.avgScore}%` : 'N/A'}</span></div>
                <div><span className="text-xs text-slate-400 block">Pass Rate</span><span className="font-medium text-slate-700">{c.passRate !== null ? `${c.passRate}%` : 'N/A'}</span></div>
                <div><span className="text-xs text-slate-400 block">Top Subject</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.hasData ? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-400'}`}>{c.topSubject}</span></div>
              </div>
            </div>
          ))}
        </div>

        {/* Table on xl+ screens */}
        <div className="overflow-x-auto hidden xl:block">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Centre Name</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">District</th>
                <th className="py-3 px-3 text-center">Students</th>
                <th className="py-3 px-3 text-center">Avg Score</th>
                <th className="py-3 px-3 text-center">Pass Rate</th>
                <th className="py-3 px-4 text-center">Top Subject</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {centrePerformanceReport.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-3 text-center font-bold text-slate-400">#{c.rank}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{c.name}</td>
                  <td className="py-3.5 px-4 text-slate-600">{c.region}</td>
                  <td className="py-3.5 px-4 text-slate-600">{c.district}</td>
                  <td className="py-3.5 px-3 text-center font-semibold text-slate-700">
                    {c.studentsCount}
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold text-indigo-700">
                    {c.avgScore !== null ? (
                      `${c.avgScore}%`
                    ) : (
                      <span className="text-slate-400 font-normal">N/A</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-center font-medium text-slate-700">
                    {c.passRate !== null ? (
                      `${c.passRate}%`
                    ) : (
                      <span className="text-slate-400 font-normal">N/A</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.hasData ? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      {c.topSubject}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        !c.hasData
                          ? 'bg-slate-100 text-slate-500'
                          : c.avgScore! >= 75
                          ? 'bg-indigo-50 text-indigo-700'
                          : c.avgScore! >= 60
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CentrePerformanceTab;
