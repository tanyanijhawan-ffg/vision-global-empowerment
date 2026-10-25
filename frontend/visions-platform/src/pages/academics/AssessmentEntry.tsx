import { useEffect, useState, useMemo } from 'react';
import { Save, Send, Check, AlertCircle, Sparkles, FileText } from 'lucide-react';
import {
  createAssessment, fetchAssessmentTypes, fetchDiagnosticOptions, fetchLearningBehaviours,
  fetchStudents, fetchSubjects, fetchAttendanceCentres, fetchAcademicYears, fetchSchoolClasses,
  saveAssessmentBehaviours, saveAssessmentDiagnostics, saveAssessmentObservation, saveAssessmentObservations,
  saveAssessmentScores, submitAssessment, reopenAssessment, fetchAssessments,
  fetchAssessmentScores, fetchAssessmentDiagnostics, fetchAssessmentBehaviours,
  fetchAssessmentObservations, type AssessmentType, type AcademicYear, type DiagnosticOptions,
  type LearningBehaviourOption, type AttendanceCentre, type StudentListItem, type Subject,
  type SchoolClass,
} from '../../lib/api';
import { DraftPromptModal } from './components/assessment-entry/DraftPromptModal';
import { SubmittedPromptModal } from './components/assessment-entry/SubmittedPromptModal';
import { SuccessModal, type SuccessDetails } from './components/assessment-entry/SuccessModal';
import { AssessmentFilterBar } from './components/assessment-entry/AssessmentFilterBar';
import { StudentAssessmentTable, type StatusFilter } from './components/assessment-entry/StudentAssessmentTable';
import { type StudentAssessmentData } from './components/assessment-entry/ExpandedStudentCard';

export const DEFAULT_UNDERSTANDING = 'CLEAR';
export const DEFAULT_APPLICATION = 'APPLIES';
export const DEFAULT_INTEREST = 'INTERESTED';
export const DEFAULT_BEHAVIOUR = 'INDEPENDENT';

const newStudentData = (): StudentAssessmentData => ({
  scores: {},
  diagnostics: {},
  behaviour: DEFAULT_BEHAVIOUR,
  keyImprovements: '',
  subjectsNeedingSupport: '',
  interventionPlan: '',
  comments: '',
});

