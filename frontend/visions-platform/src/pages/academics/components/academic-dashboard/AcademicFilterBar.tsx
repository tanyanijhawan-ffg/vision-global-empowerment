import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { Assessment, AttendanceCentre } from '../../../../lib/api';

/**
 * Styling class for custom select inputs.
 */
const selectClassName =
  'w-full appearance-none px-3 py-2 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs';

export interface AcademicFilterBarProps {
  /** Currently selected class ID string (e.g. "5") */
  filterClass: string;
  /** Callback when class filter selection changes */
  onClassChange: (val: string) => void;
  /** Currently selected centre name/ID */
  filterCentre: string;
  /** Callback when centre filter selection changes */
  onCentreChange: (val: string) => void;
  /** Currently selected assessment ID */
  selectedAssessmentId: number | null;
  /** Callback when assessment selection changes */
  onAssessmentChange: (val: number | null) => void;
  /** Available centres loaded from backend */
  availableCentres: AttendanceCentre[];
  /** Submitted assessments loaded for the selected class & centre */
  assessments: Assessment[];
  /** Total students in scope for current selection */
  studentsInScopeCount: number;
  /** Reset all filter selections to default state */
  onResetAll: () => void;
}

/**
 * AcademicFilterBar Component
 *
 * Implements the 3-step sequential filter workflow for the Academic Dashboard:
 * 1. Select Centre
 * 2. Select Class (enabled after Centre is selected)
 * 3. Select Assessment (enabled after Centre and Class are selected)
 */
export const AcademicFilterBar: React.FC<AcademicFilterBarProps> = ({
  filterClass,
  onClassChange,
  filterCentre,
  onCentreChange,
  selectedAssessmentId,
  onAssessmentChange,
  availableCentres,
  assessments,
  studentsInScopeCount,
  onResetAll,
}) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
          Academic Assessment Selection
        </h2>
        {(filterClass || filterCentre || selectedAssessmentId) && (
          <button
            onClick={onResetAll}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
          >
            Reset All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Select Centre */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block">
            1. Select Centre
          </label>
          <div className="relative">
            <select
              className={selectClassName}
              value={filterCentre}
              onChange={(e) => onCentreChange(e.target.value)}
            >
              <option value="">Choose Centre first...</option>
              {availableCentres.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        {/* 2. Select Class */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block">
            2. Select Class
          </label>
          <div className="relative">
            <select
              className={`${selectClassName} ${
                !filterCentre ? 'bg-slate-50 opacity-60 cursor-not-allowed' : ''
              }`}
              value={filterCentre ? filterClass : ''}
              onChange={(e) => {
                if (!filterCentre) return;
                onClassChange(e.target.value);
              }}
              disabled={!filterCentre}
            >
              {!filterCentre ? (
                <option value="">Select Centre first...</option>
              ) : (
                <>
                  <option value="">Choose Class...</option>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </>
              )}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        {/* 3. Select Assessment */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block">
            3. Select Assessment
          </label>
          <div className="relative">
            <select
              className={`${selectClassName} ${
                !filterCentre || !filterClass ? 'bg-slate-50 opacity-60 cursor-not-allowed' : ''
              }`}
              value={filterCentre && filterClass ? selectedAssessmentId ?? '' : ''}
              onChange={(e) => {
                if (!filterCentre || !filterClass) return;
                onAssessmentChange(e.target.value ? Number(e.target.value) : null);
              }}
              disabled={!filterCentre || !filterClass}
            >
              {!filterCentre && <option value="">Select Centre first...</option>}
              {filterCentre && !filterClass && <option value="">Select Class first...</option>}
              {filterCentre && filterClass && assessments.length === 0 && (
                <option value="">No submitted assessments for this Centre & Class</option>
              )}
              {filterCentre &&
                filterClass &&
                assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assessmentType} - Class {a.class}
                  </option>
                ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {filterCentre && filterClass && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            Centre <span className="font-bold text-slate-800">{filterCentre}</span> &bull; Class{' '}
            <span className="font-bold text-slate-800">{filterClass}</span> &bull;{' '}
            <span className="font-bold text-indigo-600">{studentsInScopeCount}</span> students in scope
          </p>
        </div>
      )}
    </div>
  );
};

export default AcademicFilterBar;
