import React, { useEffect, useState } from 'react';
import { Calendar, Building2, User, FileText, ChevronDown } from 'lucide-react';
import { type AttendanceCentre, type AssessmentType, type AcademicYear, type SchoolClass, fetchSchoolClasses } from '../../../../lib/api';

/**
 * Props for AssessmentFilterBar component.
 */
interface AssessmentFilterBarProps {
  academicYears: AcademicYear[];
  selectedAcademicYear: string;
  onAcademicYearChange: (year: string) => void;

  centres: AttendanceCentre[];
  selectedCentreId: string;
  onCentreChange: (id: string) => void;

  classes?: SchoolClass[];
  classId: number | '';
  onClassChange: (c: number | '') => void;

  types: AssessmentType[];
  assessmentTypeId: number | '';
  onTypeChange: (typeId: number | '') => void;

  maxMarks: number;
}

/**
 * AssessmentFilterBar component.
 * Render selection pills for Assessment Year, Centre, Class, and Exam (replacing type & term).
 */
export const AssessmentFilterBar: React.FC<AssessmentFilterBarProps> = ({
  academicYears,
  selectedAcademicYear,
  onAcademicYearChange,
  centres,
  selectedCentreId,
  onCentreChange,
  classes,
  classId,
  onClassChange,
  types,
  assessmentTypeId,
  onTypeChange,
  maxMarks,
}) => {
  const [internalClasses, setInternalClasses] = useState<SchoolClass[]>(classes || []);

  useEffect(() => {
    if (classes && classes.length > 0) {
      setInternalClasses(classes);
    } else {
      fetchSchoolClasses()
        .then((data) => {
          if (data && data.length > 0) {
            setInternalClasses(data);
          }
        })
        .catch((err) => console.error('Failed to load classes from /v1/classes/:', err));
    }
  }, [classes]);

  const availableClasses = (classes && classes.length > 0) ? classes : internalClasses;
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
        {/* Assessment Year Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
            Assessment Year <span className="text-rose-500">*</span>
          </label>
          <div className="relative inline-flex items-center">
            <div className="absolute left-3 text-slate-400 pointer-events-none">
              <Calendar size={15} />
            </div>
            <select
              value={selectedAcademicYear}
              onChange={(e) => onAcademicYearChange(e.target.value)}
              className="h-10 appearance-none bg-white border border-slate-200 text-slate-800 pl-9 pr-8 rounded-xl text-xs font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer shadow-2xs min-w-[140px]"
            >
              {(academicYears && academicYears.length > 0) ? (
                academicYears.map((ay) => (
                  <option key={ay.id} value={ay.name}>
                    {ay.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="2025 - 2026">2025 - 2026</option>
                  <option value="2026 - 2027">2026 - 2027</option>
                </>
              )}
            </select>
            <ChevronDown size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Centre Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
            Centre <span className="text-rose-500">*</span>
          </label>
          <div className="relative inline-flex items-center">
            <div className="absolute left-3 text-slate-400 pointer-events-none">
              <Building2 size={15} />
            </div>
            <select
              value={selectedCentreId}
              onChange={(e) => onCentreChange(e.target.value)}
              className="h-10 appearance-none bg-white border border-slate-200 text-slate-800 pl-9 pr-8 rounded-xl text-xs font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer shadow-2xs max-w-[240px] truncate"
            >
              <option value="">Select Centre</option>
              {(centres || []).map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Class Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
            Class <span className="text-rose-500">*</span>
          </label>
          <div className="relative inline-flex items-center">
            <div className="absolute left-3 text-slate-400 pointer-events-none">
              <User size={15} />
            </div>
            <select
              value={classId}
              onChange={(e) => onClassChange(e.target.value ? Number(e.target.value) : '')}
              className="h-10 appearance-none bg-white border border-slate-200 text-slate-800 pl-9 pr-8 rounded-xl text-xs font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer shadow-2xs min-w-[130px]"
            >
              <option value="">Select Class</option>
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || `Class ${c.id}`}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Exam Filter (replacing Assessment Type & Term) */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
            Exam <span className="text-rose-500">*</span>
          </label>
          <div className="relative inline-flex items-center">
            <div className="absolute left-3 text-slate-400 pointer-events-none">
              <FileText size={15} />
            </div>
            <select
              value={assessmentTypeId}
              onChange={(e) => onTypeChange(e.target.value ? Number(e.target.value) : '')}
              className="h-10 appearance-none bg-white border border-slate-200 text-slate-800 pl-9 pr-8 rounded-xl text-xs font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer shadow-2xs min-w-[150px]"
            >
              <option value="">Select Exam</option>
              {(types || []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Max Marks Readout */}
      <div className="flex items-center gap-2 self-end mb-0.5 shrink-0">
        <span className="h-10 inline-flex items-center bg-slate-100/90 text-slate-700 px-4 rounded-xl text-xs font-semibold border border-slate-200/80 shadow-2xs">
          Max Marks: {maxMarks}
        </span>
      </div>
    </div>
  );
};
