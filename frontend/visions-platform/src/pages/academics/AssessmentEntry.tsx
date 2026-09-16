import { useEffect, useState, useMemo, Fragment } from 'react';
import { 
  Save, Send, Search, ChevronDown, ChevronUp, X, ArrowLeft, ArrowRight, 
  Sparkles, CheckCircle2, Check, AlertCircle, RotateCcw, FolderDown, Trash2
} from 'lucide-react';
import {
  createAssessment, fetchAssessmentTypes, fetchDiagnosticOptions, fetchLearningBehaviours,
  fetchStudents, fetchSubjects, fetchAttendanceCentres, saveAssessmentBehaviours, saveAssessmentDiagnostics,
  saveAssessmentObservation, saveAssessmentScores, submitAssessment,
  fetchAssessments, fetchAssessmentScores, fetchAssessmentDiagnostics,
  fetchAssessmentBehaviours, fetchAssessmentObservations,
  type AssessmentType, type DiagnosticOptions, type LearningBehaviourOption,
  type AttendanceCentre, type StudentListItem, type Subject,
} from '../../lib/api';

interface StudentAssessmentData {
  scores: Record<number, number | ''>;
  diagnostics: Record<number, { understanding: string; application: string; interest: string }>;
  behaviour: string;
  keyImprovements: string;
  subjectsNeedingSupport: string;
  interventionPlan: string;
  comments: string;
  lastUpdated?: string;
}

