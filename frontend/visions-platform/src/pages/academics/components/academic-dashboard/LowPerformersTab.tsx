import React from 'react';
import type { StudentListItem } from '../../../../lib/api';

export interface LowPerformersTabProps {
  /** List of students scoring below the intervention threshold */
  lowPerformersList: StudentListItem[];
  /** Current score threshold (e.g., 30, 50, 60, 65, 70) */
  lowPerformerThreshold: number;
  /** Callback when user changes the threshold */
  onThresholdChange: (threshold: number) => void;
  /** Currently selected class ID string */
  filterClass: string;
  /** Assessment observations fetched from backend */
  observationsData?: Array<{
    studentId: number;
    keyImprovements?: string;
    subjectsNeedingSupport?: string;
    interventionPlan?: string;
  }>;
  /** Assessment diagnostics fetched from backend */
  diagnosticsData?: Array<{
    studentId: number;
    subject?: string;
    understandingLevel?: string;
  }>;
}

/**
 * LowPerformersTab Component
 *
 * Renders Tab 4 of the Academic Dashboard:
 * - Interactive score threshold selector (<30%, <50%, <60%, <65%, <70%).
 * - Fixed height & scrollable table listing low-performing students requiring academic intervention.
 * - Dynamic diagnostic observations & recommended actions pulled from backend data.
 */
export const LowPerformersTab: React.FC<LowPerformersTabProps> = ({
  lowPerformersList,
  lowPerformerThreshold,
  onThresholdChange,
  filterClass,
  observationsData = [],
  diagnosticsData = [],
}) => {
  const thresholdOptions = [30, 50, 60, 65, 70];

  /**
   * Helper function to extract diagnostic observation from backend observations/diagnostics
   */
  const getDiagnosticObservation = (studentId: string | number, academicScore?: number) => {
    const obs = observationsData.find((o) => String(o.studentId) === String(studentId));
    if (obs?.keyImprovements && obs.keyImprovements.trim()) {
      return obs.keyImprovements.trim();
    }
    if (obs?.subjectsNeedingSupport && obs.subjectsNeedingSupport.trim()) {
      const val = obs.subjectsNeedingSupport.trim();
      if (
        /^(no|none|n\/a|needs|requires|student|all|good|excellent|on track)/i.test(val) ||
        val.toLowerCase().includes('support') ||
        val.toLowerCase().includes('needed')
      ) {
        return val;
      }
      return `Needs support in ${val}`;
    }

    // Check diagnostics data for NOT_UNDERSTAND or REPETITION
    const studentDiags = diagnosticsData.filter((d) => String(d.studentId) === String(studentId));
    const notUnderstandSubjects = studentDiags
      .filter((d) => d.understandingLevel === 'NOT_UNDERSTAND' && d.subject)
      .map((d) => d.subject);
    if (notUnderstandSubjects.length > 0) {
      return `Needs support in ${notUnderstandSubjects.join(', ')}`;
    }

    const repetitionSubjects = studentDiags
      .filter((d) => d.understandingLevel === 'REPETITION' && d.subject)
      .map((d) => d.subject);
    if (repetitionSubjects.length > 0) {
      return `Needs improvement in ${repetitionSubjects.join(', ')}`;
    }

    // Fallback based on score
    const score = academicScore ?? 0;
    if (score < 40) return 'Critical concept support required';
    if (score < 60) return 'Needs support in core subjects';
    return 'Needs targeted practice';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Low-Performing Students Requiring Intervention
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {lowPerformersList.length} students in Class {filterClass} scoring below threshold
            </p>
          </div>

          {/* Threshold Selector Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Threshold:</span>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {thresholdOptions.map((th) => (
                <button
                  key={th}
                  onClick={() => onThresholdChange(th)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    lowPerformerThreshold === th
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  &lt; {th}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {lowPerformersList.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
            No students found in Class {filterClass} with score below {lowPerformerThreshold}%.
          </div>
        ) : (
          <>
            {/* Cards on small screens */}
            <div className="xl:hidden space-y-3">
              {lowPerformersList.map((s) => {
                const observation = getDiagnosticObservation(s.id, s.academicScore);
                const isPositiveObs =
                  /^(no|none|n\/a|on track|good|excellent)/i.test(observation) ||
                  observation.toLowerCase().includes('no specific support');
                return (
                  <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{s.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{s.centre} · {s.region} · Class {s.class}</div>
                      </div>
                      <div className="text-lg font-extrabold text-rose-600 shrink-0">{s.academicScore}%</div>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs text-slate-400 mb-1">Diagnostic Observation</div>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium inline-block ${isPositiveObs ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700'}`}>
                        {observation}
                      </span>
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
                  <th className="py-3 px-4 bg-slate-50">Region</th>
                  <th className="py-3 px-3 text-center bg-slate-50">Class</th>
                  <th className="py-3 px-3 text-center bg-slate-50">Academic Score</th>
                  <th className="py-3 px-4 bg-slate-50">Diagnostic Observation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm bg-white">
                {lowPerformersList.map((s) => {
                  const observation = getDiagnosticObservation(s.id, s.academicScore);

                  const isPositiveObs =
                    /^(no|none|n\/a|on track|good|excellent)/i.test(observation) ||
                    observation.toLowerCase().includes('no specific support');

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{s.centre}</td>
                      <td className="py-3.5 px-4 text-slate-600">{s.region}</td>
                      <td className="py-3.5 px-3 text-center font-semibold text-slate-700">
                        Class {s.class}
                      </td>
                      <td className="py-3.5 px-3 text-center font-extrabold text-rose-600">
                        {s.academicScore}%
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-medium inline-block ${
                            isPositiveObs
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {observation}
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

export default LowPerformersTab;
