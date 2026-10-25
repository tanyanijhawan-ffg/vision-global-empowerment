import React, { useState } from 'react';
import {
  GraduationCap, AlertCircle, CheckCircle2,
  X, ArrowRight, ShieldCheck, RefreshCw, Award
} from 'lucide-react';
import { promoteClassStudents, type PromoteClassResult } from '../../../../lib/api';

interface PromoteStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYearName: string;
  academicYearId?: number;
  centreName: string;
  centreId?: number;
  className: string;
  classId: number | string;
  onSuccess?: () => void;
}

export const PromoteStudentsModal: React.FC<PromoteStudentsModalProps> = ({
  isOpen,
  onClose,
  academicYearName,
  academicYearId,
  centreName,
  centreId,
  className,
  classId,
  onSuccess,
}) => {
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PromoteClassResult | null>(null);

  if (!isOpen) return null;

  const handlePromote = async () => {
    if (!centreId || !classId) {
      setError('Please select both a Centre and a Class before initiating promotion.');
      return;
    }

    setEvaluating(true);
    setError(null);
    try {
      const res = await promoteClassStudents({
        academicYearId,
        centreId,
        classId,
      });
      setResult(res);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to evaluate and promote students.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header - Compact Indigo Theme */}
        <div className="px-4 sm:px-5 py-3 bg-indigo-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white leading-tight">Promote Class Students</h3>
                <span className="flex items-center gap-1 text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-white/20 text-white">
                  <ShieldCheck size={10} />
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-indigo-100 font-normal leading-tight mt-0.5">
                Evaluation & Next Academic Year Rollover
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content - Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!result ? (
            /* Confirmation State */
            <div className="space-y-3">
              {/* Scope Info Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Year
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                    {academicYearName || 'Current'}
                  </span>
                </div>
                <div className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Centre
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                    {centreName || 'Not Selected'}
                  </span>
                </div>
                <div className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Class
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                    {className || 'Not Selected'}
                  </span>
                </div>
              </div>

              {/* Criterion Box */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2 text-xs text-indigo-950">
                <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                  <Award size={15} className="text-indigo-600 shrink-0" />
                  <span>Promotion Criterion (33% Rule)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-indigo-900/90">
                  Evaluates students in this class based on their submitted assessments for this academic year:
                </p>
                <div className="space-y-1 text-[11px] text-indigo-900">
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Promoted:</strong> Average &gt; 33% in <em>every</em> subject &rarr; moves to Class N+1</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">✕</span>
                    <span><strong>Retained:</strong> Average &le; 33% in any subject &rarr; repeats Class N</span>
                  </div>
                </div>
                <p className="text-[10px] text-indigo-600 font-medium pt-0.5">
                  * Next academic year record will be created/updated automatically.
                </p>
              </div>
            </div>
          ) : (
            /* Results State */
            <div className="space-y-3">
              <div className="p-3 bg-indigo-50/80 border border-indigo-200/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-900">Evaluation Completed</h4>
                    <p className="text-[11px] text-indigo-700 font-medium">
                      Next Year: <strong>{result.next_academic_year}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold text-center">
                    <span className="block text-xs">{result.promoted_count}</span>
                    <span className="text-[9px] uppercase font-semibold">Promoted</span>
                  </div>
                  <div className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold text-center">
                    <span className="block text-xs">{result.retained_count}</span>
                    <span className="text-[9px] uppercase font-semibold">Retained</span>
                  </div>
                </div>
              </div>

              {/* Student Results Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 flex justify-between items-center">
                  <span>Breakdown ({result.students?.length || 0})</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Assessments: {result.submitted_assessments_count}
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {result.students && result.students.length > 0 ? (
                    result.students.map((st) => (
                      <div key={st.studentId} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50 text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-900 block truncate">{st.studentName}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <span>{st.currentClass}</span>
                            <ArrowRight size={10} className="text-slate-400" />
                            <strong className="text-slate-700">{st.nextClass}</strong>
                          </span>
                          {st.subjectAverages && Object.keys(st.subjectAverages).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(st.subjectAverages).map(([subj, avg]) => (
                                <span
                                  key={subj}
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                                    avg > 33
                                      ? 'bg-slate-100 text-slate-700'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {subj}: {avg}%
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0">
                          {st.isPromoted ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 size={11} />
                              PROMOTED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold inline-flex items-center gap-1">
                              <AlertCircle size={11} />
                              RETAINED
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No students found in this class scope.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          {!result ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={evaluating}
                className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePromote}
                disabled={evaluating || !centreId || !classId}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {evaluating ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Evaluating...</span>
                  </>
                ) : (
                  <>
                    <GraduationCap size={14} />
                    <span>Promote Students</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
