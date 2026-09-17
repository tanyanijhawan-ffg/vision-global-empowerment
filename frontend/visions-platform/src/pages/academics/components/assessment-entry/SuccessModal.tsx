import React from 'react';
import { CheckCircle2, Check } from 'lucide-react';

export interface SuccessDetails {
  title: string;
  message: string;
  assessmentId: number;
  centreName: string;
  className: string;
  term: string;
  typeName: string;
  submittedAt: string;
  studentCount: number;
  isResubmission: boolean;
}

/**
 * Props for SuccessModal component.
 */
interface SuccessModalProps {
  isOpen: boolean;
  details: SuccessDetails | null;
  onClose: () => void;
}

/**
 * SuccessModal component.
 * Displays confirmation card after submitting or updating an assessment.
 */
export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  details,
  onClose,
}) => {
  if (!isOpen || !details) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-emerald-100 space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Top accent border */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500" />

        <div className="flex items-start gap-4 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs border border-emerald-200/60">
            <CheckCircle2 size={28} className="animate-in zoom-in duration-300" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 leading-snug">
              {details.title}
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              {details.message}
            </p>
          </div>
        </div>

        {/* Assessment Details Summary Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs text-slate-700">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Centre</span>
            <span className="font-bold text-slate-900">{details.centreName}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Class & Term</span>
            <span className="font-bold text-slate-900">{details.className} • {details.term} ({details.typeName})</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Students Recorded</span>
            <span className="font-bold text-slate-900">{details.studentCount} Students</span>
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Submitted On</span>
            <span className="font-bold text-emerald-700">{details.submittedAt}</span>
          </div>
        </div>

        <div className="bg-emerald-50/80 border border-emerald-200/60 rounded-xl p-3 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <Check size={16} className="text-emerald-600 shrink-0" />
          <span>Everything is safely saved in the system. You can edit or view results anytime.</span>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check size={16} />
            Got it, Thank You!
          </button>
        </div>
      </div>
    </div>
  );
};
