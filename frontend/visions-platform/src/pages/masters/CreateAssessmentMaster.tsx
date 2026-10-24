import React, { useEffect, useState, useMemo } from 'react';
import { Plus, X, ChevronDown, Check, AlertCircle } from 'lucide-react';
import {
  fetchAcademicYears,
  fetchSchoolClasses,
  fetchAssessmentTypes,
  fetchAllSubjects,
  createSubjectMetadata,
  createExamMetadata,
  createAssessmentSubjectMetadata,
  createAcademicYearMetadata,
  type AcademicYear,
  type SchoolClass,
  type AssessmentType,
  type Subject,
} from '../../lib/api';

export default function CreateAssessmentMaster() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | ''>('');

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);

  const [exams, setExams] = useState<AssessmentType[]>([]);
  const [selectedExamIds, setSelectedExamIds] = useState<number[]>([]);

  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [subjectMaxMarks, setSubjectMaxMarks] = useState<Record<number, number>>({});
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Modals state
  const [addSubjectModalOpen, setAddSubjectModalOpen] = useState(false);
  const [addExamModalOpen, setAddExamModalOpen] = useState(false);
  const [addYearModalOpen, setAddYearModalOpen] = useState(false);

  // Form state for Add Subject Modal
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
  });
  const [savingSubject, setSavingSubject] = useState(false);

  // Form state for Add Exam Modal
  const [examForm, setExamForm] = useState({
    name: '',
    code: '',
  });
  const [savingExam, setSavingExam] = useState(false);

  // Form state for Add Year Modal
  const [yearForm, setYearForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
  });
  const [savingYear, setSavingYear] = useState(false);

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAcademicYears().catch(() => []),
      fetchSchoolClasses().catch(() => []),
      fetchAllSubjects().catch(() => []),
    ])
      .then(([yearList, classList, subjectList]) => {
        setAcademicYears(yearList);
        if (yearList.length > 0) {
          const currentYear = yearList.find((y) => y.isCurrent) || yearList[0];
          setSelectedAcademicYearId(currentYear.id);
        }
        setClasses(classList);
        if (classList.length > 0) {
          setSelectedClassIds([classList[0].id]);
        }
        setAvailableSubjects(subjectList);
        setSelectedSubjectIds(subjectList.map((s) => s.id));

        const initialMarks: Record<number, number> = {};
        subjectList.forEach((s) => {
          initialMarks[s.id] = 100;
        });
        setSubjectMaxMarks(initialMarks);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load master metadata'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch exams strictly for selected academic year
  useEffect(() => {
    if (!selectedAcademicYearId) {
      setExams([]);
      setSelectedExamIds([]);
      return;
    }
    fetchAssessmentTypes({ academicYearId: Number(selectedAcademicYearId) })
      .then((examList) => {
        setExams(examList);
        if (examList.length > 0) {
          setSelectedExamIds([examList[0].id]);
        } else {
          setSelectedExamIds([]);
        }
      })
      .catch((err) => console.error('Failed to load exams for academic year:', err));
  }, [selectedAcademicYearId]);

  // Unselected subjects available to add
  const unselectedSubjects = useMemo(() => {
    return availableSubjects.filter((s) => !selectedSubjectIds.includes(s.id));
  }, [availableSubjects, selectedSubjectIds]);

  // Total Max Marks calculated dynamically from configured subjects
  const totalMaxMarks = useMemo(() => {
    return selectedSubjectIds.reduce((sum, subId) => {
      const mark = Number(subjectMaxMarks[subId]);
      return sum + (isNaN(mark) ? 0 : mark);
    }, 0);
  }, [selectedSubjectIds, subjectMaxMarks]);

  const toggleClassSelect = (classId: number) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const toggleExamSelect = (examId: number) => {
    setSelectedExamIds((prev) =>
      prev.includes(examId) ? prev.filter((id) => id !== examId) : [...prev, examId]
    );
  };

  const handleRemoveSubject = (subjectId: number) => {
    setSelectedSubjectIds((prev) => prev.filter((id) => id !== subjectId));
  };

  const handleAddExistingSubject = (subjectId: number) => {
    setSelectedSubjectIds((prev) => [...prev, subjectId]);
    if (subjectMaxMarks[subjectId] === undefined) {
      setSubjectMaxMarks((prev) => ({ ...prev, [subjectId]: 100 }));
    }
  };

  const handleSubjectMarkChange = (subjectId: number, value: number) => {
    setSubjectMaxMarks((prev) => ({
      ...prev,
      [subjectId]: value,
    }));
  };

  const handleCreateAssessment = async () => {
    if (selectedClassIds.length === 0) {
      setError('Please select at least one class.');
      return;
    }
    if (selectedExamIds.length === 0) {
      setError('Please select at least one exam.');
      return;
    }
    if (selectedSubjectIds.length === 0) {
      setError('Please configure at least one subject.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const subjectMarksPayload: Record<number, number> = {};
      selectedSubjectIds.forEach((id) => {
        subjectMarksPayload[id] = Number(subjectMaxMarks[id]) || 100;
      });

      await createAssessmentSubjectMetadata({
        academicYearId: selectedAcademicYearId ? Number(selectedAcademicYearId) : undefined,
        classIds: selectedClassIds,
        examIds: selectedExamIds,
        subjectIds: selectedSubjectIds,
        maxMarks: totalMaxMarks,
        subjectMarks: subjectMarksPayload,
        isActive: true,
      });

      setNotice(
        `Assessment definition created successfully for ${selectedClassIds.length} class(es) and ${selectedExamIds.length} exam(s)!`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assessment definition.');
    } finally {
      setSaving(false);
    }
  };

  // Submit Add Subject modal
  const handleAddSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.name.trim() || !subjectForm.code.trim()) {
      setError('Please fill required subject fields.');
      return;
    }

    setSavingSubject(true);
    try {
      const created = await createSubjectMetadata({
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim(),
      });

      const updatedSubjects = await fetchAllSubjects();
      setAvailableSubjects(updatedSubjects);
      if (created?.id && !selectedSubjectIds.includes(created.id)) {
        setSelectedSubjectIds((prev) => [...prev, created.id]);
        setSubjectMaxMarks((prev) => ({ ...prev, [created.id]: 100 }));
      }
      setAddSubjectModalOpen(false);
      setSubjectForm({ name: '', code: '' });
      setNotice(`Subject "${created.name}" created successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subject.');
    } finally {
      setSavingSubject(false);
    }
  };

  // Submit Add Exam modal
  const handleAddExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.name.trim() || !examForm.code.trim()) {
      setError('Please fill required exam fields.');
      return;
    }

    setSavingExam(true);
    try {
      const created = await createExamMetadata({
        name: examForm.name.trim(),
        code: examForm.code.trim(),
        academicYearId: selectedAcademicYearId ? Number(selectedAcademicYearId) : undefined,
      });

      const updatedExams = await fetchAssessmentTypes({
        academicYearId: selectedAcademicYearId ? Number(selectedAcademicYearId) : undefined,
      });
      setExams(updatedExams);
      if (created?.id && !selectedExamIds.includes(created.id)) {
        setSelectedExamIds((prev) => [...prev, created.id]);
      }
      setAddExamModalOpen(false);
      setExamForm({
        name: '',
        code: '',
      });
      setNotice(`Exam "${created.name}" created successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create exam.');
    } finally {
      setSavingExam(false);
    }
  };

  // Submit Add Academic Year modal
  const handleAddYearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearForm.name.trim()) {
      setError('Please provide an Academic Year name (e.g. 2026-2027).');
      return;
    }

    setSavingYear(true);
    try {
      const created = await createAcademicYearMetadata({
        name: yearForm.name.trim(),
        startDate: yearForm.startDate || undefined,
        endDate: yearForm.endDate || undefined,
        isCurrent: yearForm.isCurrent,
        isActive: true,
      });

      const updatedYears = await fetchAcademicYears();
      setAcademicYears(updatedYears);
      if (created?.id) {
        setSelectedAcademicYearId(created.id);
      }
      setAddYearModalOpen(false);
      setYearForm({
        name: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
      });
      setNotice(`Academic year "${created.name}" created successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create academic year.');
    } finally {
      setSavingYear(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Create assessment</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">Define exam types, select classes, and configure subject marks</p>
      </div>

      {/* Notifications */}
      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice('')} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-900 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Academic Year Selector Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Academic Year *</label>
          <button
            type="button"
            onClick={() => setAddYearModalOpen(true)}
            className="font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 text-xs cursor-pointer"
          >
            <Plus size={13} className="stroke-[2.5]" />
            New Year
          </button>
        </div>
        <div className="relative">
          <select
            value={selectedAcademicYearId}
            onChange={(e) => setSelectedAcademicYearId(Number(e.target.value))}
            className="w-full h-11 appearance-none bg-white border border-slate-200 rounded-xl px-3.5 pr-9 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
          >
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name} {y.isCurrent ? '(Current)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Main Form Sections */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-6">
        {/* SECTION 1: CLASSES */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              CLASSES * ({selectedClassIds.length} OF {classes.length} SELECTED)
            </label>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSelectedClassIds(classes.map((c) => c.id))}
                className="font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setSelectedClassIds([])}
                className="font-semibold text-slate-500 hover:text-slate-700 transition cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex flex-wrap gap-2">
              {classes.map((cls) => {
                const isSelected = selectedClassIds.includes(cls.id);
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => toggleClassSelect(cls.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-white text-indigo-600 font-bold' : 'border border-slate-400'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                    {cls.name}
                  </button>
                );
              })}
            </div>
            {selectedClassIds.length === 0 ? (
              <p className="text-xs text-rose-500 font-medium pt-1">Please select at least one class.</p>
            ) : null}
          </div>
        </div>

        {/* SECTION 2: EXAMS / ASSESSMENT TYPES */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              EXAMS / ASSESSMENT TYPES * ({selectedExamIds.length} OF {exams.length} SELECTED)
            </label>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setSelectedExamIds(exams.map((e) => e.id))}
                className="font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setSelectedExamIds([])}
                className="font-semibold text-slate-500 hover:text-slate-700 transition cursor-pointer"
              >
                Clear
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setAddExamModalOpen(true)}
                className="font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer inline-flex items-center gap-0.5"
              >
                <Plus size={13} className="stroke-[2.5]" />
                New Exam
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            {exams.length === 0 ? (
              <p className="text-xs text-slate-500 py-1">
                No exams configured for this academic year yet. Click &quot;+ New Exam&quot; to create one.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {exams.map((ex) => {
                  const isSelected = selectedExamIds.includes(ex.id);
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => toggleExamSelect(ex.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                          isSelected ? 'bg-white text-indigo-600 font-bold' : 'border border-slate-400'
                        }`}
                      >
                        {isSelected ? '✓' : ''}
                      </span>
                      {ex.name}
                      {ex.code && (
                        <span
                          className={`text-[10px] ${
                            isSelected ? 'text-indigo-200 font-normal' : 'text-slate-400'
                          }`}
                        >
                          ({ex.code})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedExamIds.length === 0 && exams.length > 0 ? (
              <p className="text-xs text-rose-500 font-medium pt-1">Please select at least one exam.</p>
            ) : null}
          </div>
        </div>

        {/* SECTION 3: CONFIGURED SUBJECTS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                CONFIGURED SUBJECTS ({selectedSubjectIds.length})
              </label>
              <p className="text-xs text-slate-400 font-normal mt-0.5">
                Each subject has its own maximum marks field.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {unselectedSubjects.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSubjectDropdownOpen(!subjectDropdownOpen)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    Add Existing
                    <ChevronDown size={13} />
                  </button>
                  {subjectDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-20 max-h-48 overflow-y-auto">
                      {unselectedSubjects.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            handleAddExistingSubject(sub.id);
                            setSubjectDropdownOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-xs font-medium text-slate-700 hover:text-indigo-700 cursor-pointer"
                        >
                          {sub.name} ({sub.code || `SUB${sub.id}`})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => setAddSubjectModalOpen(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer inline-flex items-center gap-0.5"
              >
                <Plus size={13} className="stroke-[2.5]" />
                New Subject
              </button>
            </div>
          </div>

          <div className="border border-slate-200/90 rounded-2xl p-4 bg-white space-y-3">
            {selectedSubjectIds.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No subjects configured. Add existing or create a new subject.
              </p>
            ) : (
              <div className="space-y-2.5">
                {selectedSubjectIds.map((subId) => {
                  const sub = availableSubjects.find((s) => s.id === subId);
                  const currentMax = subjectMaxMarks[subId] ?? 100;
                  return (
                    <div key={subId} className="flex items-center gap-3">
                      <div className="flex-1 bg-indigo-50/70 border border-indigo-100/50 text-indigo-950 font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl truncate">
                        {sub?.name || `Subject ${subId}`}
                      </div>

                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={currentMax}
                        onChange={(e) => handleSubjectMarkChange(subId, Number(e.target.value))}
                        className="w-24 sm:w-32 h-10 px-3 text-center bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(subId)}
                        title="Remove Subject"
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total Maximum Marks Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between px-3 bg-indigo-50/40 rounded-xl py-3">
              <span className="text-indigo-700 font-bold text-xs sm:text-sm">
                Total Maximum Marks
              </span>
              <span className="text-indigo-600 font-black text-lg sm:text-xl">
                {totalMaxMarks}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={saving || loading}
            onClick={handleCreateAssessment}
            className="w-full sm:w-auto bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm cursor-pointer text-xs sm:text-sm"
          >
            {saving ? 'Creating assessments...' : 'Create assessment'}
          </button>
        </div>
      </div>

      {/* Modal 1: Add Subject Modal */}
      {addSubjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full space-y-5 border border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Add subject</h2>
              <button
                onClick={() => setAddSubjectModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubjectSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. English"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ENG"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingSubject}
                  className="w-full h-10 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer shadow-sm"
                >
                  {savingSubject ? 'Adding...' : 'Add subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Exam Modal */}
      {addExamModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full space-y-5 border border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Add exam</h2>
              <button
                onClick={() => setAddExamModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddExamSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mid-term"
                  value={examForm.name}
                  onChange={(e) => setExamForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MID26"
                  value={examForm.code}
                  onChange={(e) => setExamForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingExam}
                  className="w-full h-10 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer shadow-sm"
                >
                  {savingExam ? 'Adding...' : 'Add exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add Academic Year Modal */}
      {addYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Academic Year</h3>
              <button
                type="button"
                onClick={() => setAddYearModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddYearSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Academic Year Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-2027"
                  value={yearForm.name}
                  onChange={(e) => setYearForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Start Date (Optional)</label>
                  <input
                    type="date"
                    value={yearForm.startDate}
                    onChange={(e) => setYearForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">End Date (Optional)</label>
                  <input
                    type="date"
                    value={yearForm.endDate}
                    onChange={(e) => setYearForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="create-master-is-current-year"
                  checked={yearForm.isCurrent}
                  onChange={(e) => setYearForm((prev) => ({ ...prev, isCurrent: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="create-master-is-current-year" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Set as current academic year
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingYear}
                  className="w-full h-10 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer shadow-sm"
                >
                  {savingYear ? 'Creating...' : 'Create Academic Year'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