type StatusFilter = 'All' | 'Incomplete' | 'Completed' | 'Needs Attention';

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
  const [classId, setClassId] = useState(6);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [assessmentTypeId, setAssessmentTypeId] = useState<number | ''>('');
  const [sectionId, setSectionId] = useState(1);
  const [term, setTerm] = useState('Q1');
  const [assessmentDate, setAssessmentDate] = useState('2026-08-29');

  const getTermsForType = (typeId: number | ''): string[] => {
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

  const handleAssessmentTypeChange = (newTypeId: number) => {
    setAssessmentTypeId(newTypeId);
    const availableTerms = getTermsForType(newTypeId);
    const newTerm = availableTerms.length > 0 ? availableTerms[0] : term;
    setTerm(newTerm);
    setNotice('');
    setError('');
    setDraftPromptOpen(false);
    setDraftInfo(null);
    checkDraftAvailable(selectedCentreId, classId, selectedSubjectId, newTypeId, newTerm);
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

  // Initialize page metadata
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchStudents(classId),
      fetchAttendanceCentres(),
      fetchAssessmentTypes(),
      fetchDiagnosticOptions(),
      fetchLearningBehaviours(),
      fetchSubjects(classId),
    ])
      .then(([studentDataList, centreList, typeData, diagnosticData, behaviourData, subjectData]) => {
        setStudents(studentDataList);
        setCentres(centreList);
        const initialCentreId = String(centreList[0]?.id || '1');
        setSelectedCentreId(initialCentreId);
        setTypes(typeData);
        setDiagnostics(diagnosticData);
        setBehaviours(behaviourData);
        setSubjects(subjectData);
        const initialTypeId = typeData[0]?.id ?? '';
        setAssessmentTypeId(initialTypeId);
        const initialTerms = typeData[0]?.name?.toLowerCase().includes('quarter')
          ? ['Q1', 'Q2', 'Q3', 'Q4']
          : ['Term 1', 'Term 2', 'Annual'];
        const initialTerm = initialTerms[0] || 'Q1';
        setTerm(initialTerm);
        const initialSubjectId = subjectData[0]?.id ?? 1;
        if (subjectData.length > 0) setSelectedSubjectId(initialSubjectId);
        
        // Initial student map with standard defaults
        const initialMap: Record<string, StudentAssessmentData> = {};
        studentDataList.forEach((s) => {
          initialMap[s.id] = newStudentData();
        });
        setStudentData(initialMap);

        // Check if draft exists on initial load for this centre, class, subject, type and term
        checkDraftAvailable(initialCentreId, classId, initialSubjectId, initialTypeId, initialTerm);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load assessment metadata'))
      .finally(() => setLoading(false));
  }, [classId]);

  // Check for saved draft whenever centre, class, subject, type or term changes
  const checkDraftAvailable = async (
    targetCentreId: string,
    targetClassId: number,
    targetSubId: number | '',
    targetTypeId: number | '',
    targetTerm: string
  ) => {
    if (!targetSubId) return;
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
          // Assessment container exists, but no marks or diagnostics for this subject
          setDraftPromptOpen(false);
          setDraftInfo(null);
          const freshMap: Record<string, StudentAssessmentData> = {};
          students.forEach((s) => {
            freshMap[s.id] = newStudentData();
          });
          setStudentData(freshMap);
        }
      } else {
        // No draft exists for this combination
        setAssessmentId(null);
        const freshMap: Record<string, StudentAssessmentData> = {};
        students.forEach((s) => {
          freshMap[s.id] = newStudentData();
        });
        setStudentData(freshMap);
      }
    } catch (e) {
      // If error occurs, ensure entries are reset cleanly
      setAssessmentId(null);
      const freshMap: Record<string, StudentAssessmentData> = {};
      students.forEach((s) => {
        freshMap[s.id] = newStudentData();
      });
      setStudentData(freshMap);
    }
  };

  const handleCentreChange = (newCentreId: string) => {
    setSelectedCentreId(newCentreId);
    setNotice('');
    setError('');
    checkDraftAvailable(newCentreId, classId, selectedSubjectId, assessmentTypeId, term);
  };

  const handleSubjectChange = (newSubjectId: number) => {
    setSelectedSubjectId(newSubjectId);
    setNotice('');
    setError('');
    checkDraftAvailable(selectedCentreId, classId, newSubjectId, assessmentTypeId, term);
  };

  // Get selected subject details
  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId) || subjects[0],
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
        classId,
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
          academicYearId: 2026,
          classId,
          sectionId,
          assessmentTypeId: Number(assessmentTypeId || 1),
          term,
          assessmentDate,
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
          academicYearId: 2026,
          classId,
          sectionId,
          assessmentTypeId: Number(assessmentTypeId),
          term,
          assessmentDate,
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

    // Verify that every subject for this class has scores entered
    const missingSubjects = subjects.filter((sub) => {
      const hasAnyScore = centreStudents.some(
        (s) => studentData[s.id]?.scores[sub.id] !== undefined && studentData[s.id]?.scores[sub.id] !== ''
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
      return;
    }

    setSaving(true);

    try {
      let id = assessmentId;
      if (!id) {
        const result = await createAssessment({
          academicYearId: 2026,
          classId,
          sectionId,
          assessmentTypeId: Number(assessmentTypeId || 1),
          term,
          assessmentDate,
        });
        id = result.id;
        setAssessmentId(id);
      }

      // 1. Save scores for all students and subjects
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

      // 2. Save diagnostics for all assessed subjects
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

      // 3. Save behaviours
      const behavioursPayload = centreStudents
        .filter((s) => studentData[s.id]?.behaviour)
        .map((s) => ({
          studentId: Number(s.id),
          behaviour: studentData[s.id]?.behaviour || 'INDEPENDENT',
        }));

      if (behavioursPayload.length > 0) {
        await saveAssessmentBehaviours(id, behavioursPayload);
      }

      // 4. Save observations
      const observationPromises = centreStudents
        .filter((s) => {
          const d = studentData[s.id];
          return Boolean(d?.keyImprovements || d?.subjectsNeedingSupport || d?.interventionPlan || d?.comments);
        })
        .map((s) => {
          const d = studentData[s.id];
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

      setNotice(`Assessment #${id} submitted successfully at ${result.submittedAt || 'now'}.`);
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
      {/* Draft Resume Modal Prompt */}
      {draftPromptOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <FolderDown size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Saved Draft Available</h3>
                  <p className="text-xs text-slate-500 font-medium">{currentCentre?.name} &nbsp;•&nbsp; Class {classId} — {selectedSubject?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDraftPromptOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              A previously saved draft was found for <strong>{currentCentre?.name}</strong>, Class {classId} - {selectedSubject?.name} saved earlier. Would you like to load and resume your entries from this draft?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDraftPromptOpen(false)}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg transition"
              >
                Start Fresh / Dismiss
              </button>
              <button
                type="button"
                onClick={loadLastDraft}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                Load Saved Draft
              </button>
            </div>
          </div>
        </div>
      )}

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
          </div>
        </div>

        {/* Action Buttons (Save Draft + Submit Assessment) */}
        <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving}
            className="h-8 inline-flex items-center gap-1.5 px-3.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition shadow-2xs disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            <Save size={13} />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            type="button"
            onClick={submitDraft}
            disabled={saving}
            className="h-8 inline-flex items-center gap-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition shadow-xs disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            Submit Assessment
          </button>
        </div>
      </div>

      {/* Control Filter Bar with all selection pills */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {/* Centre Pill */}
          <div className="relative inline-flex items-center">
            <select
              value={selectedCentreId}
              onChange={(e) => handleCentreChange(e.target.value)}
              className="h-8 appearance-none bg-indigo-50/80 border border-indigo-300 text-indigo-950 pl-3 pr-7 rounded-lg text-xs font-bold hover:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs max-w-[175px] truncate"
              title="Select Centre"
            >
              {centres.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 text-indigo-700 pointer-events-none" />
          </div>

          {/* Class Pill */}
          <div className="relative inline-flex items-center">
            <select
              value={classId}
              onChange={(e) => {
                const newClass = Number(e.target.value);
                setClassId(newClass);
                setNotice('');
                setError('');
                checkDraftAvailable(selectedCentreId, newClass, selectedSubjectId, assessmentTypeId, term);
              }}
              className="h-8 appearance-none bg-white border border-slate-300 text-slate-700 pl-3 pr-7 rounded-lg text-xs font-semibold hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              {[5, 6, 7, 8, 9, 10].map((c) => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none" />
          </div>

          {/* Subject Pill */}
          <div className="relative inline-flex items-center">
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(Number(e.target.value))}
              className="h-8 appearance-none bg-white border border-slate-300 text-slate-700 pl-3 pr-7 rounded-lg text-xs font-semibold hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none" />
          </div>

          {/* Assessment Type Pill */}
          <div className="relative inline-flex items-center">
            <select
              value={assessmentTypeId}
              onChange={(e) => handleAssessmentTypeChange(Number(e.target.value))}
              className="h-8 appearance-none bg-white border border-slate-300 text-slate-700 pl-3 pr-7 rounded-lg text-xs font-semibold hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="">Select assessment</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none" />
          </div>

          {/* Term Pill */}
          <div className="relative inline-flex items-center">
            <select
              value={term}
              onChange={(e) => {
                const newTerm = e.target.value;
                setTerm(newTerm);
                setNotice('');
                setError('');
                setDraftPromptOpen(false);
                setDraftInfo(null);
                checkDraftAvailable(selectedCentreId, classId, selectedSubjectId, assessmentTypeId, newTerm);
              }}
              className="h-8 appearance-none bg-white border border-slate-300 text-slate-700 pl-3 pr-7 rounded-lg text-xs font-semibold hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              {getTermsForType(assessmentTypeId).map((t) => (
                <option key={t} value={t}>Term: {t}</option>
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

      {/* Alerts */}
      {(error || notice) && (
        <div className={`p-3.5 rounded-xl text-sm flex items-start justify-between gap-2.5 ${
          error ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
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
            <X size={15} />
          </button>
        </div>
      )}

      {/* Sub-Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-1">
        {/* Progress & Centre Label */}
        <div className="flex items-center gap-3">
          <span className="p-1 rounded bg-slate-100 text-slate-500">
            <CheckCircle2 size={16} className="text-slate-600" />
          </span>
          <span className="text-xs font-semibold text-slate-700">
            {stats.completed} of {stats.total} students completed
          </span>
          <div className="w-32 bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-600">{stats.percentage}%</span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium hidden sm:inline-block">
            {currentCentre?.name}
          </span>
        </div>

        {/* Search, Filter, Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 shadow-2xs"
            />
          </div>

          {/* Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-7 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="All">Filter: All</option>
              <option value="Incomplete">Filter: Incomplete</option>
              <option value="Completed">Filter: Completed</option>
              <option value="Needs Attention">Filter: Needs Attention</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Quick Actions Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setQuickActionsOpen(!quickActionsOpen)}
              className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            >
              <Sparkles size={13} className="text-slate-600" />
              Quick Actions
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {quickActionsOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20 text-xs font-medium text-slate-700">
                <button
                  onClick={loadLastDraft}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-800"
                >
                  <RotateCcw size={14} className="text-indigo-600" />
                  Load Last Saved Draft
                </button>
                <button
                  onClick={saveDraft}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-800"
                >
                  <Save size={14} className="text-indigo-600" />
                  Save Draft Now
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={clearCurrentEntries}
                  className="w-full text-left px-3.5 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-600"
                >
                  <Trash2 size={14} className="text-rose-500" />
                  Reset Current Entries
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gradebook Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-white">
                <th className="py-3 px-3 w-8 text-center">#</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Marks ( / {maxMarks}) <span className="text-rose-500 font-bold">*</span></th>
                <th className="py-3 px-4">Understanding / Narrative <span className="text-rose-500 font-bold">*</span></th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-3 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStudents.map((student, index) => {
                const data = studentData[student.id] ?? newStudentData();
                const score = selectedSubject ? (data.scores[selectedSubject.id] ?? '') : '';
                const isExpanded = expandedStudentId === student.id;

                return (
                  <Fragment key={student.id}>
                    <tr className={`hover:bg-slate-50/70 transition-colors ${isExpanded ? 'bg-slate-50/90' : ''}`}>
                      <td className="py-3.5 px-3 text-center text-xs text-slate-400 font-medium">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-amber-200">
                            {student.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-xs">
                              {student.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {student.centre || currentCentre?.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={maxMarks}
                            value={score}
                            onChange={(e) => updateScore(student.id, selectedSubject.id, e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-14 h-7 px-2 border border-slate-200 rounded-md text-xs font-semibold text-slate-800 text-center focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none bg-white"
                            placeholder="—"
                          />
                          <span className="text-xs text-slate-400 font-medium">/ {maxMarks}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {getUnderstandingBadge(student.id)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-normal whitespace-nowrap">
                        {data.lastUpdated || '—'}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Student Card Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="p-3 bg-indigo-50/20 border-y border-indigo-100">
                          <ExpandedStudentCard
                            student={student}
                            data={data}
                            subject={selectedSubject}
                            maxMarks={maxMarks}
                            diagnostics={diagnostics}
                            behaviours={behaviours}
                            onUpdate={(updates) => updateStudentData(student.id, updates)}
                            onScoreChange={(value) => updateScore(student.id, selectedSubject.id, value)}
                            onDiagnosticChange={(field, value) => updateDiagnostic(student.id, selectedSubject.id, field, value)}
                            onClose={() => setExpandedStudentId(null)}
                            filteredStudents={filteredStudents}
                            currentStudentIndex={filteredStudents.findIndex((s) => s.id === student.id)}
                            onNavigateStudent={async (targetId) => {
                              await saveSingleStudent(student.id);
                              setExpandedStudentId(targetId);
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs font-medium">
            No students found for {currentCentre?.name || 'this Centre'} matching your search or filters.
          </div>
        )}
      </div>
    </div>
  );
}

interface ExpandedStudentCardProps {
  student: StudentListItem;
  data: StudentAssessmentData;
  subject: Subject;
  maxMarks: number;
  diagnostics: DiagnosticOptions | null;
  behaviours: LearningBehaviourOption[];
  onUpdate: (updates: Partial<StudentAssessmentData>) => void;
  onScoreChange: (value: number | '') => void;
  onDiagnosticChange: (field: 'understanding' | 'application' | 'interest', value: string) => void;
  onClose: () => void;
  filteredStudents: StudentListItem[];
  currentStudentIndex: number;
  onNavigateStudent: (studentId: string) => void;
}

function ExpandedStudentCard({
  student,
  data,
  subject,
  maxMarks,
  diagnostics,
  behaviours,
  onUpdate,
  onScoreChange,
  onDiagnosticChange,
  onClose,
  filteredStudents,
  currentStudentIndex,
  onNavigateStudent,
}: ExpandedStudentCardProps) {
  const score = data.scores[subject?.id] ?? '';
  const subjectDiagnostics = data.diagnostics[subject?.id] || {};
  const currentUnderstanding = subjectDiagnostics.understanding || '';
  const currentBehaviour = data.behaviour || 'INDEPENDENT';

  const pillCardClass = (isActive: boolean, activeColor = 'border-indigo-500 bg-indigo-50/70 text-indigo-800') =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${isActive
      ? `${activeColor} shadow-2xs`
      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
    }`;

  return (
    <div className="bg-white border border-indigo-300 rounded-xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 border-2 border-amber-300 text-amber-900 font-bold flex items-center justify-center text-sm shadow-2xs">
            {student.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{student.name}</h3>
            <div className="text-xs text-slate-500 mt-0.5">
              Roll No. {student.id} &nbsp;•&nbsp; Class {student.class || '6'} - A &nbsp;•&nbsp; Student ID: STU{String(student.id).padStart(5, '0')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div className="text-xs text-slate-400">
            <div>{data.lastUpdated || 'Today, 11:20 AM'}</div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Row 1: Marks | Understanding / Diagnostics | Learning Behaviour */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
        {/* Col 1: Marks */}
        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
          <label className="text-xs font-semibold text-slate-700 block mb-2">
            Marks <span className="text-rose-500 font-bold">*</span> <span className="text-slate-400 font-normal">(Out of {maxMarks})</span>
          </label>
          <div className="flex items-baseline gap-2 mt-1">
            <input
              type="number"
              min="0"
              max={maxMarks}
              value={score}
              onChange={(e) => onScoreChange(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-24 h-11 px-3 border border-slate-300 rounded-lg text-lg font-bold text-slate-900 bg-white text-center focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none shadow-2xs"
              placeholder="0"
            />
            <span className="text-sm font-semibold text-slate-500">/ {maxMarks}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Enter a value between 0 and {maxMarks}</p>
        </div>

        {/* Col 2: Understanding / Diagnostic Levels */}
        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Understanding Level <span className="text-rose-500 font-bold">*</span>
            </label>
            <span className="text-slate-400 text-xs">ⓘ</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onDiagnosticChange('understanding', 'CLEAR')}
              className={pillCardClass(currentUnderstanding === 'CLEAR', 'border-emerald-500 bg-emerald-50 text-emerald-800')}
            >
              <span>👍</span> Understands
            </button>

            <button
              type="button"
              onClick={() => onDiagnosticChange('understanding', 'REPETITION')}
              className={pillCardClass(currentUnderstanding === 'REPETITION', 'border-amber-500 bg-amber-50 text-amber-800')}
            >
              <span>⚠️</span> Repetition
            </button>

            <button
              type="button"
              onClick={() => onDiagnosticChange('understanding', 'NOT_UNDERSTAND')}
              className={pillCardClass(currentUnderstanding === 'NOT_UNDERSTAND', 'border-rose-500 bg-rose-50 text-rose-800')}
            >
              <span>🚫</span> Needs Support
            </button>

            <button
              type="button"
              onClick={() => onDiagnosticChange('understanding', '')}
              className={pillCardClass(currentUnderstanding === '', 'border-slate-400 bg-slate-100 text-slate-700')}
            >
              <span>⊝</span> Not Assessed
            </button>
          </div>
        </div>

        {/* Col 3: Learning Behaviour */}
        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Learning Behaviour <span className="text-rose-500 font-bold">*</span>
            </label>
            <span className="text-slate-400 text-xs">👤</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onUpdate({ behaviour: 'INDEPENDENT' })}
              className={pillCardClass(currentBehaviour === 'INDEPENDENT', 'border-indigo-500 bg-indigo-50 text-indigo-800')}
            >
              <span>⭐</span> Independent
            </button>

            <button
              type="button"
              onClick={() => onUpdate({ behaviour: 'SUPERVISION' })}
              className={pillCardClass(currentBehaviour === 'SUPERVISION', 'border-amber-500 bg-amber-50 text-amber-800')}
            >
              <span>👀</span> Supervision
            </button>

            <button
              type="button"
              onClick={() => onUpdate({ behaviour: 'MOTIVATED' })}
              className={pillCardClass(currentBehaviour === 'MOTIVATED', 'border-indigo-500 bg-indigo-50 text-indigo-800')}
            >
              <span>🔥</span> Motivated
            </button>

            <button
              type="button"
              onClick={() => onUpdate({ behaviour: 'IRREGULAR' })}
              className={pillCardClass(currentBehaviour === 'IRREGULAR', 'border-rose-500 bg-rose-50 text-rose-800')}
            >
              <span>⏳</span> Irregular
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Strengths | Areas to Improve | Next Steps / Support Plan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
        {/* Strengths */}
        <div>
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">✓</span>
              <label className="text-xs font-bold text-slate-800">
                Strengths / Key Improvements <span className="text-rose-500 font-bold">*</span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => onUpdate({ keyImprovements: 'Active participation and strong concept retention' })}
              className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer underline"
            >
              Active learner
            </button>
          </div>
          <textarea
            value={data.keyImprovements}
            onChange={(e) => onUpdate({ keyImprovements: e.target.value })}
            placeholder="Good at problem solving, active class participation."
            rows={2}
            className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white resize-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 text-slate-700 placeholder-slate-400 shadow-2xs"
          />
        </div>

        {/* Areas to Improve */}
        <div>
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px]">○</span>
              <label className="text-xs font-bold text-slate-800">
                Areas to Improve <span className="text-rose-500 font-bold">*</span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => onUpdate({ subjectsNeedingSupport: 'No specific support needed' })}
              className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer underline"
            >
              No support needed
            </button>
          </div>
          <textarea
            value={data.subjectsNeedingSupport}
            onChange={(e) => onUpdate({ subjectsNeedingSupport: e.target.value })}
            placeholder="Needs practice in multi-step word problems..."
            rows={2}
            className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white resize-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 text-slate-700 placeholder-slate-400 shadow-2xs"
          />
        </div>

        {/* Next Steps / Support Plan */}
        <div>
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px]">✎</span>
              <label className="text-xs font-bold text-slate-800">
                Next Steps / Support Plan <span className="text-rose-500 font-bold">*</span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => onUpdate({ interventionPlan: 'Standard revision worksheets' })}
              className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer underline"
            >
              Standard practice
            </button>
          </div>
          <textarea
            value={data.interventionPlan}
            onChange={(e) => onUpdate({ interventionPlan: e.target.value })}
            placeholder="Provide extra practice worksheets on word problems and time conversions."
            rows={2}
            className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white resize-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 text-slate-700 placeholder-slate-400 shadow-2xs"
          />
        </div>
      </div>

      {/* Row 3: Teacher Comments */}
      <div className="bg-slate-50/40 p-3 rounded-xl border border-slate-100">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-slate-700">Teacher Comments <span className="text-slate-400 font-normal">(Optional general notes)</span></label>
          <span className="text-[11px] text-slate-400">{data.comments?.length || 0} / 300 characters</span>
        </div>
        <textarea
          value={data.comments}
          onChange={(e) => onUpdate({ comments: e.target.value.slice(0, 300) })}
          placeholder="Understands concepts well. Enthusiastic in classroom discussions..."
          rows={2}
          className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white resize-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 text-slate-700 placeholder-slate-400"
        />
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => {
            if (currentStudentIndex > 0) {
              onNavigateStudent(filteredStudents[currentStudentIndex - 1].id);
            }
          }}
          disabled={currentStudentIndex === 0}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
        >
          <ArrowLeft size={14} /> Previous Student
        </button>

        <div className="text-xs font-semibold text-slate-500">
          {currentStudentIndex + 1} of {filteredStudents.length} Students
        </div>

        <button
          type="button"
          onClick={() => {
            if (currentStudentIndex < filteredStudents.length - 1) {
              onNavigateStudent(filteredStudents[currentStudentIndex + 1].id);
            } else {
              onClose();
            }
          }}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-xs"
        >
          Save & Next Student <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}