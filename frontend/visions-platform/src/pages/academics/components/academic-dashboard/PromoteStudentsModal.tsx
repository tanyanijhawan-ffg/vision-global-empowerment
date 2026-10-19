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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header - Indigo Theme */}
        <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Promote Class Students</h3>
                <span className="flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/20 text-white">
                  <ShieldCheck size={11} />
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-indigo-100 font-medium">
                Academic Year Evaluation & Class Rollover
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!result ? (
            /* Confirmation State */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Academic Year
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                    {academicYearName || 'Current'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Learning Centre
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                    {centreName || 'Not Selected'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Target Class
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                    {className || 'Not Selected'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-xs text-indigo-950">
                <div className="flex items-center gap-2 font-bold text-indigo-900">
                  <Award size={16} className="text-indigo-600" />
                  <span>Promotion Evaluation Criterion (33% Rule)</span>
                </div>
                <p className="leading-relaxed text-indigo-900">
                  All students in this class and centre will be evaluated based on their subject-wise performance across submitted assessments in this academic year:
                </p>
                <ul className="list-disc list-inside space-y-1 text-indigo-800 font-medium pl-1">
                  <li>
                    <strong>Promoted (Class N+1):</strong> Average score strictly exceeds <strong>33%</strong> in <em>every</em> subject.
                  </li>
                  <li>
                    <strong>Retained (Class N):</strong> Average score is <strong>≤ 33%</strong> in any subject, or no scores were entered.
                  </li>
                </ul>
                <p className="text-[11px] text-indigo-700 font-medium pt-1">
                  * Students will have their records automatically created/updated in the upcoming academic year.
                </p>
              </div>
            </div>
          ) : (
            /* Results State */
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900">Evaluation Completed</h4>
                    <p className="text-xs text-indigo-700 font-medium">
                      Next Academic Year: <strong>{result.next_academic_year}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold text-center">
                    <span className="block text-sm">{result.promoted_count}</span>
                    <span className="text-[10px] uppercase font-semibold">Promoted</span>
                  </div>
                  <div className="px-3 py-1.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold text-center">
                    <span className="block text-sm">{result.retained_count}</span>
                    <span className="text-[10px] uppercase font-semibold">Retained</span>
                  </div>
                </div>
              </div>

              {/* Student Results Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 flex justify-between items-center">
                  <span>Student Evaluation Breakdown ({result.students?.length || 0})</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Assessments Evaluated: {result.submitted_assessments_count}
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {result.students && result.students.length > 0 ? (
                    result.students.map((st) => (
                      <div key={st.studentId} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">{st.studentName}</span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{st.currentClass}</span>
                            <ArrowRight size={12} className="text-slate-400" />
                            <strong className="text-slate-700">{st.nextClass}</strong>
                          </span>
                          {st.subjectAverages && Object.keys(st.subjectAverages).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {Object.entries(st.subjectAverages).map(([subj, avg]) => (
                                <span
                                  key={subj}
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
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
                        <div>
                          {st.isPromoted ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-[11px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              PROMOTED
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[11px] font-bold inline-flex items-center gap-1">
                              <AlertCircle size={12} />
                              RETAINED
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No students found in this class scope.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          {!result ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={evaluating}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePromote}
                disabled={evaluating || !centreId || !classId}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {evaluating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Evaluating & Promoting...</span>
                  </>
                ) : (
                  <>
                    <GraduationCap size={15} />
                    <span>Evaluate & Promote Students</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
