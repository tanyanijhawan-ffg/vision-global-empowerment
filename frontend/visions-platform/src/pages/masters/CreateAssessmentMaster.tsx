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
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');

  const [exams, setExams] = useState<AssessmentType[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | ''>('');

  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);

  const [maxMarks, setMaxMarks] = useState<number>(100);

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
          setSelectedClassId(classList[0].id);
        }
        setAvailableSubjects(subjectList);
        setSelectedSubjectIds(subjectList.map((s) => s.id));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load master metadata'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch exams strictly for selected academic year
  useEffect(() => {
    if (!selectedAcademicYearId) {
      setExams([]);
      setSelectedExamId('');
      return;
    }
    fetchAssessmentTypes({ academicYearId: Number(selectedAcademicYearId) })
      .then((examList) => {
        setExams(examList);
        if (examList.length > 0) {
          setSelectedExamId(examList[0].id);
        } else {
          setSelectedExamId('');
        }
      })
      .catch((err) => console.error('Failed to load exams for academic year:', err));
  }, [selectedAcademicYearId]);

  // Unselected subjects available to add
  const unselectedSubjects = useMemo(() => {
    return availableSubjects.filter((s) => !selectedSubjectIds.includes(s.id));
  }, [availableSubjects, selectedSubjectIds]);

  const handleCreateAssessment = async () => {
    if (!selectedClassId) {
      setError('Please select a class.');
      return;
    }
    if (!selectedExamId) {
      setError('Please select an exam.');
      return;
    }
    if (selectedSubjectIds.length === 0) {
      setError('Please select at least one subject.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await createAssessmentSubjectMetadata({
        academicYearId: selectedAcademicYearId ? Number(selectedAcademicYearId) : undefined,
        classId: Number(selectedClassId),
        examId: Number(selectedExamId),
        subjectIds: selectedSubjectIds,
        maxMarks: Number(maxMarks),
        isActive: true,
      });

      const selectedExam = exams.find((e) => e.id === selectedExamId);
      const selectedClass = classes.find((c) => c.id === selectedClassId);
      setNotice(
        `Assessment definition for ${selectedExam?.name || 'Exam'} (${selectedClass?.name || 'Class'}) saved successfully!`
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

      // Refresh subjects list (metadata endpoint returns ALL subjects)
      const updatedSubjects = await fetchAllSubjects();
      setAvailableSubjects(updatedSubjects);
      if (created?.id && !selectedSubjectIds.includes(created.id)) {
        setSelectedSubjectIds((prev) => [...prev, created.id]);
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
      if (created?.id) {
        setSelectedExamId(created.id);
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
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Create assessment</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">Define an exam and the subjects it covers</p>
      </div>

      {/* Notifications */}
      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check size={16} className="text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Card Form */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 md:p-8 shadow-2xs space-y-6">
        {/* Row 1: Academic year & Class */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Academic year */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Academic year</label>
              <button
                type="button"
                onClick={() => setAddYearModalOpen(true)}
                className="font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 text-xs cursor-pointer"
              >
                <Plus size={13} />
                New Year
              </button>
            </div>
            <div className="relative">
              <select
                value={selectedAcademicYearId}
                onChange={(e) => setSelectedAcademicYearId(Number(e.target.value))}
                className="w-full h-11 appearance-none bg-white border border-slate-200 rounded-xl px-3.5 pr-9 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
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

          {/* Select class */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Select class</label>
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(Number(e.target.value))}
                className="w-full h-11 appearance-none bg-white border border-slate-200 rounded-xl px-3.5 pr-9 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 2: Select exam & [+ Add exam] button */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Select exam</label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(Number(e.target.value))}
                className="w-full h-11 appearance-none bg-white border border-slate-200 rounded-xl px-3.5 pr-9 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
              >
                <option value="">Select Exam</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={() => {
                setExamForm({
                  name: '',
                  code: '',
                });
                setAddExamModalOpen(true);
              }}
              className="h-11 px-4 border-2 border-indigo-600 text-indigo-600 font-semibold rounded-xl text-xs flex items-center gap-1.5 hover:bg-indigo-50 transition cursor-pointer shrink-0 shadow-2xs"
            >
              <Plus size={14} className="stroke-[2.5]" />
              Add exam
            </button>
          </div>
        </div>

        {/* Row 3: Select subjects tags & [+ Add subject] button */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Select subjects</label>
          <div className="flex items-start gap-3">
            <div className="relative flex-1">
              <div
                onClick={() => setSubjectDropdownOpen(!subjectDropdownOpen)}
                className="min-h-[44px] p-2 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center gap-2 cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500 shadow-2xs"
              >
                {selectedSubjectIds.map((subId) => {
                  const subject = availableSubjects.find((s) => s.id === subId);
                  return (
                    <span
                      key={subId}
                      className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
                    >
                      {subject?.name || `Subject ${subId}`}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubjectIds((prev) => prev.filter((id) => id !== subId));
                        }}
                        className="hover:text-indigo-900 transition"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
                {selectedSubjectIds.length === 0 && (
                  <span className="text-xs text-slate-400 px-1 font-normal">Select subjects...</span>
                )}
                {selectedSubjectIds.length > 0 && unselectedSubjects.length > 0 && (
                  <span className="text-xs text-slate-400 px-1 font-normal">Add more...</span>
                )}
              </div>

              {/* Subject dropdown selector */}
              {subjectDropdownOpen && unselectedSubjects.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20 max-h-48 overflow-y-auto">
                  {unselectedSubjects.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setSelectedSubjectIds((prev) => [...prev, sub.id]);
                        setSubjectDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      {sub.name} ({sub.code || `SUB${sub.id}`})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setSubjectForm({
                  name: '',
                  code: '',
                });
                setAddSubjectModalOpen(true);
              }}
              className="h-11 px-4 border-2 border-indigo-600 text-indigo-600 font-semibold rounded-xl text-xs flex items-center gap-1.5 hover:bg-indigo-50 transition cursor-pointer shrink-0 shadow-2xs"
            >
              <Plus size={14} className="stroke-[2.5]" />
              Add subject
            </button>
          </div>
        </div>

        {/* Row 4: Max marks */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Max marks</label>
          <div>
            <input
              type="number"
              min="1"
              value={maxMarks}
              onChange={(e) => setMaxMarks(Number(e.target.value))}
              className="w-full max-w-[200px] h-11 px-3.5 bg-white border border-slate-200 text-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Row 5: Create assessment button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={handleCreateAssessment}
            className="bg-indigo-600 text-white font-bold px-7 py-3 rounded-xl text-xs hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm cursor-pointer"
          >
            {saving ? 'Creating...' : 'Create assessment'}
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

      {/* Add Academic Year Modal */}
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
