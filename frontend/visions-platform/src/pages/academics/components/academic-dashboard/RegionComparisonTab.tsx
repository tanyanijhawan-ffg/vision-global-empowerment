import React from 'react';

export interface RegionComparisonReportItem {
  name: string;
  centresCount: number;
  studentsCount: number;
  avgScore: number | null;
  passRate: number | null;
  lowCount: number;
  hasData: boolean;
  level: string;
}

export interface RegionComparisonTabProps {
  /** Array of regional comparison report items */
  regionComparisonReport: RegionComparisonReportItem[];
  /** Currently selected class ID string */
  filterClass: string;
}

/**
 * RegionComparisonTab Component
 *
 * Renders Tab 3 of the Academic Dashboard:
 * - Comparative evaluation across all operating regions for the selected class.
 * - Displays region name, total centres, total students, avg score, pass rate, and performance level.
 * - Displays N/A gracefully for regions without assessment data.
 */
export const RegionComparisonTab: React.FC<RegionComparisonTabProps> = ({
  regionComparisonReport,
  filterClass,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-1">Region Comparison Report</h3>
        <p className="text-xs text-slate-500 mb-5">
          Comparative evaluation of all operating states and regions for Class {filterClass}
        </p>

        {/* Cards on small screens */}
        <div className="xl:hidden space-y-3">
          {regionComparisonReport.map((r) => (
            <div key={r.name} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-start justify-between gap-3">
                <div className="font-bold text-slate-900 min-w-0 truncate">{r.name}</div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${!r.hasData ? 'bg-slate-100 text-slate-500' : r.avgScore! >= 60 ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                  {r.level}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div><span className="text-xs text-slate-400 block">Centres</span><span className="font-medium text-slate-600">{r.centresCount}</span></div>
                <div><span className="text-xs text-slate-400 block">Students</span><span className="font-semibold text-slate-700">{r.studentsCount}</span></div>
                <div><span className="text-xs text-slate-400 block">Avg Score</span><span className="font-bold text-indigo-700">{r.avgScore !== null ? `${r.avgScore}%` : 'N/A'}</span></div>
                <div><span className="text-xs text-slate-400 block">Pass Rate</span><span className="font-semibold text-slate-700">{r.passRate !== null ? `${r.passRate}%` : 'N/A'}</span></div>
              </div>
            </div>
          ))}
        </div>

        {/* Table on xl+ screens */}
        <div className="overflow-x-auto hidden xl:block">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-3 text-center">Centres</th>
                <th className="py-3 px-3 text-center">Students</th>
                <th className="py-3 px-3 text-center">Avg Score</th>
                <th className="py-3 px-4 text-center">Pass Rate</th>
                <th className="py-3 px-4 text-right">Performance Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {regionComparisonReport.map((r) => (
                <tr key={r.name} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{r.name}</td>
                  <td className="py-3.5 px-3 text-center font-medium text-slate-600">
                    {r.centresCount}
                  </td>
                  <td className="py-3.5 px-3 text-center font-semibold text-slate-700">
                    {r.studentsCount}
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold text-indigo-700">
                    {r.avgScore !== null ? (
                      `${r.avgScore}%`
                    ) : (
                      <span className="text-slate-400 font-normal">N/A</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                      <span>
                        {r.passRate !== null ? (
                          `${r.passRate}%`
                        ) : (
                          <span className="text-slate-400 font-normal">N/A</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        !r.hasData
                          ? 'bg-slate-100 text-slate-500'
                          : r.avgScore! >= 75
                          ? 'bg-indigo-50 text-indigo-700'
                          : r.avgScore! >= 60
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {r.level}
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

export default RegionComparisonTab;
