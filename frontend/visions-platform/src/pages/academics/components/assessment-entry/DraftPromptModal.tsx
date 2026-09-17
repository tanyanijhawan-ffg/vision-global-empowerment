import React from 'react';
import { FolderDown, X, RotateCcw } from 'lucide-react';
import { type AttendanceCentre, type Subject } from '../../../../lib/api';

/**
 * Props for DraftPromptModal component.
 */
interface DraftPromptModalProps {
  isOpen: boolean;
  centre?: AttendanceCentre;
  classId: number | '';
  subject?: Subject;
  onDismiss: () => void;
  onLoadDraft: () => void;
}

/**
 * DraftPromptModal component.
 * Displays a prompt when a local or server draft is detected for the selected combination.
 */
export const DraftPromptModal: React.FC<DraftPromptModalProps> = ({
  isOpen,
  centre,
  classId,
  subject,
  onDismiss,
  onLoadDraft,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <FolderDown size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Saved Draft Available</h3>
              <p className="text-xs text-slate-500 font-medium">
                {centre?.name} &nbsp;•&nbsp; Class {classId} — {subject?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          A previously saved draft was found for <strong>{centre?.name}</strong>, Class {classId} - {subject?.name}. Would you like to load and resume your entries from this draft?
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onDismiss}
            className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Start Fresh / Dismiss
          </button>
          <button
            type="button"
            onClick={onLoadDraft}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={13} />
            Load Saved Draft
          </button>
        </div>
      </div>
    </div>
  );
};
