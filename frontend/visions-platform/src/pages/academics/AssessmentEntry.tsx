import { useEffect, useState, useMemo } from 'react';
import { Save, Send, Check, AlertCircle, Sparkles } from 'lucide-react';
import {
  createAssessment, fetchAssessmentTypes, fetchDiagnosticOptions, fetchLearningBehaviours,
  fetchStudents, fetchSubjects, fetchAttendanceCentres, saveAssessmentBehaviours, saveAssessmentDiagnostics,
  saveAssessmentObservation, saveAssessmentScores, submitAssessment, reopenAssessment,
  fetchAssessments, fetchAssessmentScores, fetchAssessmentDiagnostics,
  fetchAssessmentBehaviours, fetchAssessmentObservations,
  type AssessmentType, type DiagnosticOptions, type LearningBehaviourOption,
  type AttendanceCentre, type StudentListItem, type Subject,
} from '../../lib/api';
import { DraftPromptModal } from './components/assessment-entry/DraftPromptModal';
import { SubmittedPromptModal } from './components/assessment-entry/SubmittedPromptModal';
import { SuccessModal, type SuccessDetails } from './components/assessment-entry/SuccessModal';
import { AssessmentFilterBar } from './components/assessment-entry/AssessmentFilterBar';
import { StudentAssessmentTable, type StatusFilter } from './components/assessment-entry/StudentAssessmentTable';
import { type StudentAssessmentData } from './components/assessment-entry/ExpandedStudentCard';

const newStudentData = (): StudentAssessmentData => ({
  scores: {},
  diagnostics: {},
  behaviour: 'INDEPENDENT',
  keyImprovements: '',
  subjectsNeedingSupport: '',
  interventionPlan: '',
  comments: '',
});

