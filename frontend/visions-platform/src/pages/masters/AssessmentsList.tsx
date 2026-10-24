import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Edit2, Search, Trash2, X, Plus, Filter, ChevronDown, AlertCircle, Check } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { getCurrentUser } from '../../lib/auth';
import {
  fetchAssessments,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  fetchAssessmentDetail,
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
  type Assessment,
} from '../../lib/api';

export default function AssessmentsList() {
  const canManage = getCurrentUser()?.role === 'SUPER_ADMIN' || getCurrentUser()?.role === 'REGIONAL_ADMIN';

  const [data, setData] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [filterYear, setFilterYear] = useState('All');

  // Master dropdown data
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [exams, setExams] = useState<AssessmentType[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);

  // Form Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | ''>('');
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [selectedExamIds, setSelectedExamIds] = useState<number[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [subjectMaxMarks, setSubjectMaxMarks] = useState<Record<number, number>>({});
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);

  // Sub-modals for inline creation
  const [addSubjectModalOpen, setAddSubjectModalOpen] = useState(false);
  const [addExamModalOpen, setAddExamModalOpen] = useState(false);
  const [addYearModalOpen, setAddYearModalOpen] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '' });
  const [examForm, setExamForm] = useState({ name: '', code: '' });
  const [yearForm, setYearForm] = useState({ name: '', startDate: '', endDate: '', isCurrent: false });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [assessmentsRes, yearList, classList, subjectList] = await Promise.all([
        fetchAssessments().catch(() => []),
        fetchAcademicYears().catch(() => []),
        fetchSchoolClasses().catch(() => []),
        fetchAllSubjects().catch(() => []),
      ]);
      setData(assessmentsRes);
      setAcademicYears(yearList);
      setClasses(classList);
      setAvailableSubjects(subjectList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load assessments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fetch exams strictly for selected academic year in form
  useEffect(() => {
    if (!selectedAcademicYearId) {
      setExams([]);
      return;
    }
    fetchAssessmentTypes({ academicYearId: Number(selectedAcademicYearId) })
      .then((examList) => {
        setExams(examList);
      })
      .catch((err) => console.error('Failed to load exams for academic year:', err));
  }, [selectedAcademicYearId]);

  // Auto-clear notice message after 5 seconds
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice('');
    }, 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const normalizeClass = useCallback((val?: string | number) => String(val || '').replace(/[^0-9]/g, ''), []);

  // Filtered List
  const filteredData = useMemo(() => {
    const selYearObj = academicYears.find(
      (y) => String(y.id) === String(filterYear) || y.name === filterYear
    );
    const selYearStart = selYearObj?.name?.match(/\d{4}/)?.[0] || String(filterYear);

    return data.filter((item) => {
      const matchesSearch =
        [item.assessmentType, item.academicYear, item.class, item.centreName]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase());

      const normFilterClass = normalizeClass(filterClass);
      const normItemClass = normalizeClass(item.class);
      const normItemClassId = normalizeClass(item.classId);

      const matchesClass =
        filterClass === 'All' ||
        (normFilterClass !== '' && (normItemClass === normFilterClass || normItemClassId === normFilterClass)) ||
        item.class === filterClass ||
        String(item.classId) === String(filterClass);

      const itemYearStart = String(item.academicYear || '').match(/\d{4}/)?.[0];

      const matchesYear =
        filterYear === 'All' ||
        String(item.academicYearId) === String(filterYear) ||
        item.academicYear === filterYear ||
        (selYearObj && String(item.academicYearId) === String(selYearObj.id)) ||
        (selYearObj && item.academicYear === selYearObj.name) ||
        (Boolean(itemYearStart) && Boolean(selYearStart) && itemYearStart === selYearStart);

      return matchesSearch && matchesClass && matchesYear;
    });
  }, [data, search, filterClass, filterYear, academicYears, normalizeClass]);

  const totalMaxMarks = useMemo(() => {
    return selectedSubjectIds.reduce((sum, subId) => {
      const mark = Number(subjectMaxMarks[subId]);
      return sum + (isNaN(mark) ? 0 : mark);
    }, 0);
  }, [selectedSubjectIds, subjectMaxMarks]);

  const handleSubjectMarkChange = (subjectId: number, value: number) => {
    setSubjectMaxMarks((prev) => ({
      ...prev,
      [subjectId]: value,
    }));
  };

  const openAddForm = () => {
    setEditingId(null);
    setError('');
    setNotice('');

    const currentYear = academicYears.find((y) => y.isCurrent) || academicYears[0];
    const defaultYearId = currentYear ? currentYear.id : '';
    const defaultClassIds = classes.length > 0 ? [classes[0].id] : [];

    setSelectedAcademicYearId(defaultYearId);
    setSelectedClassIds(defaultClassIds);
    setSelectedSubjectIds(availableSubjects.map((s) => s.id));
    setMaxMarks(100);

    const initialMarks: Record<number, number> = {};
    availableSubjects.forEach((s) => {
      initialMarks[s.id] = 100;
    });
    setSubjectMaxMarks(initialMarks);

    if (defaultYearId) {
      fetchAssessmentTypes({ academicYearId: Number(defaultYearId) }).then((examList) => {
        setExams(examList);
        setSelectedExamIds(examList.length > 0 ? [examList[0].id] : []);
      });
    } else {
      setSelectedExamIds([]);
    }

    setIsFormOpen(true);
  };

  const openEditForm = async (item: Assessment) => {
    setEditingId(item.id);
    setError('');
    setNotice('');
    setIsFormOpen(true);

    const yearId = item.academicYearId || (academicYears.find((y) => y.name === item.academicYear)?.id || '');
    const matchedClass = classes.find((c) => c.name === item.class || `Grade ${c.id}` === item.class || c.id === item.classId);
    const classId = item.classId || (matchedClass ? matchedClass.id : '');

    setSelectedAcademicYearId(yearId);
    setSelectedClassIds(classId ? [Number(classId)] : []);
    setMaxMarks(item.maxMarks || 100);

    if (yearId) {
      const examList = await fetchAssessmentTypes({ academicYearId: Number(yearId) }).catch(() => []);
      setExams(examList);
      const matchExam = examList.find((e) => e.name === item.assessmentType || e.id === item.assessmentTypeId);
      setSelectedExamIds(matchExam ? [matchExam.id] : (item.assessmentTypeId ? [item.assessmentTypeId] : []));
    }

    // Try fetching detailed subject IDs and maxMarks if available
    try {
      const detail = await fetchAssessmentDetail(item.id);
      if (detail) {
        if (detail.maxMarks) setMaxMarks(detail.maxMarks);
        if (Array.isArray(detail.subjectIds) && detail.subjectIds.length > 0) {
          setSelectedSubjectIds(detail.subjectIds);
        } else {
          setSelectedSubjectIds(availableSubjects.map((s) => s.id));
        }
      }
    } catch {
      setSelectedSubjectIds(availableSubjects.map((s) => s.id));
    }
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setError('');
    setSubjectDropdownOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this assessment? All recorded scores and entries for this assessment will be deleted.')) {
      return;
    }

    try {
      await deleteAssessment(id);
      setNotice('Assessment deleted successfully.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete assessment.');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClassIds.length === 0) {
      setError('Please select at least one class.');
      return;
    }
    if (selectedExamIds.length === 0) {
      setError('Please select at least one exam.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    const defaultDate = new Date().toISOString().split('T')[0];

    try {
      if (editingId) {
        await updateAssessment(editingId, {
          academicYearId: selectedAcademicYearId ? Number(selectedAcademicYearId) : undefined,
          classId: Number(selectedClassIds[0]),
          assessmentTypeId: Number(selectedExamIds[0]),
          subjectIds: selectedSubjectIds,
          maxMarks: Number(maxMarks),
        });
        setNotice('Assessment updated successfully!');
      } else {
        await createAssessment({
          academicYearId: Number(selectedAcademicYearId),
          classIds: selectedClassIds,
          assessmentTypeIds: selectedExamIds,
          assessmentDate: defaultDate,
          subjectIds: selectedSubjectIds,
          maxMarks: Number(maxMarks),
        });

        // Also save subject metadata
        if (selectedSubjectIds.length > 0) {
          const subjectMarksPayload: Record<number, number> = {};
          selectedSubjectIds.forEach((id) => {
            subjectMarksPayload[id] = Number(subjectMaxMarks[id]) || 100;
          });

          await createAssessmentSubjectMetadata({
            academicYearId: Number(selectedAcademicYearId),
            classIds: selectedClassIds,
            examIds: selectedExamIds,
            subjectIds: selectedSubjectIds,
            maxMarks: totalMaxMarks,
            subjectMarks: subjectMarksPayload,
            isActive: true,
          }).catch(() => null);
        }

        setNotice('Assessment created successfully');
      }

      setIsFormOpen(false);
      setEditingId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save assessment.');
    } finally {
      setSaving(false);
    }
  };

  // Inline Subject Creation
  const handleAddSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.name.trim() || !subjectForm.code.trim()) {
      setError('Please fill in both Subject Name and Code.');
      return;
    }
    try {
      const newSubject = await createSubjectMetadata({
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim().toUpperCase(),
      });
      setAvailableSubjects((prev) => [...prev, newSubject]);
      setSelectedSubjectIds((prev) => [...prev, newSubject.id]);
      setSubjectForm({ name: '', code: '' });
      setAddSubjectModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subject');
    }
  };

  // Inline Exam Creation
  const handleAddExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.name.trim() || !examForm.code.trim()) {
      setError('Please fill in both Exam Name and Code.');
      return;
    }
    try {
      const newExam = await createExamMetadata({
        name: examForm.name.trim(),
        code: examForm.code.trim().toUpperCase(),
        academicYearId: selectedAcademicYearId ? Number(selectedAcademicYearId) : undefined,
      });
      setExams((prev) => [...prev, newExam]);
      setSelectedExamIds((prev) => [...prev, newExam.id]);
      setExamForm({ name: '', code: '' });
      setAddExamModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create exam');
    }
  };

  // Inline Academic Year Creation
  const handleAddYearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearForm.name.trim()) {
      setError('Please provide an Academic Year name (e.g. 2026-2027).');
      return;
    }
    try {
      const newYear = await createAcademicYearMetadata({
        name: yearForm.name.trim(),
        startDate: yearForm.startDate ? yearForm.startDate : undefined,
        endDate: yearForm.endDate ? yearForm.endDate : undefined,
        isCurrent: yearForm.isCurrent,
        isActive: true,
      });

      setAcademicYears((prev) => {
        const updated = yearForm.isCurrent
          ? prev.map((y) => ({ ...y, isCurrent: false }))
          : [...prev];
        const existingIdx = updated.findIndex((y) => y.id === newYear.id);
        if (existingIdx >= 0) {
          updated[existingIdx] = newYear;
          return updated;
        }
        return [...updated, newYear];
      });

      setSelectedAcademicYearId(newYear.id);
      setYearForm({ name: '', startDate: '', endDate: '', isCurrent: false });
      setAddYearModalOpen(false);
      setNotice(`Academic year "${newYear.name}" created successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create academic year');
    }
  };

  const toggleClassSelect = (id: number) => {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id]
    );
  };

  const toggleExamSelect = (id: number) => {
    setSelectedExamIds((prev) =>
      prev.includes(id) ? prev.filter((eId) => eId !== id) : [...prev, id]
    );
  };

  const toggleSubjectSelect = (id: number) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const unselectedSubjects = useMemo(() => {
    return availableSubjects.filter((s) => !selectedSubjectIds.includes(s.id));
  }, [availableSubjects, selectedSubjectIds]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Assessments"
        subtitle="Manage exams, class configurations, and subjects."
        action={
          canManage ? (
            <button
              onClick={openAddForm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus size={18} />
              Create Assessment
            </button>
          ) : undefined
        }
      />

      {notice ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center justify-between shadow-2xs">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="text-emerald-600 hover:text-emerald-900">
            <X size={16} />
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-900">
            <X size={16} />
          </button>
        </div>
      ) : null}

      <div className="xl:bg-white xl:border xl:border-slate-200 xl:rounded-xl xl:shadow-xs overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by exam, class..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Academic Year Filter */}
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-slate-400" />
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="py-2 pl-3 pr-8 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Academic Years</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Filter */}
            <div className="flex items-center gap-2">
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="py-2 pl-3 pr-8 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        {/* Cards on small screens */}
        <div className="xl:hidden space-y-3 p-3">
          {loading ? (
            <p className="p-12 text-center text-slate-400">Loading assessments...</p>
          ) : filteredData.length === 0 ? (
            <p className="p-12 text-center text-slate-400">No assessments found.</p>
          ) : (
            filteredData.map((item) => (
              <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{item.assessmentType || 'Assessment'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{item.academicYear || '-'}</div>
                  </div>
                  {canManage ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditForm(item)}
                        title="Edit Assessment"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        title="Delete Assessment"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div className="text-slate-600"><span className="text-xs text-slate-400 block">Class</span><span className="font-semibold text-slate-800">{item.class || '-'}</span></div>
                  <div className="text-slate-600"><span className="text-xs text-slate-400 block">Max Marks</span><span className="font-semibold text-slate-700">{item.maxMarks || 100} Marks</span></div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Table on lg+ screens */}
        <div className="overflow-x-auto hidden xl:block">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-3.5">Exam Name</th>
                <th className="px-6 py-3.5">Academic Year</th>
                <th className="px-6 py-3.5">Class</th>
                <th className="px-6 py-3.5">Max Marks</th>
                {canManage ? <th className="px-6 py-3.5 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Loading assessments...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No assessments found.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{item.assessmentType || 'Assessment'}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">{item.academicYear || '-'}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{item.class || '-'}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{item.maxMarks || 100} Marks</td>
                    {canManage ? (
                      <td className="px-6 py-4 text-right space-x-1">
                        <button
                          onClick={() => openEditForm(item)}
                          title="Edit Assessment"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          title="Delete Assessment"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Assessment Modal */}
      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-4">
          <form
            onSubmit={handleFormSubmit}
            className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  {editingId ? 'Edit Assessment' : 'Create New Assessment'}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                  {editingId ? 'Modify assessment exam, class, and subject configuration.' : 'Define exam schedule, class, and subjects.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
            {/* When Editing: show single selects */}
            {editingId ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Academic Year */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Academic Year *
                    </label>
                    <button
                      type="button"
                      onClick={() => setAddYearModalOpen(true)}
                      className="font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 text-xs cursor-pointer"
                    >
                      <Plus size={13} />
                      New Year
                    </button>
                  </div>
                  <select
                    value={selectedAcademicYearId}
                    onChange={(e) => setSelectedAcademicYearId(e.target.value ? Number(e.target.value) : '')}
                    required
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="">Select Academic Year</option>
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name} {y.isCurrent ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Class *
                  </label>
                  <select
                    value={selectedClassIds[0] || ''}
                    onChange={(e) => setSelectedClassIds(e.target.value ? [Number(e.target.value)] : [])}
                    required
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Exam */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Exam *
                  </label>
                  <select
                    value={selectedExamIds[0] || ''}
                    onChange={(e) => setSelectedExamIds(e.target.value ? [Number(e.target.value)] : [])}
                    required
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="">Select Exam</option>
                    {exams.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              /* When Creating: show multi-select for Classes and Exams */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Academic Year */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Academic Year *
                      </label>
                      <button
                        type="button"
                        onClick={() => setAddYearModalOpen(true)}
                        className="font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 text-xs cursor-pointer"
                      >
                        <Plus size={13} />
                        New Year
                      </button>
                    </div>
                    <select
                      value={selectedAcademicYearId}
                      onChange={(e) => setSelectedAcademicYearId(e.target.value ? Number(e.target.value) : '')}
                      required
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    >
                      <option value="">Select Academic Year</option>
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name} {y.isCurrent ? '(Current)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

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
              </div>
            )}

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
                                toggleSubjectSelect(sub.id);
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
                            onClick={() => toggleSubjectSelect(subId)}
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
          </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || (!editingId && (selectedClassIds.length === 0 || selectedExamIds.length === 0))}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving
                  ? 'Saving...'
                  : editingId
                  ? 'Save Changes'
                  : selectedClassIds.length * selectedExamIds.length > 1
                  ? `Create ${selectedClassIds.length * selectedExamIds.length} Assessments`
                  : 'Create Assessment'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Add Subject Modal */}
      {addSubjectModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleAddSubjectSubmit}
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add New Subject</h3>
              <button
                type="button"
                onClick={() => setAddSubjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subject Name *
              </label>
              <input
                type="text"
                required
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                placeholder="e.g. Science"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subject Code *
              </label>
              <input
                type="text"
                required
                value={subjectForm.code}
                onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                placeholder="e.g. SCI"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddSubjectModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition cursor-pointer"
              >
                Create Subject
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Add Exam Modal */}
      {addExamModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleAddExamSubmit}
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add New Exam</h3>
              <button
                type="button"
                onClick={() => setAddExamModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Exam Name *
              </label>
              <input
                type="text"
                required
                value={examForm.name}
                onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                placeholder="e.g. Annual Exam"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Exam Code *
              </label>
              <input
                type="text"
                required
                value={examForm.code}
                onChange={(e) => setExamForm({ ...examForm, code: e.target.value })}
                placeholder="e.g. ANNUAL"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddExamModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition cursor-pointer"
              >
                Create Exam
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Add Academic Year Modal */}
      {addYearModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleAddYearSubmit}
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Academic Year Name *
              </label>
              <input
                type="text"
                required
                value={yearForm.name}
                onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
                placeholder="e.g. 2026-2027"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={yearForm.startDate}
                  onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={yearForm.endDate}
                  onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is-current-year"
                checked={yearForm.isCurrent}
                onChange={(e) => setYearForm({ ...yearForm, isCurrent: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="is-current-year" className="text-xs font-medium text-slate-700 cursor-pointer">
                Set as current academic year
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddYearModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition cursor-pointer"
              >
                Create Academic Year
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
