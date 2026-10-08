import React from 'react';
import { AlertCircle, X, RotateCcw } from 'lucide-react';

/**
 * Props for SubmittedPromptModal component.
 */
interface SubmittedPromptModalProps {
  isOpen: boolean;
  info: { id: number; label: string } | null;
  saving: boolean;
  onDismiss: () => void;
  onLoadSubmitted: () => void;
}

/**
 * SubmittedPromptModal component.
 * Prompts user when a submitted assessment already exists, offering to reopen it for editing.
 */
export const SubmittedPromptModal: React.FC<SubmittedPromptModalProps> = ({
  isOpen,
  info,
  saving,
  onDismiss,
  onLoadSubmitted,
}) => {
  if (!isOpen || !info) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-amber-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Published Assessment Found</h3>
              <p className="text-xs text-slate-500 font-medium">{info.label}</p>
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
          Data for this exam has already been submitted and published to the dashboard. Would you like to <strong>edit previously published marks</strong>? You can update scores, diagnostics, and observations, then re-publish.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 font-medium">
          ⚠️ Reopening will allow you to update scores, diagnostics, and observations, then re-publish to the dashboard.
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onDismiss}
            className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onLoadSubmitted}
            disabled={saving}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw size={13} />
            {saving ? 'Reopening...' : 'Edit Previously Published Marks'}
          </button>
        </div>
      </div>
    </div>
  );
};