export default function AssessmentEntry() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [centres, setCentres] = useState<AttendanceCentre[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState<string>('');
  const [types, setTypes] = useState<AssessmentType[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticOptions | null>(null);
  const [behaviours, setBehaviours] = useState<LearningBehaviourOption[]>([]);

  // Form controls
  const [classId, setClassId] = useState<number | ''>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [assessmentTypeId, setAssessmentTypeId] = useState<number | ''>('');
  const [term, setTerm] = useState('');
  const [assessmentDate, setAssessmentDate] = useState('2026-08-29');

  const getTermsForType = (typeId: number | ''): string[] => {
    if (!typeId) return [];
    const selectedType = types.find((t) => t.id === typeId);
    const typeName = (selectedType?.name || selectedType?.code || '').toLowerCase();
    if (typeName.includes('quarter')) {
      return ['Q1', 'Q2', 'Q3', 'Q4'];
    }
    if (typeName.includes('half')) {
      return ['Term 1', 'Term 2'];
    }
    if (typeName.includes('annual')) {
      return ['Annual', 'Final Term'];
    }
    return ['Q1', 'Q2', 'Term 1', 'Annual'];
  };

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

  const handleSubjectChange = (newSubjectId: number | '') => {
    setSelectedSubjectId(newSubjectId);
    setNotice('');
    setError('');
  };

  const handleAssessmentTypeChange = (newTypeId: number | '') => {
    setAssessmentTypeId(newTypeId);
    setTerm('');
    setNotice('');
    setError('');
  };

  const handleTermChange = (newTerm: string) => {
    setTerm(newTerm);
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
  const [successDetails, setSuccessDetails] = useState<{
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
  } | null>(null);

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
      fetchAssessmentTypes(),
      fetchDiagnosticOptions(),
      fetchLearningBehaviours(),
    ])
      .then(([centreList, typeData, diagnosticData, behaviourData]) => {
        setCentres(centreList);
        setTypes(typeData);
        setDiagnostics(diagnosticData);
        setBehaviours(behaviourData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load assessment metadata'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch subjects lazily when classId changes
  useEffect(() => {
    if (!classId) {
      setSubjects([]);
      setSelectedSubjectId('');
      return;
    }
    fetchSubjects(Number(classId))
      .then((subjectData) => {
        setSubjects(subjectData);
      })
      .catch((err) => console.error('Failed to load subjects:', err));
  }, [classId]);

  // Fetch students lazily when classId and selectedCentreId are selected
  useEffect(() => {
    if (!classId || !selectedCentreId) {
      setStudents([]);
      setStudentData({});
      return;
    }
    fetchStudents(classId, selectedCentreId)
      .then((studentDataList) => {
        setStudents(studentDataList);
        const initialMap: Record<string, StudentAssessmentData> = {};
        studentDataList.forEach((s) => {
          initialMap[s.id] = newStudentData();
        });
        setStudentData(initialMap);
      })
      .catch((err) => console.error('Failed to load students:', err));
  }, [classId, selectedCentreId]);

  // Check draft / submitted assessment availability when ALL 5 fields are populated
  useEffect(() => {
    if (!selectedCentreId || !classId || !selectedSubjectId || !assessmentTypeId || !term) {
      setDraftPromptOpen(false);
      setDraftInfo(null);
      setSubmittedPromptOpen(false);
      setSubmittedAssessmentInfo(null);
      setAssessmentId(null);
      setIsEditingSubmitted(false);
      return;
    }
    checkDraftAvailable(selectedCentreId, Number(classId), Number(selectedSubjectId), Number(assessmentTypeId), term);
  }, [selectedCentreId, classId, selectedSubjectId, assessmentTypeId, term]);

  const checkDraftAvailable = async (
    targetCentreId: string,
    targetClassId: number | '',
    targetSubId: number | '',
    targetTypeId: number | '',
    targetTerm: string
  ) => {
    if (!targetCentreId || !targetClassId || !targetSubId || !targetTypeId || !targetTerm) {
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

    // 1. Check local storage draft
    const localKey = `assessment_draft_${targetCentreId}_${targetClassId}_${targetSubId}_${targetTypeId}_${targetTerm}`;
    const localDraft = localStorage.getItem(localKey);
    if (localDraft) {
      try {
        const parsed = JSON.parse(localDraft);
        const hasLocalData = parsed.studentData && Object.values(parsed.studentData).some((sd: any) => {
          const hasScore = sd.scores && sd.scores[targetSubId] !== undefined && sd.scores[targetSubId] !== '';
          const hasDiag = Boolean(sd.diagnostics && sd.diagnostics[targetSubId]?.understanding);
          return hasScore || hasDiag;
        });

        if (hasLocalData) {
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

    // 2. Check backend draft matching class, assessment type, AND term
    try {
      const allAssessments = await fetchAssessments({
        classId: targetClassId,
        centreId: targetCentreId || selectedCentreId || undefined,
        assessmentTypeId: targetTypeId || undefined,
        term: targetTerm || undefined,
        status: 'DRAFT',
      });

      const backendDraft = allAssessments[0];

      if (backendDraft) {
        setAssessmentId(backendDraft.id);

        // Fetch scores & diagnostics to check if this draft has any non-empty marks/diagnostics for targetSubId
        const [scoreRes, diagRes] = await Promise.all([
          fetchAssessmentScores(backendDraft.id).catch(() => null),
          fetchAssessmentDiagnostics(backendDraft.id).catch(() => null),
        ]);

        // Always merge existing backend scores so scores for other subjects are preserved
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

        const hasSubjectScore = Boolean(
          scoreRes?.students?.some((s: any) =>
            s.scores?.some(
              (sc: any) =>
                sc.subjectId === targetSubId &&
                sc.obtainedMarks !== '' &&
                sc.obtainedMarks !== null &&
                sc.obtainedMarks !== undefined
            )
          )
        );

        const hasSubjectDiag = Boolean(
          diagRes?.diagnostics?.some(
            (d: any) => d.subjectId === targetSubId && Boolean(d.understandingLevel)
          )
        );

        if (hasSubjectScore || hasSubjectDiag) {
          setDraftInfo({
            label: `Saved draft on server (Assessment #${backendDraft.id} - ${backendDraft.assessmentType} ${backendDraft.term})`,
          });
          setDraftPromptOpen(true);
        } else {
          // Assessment container exists, but no marks or diagnostics yet for this specific subject
          setDraftPromptOpen(false);
          setDraftInfo(null);
        }
      } else {
        // No draft exists – also check for SUBMITTED assessments that can be edited
        try {
          const submittedAssessments = await fetchAssessments({
            classId: targetClassId,
            centreId: targetCentreId || selectedCentreId || undefined,
            assessmentTypeId: targetTypeId || undefined,
            term: targetTerm || undefined,
            status: 'SUBMITTED',
          });

          const submittedMatch = submittedAssessments[0];
          if (submittedMatch) {
            setSubmittedAssessmentInfo({
              id: submittedMatch.id,
              label: `${submittedMatch.assessmentType} ${submittedMatch.term} – ${submittedMatch.class}`,
            });
            setSubmittedPromptOpen(true);
          } else {
            setAssessmentId(null);
            setIsEditingSubmitted(false);
            const freshMap: Record<string, StudentAssessmentData> = {};
            students.forEach((s) => {
              freshMap[s.id] = newStudentData();
            });
            setStudentData(freshMap);
          }
        } catch {
          setAssessmentId(null);
          setIsEditingSubmitted(false);
          const freshMap: Record<string, StudentAssessmentData> = {};
          students.forEach((s) => {
            freshMap[s.id] = newStudentData();
          });
          setStudentData(freshMap);
        }
      }
    } catch (e) {
      // If error occurs, ensure entries are reset cleanly
      setAssessmentId(null);
      setIsEditingSubmitted(false);
      const freshMap: Record<string, StudentAssessmentData> = {};
      students.forEach((s) => {
        freshMap[s.id] = newStudentData();
      });
      setStudentData(freshMap);
    }
  };

  // Load submitted assessment for editing
  const loadSubmittedForEditing = async () => {
    if (!submittedAssessmentInfo) return;
    setSaving(true);
    setError('');
    setNotice('');
    setSubmittedPromptOpen(false);

    try {
      // Reopen the assessment (backend changes status to DRAFT)
      await reopenAssessment(submittedAssessmentInfo.id);
      setAssessmentId(submittedAssessmentInfo.id);
      setIsEditingSubmitted(true);

      // Load the existing data
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

  // Get selected subject details
  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId),
    [subjects, selectedSubjectId]
  );

  const maxMarks = selectedSubject?.maxMarks ?? 100;

  // Selected Centre object
  const currentCentre = useMemo(
    () => centres.find((c) => String(c.id) === selectedCentreId) || centres[0],
    [centres, selectedCentreId]
  );

  // Filter students strictly by Centre
  const centreStudents = useMemo(() => {
    if (!selectedCentreId || centres.length === 0) return students;
    const targetCentre = centres.find((c) => String(c.id) === selectedCentreId);
    const matched = students.filter((s) => {
      if (s.centreId !== undefined && s.centreId !== null) {
        return String(s.centreId) === selectedCentreId;
      }
      if (targetCentre && s.centre) {
        return s.centre.toLowerCase().includes(targetCentre.name.toLowerCase()) ||
          targetCentre.name.toLowerCase().includes(s.centre.toLowerCase());
      }
      return false;
    });

    if (matched.length === 0 && students.length > 0) {
      const centreIndex = centres.findIndex(c => String(c.id) === selectedCentreId);
      const chunkSize = Math.max(3, Math.ceil(students.length / Math.max(1, centres.length)));
      const start = (Math.max(0, centreIndex) * chunkSize) % students.length;
      return students.slice(start, start + chunkSize);
    }

    return matched;
  }, [students, selectedCentreId, centres]);

  // Compute completion stats for the selected Centre's students
  const stats = useMemo(() => {
    const total = centreStudents.length;
    let completed = 0;

    centreStudents.forEach((student) => {
      const data = studentData[student.id];
      if (data && selectedSubject) {
        const hasScore = data.scores[selectedSubject.id] !== undefined && data.scores[selectedSubject.id] !== '';
        const hasUnderstanding = data.diagnostics[selectedSubject.id]?.understanding;
        if (hasScore && hasUnderstanding) {
          completed++;
        }
      }
    });

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [centreStudents, studentData, selectedSubject]);

  // Filter centre students by Search and Status
  const filteredStudents = useMemo(() => {
    return centreStudents.filter((student) => {
      const matchesSearch = !searchQuery ||
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.id.toString().includes(searchQuery);

      if (!matchesSearch) return false;
      if (statusFilter === 'All') return true;

      const data = studentData[student.id];
      if (!data || !selectedSubject) return false;

      const hasScore = data.scores[selectedSubject.id] !== undefined && data.scores[selectedSubject.id] !== '';
      const hasUnderstanding = Boolean(data.diagnostics[selectedSubject.id]?.understanding);
      const isComplete = hasScore && hasUnderstanding;

      if (statusFilter === 'Completed') return isComplete;
      if (statusFilter === 'Incomplete') return !isComplete;
      if (statusFilter === 'Needs Attention') {
        const understanding = data.diagnostics[selectedSubject.id]?.understanding;
        return understanding === 'NOT_UNDERSTAND' || understanding === 'REPETITION';
      }

      return true;
    });
  }, [centreStudents, studentData, searchQuery, statusFilter, selectedSubject]);

  const updateStudentData = (studentId: string, update: Partial<StudentAssessmentData>) => {
    setStudentData((current) => ({
      ...current,
      [studentId]: {
        ...(current[studentId] ?? newStudentData()),
        ...update,
        lastUpdated: 'Today, Just now',
      },
    }));
  };

  const updateScore = (studentId: string, subjectId: number, value: number | '') => {
    const validVal = value === '' ? '' : Math.min(maxMarks, Math.max(0, value));
    updateStudentData(studentId, {
      scores: { ...(studentData[studentId]?.scores ?? {}), [subjectId]: validVal },
    });
  };

  const updateDiagnostic = (studentId: string, subjectId: number, field: 'understanding' | 'application' | 'interest', value: string) => {
    updateStudentData(studentId, {
      diagnostics: {
        ...(studentData[studentId]?.diagnostics ?? {}),
        [subjectId]: { ...(studentData[studentId]?.diagnostics[subjectId] ?? {}), [field]: value },
      },
    });
  };

  const getUnderstandingBadge = (studentId: string) => {
    if (!selectedSubject) return <span className="text-slate-400 font-normal text-xs">—</span>;
    const understanding = studentData[studentId]?.diagnostics[selectedSubject.id]?.understanding;

    if (understanding === 'CLEAR') {
      return (
        <span className="inline-flex items-center gap-1.5 font-medium text-xs text-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Understands
        </span>
      );
    }
    if (understanding === 'REPETITION') {
      return (
        <span className="inline-flex items-center gap-1.5 font-medium text-xs text-amber-700">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Needs Improvement
        </span>
      );
    }
    if (understanding === 'NOT_UNDERSTAND') {
      return (
        <span className="inline-flex items-center gap-1.5 font-medium text-xs text-rose-700">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          Needs Support
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-normal">
        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
        Not Assessed
      </span>
    );
  };

  // Load last saved draft
  const loadLastDraft = async () => {
    if (!selectedSubject) return;
    setSaving(true);
    setError('');
    setNotice('');
    setDraftPromptOpen(false);
    setQuickActionsOpen(false);

    try {
      let loaded = false;
      let draftLabel = '';
      const mergedData = { ...studentData };

      // 1. Try to load from backend assessments
      const allAssessments = await fetchAssessments({
        classId: Number(classId),
        assessmentTypeId: assessmentTypeId || undefined,
        term: term || undefined,
        status: 'DRAFT',
      }).catch(() => []);

      const backendDraft = allAssessments[0];

      if (backendDraft) {
        setAssessmentId(backendDraft.id);
        const [scoreRes, diagRes, behavRes, obsRes] = await Promise.all([
          fetchAssessmentScores(backendDraft.id).catch(() => null),
          fetchAssessmentDiagnostics(backendDraft.id).catch(() => null),
          fetchAssessmentBehaviours(backendDraft.id).catch(() => null),
          fetchAssessmentObservations(backendDraft.id).catch(() => null),
        ]);

        // Merge backend scores
        scoreRes?.students?.forEach((s: any) => {
          const sid = String(s.studentId);
          if (!mergedData[sid]) mergedData[sid] = newStudentData();
          s.scores?.forEach((sc: any) => {
            mergedData[sid].scores[sc.subjectId] = sc.obtainedMarks;
          });
        });

        // Merge backend diagnostics
        diagRes?.diagnostics?.forEach((d: any) => {
          const sid = String(d.studentId);
          if (!mergedData[sid]) mergedData[sid] = newStudentData();
          if (!mergedData[sid].diagnostics[d.subjectId]) {
            mergedData[sid].diagnostics[d.subjectId] = { understanding: '', application: '', interest: '' };
          }
          mergedData[sid].diagnostics[d.subjectId] = {
            understanding: d.understandingLevel || '',
            application: d.applicationAbility || '',
            interest: d.interestLevel || '',
          };
        });

        // Merge behaviours
        behavRes?.students?.forEach((b: any) => {
          const sid = String(b.studentId);
          if (!mergedData[sid]) mergedData[sid] = newStudentData();
          mergedData[sid].behaviour = b.behaviour || 'INDEPENDENT';
        });

        // Merge observations
        obsRes?.students?.forEach((o: any) => {
          const sid = String(o.studentId);
          if (!mergedData[sid]) mergedData[sid] = newStudentData();
          mergedData[sid].keyImprovements = o.keyImprovements || '';
          mergedData[sid].subjectsNeedingSupport = o.subjectsNeedingSupport || '';
          mergedData[sid].interventionPlan = o.interventionPlan || '';
          mergedData[sid].comments = o.comments || '';
        });

        // Check if any subject-specific data was loaded
        const hasBackendData = scoreRes?.students?.some((s: any) =>
          s.scores?.some((sc: any) => sc.subjectId === selectedSubject.id && sc.obtainedMarks !== '' && sc.obtainedMarks !== null)
        ) || diagRes?.diagnostics?.some((d: any) => d.subjectId === selectedSubject.id && Boolean(d.understandingLevel));

        if (hasBackendData) {
          loaded = true;
          draftLabel = `Server Draft (${backendDraft.assessmentType} ${backendDraft.term})`;
        }
      }

      // 2. Also check local storage
      const localKey = `assessment_draft_${selectedCentreId}_${classId}_${selectedSubject.id}_${assessmentTypeId}_${term}`;
      const localSaved = localStorage.getItem(localKey);
      if (localSaved) {
        try {
          const parsed = JSON.parse(localSaved);
          if (parsed.studentData) {
            let hasLocalSubjectData = false;
            Object.keys(parsed.studentData).forEach((sid) => {
              const sd = parsed.studentData[sid];
              if (
                (sd?.scores && sd.scores[selectedSubject.id] !== undefined && sd.scores[selectedSubject.id] !== '') ||
                Boolean(sd?.diagnostics && sd.diagnostics[selectedSubject.id]?.understanding)
              ) {
                hasLocalSubjectData = true;
              }
              mergedData[sid] = {
                ...(mergedData[sid] ?? newStudentData()),
                ...parsed.studentData[sid],
              };
            });
            if (hasLocalSubjectData) {
              loaded = true;
              draftLabel = parsed.savedAt ? `Saved at ${parsed.savedAt}` : 'Local Draft';
            }
          }
        } catch (e) {
          console.error('Failed to parse local draft:', e);
        }
      }

      if (loaded) {
        setStudentData(mergedData);
        setNotice(`Successfully loaded last saved draft for ${currentCentre?.name || 'Centre'}, Class ${classId} - ${selectedSubject.name}.`);
      } else {
        setNotice(`No saved draft entries found for ${currentCentre?.name || 'Centre'}, Class ${classId} - ${selectedSubject.name}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load draft');
    } finally {
      setSaving(false);
    }
  };

  const saveSingleStudent = async (studentId: string) => {
    if (!selectedSubject) return;
    try {
      const sData = studentData[studentId];
      if (!sData) return;

      const hasScore = sData.scores[selectedSubject.id] !== undefined && sData.scores[selectedSubject.id] !== '';
      const diag = sData.diagnostics[selectedSubject.id];
      const hasDiag = Boolean(diag?.understanding);
      const hasObs = Boolean(sData.keyImprovements || sData.subjectsNeedingSupport || sData.interventionPlan || sData.comments);

      if (!hasScore && !hasDiag && !hasObs) {
        return;
      }

      let id = assessmentId;
      if (!id) {
        const result = await createAssessment({
          academicYearId: new Date().getFullYear(),
          classId: Number(classId),
          assessmentTypeId: Number(assessmentTypeId || 1),
          term,
          assessmentDate,
          centreId: selectedCentreId ? Number(selectedCentreId) : undefined,
        });
        id = result.id;
        setAssessmentId(id);
      }

      // 1. Save score only if explicitly entered
      if (hasScore) {
        await saveAssessmentScores(id, [{
          studentId: Number(studentId),
          scores: [{ subjectId: selectedSubject.id, obtainedMarks: Number(sData.scores[selectedSubject.id]) }]
        }]);
      }

      // 2. Save diagnostic only if entered
      if (hasDiag) {
        await saveAssessmentDiagnostics(id, [{
          studentId: Number(studentId),
          subjectId: selectedSubject.id,
          understandingLevel: diag?.understanding || 'CLEAR',
          applicationAbility: diag?.application || 'APPLIES',
          interestLevel: diag?.interest || 'INTERESTED',
        }]);
      }

      // 3. Save behaviour
      if (sData.behaviour) {
        await saveAssessmentBehaviours(id, [{
          studentId: Number(studentId),
          behaviour: sData.behaviour,
        }]);
      }

      // 4. Save observation if provided
      if (hasObs) {
        await saveAssessmentObservation(id, Number(studentId), {
          keyImprovements: sData.keyImprovements || '',
          subjectsNeedingSupport: sData.subjectsNeedingSupport || '',
          interventionPlan: sData.interventionPlan || '',
          comments: sData.comments || '',
        });
      }

      // Sync local cache
      const localKey = `assessment_draft_${selectedCentreId}_${classId}_${selectedSubject.id}_${assessmentTypeId}_${term}`;
      localStorage.setItem(localKey, JSON.stringify({
        centreId: selectedCentreId,
        classId,
        subjectId: selectedSubject.id,
        assessmentTypeId,
        term,
        studentData,
        savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
    } catch (e) {
      console.error('Failed to auto-save student:', e);
    }
  };

  const saveDraft = async () => {
    if (!assessmentTypeId || !selectedSubject) {
      return setError('Please select assessment type and subject before saving.');
    }

    // Guard: Don't save draft if no marks or diagnostics have been entered for this subject
    const hasAnySubjectData = centreStudents.some((s) => {
      const d = studentData[s.id];
      if (!d) return false;
      const hasScore = d.scores[selectedSubject.id] !== undefined && d.scores[selectedSubject.id] !== '';
      const hasDiag = Boolean(d.diagnostics[selectedSubject.id]?.understanding);
      return hasScore || hasDiag;
    });

    if (!hasAnySubjectData) {
      setError(`Cannot save draft: No marks or diagnostics have been entered for ${selectedSubject.name}.`);
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    setQuickActionsOpen(false);

    try {
      let id = assessmentId;
      if (!id) {
        const result = await createAssessment({
          academicYearId: new Date().getFullYear(),
          classId: Number(classId),
          assessmentTypeId: Number(assessmentTypeId),
          term,
          assessmentDate,
          centreId: selectedCentreId ? Number(selectedCentreId) : undefined,
        });
        id = result.id;
        setAssessmentId(id);
      }

      // Save scores for all active centre students
      const scoresPayload = centreStudents.map((s) => ({
        studentId: Number(s.id),
        scores: subjects
          .filter((sub) => studentData[s.id]?.scores[sub.id] !== undefined && studentData[s.id]?.scores[sub.id] !== '')
          .map((sub) => ({ subjectId: sub.id, obtainedMarks: Number(studentData[s.id].scores[sub.id]) })),
      })).filter((s) => s.scores.length > 0);

      if (scoresPayload.length > 0) {
        await saveAssessmentScores(id, scoresPayload);
      }

      // Save diagnostics for all assessed subjects
      const diagnosticsPayload: Array<Record<string, number | string>> = [];
      centreStudents.forEach((s) => {
        const d = studentData[s.id];
        if (!d) return;
        subjects.forEach((sub) => {
          const diag = d.diagnostics[sub.id];
          const hasScore = d.scores[sub.id] !== undefined && d.scores[sub.id] !== '';
          if (diag?.understanding || hasScore) {
            diagnosticsPayload.push({
              studentId: Number(s.id),
              subjectId: sub.id,
              understandingLevel: diag?.understanding || 'CLEAR',
              applicationAbility: diag?.application || 'APPLIES',
              interestLevel: diag?.interest || 'INTERESTED',
            });
          }
        });
      });

      if (diagnosticsPayload.length > 0) {
        await saveAssessmentDiagnostics(id, diagnosticsPayload);
      }

      // Save behaviours for all assessed students
      const behavioursPayload = centreStudents
        .filter((s) => studentData[s.id]?.behaviour)
        .map((s) => ({
          studentId: Number(s.id),
          behaviour: studentData[s.id]?.behaviour || 'INDEPENDENT',
        }));

      if (behavioursPayload.length > 0) {
        await saveAssessmentBehaviours(id, behavioursPayload);
      }

      // Save observations only for students who have entered observations
      const observationPromises = centreStudents
        .filter((s) => {
          const d = studentData[s.id];
          return Boolean(d?.keyImprovements || d?.subjectsNeedingSupport || d?.interventionPlan || d?.comments);
        })
        .map((s) => {
          const d = studentData[s.id];
          return saveAssessmentObservation(id, Number(s.id), {
            keyImprovements: d?.keyImprovements || '',
            subjectsNeedingSupport: d?.subjectsNeedingSupport || '',
            interventionPlan: d?.interventionPlan || '',
            comments: d?.comments || '',
          });
        });

      if (observationPromises.length > 0) {
        await Promise.all(observationPromises);
      }

      // Persist to local storage draft
      const localKey = `assessment_draft_${selectedCentreId}_${classId}_${selectedSubject.id}_${assessmentTypeId}_${term}`;
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      localStorage.setItem(localKey, JSON.stringify({
        centreId: selectedCentreId,
        classId,
        subjectId: selectedSubject.id,
        assessmentTypeId,
        term,
        studentData,
        savedAt: nowTime,
      }));

      setNotice(`Draft saved successfully for ${currentCentre?.name || 'Centre'}, Class ${classId}, ${selectedSubject.name} at ${nowTime}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const clearCurrentEntries = () => {
    if (window.confirm(`Are you sure you want to clear all entered data for ${currentCentre?.name || 'Centre'}, Class ${classId} - ${selectedSubject?.name}?`)) {
      const resetMap: Record<string, StudentAssessmentData> = {};
      centreStudents.forEach((s) => {
        resetMap[s.id] = newStudentData();
      });
      setStudentData(resetMap);
      setNotice(`Cleared entries for ${selectedSubject?.name}.`);
      setQuickActionsOpen(false);
    }
  };

  const submitDraft = async () => {
    setError('');
    setNotice('');
    setSaving(true);

    try {
      let id = assessmentId;
      if (!id) {
        const allAssessments = await fetchAssessments({
          classId: Number(classId),
          assessmentTypeId: assessmentTypeId || undefined,
          term: term || undefined,
          status: 'DRAFT',
        }).catch(() => []);
        if (allAssessments[0]) {
          id = allAssessments[0].id;
          setAssessmentId(id);
        }
      }

      // Sync backend scores into studentData before checking missing subjects
      let currentData = { ...studentData };
      if (id) {
        const scoreRes = await fetchAssessmentScores(id).catch(() => null);
        if (scoreRes?.students) {
          scoreRes.students.forEach((s: any) => {
            const sid = String(s.studentId);
            if (!currentData[sid]) currentData[sid] = newStudentData();
            s.scores?.forEach((sc: any) => {
              if (sc.obtainedMarks !== '' && sc.obtainedMarks !== null && sc.obtainedMarks !== undefined) {
                currentData[sid].scores[sc.subjectId] = sc.obtainedMarks;
              }
            });
          });
          setStudentData(currentData);
        }
      }

      // Verify that every subject for this class has scores entered
      const missingSubjects = subjects.filter((sub) => {
        const hasAnyScore = centreStudents.some(
          (s) => currentData[s.id]?.scores[sub.id] !== undefined && currentData[s.id]?.scores[sub.id] !== ''
        );
        return !hasAnyScore;
      });

      if (missingSubjects.length > 0) {
        const missingNames = missingSubjects.map((s) => s.name).join(', ');
        const selectedTypeObj = types.find((t) => t.id === assessmentTypeId);
        const typeName = selectedTypeObj?.name || 'Quarterly';
        setError(
          `Not all subjects for Class ${classId} (Type: ${typeName}, Term: ${term}) have been completed (Missing: ${missingNames}). Please save progress as draft instead.`
        );
        setSaving(false);
        return;
      }

      if (!id) {
        const result = await createAssessment({
          academicYearId: new Date().getFullYear(),
          classId: Number(classId),
          assessmentTypeId: Number(assessmentTypeId || 1),
          term,
          assessmentDate,
          centreId: selectedCentreId ? Number(selectedCentreId) : undefined,
        });
        id = result.id;
        setAssessmentId(id);
      }

      // 1. Save scores for all students and subjects
      const scoresPayload = centreStudents
        .map((s) => ({
          studentId: Number(s.id),
          scores: subjects
            .filter((sub) => currentData[s.id]?.scores[sub.id] !== undefined && currentData[s.id]?.scores[sub.id] !== '')
            .map((sub) => ({ subjectId: sub.id, obtainedMarks: Number(currentData[s.id].scores[sub.id]) })),
        }))
        .filter((s) => s.scores.length > 0);

      if (scoresPayload.length > 0) {
        await saveAssessmentScores(id, scoresPayload);
      }

      // 2. Save diagnostics for all assessed subjects
      const diagnosticsPayload: Array<Record<string, number | string>> = [];
      centreStudents.forEach((s) => {
        const d = currentData[s.id];
        if (!d) return;
        subjects.forEach((sub) => {
          const diag = d.diagnostics[sub.id];
          const hasScore = d.scores[sub.id] !== undefined && d.scores[sub.id] !== '';
          if (diag?.understanding || hasScore) {
            diagnosticsPayload.push({
              studentId: Number(s.id),
              subjectId: sub.id,
              understandingLevel: diag?.understanding || 'CLEAR',
              applicationAbility: diag?.application || 'APPLIES',
              interestLevel: diag?.interest || 'INTERESTED',
            });
          }
        });
      });

      if (diagnosticsPayload.length > 0) {
        await saveAssessmentDiagnostics(id, diagnosticsPayload);
      }

      // 3. Save behaviours
      const behavioursPayload = centreStudents
        .filter((s) => currentData[s.id]?.behaviour)
        .map((s) => ({
          studentId: Number(s.id),
          behaviour: currentData[s.id]?.behaviour || 'INDEPENDENT',
        }));

      if (behavioursPayload.length > 0) {
        await saveAssessmentBehaviours(id, behavioursPayload);
      }

      // 4. Save observations
      const observationPromises = centreStudents
        .filter((s) => {
          const d = currentData[s.id];
          return Boolean(d?.keyImprovements || d?.subjectsNeedingSupport || d?.interventionPlan || d?.comments);
        })
        .map((s) => {
          const d = currentData[s.id];
          return saveAssessmentObservation(id, Number(s.id), {
            keyImprovements: d?.keyImprovements || 'Good problem solving and class participation.',
            subjectsNeedingSupport: d?.subjectsNeedingSupport || 'No specific support needed',
            interventionPlan: d?.interventionPlan || 'Continue standard classroom practice and periodic revision.',
            comments: d?.comments || '',
          });
        });

      if (observationPromises.length > 0) {
        await Promise.all(observationPromises);
      }

      // 5. Perform final submission
      const result = await submitAssessment(id);

      // Clean up local storage drafts for this assessment
      subjects.forEach((sub) => {
        const localKey = `assessment_draft_${selectedCentreId}_${classId}_${sub.id}_${assessmentTypeId}_${term}`;
        localStorage.removeItem(localKey);
      });
      setDraftPromptOpen(false);
      setDraftInfo(null);

      const wasEditing = isEditingSubmitted;
      setIsEditingSubmitted(false);
      setSubmittedAssessmentInfo(null);

      const typeObj = types.find((t) => t.id === Number(assessmentTypeId));
      const readableTime = formatReadableDateTime(result.submittedAt);

      setSuccessDetails({
        title: wasEditing ? 'Assessment Updated Successfully!' : 'Assessment Submitted Successfully!',
        message: wasEditing
          ? 'The assessment marks and observations have been re-submitted and saved.'
          : 'All marks, diagnostics, and observations have been recorded and saved.',
        assessmentId: id,
        centreName: currentCentre?.name || 'Centre',
        className: `Class ${classId}`,
        term,
        typeName: typeObj?.name || 'Quarterly',
        submittedAt: readableTime,
        studentCount: centreStudents.length,
        isResubmission: wasEditing,
      });
      setSuccessModalOpen(true);
      setNotice(wasEditing ? 'Assessment updated and re-submitted.' : 'Assessment submitted successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assessment submission failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Loading assessment module...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12 font-sans text-slate-900">
      {/* Submission Success Confirmation Modal */}
      <SuccessModal
        isOpen={successModalOpen}
        details={successDetails}
        onClose={() => setSuccessModalOpen(false)}
      />

      {/* Draft Resume Modal Prompt */}
      <DraftPromptModal
        isOpen={draftPromptOpen}
        centre={currentCentre}
        classId={classId}
        subject={selectedSubject}
        onDismiss={() => setDraftPromptOpen(false)}
        onLoadDraft={loadLastDraft}
      />

      {/* Submitted Assessment Edit Prompt Modal */}
      <SubmittedPromptModal
        isOpen={submittedPromptOpen}
        info={submittedAssessmentInfo}
        saving={saving}
        onDismiss={() => { setSubmittedPromptOpen(false); setSubmittedAssessmentInfo(null); }}
        onLoadSubmitted={loadSubmittedForEditing}
      />

      {/* Top Bar: Title & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-1 border-b border-slate-200/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Assessments Entry</h1>
            {isEditingSubmitted && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                ✏️ Editing Submitted Assessment #{assessmentId}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons (Save Draft + Submit Assessment) */}
        <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving || !(selectedCentreId && classId && selectedSubjectId && assessmentTypeId && term)}
            className="h-8 inline-flex items-center gap-1.5 px-3.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
          >
            <Save size={13} />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            type="button"
            onClick={submitDraft}
            disabled={saving || !(selectedCentreId && classId && selectedSubjectId && assessmentTypeId && term)}
            className={`h-8 inline-flex items-center gap-1.5 px-4 text-white text-xs font-semibold rounded-lg transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer ${isEditingSubmitted ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
          >
            <Send size={13} />
            {isEditingSubmitted ? 'Re-Submit Assessment' : 'Submit Assessment'}
          </button>
        </div>
      </div>

      {/* Control Filter Bar with all selection pills */}
      <AssessmentFilterBar
        centres={centres}
        selectedCentreId={selectedCentreId}
        onCentreChange={handleCentreChange}
        classId={classId}
        onClassChange={handleClassChange}
        subjects={subjects}
        selectedSubjectId={selectedSubjectId}
        onSubjectChange={handleSubjectChange}
        types={types}
        assessmentTypeId={assessmentTypeId}
        onTypeChange={handleAssessmentTypeChange}
        term={term}
        onTermChange={handleTermChange}
        getTermsForType={getTermsForType}
        maxMarks={maxMarks}
      />

      {/* Alerts */}
      {(error || notice) && (
        <div className={`p-3.5 rounded-xl text-sm flex items-start justify-between gap-2.5 ${error ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}>
          <div className="flex items-start gap-2.5">
            {error ? <AlertCircle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" /> : <Check size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />}
            <div className="whitespace-pre-wrap">{error || notice}</div>
          </div>
          <button
            type="button"
            onClick={() => { setError(''); setNotice(''); }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 transition cursor-pointer"
            aria-label="Dismiss alert"
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
        </div>
      )}

      {!(selectedCentreId && classId && selectedSubjectId && assessmentTypeId && term) ? (
        <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-8 text-center space-y-3 shadow-2xs my-4">
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto font-bold shadow-xs">
            <Sparkles size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Select All Filters to Begin Assessment Entry</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Please select a <strong>Centre</strong>, <strong>Class</strong>, <strong>Subject</strong>, <strong>Assessment Type</strong>, and <strong>Term</strong> in the control bar above to load students and check for saved drafts or previous assessments.
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
          selectedSubject={selectedSubject}
          maxMarks={maxMarks}
          expandedStudentId={expandedStudentId}
          onToggleExpandStudent={setExpandedStudentId}
          updateScore={updateScore}
          updateDiagnostic={updateDiagnostic}
          updateStudentData={updateStudentData}
          saveSingleStudent={saveSingleStudent}
          diagnostics={diagnostics}
          behaviours={behaviours}
          getUnderstandingBadge={getUnderstandingBadge}
        />
      )}
    </div>
  );
}