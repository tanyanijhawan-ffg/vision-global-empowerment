import React from 'react';
import { ChevronDown } from 'lucide-react';
import { type AttendanceCentre, type AssessmentType, type Subject } from '../../../../lib/api';

/**
 * Props for AssessmentFilterBar component.
 */
interface AssessmentFilterBarProps {
  centres: AttendanceCentre[];
  selectedCentreId: string;
  onCentreChange: (id: string) => void;
  
  classId: number | '';
  onClassChange: (c: number | '') => void;
  
  subjects: Subject[];
  selectedSubjectId: number | '';
  onSubjectChange: (sId: number | '') => void;
  
  types: AssessmentType[];
  assessmentTypeId: number | '';
  onTypeChange: (typeId: number | '') => void;
  
  term: string;
  onTermChange: (term: string) => void;
  getTermsForType: (typeId: number | '') => string[];
  
  maxMarks: number;
}

/**
 * AssessmentFilterBar component.
 * Render selection pills for Centre, Class, Subject, Assessment Type, and Term.
 */
export const AssessmentFilterBar: React.FC<AssessmentFilterBarProps> = ({
  centres,
  selectedCentreId,
  onCentreChange,
  classId,
  onClassChange,
  subjects,
  selectedSubjectId,
  onSubjectChange,
  types,
  assessmentTypeId,
  onTypeChange,
  term,
  onTermChange,
  getTermsForType,
  maxMarks,
}) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        {/* Centre Selector */}
        <div className="relative inline-flex items-center">
          <select
            value={selectedCentreId}
            onChange={(e) => onCentreChange(e.target.value)}
            className="h-8 appearance-none bg-indigo-50/80 border border-indigo-300 text-indigo-950 pl-3 pr-7 rounded-lg text-xs font-bold hover:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs max-w-[175px] truncate"
            title="Select Centre"
          >
            <option value="">Select Centre</option>
            {centres.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 text-indigo-700 pointer-events-none" />
        </div>

        {/* Class Selector */}
        <div className="relative inline-flex items-center">
          <select
            value={classId}
            onChange={(e) => onClassChange(e.target.value ? Number(e.target.value) : '')}
            className="h-8 appearance-none bg-white border border-slate-300 text-slate-700 pl-3 pr-7 rounded-lg text-xs font-semibold hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
          >
            <option value="">Select Class</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((c) => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none" />
        </div>

        {/* Subject Selector */}
        <div className="relative inline-flex items-center">
          <select
            value={selectedSubjectId}
            onChange={(e) => onSubjectChange(e.target.value ? Number(e.target.value) : '')}
            disabled={!classId}
            className="h-8 appearance-none bg-white border border-slate-300 text-slate-700 pl-3 pr-7 rounded-lg text-xs font-semibold hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            <option value="">{classId ? 'Select Subject' : 'Select Class First'}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none" />
        </div>

        {/* Assessment Type Selector */}
        <div className="relative inline-flex items-center">
          <select
            value={assessmentTypeId}
            onChange={(e) => onTypeChange(e.target.value ? Number(e.target.value) : '')}
            className="h-8 appearance-none bg-white border border-slate-300 text-slate-700 pl-3 pr-7 rounded-lg text-xs font-semibold hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
          >
            <option value="">Select Type</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none" />
        </div>

        {/* Term Selector */}
        <div className="relative inline-flex items-center">
          <select
            value={term}
            onChange={(e) => onTermChange(e.target.value)}
            disabled={!assessmentTypeId}
            className="h-8 appearance-none bg-white border border-slate-300 text-slate-700 pl-3 pr-7 rounded-lg text-xs font-semibold hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            <option value="">{assessmentTypeId ? 'Select Term' : 'Select Type First'}</option>
            {getTermsForType(assessmentTypeId).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Max Marks Indicator */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="h-8 inline-flex items-center bg-slate-100 text-slate-700 px-3 rounded-lg text-xs font-semibold border border-slate-200">
          Max Marks: {maxMarks}
        </span>
      </div>
    </div>
  );
};