export default function AssessmentEntry() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [centres, setCentres] = useState<AttendanceCentre[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState<string>('');
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('2025 - 2026');
  const [types, setTypes] = useState<AssessmentType[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticOptions | null>(null);
  const [behaviours, setBehaviours] = useState<LearningBehaviourOption[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  // Form controls
  const [classId, setClassId] = useState<number | ''>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [assessmentTypeId, setAssessmentTypeId] = useState<number | ''>('');
  const [assessmentDate, setAssessmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const handleClassChange = (newClassId: number | '') => {
    setClassId(newClassId);
    setSelectedSubjectId('');
    setNotice('');
    setError('');
  };

  const handleCentreChange = (newCentreId: string) => {
    setSelectedCentreId(newCentreId);
    setNotice('');
    setError('');
  };

  const handleAssessmentTypeChange = (newTypeId: number | '') => {
    setAssessmentTypeId(newTypeId);
    setNotice('');
    setError('');
  };

  // Assessment tracking
  const [assessmentId, setAssessmentId] = useState<number | null>(null);
  const [studentData, setStudentData] = useState<Record<string, StudentAssessmentData>>({});

  // UI state
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  // Draft prompt modal
  const [draftPromptOpen, setDraftPromptOpen] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{ label: string; date?: string } | null>(null);

  // Submitted assessment editing
  const [isEditingSubmitted, setIsEditingSubmitted] = useState(false);
  const [submittedPromptOpen, setSubmittedPromptOpen] = useState(false);
  const [submittedAssessmentInfo, setSubmittedAssessmentInfo] = useState<{ id: number; label: string } | null>(null);

  // Success modal prompt
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successDetails, setSuccessDetails] = useState<SuccessDetails | null>(null);

  // Auto-dismiss notice after 5 seconds
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const formatReadableDateTime = (isoOrDateStr?: string) => {
    if (!isoOrDateStr) {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    try {
      const d = new Date(isoOrDateStr);
      if (isNaN(d.getTime())) return isoOrDateStr;
      const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${datePart} at ${timePart}`;
    } catch {
      return isoOrDateStr;
    }
  };

  // Initialize page metadata on mount
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAttendanceCentres(),
      fetchAssessmentTypes({ onlyCreated: true }),
      fetchDiagnosticOptions(),
      fetchLearningBehaviours(),
      fetchAcademicYears().catch(() => []),
      fetchSchoolClasses().catch(() => []),
    ])
      .then(([centreList, typeData, diagnosticData, behaviourData, yearData, classList]) => {
        setCentres(centreList);
        setTypes(typeData);
        setDiagnostics(diagnosticData);
        setBehaviours(behaviourData);
        if (classList && classList.length > 0) {
          setClasses(classList);
        }
        if (yearData && yearData.length > 0) {
          setAcademicYears(yearData);
          const current = yearData.find((y) => y.isCurrent) || yearData[0];
          if (current) setSelectedAcademicYear(current.name);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load assessment metadata'))
      .finally(() => setLoading(false));
  }, []);

  // Re-fetch assessment types whenever selectedAcademicYear or classId changes
  useEffect(() => {
    if (!selectedAcademicYear) return;
    fetchAssessmentTypes({ academicYear: selectedAcademicYear, classId: classId || undefined, onlyCreated: true })
      .then((typeData) => {
        setTypes(typeData);
        if (assessmentTypeId && !typeData.some((t) => t.id === assessmentTypeId)) {
          setAssessmentTypeId('');
        }
      })
      .catch((err) => console.error('Failed to load assessment types for academic year & class:', err));
  }, [selectedAcademicYear, classId]);

  // Fetch subjects lazily when classId, assessmentTypeId, or selectedCentreId changes
  useEffect(() => {
    if (!classId) {
      setSubjects([]);
      setSelectedSubjectId('');
      return;
    }
    fetchSubjects(
      Number(classId),
      assessmentTypeId ? Number(assessmentTypeId) : undefined,
      selectedCentreId || undefined
    )
      .then((subjectData) => {
        setSubjects(subjectData);
      })
      .catch((err) => console.error('Failed to load subjects:', err));
  }, [classId, assessmentTypeId, selectedCentreId]);

  // Fetch students lazily when classId, selectedCentreId, or selectedAcademicYear are selected
  useEffect(() => {
    if (!classId || !selectedCentreId) {
      setStudents([]);
      setStudentData({});
      return;
    }
    fetchStudents(classId, selectedCentreId, selectedAcademicYear)
      .then((studentDataList) => {
        setStudents(studentDataList);
        const initialMap: Record<string, StudentAssessmentData> = {};
        studentDataList.forEach((s) => {
          initialMap[s.id] = newStudentData();
        });
        setStudentData(initialMap);
      })
      .catch((err) => console.error('Failed to load students:', err));
  }, [classId, selectedCentreId, selectedAcademicYear]);

  // Check draft / submitted assessment availability when filters are populated
  useEffect(() => {
    if (!selectedCentreId || !classId || !assessmentTypeId) {
      setDraftPromptOpen(false);
      setDraftInfo(null);
      setSubmittedPromptOpen(false);
      setSubmittedAssessmentInfo(null);
      setAssessmentId(null);
      setIsEditingSubmitted(false);
      return;
    }
    checkDraftAvailable(selectedCentreId, Number(classId), Number(selectedSubjectId || 1), Number(assessmentTypeId));
  }, [selectedCentreId, classId, assessmentTypeId, types]);

  const checkDraftAvailable = async (
    targetCentreId: string,
    targetClassId: number | '',
    targetSubId: number | '',
    targetTypeId: number | ''
  ) => {
    if (!targetCentreId || !targetClassId || !targetTypeId) {
      setDraftPromptOpen(false);
      setDraftInfo(null);
      setSubmittedPromptOpen(false);
      setSubmittedAssessmentInfo(null);
      setAssessmentId(null);
      setIsEditingSubmitted(false);
      return;
    }
    setDraftPromptOpen(false);
    setDraftInfo(null);

    // 1. Check for SUBMITTED/PUBLISHED assessments first
    try {
      const submittedAssessments = await fetchAssessments({
        classId: targetClassId,
        centreId: targetCentreId || (selectedCentreId ? Number(selectedCentreId) : undefined),
        assessmentTypeId: targetTypeId || undefined,
        status: 'SUBMITTED',
      });

      const submittedMatch = submittedAssessments[0];
      if (submittedMatch) {
        const examName = submittedMatch.assessmentType || types.find((t) => t.id === Number(targetTypeId))?.name || 'Exam';
        const className = submittedMatch.class ? `Class ${submittedMatch.class}` : `Class ${targetClassId}`;
        const centreName = currentCentre?.name || '';
        const matchLabel = [examName, className, centreName].filter(Boolean).join(' · ');

        setSubmittedAssessmentInfo({
          id: submittedMatch.id,
          label: matchLabel || `${examName} – ${className}`,
        });
        setSubmittedPromptOpen(true);
        return;
      }
    } catch (e) {
      console.error('Failed checking submitted assessment:', e);
    }

    // 2. Check local storage draft
    const localKey = `assessment_draft_${targetCentreId}_${targetClassId}_${targetTypeId}`;
    const localDraft = localStorage.getItem(localKey);
    if (localDraft) {
      try {
        const parsed = JSON.parse(localDraft);
        if (parsed.studentData && Object.keys(parsed.studentData).length > 0) {
          setDraftInfo({
            label: parsed.savedAt ? `Saved locally at ${parsed.savedAt}` : 'Saved local draft',
          });
          setDraftPromptOpen(true);
          return;
        } else {
          localStorage.removeItem(localKey);
        }
      } catch (e) {
        console.error('Failed to parse local draft:', e);
      }
    }

    // 3. Check backend draft
    try {
      const allAssessments = await fetchAssessments({
        classId: targetClassId,
        centreId: targetCentreId || (selectedCentreId ? Number(selectedCentreId) : undefined),
        assessmentTypeId: targetTypeId || undefined,
        status: 'DRAFT',
      });

      const backendDraft = allAssessments[0];

      if (backendDraft) {
        setAssessmentId(backendDraft.id);

        const [scoreRes] = await Promise.all([
          fetchAssessmentScores(backendDraft.id).catch(() => null),
        ]);

        if (scoreRes?.students) {
          setStudentData((prevData) => {
            const merged = { ...prevData };
            scoreRes.students.forEach((s: any) => {
              const sid = String(s.studentId);
              if (!merged[sid]) merged[sid] = newStudentData();
              s.scores?.forEach((sc: any) => {
                if (sc.obtainedMarks !== '' && sc.obtainedMarks !== null && sc.obtainedMarks !== undefined) {
                  merged[sid].scores[sc.subjectId] = sc.obtainedMarks;
                }
              });
            });
            return merged;
          });
        }

        const examName = backendDraft.assessmentType || types.find((t) => t.id === Number(targetTypeId))?.name || 'Exam';
        const className = backendDraft.class ? `Class ${backendDraft.class}` : `Class ${targetClassId}`;
        const centreName = currentCentre?.name || '';
        const draftParts = [examName, className, centreName].filter(Boolean).join(' · ');
        setDraftInfo({
          label: draftParts || 'Saved draft on server',
        });
        setDraftPromptOpen(true);
      } else {
        setAssessmentId(null);
        setIsEditingSubmitted(false);
      }
    } catch (e) {
      setAssessmentId(null);
      setIsEditingSubmitted(false);
    }
  };

  const loadSubmittedForEditing = async () => {
    if (!submittedAssessmentInfo) return;
    setSaving(true);
    setError('');
    setNotice('');
    setSubmittedPromptOpen(false);

    try {
      await reopenAssessment(submittedAssessmentInfo.id);
      setAssessmentId(submittedAssessmentInfo.id);
      setIsEditingSubmitted(true);

      const mergedData: Record<string, StudentAssessmentData> = {};
      students.forEach((s) => {
        mergedData[s.id] = newStudentData();
      });

      const [scoreRes, diagRes, behavRes, obsRes] = await Promise.all([
        fetchAssessmentScores(submittedAssessmentInfo.id).catch(() => null),
        fetchAssessmentDiagnostics(submittedAssessmentInfo.id).catch(() => null),
        fetchAssessmentBehaviours(submittedAssessmentInfo.id).catch(() => null),
        fetchAssessmentObservations(submittedAssessmentInfo.id).catch(() => null),
      ]);

      scoreRes?.students?.forEach((s: any) => {
        const sid = String(s.studentId);
        if (!mergedData[sid]) mergedData[sid] = newStudentData();
        s.scores?.forEach((sc: any) => {
          mergedData[sid].scores[sc.subjectId] = sc.obtainedMarks;
        });
      });

      diagRes?.diagnostics?.forEach((d: any) => {
        const sid = String(d.studentId);
        if (!mergedData[sid]) mergedData[sid] = newStudentData();
        mergedData[sid].diagnostics[d.subjectId] = {
          understanding: d.understandingLevel || '',
          application: d.applicationAbility || '',
          interest: d.interestLevel || '',
        };
      });

      behavRes?.students?.forEach((b: any) => {
        const sid = String(b.studentId);
        if (!mergedData[sid]) mergedData[sid] = newStudentData();
        mergedData[sid].behaviour = b.behaviour || 'INDEPENDENT';
      });

      obsRes?.students?.forEach((o: any) => {
        const sid = String(o.studentId);
        if (!mergedData[sid]) mergedData[sid] = newStudentData();
        mergedData[sid].keyImprovements = o.keyImprovements || '';
        mergedData[sid].subjectsNeedingSupport = o.subjectsNeedingSupport || '';
        mergedData[sid].interventionPlan = o.interventionPlan || '';
        mergedData[sid].comments = o.comments || '';
      });

      setStudentData(mergedData);
      setNotice(`Assessment #${submittedAssessmentInfo.id} reopened for editing. Make your changes and re-submit when ready.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reopen assessment for editing');
    } finally {
      setSaving(false);
    }
  };

  const loadLastDraft = async () => {
    setDraftPromptOpen(false);
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const mergedData: Record<string, StudentAssessmentData> = {};
      students.forEach((s) => {
        mergedData[s.id] = newStudentData();
      });

      let loaded = false;

      if (assessmentId) {
        const [scoreRes, diagRes, behavRes, obsRes] = await Promise.all([
          fetchAssessmentScores(assessmentId).catch(() => null),
          fetchAssessmentDiagnostics(assessmentId).catch(() => null),
          fetchAssessmentBehaviours(assessmentId).catch(() => null),
          fetchAssessmentObservations(assessmentId).catch(() => null),
        ]);

        scoreRes?.students?.forEach((s: any) => {
          const sid = String(s.studentId);
          if (!mergedData[sid]) mergedData[sid] = newStudentData();
          s.scores?.forEach((sc: any) => {
            mergedData[sid].scores[sc.subjectId] = sc.obtainedMarks;
          });
          loaded = true;
        });

        diagRes?.diagnostics?.forEach((d: any) => {
          const sid = String(d.studentId);
          if (!mergedData[sid]) mergedData[sid] = newStudentData();
          mergedData[sid].diagnostics[d.subjectId] = {
            understanding: d.understandingLevel || '',
            application: d.applicationAbility || '',
            interest: d.interestLevel || '',
          };
          loaded = true;
        });

        behavRes?.students?.forEach((b: any) => {
          const sid = String(b.studentId);
          if (!mergedData[sid]) mergedData[sid] = newStudentData();
          mergedData[sid].behaviour = b.behaviour || 'INDEPENDENT';
        });

        obsRes?.students?.forEach((o: any) => {
          const sid = String(o.studentId);
          if (!mergedData[sid]) mergedData[sid] = newStudentData();
          mergedData[sid].keyImprovements = o.keyImprovements || '';
          mergedData[sid].subjectsNeedingSupport = o.subjectsNeedingSupport || '';
          mergedData[sid].interventionPlan = o.interventionPlan || '';
          mergedData[sid].comments = o.comments || '';
        });
      }

      if (loaded) {
        setStudentData(mergedData);
        setNotice(`Successfully loaded last saved draft for ${currentCentre?.name || 'Centre'}, Class ${classId}.`);
      } else {
        setNotice(`No saved draft entries found.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load draft');
    } finally {
      setSaving(false);
    }
  };

  const maxMarks = useMemo(() => {
    if (subjects.length > 0) return subjects.reduce((sum, s) => sum + (s.maxMarks || 100), 0);
    const selectedType = types.find((t) => t.id === assessmentTypeId);
    if (selectedType?.maxMarks) return selectedType.maxMarks;
    return 600;
  }, [subjects, types, assessmentTypeId]);

  const currentCentre = useMemo(
    () => centres.find((c) => String(c.id) === selectedCentreId) || centres[0],
    [centres, selectedCentreId]
  );

  const centreStudents = useMemo(() => {
    if (!selectedCentreId || centres.length === 0) return students;
    const targetCentre = centres.find((c) => String(c.id) === selectedCentreId);
    return students.filter((s) => {
      if (s.centreId !== undefined && s.centreId !== null) {
        return String(s.centreId) === selectedCentreId;
      }
      if (targetCentre && s.centre) {
        return s.centre.toLowerCase().includes(targetCentre.name.toLowerCase()) ||
          targetCentre.name.toLowerCase().includes(s.centre.toLowerCase());
      }
      return true;
    });
  }, [students, selectedCentreId, centres]);

  const checkIsStudentComplete = (sData?: StudentAssessmentData) => {
    if (!sData) return false;
    const allScoresFilled = subjects.length > 0 && subjects.every((s) => {
      const val = sData.scores?.[s.id];
      return typeof val === 'number' && val >= 0;
    });
    const firstSubId = subjects[0]?.id;
    const diag = (firstSubId && sData.diagnostics?.[firstSubId]) || Object.values(sData.diagnostics || {})[0];
    const understandingVal = diag?.understanding !== undefined ? diag.understanding : DEFAULT_UNDERSTANDING;
    const applicationVal = diag?.application !== undefined ? diag.application : DEFAULT_APPLICATION;
    const interestVal = diag?.interest !== undefined ? diag.interest : DEFAULT_INTEREST;
    const behaviourVal = sData.behaviour !== undefined ? sData.behaviour : DEFAULT_BEHAVIOUR;

    const hasUnderstanding = understandingVal.trim() !== '';
    const hasApplication = applicationVal.trim() !== '';
    const hasInterest = interestVal.trim() !== '';
    const hasBehaviour = behaviourVal.trim() !== '';
    const hasRemarks = Boolean((sData.keyImprovements || sData.comments || '').trim());

    return allScoresFilled && hasUnderstanding && hasApplication && hasInterest && hasBehaviour && hasRemarks;
  };

  const filteredStudents = useMemo(() => {
    return centreStudents.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesId = String(s.id).includes(q);
        if (!matchesName && !matchesId) return false;
      }

      const sData = studentData[s.id];
      if (statusFilter === 'Completed') return checkIsStudentComplete(sData);
      if (statusFilter === 'Incomplete') return !checkIsStudentComplete(sData);
      return true;
    });
  }, [centreStudents, searchQuery, statusFilter, studentData, subjects]);

  const stats = useMemo(() => {
    const total = centreStudents.length;
    let completed = 0;
    centreStudents.forEach((s) => {
      const sData = studentData[s.id];
      if (checkIsStudentComplete(sData)) {
        completed += 1;
      }
    });
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [centreStudents, studentData, subjects]);

  const updateScore = (studentId: string, subjectId: number, value: number | '') => {
    setStudentData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        scores: {
          ...prev[studentId]?.scores,
          [subjectId]: value,
        },
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    }));
  };

  const updateDiagnostic = (studentId: string, subjectId: number, field: 'understanding' | 'application' | 'interest', value: string) => {
    setStudentData((prev) => {
      const studentObj = prev[studentId] || newStudentData();
      const subjectDiag = studentObj.diagnostics[subjectId] || { understanding: '', application: '', interest: '' };
      return {
        ...prev,
        [studentId]: {
          ...studentObj,
          diagnostics: {
            ...studentObj.diagnostics,
            [subjectId]: {
              ...subjectDiag,
              [field]: value,
            },
          },
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      };
    });
  };

  const updateStudentData = (studentId: string, updates: Partial<StudentAssessmentData>) => {
    setStudentData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        ...updates,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    }));
  };

  const persistAllData = async (id: number) => {
    // 1. Scores
    const scoresPayload = centreStudents
      .map((s) => ({
        studentId: Number(s.id),
        scores: subjects
          .filter((sub) => studentData[s.id]?.scores[sub.id] !== undefined && studentData[s.id]?.scores[sub.id] !== '')
          .map((sub) => ({ subjectId: sub.id, obtainedMarks: Number(studentData[s.id].scores[sub.id]) })),
      }))
      .filter((s) => s.scores.length > 0);

    if (scoresPayload.length > 0) {
      await saveAssessmentScores(id, scoresPayload);
    }

    // 2. Behaviours
    const behavioursPayload = centreStudents
      .map((s) => ({
        studentId: Number(s.id),
        behaviour: studentData[s.id]?.behaviour || DEFAULT_BEHAVIOUR,
      }))
      .filter((s) => Boolean(s.behaviour));

    if (behavioursPayload.length > 0) {
      await saveAssessmentBehaviours(id, behavioursPayload);
    }

    // 3. Diagnostics
    const diagPayload: Array<Record<string, number | string>> = [];
    centreStudents.forEach((s) => {
      const sDiag = studentData[s.id]?.diagnostics || {};
      const firstDiag = Object.values(sDiag)[0];
      subjects.forEach((sub) => {
        const d = sDiag[sub.id] || firstDiag || {};
        diagPayload.push({
          studentId: Number(s.id),
          subjectId: Number(sub.id),
          understandingLevel: d.understanding || DEFAULT_UNDERSTANDING,
          applicationAbility: d.application || DEFAULT_APPLICATION,
          interestLevel: d.interest || DEFAULT_INTEREST,
        });
      });
    });

    if (diagPayload.length > 0) {
      await saveAssessmentDiagnostics(id, diagPayload);
    }

    // 4. Observations
    const obsPayload = centreStudents
      .map((s) => {
        const sData = studentData[s.id];
        const text = sData?.keyImprovements || sData?.comments || sData?.subjectsNeedingSupport || sData?.interventionPlan || '';
        return {
          studentId: Number(s.id),
          keyImprovements: sData?.keyImprovements || sData?.comments || text,
          subjectsNeedingSupport: sData?.subjectsNeedingSupport || '',
          interventionPlan: sData?.interventionPlan || '',
          comments: sData?.comments || '',
        };
      })
      .filter((obs) => Boolean(obs.keyImprovements || obs.subjectsNeedingSupport || obs.interventionPlan || obs.comments));

    if (obsPayload.length > 0) {
      await saveAssessmentObservations(id, obsPayload);
    }
  };

  const saveSingleStudent = async (studentId: string) => {
    try {
      const sData = studentData[studentId];
      if (!sData) return;

      let id = assessmentId;
      if (!id) {
        const targetCentre = selectedCentreId ? Number(selectedCentreId) : undefined;
        const existing = await fetchAssessments({
          classId: Number(classId),
          assessmentTypeId: Number(assessmentTypeId || 1),
          centreId: targetCentre,
        });
        if (existing && existing.length > 0) {
          id = existing[0].id;
          setAssessmentId(id);
        } else {
          const ayId = academicYears.find((y) => y.name === selectedAcademicYear)?.id || 1;
          const result = await createAssessment({
            academicYearId: ayId,
            classId: Number(classId),
            assessmentTypeId: Number(assessmentTypeId || 1),
            assessmentDate,
            centreId: targetCentre,
          });
          id = result.id;
          setAssessmentId(id);
        }
      }

      // Save scores
      const scoreInputs = subjects
        .filter((sub) => sData.scores[sub.id] !== undefined && sData.scores[sub.id] !== '')
        .map((sub) => ({ subjectId: sub.id, obtainedMarks: Number(sData.scores[sub.id]) }));

      if (scoreInputs.length > 0) {
        await saveAssessmentScores(id, [{ studentId: Number(studentId), scores: scoreInputs }]);
      }

      // Save behaviour
      if (sData.behaviour) {
        await saveAssessmentBehaviours(id, [{ studentId: Number(studentId), behaviour: sData.behaviour }]);
      }

      // Save diagnostics
      const diagPayload: Array<Record<string, number | string>> = [];
      Object.entries(sData.diagnostics || {}).forEach(([subId, d]) => {
        if (d.understanding || d.application || d.interest) {
          diagPayload.push({
            studentId: Number(studentId),
            subjectId: Number(subId),
            understandingLevel: d.understanding || 'GOOD',
            applicationAbility: d.application || 'GOOD',
            interestLevel: d.interest || 'HIGH',
          });
        }
      });
      if (diagPayload.length > 0) {
        await saveAssessmentDiagnostics(id, diagPayload);
      }

      // Save observations
      const obsText = sData.keyImprovements || sData.comments || sData.subjectsNeedingSupport || sData.interventionPlan;
      if (obsText) {
        await saveAssessmentObservations(id, [{
          studentId: Number(studentId),
          keyImprovements: sData.keyImprovements || sData.comments || obsText,
          subjectsNeedingSupport: sData.subjectsNeedingSupport || '',
          interventionPlan: sData.interventionPlan || '',
          comments: sData.comments || '',
        }]);
      }
    } catch (e) {
      console.error('Failed to auto-save student:', e);
    }
  };

  const saveDraft = async () => {
    if (!assessmentTypeId) {
      return setError('Please select an Exam before saving draft.');
    }

    setSaving(true);
    setError('');
    setNotice('');
    setQuickActionsOpen(false);

    try {
      let id = assessmentId;
      if (!id) {
        const targetCentre = selectedCentreId ? Number(selectedCentreId) : undefined;
        const existing = await fetchAssessments({
          classId: Number(classId),
          assessmentTypeId: Number(assessmentTypeId),
          centreId: targetCentre,
        });
        if (existing && existing.length > 0) {
          id = existing[0].id;
          setAssessmentId(id);
        } else {
          const ayId = academicYears.find((y) => y.name === selectedAcademicYear)?.id || 1;
          const result = await createAssessment({
            academicYearId: ayId,
            classId: Number(classId),
            assessmentTypeId: Number(assessmentTypeId),
            assessmentDate,
            centreId: targetCentre,
          });
          id = result.id;
          setAssessmentId(id);
        }
      }

      await persistAllData(id);

      setNotice(`Draft saved successfully for ${currentCentre?.name || 'Centre'}, Class ${classId}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const clearCurrentEntries = () => {
    if (window.confirm(`Are you sure you want to clear all entered data for ${currentCentre?.name || 'Centre'}, Class ${classId}?`)) {
      const resetMap: Record<string, StudentAssessmentData> = {};
      centreStudents.forEach((s) => {
        resetMap[s.id] = newStudentData();
      });
      setStudentData(resetMap);
      setNotice(`Cleared all current entries.`);
      setQuickActionsOpen(false);
    }
  };

  const submitDraft = async () => {
    setError('');
    setNotice('');

    // Check if at least one student has marks
    const studentsWithMarks = centreStudents.filter((s) => {
      const sData = studentData[s.id];
      return sData && Object.values(sData.scores).some((v) => typeof v === 'number' && v >= 0);
    });

    if (studentsWithMarks.length === 0) {
      setError('Please enter marks for students before publishing to dashboard.');
      return;
    }

    // Check narrative observation is specified for each student with marks
    const missingNarrativeStudents = studentsWithMarks.filter((s) => {
      const sData = studentData[s.id];
      const text = (
        sData?.keyImprovements ||
        sData?.comments ||
        sData?.interventionPlan ||
        sData?.subjectsNeedingSupport ||
        ''
      ).trim();
      return !text;
    });

    if (missingNarrativeStudents.length > 0) {
      const missingNames = missingNarrativeStudents.map((s) => s.name).join(', ');
      setError(
        `Cannot publish to dashboard: Narrative observation is mandatory for each student. Missing observation for: ${missingNames}.`
      );
      return;
    }

    // Check understanding level, application ability, interest level, and learning behaviour are selected
    const missingDiagnosticStudents = studentsWithMarks.filter((s) => {
      const sData = studentData[s.id];
      const firstSubId = subjects[0]?.id;
      const diag = (firstSubId && sData?.diagnostics?.[firstSubId]) || Object.values(sData?.diagnostics || {})[0];
      const understandingVal = diag?.understanding !== undefined ? diag.understanding : DEFAULT_UNDERSTANDING;
      const applicationVal = diag?.application !== undefined ? diag.application : DEFAULT_APPLICATION;
      const interestVal = diag?.interest !== undefined ? diag.interest : DEFAULT_INTEREST;
      const behaviourVal = sData?.behaviour !== undefined ? sData.behaviour : DEFAULT_BEHAVIOUR;
      return !understandingVal.trim() || !applicationVal.trim() || !interestVal.trim() || !behaviourVal.trim();
    });

    if (missingDiagnosticStudents.length > 0) {
      const missingNames = missingDiagnosticStudents.map((s) => s.name).join(', ');
      setError(
        `Cannot publish to dashboard: Understanding level, Application ability, Interest level, and Learning behaviour must be selected for: ${missingNames}.`
      );
      return;
    }

    setSaving(true);

    try {
      let id = assessmentId;
      if (!id) {
        const targetCentre = selectedCentreId ? Number(selectedCentreId) : undefined;
        const existing = await fetchAssessments({
          classId: Number(classId),
          assessmentTypeId: Number(assessmentTypeId || 1),
          centreId: targetCentre,
        });
        if (existing && existing.length > 0) {
          id = existing[0].id;
          setAssessmentId(id);
        } else {
          const ayId = academicYears.find((y) => y.name === selectedAcademicYear)?.id || 1;
          const result = await createAssessment({
            academicYearId: ayId,
            classId: Number(classId),
            assessmentTypeId: Number(assessmentTypeId || 1),
            assessmentDate,
            centreId: targetCentre,
          });
          id = result.id;
          setAssessmentId(id);
        }
      }

      await persistAllData(id);

      const result = await submitAssessment(id);

      window.dispatchEvent(new CustomEvent('vge-assessment-change', { detail: { assessmentId: id } }));

      const typeObj = types.find((t) => t.id === Number(assessmentTypeId));
      const readableTime = formatReadableDateTime(result.submittedAt);

      setSuccessDetails({
        title: isEditingSubmitted ? 'Assessment Updated & Published!' : 'Assessment Published to Dashboard!',
        message: `Marks and observations for ${stats.completed} student(s) have been recorded.`,
        assessmentId: id,
        centreName: currentCentre?.name || 'Selected Centre',
        className: `Class ${classId}`,
        typeName: typeObj?.name || 'Exam',
        submittedAt: readableTime,
        studentCount: stats.completed,
        isResubmission: isEditingSubmitted,
      });

      setIsEditingSubmitted(false);
      setSuccessModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit assessment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Modals */}
      <DraftPromptModal
        isOpen={draftPromptOpen}
        info={draftInfo}
        onDismiss={() => setDraftPromptOpen(false)}
        onLoadDraft={loadLastDraft}
        onStartFresh={clearCurrentEntries}
      />

      <SubmittedPromptModal
        isOpen={submittedPromptOpen}
        info={submittedAssessmentInfo}
        saving={saving}
        onDismiss={() => { setSubmittedPromptOpen(false); setSubmittedAssessmentInfo(null); }}
        onLoadSubmitted={loadSubmittedForEditing}
      />

      {successDetails && (
        <SuccessModal
          isOpen={successModalOpen}
          details={successDetails}
          onClose={() => setSuccessModalOpen(false)}
        />
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-1 border-b border-slate-200/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100/80">
            <FileText size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Assessments Entry</h1>
            {isEditingSubmitted && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md ml-2">
                ✏️ Editing Submitted Assessment #{assessmentId}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving || !(selectedCentreId && classId && assessmentTypeId)}
            className="h-9 inline-flex items-center gap-1.5 px-4 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            type="button"
            onClick={submitDraft}
            disabled={saving || !(selectedCentreId && classId && assessmentTypeId)}
            className={`h-9 inline-flex items-center gap-1.5 px-4 text-white text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer ${
              isEditingSubmitted ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <Send size={14} />
            {isEditingSubmitted ? 'Re-Publish to Dashboard' : 'Publish to Dashboard'}
          </button>
        </div>
      </div>

      {/* Control Filter Bar */}
      <AssessmentFilterBar
        academicYears={academicYears}
        selectedAcademicYear={selectedAcademicYear}
        onAcademicYearChange={setSelectedAcademicYear}
        centres={centres}
        selectedCentreId={selectedCentreId}
        onCentreChange={handleCentreChange}
        classes={classes}
        classId={classId}
        onClassChange={handleClassChange}
        types={types}
        assessmentTypeId={assessmentTypeId}
        onTypeChange={handleAssessmentTypeChange}
        maxMarks={maxMarks}
      />

      {/* Alerts */}
      {(error || notice) && (
        <div className={`p-3.5 rounded-xl text-xs font-medium flex items-start justify-between gap-2.5 ${
          error ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          <div className="flex items-start gap-2.5">
            {error ? <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" /> : <Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />}
            <div className="whitespace-pre-wrap">{error || notice}</div>
          </div>
          <button
            type="button"
            onClick={() => { setError(''); setNotice(''); }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 transition cursor-pointer"
            aria-label="Dismiss alert"
          >
            ✕
          </button>
        </div>
      )}

      {!(selectedCentreId && classId && assessmentTypeId) ? (
        <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-8 text-center space-y-3 shadow-2xs my-4">
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto font-bold shadow-xs">
            <Sparkles size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Select All Filters to Begin Assessment Entry</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Please select an <strong>Assessment Year</strong>, <strong>Centre</strong>, <strong>Class</strong>, and <strong>Exam</strong> in the control bar above to load students.
          </p>
        </div>
      ) : (
        <StudentAssessmentTable
          stats={stats}
          currentCentre={currentCentre}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          quickActionsOpen={quickActionsOpen}
          onToggleQuickActions={() => setQuickActionsOpen(!quickActionsOpen)}
          onLoadLastDraft={loadLastDraft}
          onSaveDraft={saveDraft}
          onClearCurrentEntries={clearCurrentEntries}
          filteredStudents={filteredStudents}
          studentData={studentData}
          subjects={subjects}
          maxMarks={maxMarks}
          expandedStudentId={expandedStudentId}
          onToggleExpandStudent={setExpandedStudentId}
          updateScore={updateScore}
          updateDiagnostic={updateDiagnostic}
          updateStudentData={updateStudentData}
          saveSingleStudent={saveSingleStudent}
          diagnostics={diagnostics}
          behaviours={behaviours}
        />
      )}
    </div>
  );
}