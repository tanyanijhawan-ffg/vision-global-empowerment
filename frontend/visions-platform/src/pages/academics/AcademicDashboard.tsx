import { useState, useEffect, useMemo } from 'react';
import {
  Trophy, BookOpen, TrendingUp, AlertTriangle,
  MapPin, Globe, Award, UserCheck, Layers,
  Calendar, ChevronDown, GraduationCap
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import {
  fetchAssessments, fetchAssessmentStatistics, fetchAssessmentComparison,
  fetchSubjectComparison, fetchAssessmentScores, fetchAssessmentDiagnostics,
  fetchAssessmentBehaviours, fetchAssessmentObservations, fetchAttendanceCentres,
  fetchStudents, fetchSubjects, fetchAcademicYears, fetchCentrePerformanceReport,
  fetchSchoolClasses,
  type Assessment, type AttendanceCentre, type StudentListItem, type Subject,
  type AssessmentStatistics, type AcademicYear,
  type CentrePerformanceReportItem, type RegionComparisonReportItem,
  type SchoolClass
} from '../../lib/api';
import { getCurrentUser } from '../../lib/auth';

// Subcomponents for Academic Dashboard
import AcademicFilterBar from './components/academic-dashboard/AcademicFilterBar';
import ComparativeAnalyticsTab from './components/academic-dashboard/ComparativeAnalyticsTab';
import CentrePerformanceTab from './components/academic-dashboard/CentrePerformanceTab';
import RegionComparisonTab from './components/academic-dashboard/RegionComparisonTab';
import LowPerformersTab from './components/academic-dashboard/LowPerformersTab';
import StudentGradebookTab from './components/academic-dashboard/StudentGradebookTab';
import { PromoteStudentsModal } from './components/academic-dashboard/PromoteStudentsModal';

type ActiveReportTab = 'comparative' | 'centre-report' | 'region-report' | 'low-performers' | 'class-tracking';

const normalizeClass = (val?: string | number) => {
  if (!val) return '';
  return String(val).replace(/^(Class|Grade)[_\s]*/i, '').trim();
};

/**
 * AcademicDashboard Component
 *
 * Main orchestrator page for Academic Reports and Performance Analytics:
 * - 3-step Filter Header (Class -> Centre -> Assessment)
 * - Real-time statistics cards (Avg Score, Assessed Students, Top Performers, Needs Support)
 * - Tab 1: Comparative Analysis & Trends
 * - Tab 2: Centre-Wise Performance Report
 * - Tab 3: Region Comparison Report
 * - Tab 4: Low-Performing Students & Action Plans
 * - Tab 5: Subject-Wise Student Gradebook
 */
export default function AcademicDashboard() {
  const currentUser = getCurrentUser();
  const [activeTab, setActiveTab] = useState<ActiveReportTab>('comparative');

  // Backend Metadata & Records
  const [centres, setCentres] = useState<AttendanceCentre[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null);

  // Selection Workflow State
  const [filterClass, setFilterClass] = useState('');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);

  // Region / District / Centre Scope
  const [filterRegion] = useState(currentUser?.role === 'FACILITATOR' ? currentUser.region : '');
  const [filterDistrict] = useState('');
  const [filterCentre, setFilterCentre] = useState('');

  // Students fetched for the selected scope
  const [students, setStudents] = useState<StudentListItem[]>([]);

  // Assessment details & scores
  const [statistics, setStatistics] = useState<AssessmentStatistics | null>(null);
  const [comparison, setComparison] = useState<{ current: { percentage: number; assessment?: string }; previous: { percentage: number | null; assessment?: string }; change: { percentagePoints: number; trend: string } } | null>(null);
  const [subjectComparison, setSubjectComparison] = useState<Array<{ subject: string; previousPercentage: number | null; currentPercentage: number; change: number; trend: string }>>([]);
  const [scoresData, setScoresData] = useState<Array<{ studentId: number; studentName?: string; scores: Array<{ subjectId: number; subject?: string; obtainedMarks: number; maxMarks: number }>; percentage: number }>>([]);
  const [diagnosticsData, setDiagnosticsData] = useState<Array<{ studentId: number; subjectId: number; understandingLevel: string; applicationAbility: string; interestLevel: string }>>([]);
  const [observationsData, setObservationsData] = useState<Array<{ studentId: number; keyImprovements?: string; subjectsNeedingSupport?: string; interventionPlan?: string }>>([]);

  // Centre-wise and regional reports fetched across all learning centres
  const [centrePerformanceData, setCentrePerformanceData] = useState<CentrePerformanceReportItem[]>([]);
  const [regionPerformanceData, setRegionPerformanceData] = useState<RegionComparisonReportItem[]>([]);

  const [lowPerformerThreshold, setLowPerformerThreshold] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, setError] = useState('');

  // 1. Initial Load: Metadata (centres, academic years, classes)
  const loadInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [centresRes, yearsRes, classesRes] = await Promise.all([
        fetchAttendanceCentres().catch(() => []),
        fetchAcademicYears().catch(() => []),
        fetchSchoolClasses().catch(() => []),
      ]);
      setCentres(centresRes);
      setAcademicYears(yearsRes);
      setClasses(classesRes);
      if (yearsRes && yearsRes.length > 0) {
        const currentYear = yearsRes.find((y) => y.isCurrent) || yearsRes[0];
        if (currentYear) {
          setSelectedAcademicYearId((prev) => prev ?? currentYear.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metadata');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch subjects lazily ONLY when class is selected
  useEffect(() => {
    if (!filterClass) {
      setSubjects([]);
      return;
    }
    const classNum = Number(normalizeClass(filterClass));
    fetchSubjects(classNum)
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, [filterClass]);

  // 2. Fetch assessment list ONLY when both class and centre have been selected
  useEffect(() => {
    if (!filterClass || !filterCentre) {
      setAssessments([]);
      setSelectedAssessmentId(null);
      return;
    }

    const classNum = Number(normalizeClass(filterClass));
    let targetCentreId: number | undefined = undefined;
    const found = centres.find(c => c.name === filterCentre || String(c.id) === filterCentre);
    if (found) targetCentreId = found.id;

    setRefreshing(true);
    fetchAssessments({
      classId: classNum,
      centreId: targetCentreId,
      status: 'SUBMITTED',
      academicYearId: selectedAcademicYearId || undefined,
    })
      .then((res) => {
        const submitted = res.filter(a => a.status === 'SUBMITTED' || a.status === 'submitted');
        // Deduplicate assessments by academicYearId, assessmentTypeId / assessmentType, and classId / class
        const uniqueAssessments: Assessment[] = [];
        const seenTypeKeys = new Set<string>();
        for (const a of submitted) {
          const typeKey = `${a.academicYearId || a.academicYear}_${a.assessmentTypeId || a.assessmentType}_${a.classId || a.class}`;
          if (!seenTypeKeys.has(typeKey)) {
            seenTypeKeys.add(typeKey);
            uniqueAssessments.push(a);
          }
        }
        setAssessments(uniqueAssessments);
        if (uniqueAssessments.length > 0) {
          setSelectedAssessmentId(prev => (prev && uniqueAssessments.some(a => a.id === prev)) ? prev : uniqueAssessments[0].id);
        } else {
          setSelectedAssessmentId(null);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch assessments:', err);
        setAssessments([]);
        setSelectedAssessmentId(null);
      })
      .finally(() => setRefreshing(false));
  }, [filterClass, filterCentre, centres, selectedAcademicYearId]);

  // 3. Fetch scores, statistics, etc. ONLY when selectedAssessmentId changes
  useEffect(() => {
    if (!selectedAssessmentId) {
      setScoresData([]);
      setDiagnosticsData([]);
      setObservationsData([]);
      setStatistics(null);
      setComparison(null);
      setSubjectComparison([]);
      return;
    }

    setRefreshing(true);
    Promise.all([
      fetchAssessmentStatistics(selectedAssessmentId).catch(() => null),
      fetchAssessmentComparison(selectedAssessmentId).catch(() => null),
      fetchSubjectComparison(selectedAssessmentId).catch(() => []),
      fetchAssessmentScores(selectedAssessmentId).catch(() => null),
      fetchAssessmentDiagnostics(selectedAssessmentId).catch(() => null),
      fetchAssessmentBehaviours(selectedAssessmentId).catch(() => null),
      fetchAssessmentObservations(selectedAssessmentId).catch(() => null),
    ])
      .then(([statsRes, compRes, subjCompRes, scoresRes, diagRes, _behavRes, obsRes]) => {
        setStatistics(statsRes);
        setComparison(compRes as any);
        if (Array.isArray(subjCompRes)) setSubjectComparison(subjCompRes as any);
        if (scoresRes?.students) setScoresData(scoresRes.students);
        else setScoresData([]);
        if (diagRes?.diagnostics) setDiagnosticsData(diagRes.diagnostics);
        else setDiagnosticsData([]);
        if (obsRes?.students) setObservationsData(obsRes.students);
        else setObservationsData([]);
      })
      .finally(() => setRefreshing(false));
  }, [selectedAssessmentId]);

  // 4. Fetch student data ONLY after Class and Centre are selected
  useEffect(() => {
    if (!filterClass || !filterCentre) {
      setStudents([]);
      return;
    }

    let isMounted = true;
    const loadScopedStudents = async () => {
      let targetCentreId: number | undefined = undefined;
      const found = centres.find(c => c.name === filterCentre || String(c.id) === filterCentre);
      if (found) targetCentreId = found.id;

      const classNum = filterClass ? normalizeClass(filterClass) : undefined;
      const selectedYearName = academicYears.find(y => y.id === selectedAcademicYearId)?.name;
      try {
        const studentRes = await fetchStudents(classNum, targetCentreId, selectedYearName);
        if (isMounted) setStudents(studentRes);
      } catch (e) {
        console.error('Failed to fetch scoped students:', e);
        if (isMounted) setStudents([]);
      }
    };

    loadScopedStudents();
    return () => { isMounted = false; };
  }, [filterClass, filterCentre, centres, selectedAcademicYearId, academicYears]);

  // 5. Fetch centre-wise and regional performance reports across all learning centres
  useEffect(() => {
    if (!filterClass) {
      setCentrePerformanceData([]);
      setRegionPerformanceData([]);
      return;
    }

    let isMounted = true;
    const classNum = normalizeClass(filterClass);
    fetchCentrePerformanceReport(selectedAssessmentId, {
      classId: classNum,
      academicYearId: selectedAcademicYearId || undefined,
    })
      .then((res) => {
        if (!isMounted) return;
        if (res?.centres && Array.isArray(res.centres)) {
          setCentrePerformanceData(res.centres);
        } else {
          setCentrePerformanceData([]);
        }
        if (res?.regions && Array.isArray(res.regions)) {
          setRegionPerformanceData(res.regions);
        } else {
          setRegionPerformanceData([]);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch centre performance report:', err);
        if (isMounted) {
          setCentrePerformanceData([]);
          setRegionPerformanceData([]);
        }
      });

    return () => { isMounted = false; };
  }, [filterClass, selectedAssessmentId, selectedAcademicYearId]);

  const availableCentres = useMemo(() => {
    return centres;
  }, [centres]);

  const selectedCentreObj = useMemo(() => {
    return centres.find(c => c.name === filterCentre || String(c.id) === filterCentre);
  }, [centres, filterCentre]);

  const selectedAcademicYearObj = useMemo(() => {
    return academicYears.find(ay => ay.id === selectedAcademicYearId);
  }, [academicYears, selectedAcademicYearId]);

  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    centres.forEach(c => { if (c.region) set.add(c.region); });
    students.forEach(s => { if (s.region) set.add(s.region); });
    return Array.from(set);
  }, [centres, students]);

  // Map student scores from scoresData
  const studentScoresMap = useMemo(() => {
    const map = new Map<number, { percentage: number; scores: Record<number, number> }>();
    scoresData.forEach(s => {
      const subjectScores: Record<number, number> = {};
      s.scores?.forEach(sc => {
        if (sc.subjectId !== undefined) {
          subjectScores[sc.subjectId] = sc.obtainedMarks;
        }
      });
      map.set(Number(s.studentId), {
        percentage: Math.round(s.percentage),
        scores: subjectScores,
      });
    });
    return map;
  }, [scoresData]);

  // Filtered Students with real computed scores
  const filteredStudentsWithScores = useMemo(() => {
    const studentMap = new Map<number, StudentListItem>();

    students.forEach(s => {
      const sId = Number(s.id);
      studentMap.set(sId, s);
    });

    scoresData.forEach(sd => {
      const sId = Number(sd.studentId);
      if (!studentMap.has(sId)) {
        studentMap.set(sId, {
          id: String(sd.studentId),
          name: sd.studentName || `Student ${sd.studentId}`,
          region: filterRegion || '',
          centre: filterCentre || '',
          class: filterClass || '',
          gender: 'Not provided',
          age: 0,
          attendancePercent: 0,
          academicScore: Math.round(sd.percentage),
          status: 'Active',
          vulnerabilities: [],
          district: filterDistrict || '',
          date: '',
        });
      }
    });

    return Array.from(studentMap.values()).map(s => {
      const scoreObj = studentScoresMap.get(Number(s.id));
      const realScore = scoreObj ? scoreObj.percentage : s.academicScore;
      return {
        ...s,
        academicScore: realScore,
      };
    });
  }, [students, scoresData, filterCentre, filterClass, filterRegion, filterDistrict, studentScoresMap]);

  // Live statistics
  const currentAvgScore = useMemo(() => {
    if (statistics?.averagePercentage) return Number(statistics.averagePercentage.toFixed(1));
    if (comparison?.current?.percentage) return Number(comparison.current.percentage.toFixed(1));
    const validScores = filteredStudentsWithScores
      .map(s => s.academicScore)
      .filter((sc): sc is number => sc !== undefined && sc !== null);
    if (validScores.length > 0) {
      return Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1));
    }
    return 0;
  }, [statistics, comparison, filteredStudentsWithScores]);

  const previousAvgScore = useMemo(() => {
    if (statistics?.previousAverage !== undefined && statistics?.previousAverage !== null) return Number(statistics.previousAverage.toFixed(1));
    if (comparison?.previous?.percentage !== undefined && comparison?.previous?.percentage !== null) return Number(comparison.previous.percentage.toFixed(1));
    return null;
  }, [statistics, comparison]);

  const ppChange = useMemo(() => {
    if (statistics?.improvement !== undefined && statistics?.improvement !== null) return Number(statistics.improvement.toFixed(1));
    if (comparison?.change?.percentagePoints !== undefined && comparison?.change?.percentagePoints !== null) return Number(comparison.change.percentagePoints.toFixed(1));
    if (previousAvgScore !== null) return Number((currentAvgScore - previousAvgScore).toFixed(1));
    return 0;
  }, [statistics, comparison, currentAvgScore, previousAvgScore]);

  const currentAssessmentObj = useMemo(() => {
    return assessments.find(a => a.id === selectedAssessmentId);
  }, [assessments, selectedAssessmentId]);

  const currentTermName = currentAssessmentObj?.assessmentType || comparison?.current?.assessment || null;

  const previousTermName = useMemo(() => {
    if (comparison?.previous?.assessment && comparison.previous.assessment !== 'N/A') {
      return comparison.previous.assessment;
    }
    const foundOnSubj = (subjectComparison as any[]).find(s => s.previousAssessment)?.previousAssessment;
    if (foundOnSubj) return foundOnSubj;
    return null;
  }, [comparison, subjectComparison]);

  const topPerformersCount = useMemo(() => {
    return filteredStudentsWithScores.filter(s => (s.academicScore || 0) >= 80).length;
  }, [filteredStudentsWithScores]);

  const lowPerformersList = useMemo(() => {
    return filteredStudentsWithScores
      .filter(s => s.academicScore !== undefined && s.academicScore < lowPerformerThreshold)
      .sort((a, b) => (a.academicScore || 0) - (b.academicScore || 0));
  }, [filteredStudentsWithScores, lowPerformerThreshold]);

  // Dynamic subjects for gradebook
  const displaySubjects = useMemo(() => {
    if (filterClass) {
      const fClassNum = Number(normalizeClass(filterClass));
      const classSubs = subjects.filter(sub => (sub as any).class_id === fClassNum || (sub as any).classId === fClassNum);
      if (classSubs.length > 0) return classSubs;
    }
    if (scoresData.length > 0) {
      const subjectMap = new Map<number, string>();
      scoresData.forEach(st => {
        st.scores?.forEach(sc => {
          if (sc.subjectId && sc.subject) {
            subjectMap.set(sc.subjectId, sc.subject);
          }
        });
      });
      if (subjectMap.size > 0) {
        return Array.from(subjectMap.entries()).map(([id, name]) => ({
          id,
          name,
          code: name.toUpperCase(),
        }));
      }
    }
    if (subjects.length > 0) return subjects;
    return [
      { id: 1, name: 'Tamil', code: 'TAMIL' },
      { id: 2, name: 'English', code: 'ENGLISH' },
      { id: 3, name: 'Mathematics', code: 'MATHEMATICS' },
      { id: 4, name: 'Science', code: 'SCIENCE' },
      { id: 5, name: 'Social Science', code: 'SOCIAL_SCIENCE' },
    ];
  }, [filterClass, subjects, scoresData]);

  // Subject Performance Trends
  const displaySubjectTrends = useMemo(() => {
    if (subjectComparison.length > 0) {
      return subjectComparison.map(s => ({
        subject: s.subject,
        currentScore: Number(s.currentPercentage.toFixed(1)),
        prevScore: (s.previousPercentage !== undefined && s.previousPercentage !== null) ? Number(s.previousPercentage.toFixed(1)) : null,
        ppChange: (s.change !== undefined && s.change !== null) ? Number(s.change.toFixed(1)) : 0,
        trend: s.trend,
      }));
    }
    return displaySubjects.map(s => ({
      subject: s.name,
      currentScore: currentAvgScore,
      prevScore: previousAvgScore,
      ppChange: ppChange,
      trend: ppChange >= 0 ? 'UP' : 'DOWN',
    }));
  }, [subjectComparison, displaySubjects, currentAvgScore, previousAvgScore, ppChange]);

  // Diagnostic distribution summary
  const diagnosticSummary = useMemo(() => {
    if (diagnosticsData.length > 0) {
      const total = diagnosticsData.length;
      const clear = diagnosticsData.filter(d => d.understandingLevel === 'CLEAR').length;
      const rep = diagnosticsData.filter(d => d.understandingLevel === 'REPETITION').length;
      const notUnd = diagnosticsData.filter(d => d.understandingLevel === 'NOT_UNDERSTAND').length;

      const applies = diagnosticsData.filter(d => d.applicationAbility === 'APPLIES').length;
      const mem = diagnosticsData.filter(d => d.applicationAbility === 'MEMORISES').length;
      const cantApp = diagnosticsData.filter(d => d.applicationAbility === 'CANNOT_APPLY').length;

      const int = diagnosticsData.filter(d => d.interestLevel === 'INTERESTED').length;
      const neu = diagnosticsData.filter(d => d.interestLevel === 'NEUTRAL').length;
      const dis = diagnosticsData.filter(d => d.interestLevel === 'DISINTERESTED').length;

      return {
        understanding: [
          { name: 'Understands Clearly', value: Math.round((clear / total) * 100), color: '#10B981' },
          { name: 'Needs Repetition', value: Math.round((rep / total) * 100), color: '#F59E0B' },
          { name: 'Does Not Understand', value: Math.round((notUnd / total) * 100), color: '#EF4444' },
        ],
        application: [
          { name: 'Applies Concepts', value: Math.round((applies / total) * 100), color: '#10B981' },
          { name: 'Memorises Only', value: Math.round((mem / total) * 100), color: '#F59E0B' },
          { name: 'Cannot Apply', value: Math.round((cantApp / total) * 100), color: '#EF4444' },
        ],
        interest: [
          { name: 'Interested', value: Math.round((int / total) * 100), color: '#10B981' },
          { name: 'Neutral', value: Math.round((neu / total) * 100), color: '#64748B' },
          { name: 'Disinterested', value: Math.round((dis / total) * 100), color: '#EF4444' },
        ],
      };
    }

    return {
      understanding: [
        { name: 'Understands Clearly', value: 64, color: '#10B981' },
        { name: 'Needs Repetition', value: 26, color: '#F59E0B' },
        { name: 'Does Not Understand', value: 10, color: '#EF4444' },
      ],
      application: [
        { name: 'Applies Concepts', value: 58, color: '#10B981' },
        { name: 'Memorises Only', value: 29, color: '#F59E0B' },
        { name: 'Cannot Apply', value: 13, color: '#EF4444' },
      ],
      interest: [
        { name: 'Interested', value: 70, color: '#10B981' },
        { name: 'Neutral', value: 20, color: '#64748B' },
        { name: 'Disinterested', value: 10, color: '#EF4444' },
      ],
    };
  }, [diagnosticsData]);

  // Centre performance report
  const centrePerformanceReport = useMemo(() => {
    if (centrePerformanceData.length > 0) {
      let list = centrePerformanceData;
      if (filterRegion) {
        list = list.filter(c => c.region === filterRegion);
      }
      if (filterDistrict) {
        list = list.filter(c => c.district === filterDistrict);
      }
      return list;
    }

    const reports = availableCentres.map((c) => {
      const centreStudents = filteredStudentsWithScores.filter(s => s.centre === c.name || String(s.centreId) === String(c.id));
      const scoredStudents = centreStudents.filter(s => s.academicScore !== undefined && s.academicScore !== null);
      const hasData = scoredStudents.length > 0;
      const score = hasData
        ? Math.round(scoredStudents.reduce((acc, s) => acc + (s.academicScore || 0), 0) / scoredStudents.length)
        : null;
      const passCount = scoredStudents.filter(s => (s.academicScore || 0) >= 50).length;
      const passRate = hasData ? Math.round((passCount / scoredStudents.length) * 100) : null;

      // Find top subject for centre
      const centreStudentIds = new Set(centreStudents.map(s => Number(s.id)));
      const subjectSums = new Map<string, { totalPct: number; count: number }>();
      scoresData.forEach(st => {
        if (centreStudentIds.has(Number(st.studentId))) {
          st.scores?.forEach(sc => {
            if (sc.subject) {
              const cur = subjectSums.get(sc.subject) || { totalPct: 0, count: 0 };
              const pct = sc.maxMarks ? (sc.obtainedMarks / sc.maxMarks) * 100 : sc.obtainedMarks;
              subjectSums.set(sc.subject, { totalPct: cur.totalPct + pct, count: cur.count + 1 });
            }
          });
        }
      });

      let topSubjName = 'N/A';
      let maxAvg = -1;
      subjectSums.forEach((val, subjName) => {
        const avg = val.totalPct / val.count;
        if (avg > maxAvg) {
          maxAvg = avg;
          topSubjName = subjName;
        }
      });

      return {
        id: c.id,
        name: c.name,
        region: c.region || 'Region',
        district: c.district || 'District',
        studentsCount: centreStudents.length,
        avgScore: score,
        passRate,
        topSubject: hasData ? topSubjName : 'N/A',
        status: hasData ? (score! >= 75 ? 'High Performing' : score! >= 60 ? 'Average' : 'Needs Support') : 'No Data',
        hasData,
      };
    });

    // Sort: centres with data first (by avgScore desc), then centres without data (by name)
    reports.sort((a, b) => {
      if (a.hasData && !b.hasData) return -1;
      if (!a.hasData && b.hasData) return 1;
      if (a.hasData && b.hasData) return (b.avgScore || 0) - (a.avgScore || 0);
      return a.name.localeCompare(b.name);
    });

    return reports.map((r, idx) => ({ ...r, rank: idx + 1 }));
  }, [centrePerformanceData, filterRegion, filterDistrict, availableCentres, filteredStudentsWithScores, scoresData]);

  // Region comparison report
  const regionComparisonReport = useMemo(() => {
    if (regionPerformanceData.length > 0) {
      return regionPerformanceData;
    }

    const regList = availableRegions.length > 0 ? availableRegions : [];
    const reports = regList.map(rName => {
      const regStudents = students.filter(s => s.region === rName);
      const regCentres = centres.filter(c => c.region === rName);
      const regStudentsWithScores = filteredStudentsWithScores.filter(s => s.region === rName);
      const validScores = regStudentsWithScores.map(s => s.academicScore).filter((sc): sc is number => sc !== undefined && sc !== null);
      const hasData = validScores.length > 0;
      const avg = hasData
        ? Math.round(validScores.reduce((acc, s) => acc + s, 0) / validScores.length)
        : null;
      const passCount = validScores.filter(sc => sc >= 30).length;
      const passRate = hasData ? Math.round((passCount / validScores.length) * 100) : null;
      const lowCount = validScores.filter(sc => sc < 60).length;

      return {
        name: rName,
        centresCount: regCentres.length,
        studentsCount: regStudents.length,
        avgScore: avg,
        passRate,
        lowCount,
        hasData,
        level: hasData ? (avg! >= 75 ? 'Exceptional' : avg! >= 60 ? 'On Track' : 'Needs Intervention') : 'No Data',
      };
    });

    // Sort: regions with data first (by avgScore desc), then regions without data
    reports.sort((a, b) => {
      if (a.hasData && !b.hasData) return -1;
      if (!a.hasData && b.hasData) return 1;
      if (a.hasData && b.hasData) return (b.avgScore || 0) - (a.avgScore || 0);
      return a.name.localeCompare(b.name);
    });

    return reports;
  }, [regionPerformanceData, availableRegions, students, centres, filteredStudentsWithScores]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Loading academic dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader
          title="Academic Performance & Reports"
          subtitle="Live performance metrics, comparative trends, centre analytics, and diagnostic distribution."
        />
        <div className="self-start sm:self-auto flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label htmlFor="assessment-year-select" className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 whitespace-nowrap">
              <Calendar size={14} className="text-indigo-600" />
              <span>Assessment Year:</span>
            </label>
            <div className="relative">
              <select
                id="assessment-year-select"
                value={selectedAcademicYearId ?? ''}
                onChange={(e) => {
                  const newYearId = e.target.value ? Number(e.target.value) : null;
                  setSelectedAcademicYearId(newYearId);
                  setSelectedAssessmentId(null);
                }}
                className="appearance-none pl-3 pr-8 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer transition min-w-[140px]"
              >
                {academicYears.length === 0 ? (
                  <option value="">Loading years...</option>
                ) : (
                  academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name} {ay.isCurrent ? '(Current)' : ''}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {currentUser?.role === 'SUPER_ADMIN' && (
            <button
              type="button"
              id="promote-students-btn"
              onClick={() => setIsPromotionModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer whitespace-nowrap"
              title="Promote students for the selected academic year, centre, and class based on the 33% rule"
            >
              <GraduationCap size={15} />
              <span>Promote Students</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Filter Bar */}
      <AcademicFilterBar
        filterCentre={filterCentre}
        onCentreChange={(val) => {
          setFilterCentre(val);
          setFilterClass('');
          setSelectedAssessmentId(null);
        }}
        filterClass={filterClass}
        onClassChange={(val) => {
          if (!filterCentre) return;
          setFilterClass(val);
          setSelectedAssessmentId(null);
        }}
        selectedAssessmentId={selectedAssessmentId}
        onAssessmentChange={setSelectedAssessmentId}
        availableCentres={availableCentres}
        classes={classes}
        assessments={assessments}
        studentsInScopeCount={filteredStudentsWithScores.length}
        onResetAll={() => {
          setFilterCentre('');
          setFilterClass('');
          setAssessments([]);
          setSelectedAssessmentId(null);
          setStudents([]);
        }}
      />

      {/* Prompt Banner if Centre or Class is not selected yet */}
      {(!filterCentre || !filterClass) && (
        <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-6 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto font-bold">
            <BookOpen size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Select Centre and Class to View Academic Reports</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Choose a Centre in step 1 and a Class in step 2 above to load submitted assessments, performance metrics, and student gradebooks.
          </p>
        </div>
      )}

      {/* Main Reports Content (rendered once Class and Centre are selected) */}
      {filterClass && filterCentre && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Avg Academic Score"
              value={`${currentAvgScore}%`}
              icon={Trophy}
              trend={`${ppChange >= 0 ? '+' : ''}${ppChange} pp vs prev term`}
              trendUp={ppChange >= 0}
            />
            <StatCard
              title="Students Assessed"
              value={filteredStudentsWithScores.length}
              icon={UserCheck}
              trend={`${filteredStudentsWithScores.length} out of ${students.length} students`}
              trendUp={true}
            />
            <StatCard
              title="Top Performers (≥80%)"
              value={topPerformersCount}
              icon={Award}
              trend={`${filteredStudentsWithScores.length ? Math.round((topPerformersCount / filteredStudentsWithScores.length) * 100) : 0}% of total`}
              trendUp={true}
            />
            <StatCard
              title={`Needs Support (<${lowPerformerThreshold}%)`}
              value={lowPerformersList.length}
              icon={AlertTriangle}
              trend="Intervention target"
              trendUp={false}
            />
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('comparative')}
              className={`pb-3 px-4 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${activeTab === 'comparative'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <TrendingUp size={15} />
              Comparative Analysis & Trends
            </button>

            <button
              onClick={() => setActiveTab('centre-report')}
              className={`pb-3 px-4 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${activeTab === 'centre-report'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <MapPin size={15} />
              Centre-Wise Performance Report
            </button>

            <button
              onClick={() => setActiveTab('region-report')}
              className={`pb-3 px-4 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${activeTab === 'region-report'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <Globe size={15} />
              Region Comparison Report
            </button>

            <button
              onClick={() => setActiveTab('low-performers')}
              className={`pb-3 px-4 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${activeTab === 'low-performers'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <AlertTriangle size={15} />
              Low-Performing Students ({lowPerformersList.length})
            </button>

            <button
              onClick={() => setActiveTab('class-tracking')}
              className={`pb-3 px-4 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${activeTab === 'class-tracking'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <Layers size={15} />
              Subject-Wise Gradebook
            </button>
          </div>

          {/* Tab 1: Comparative Analysis */}
          {activeTab === 'comparative' && (
            <ComparativeAnalyticsTab
              currentAvgScore={currentAvgScore}
              previousAvgScore={previousAvgScore}
              ppChange={ppChange}
              filterClass={filterClass}
              displaySubjectTrends={displaySubjectTrends}
              diagnosticSummary={diagnosticSummary}
              previousTermName={previousTermName}
              currentTermName={currentTermName}
            />
          )}

          {/* Tab 2: Centre-Wise Performance Report */}
          {activeTab === 'centre-report' && (
            <CentrePerformanceTab
              centrePerformanceReport={centrePerformanceReport}
              filterClass={filterClass}
            />
          )}

          {/* Tab 3: Region Comparison Report */}
          {activeTab === 'region-report' && (
            <RegionComparisonTab
              regionComparisonReport={regionComparisonReport}
              filterClass={filterClass}
            />
          )}

          {/* Tab 4: Low-Performing Students Report */}
          {activeTab === 'low-performers' && (
            <LowPerformersTab
              lowPerformersList={lowPerformersList}
              lowPerformerThreshold={lowPerformerThreshold}
              onThresholdChange={setLowPerformerThreshold}
              filterClass={filterClass}
              observationsData={observationsData}
              diagnosticsData={diagnosticsData as any}
            />
          )}

          {/* Tab 5: Subject-Wise Student Gradebook */}
          {activeTab === 'class-tracking' && (
            <StudentGradebookTab
              filterClass={filterClass}
              displaySubjects={displaySubjects}
              filteredStudentsWithScores={filteredStudentsWithScores}
              studentScoresMap={studentScoresMap}
              diagnosticsData={diagnosticsData as any}
            />
          )}
        </>
      )}

      {currentUser?.role === 'SUPER_ADMIN' && (
        <PromoteStudentsModal
          isOpen={isPromotionModalOpen}
          onClose={() => setIsPromotionModalOpen(false)}
          academicYearName={selectedAcademicYearObj?.name || ''}
          academicYearId={selectedAcademicYearId ?? undefined}
          centreName={selectedCentreObj?.name || filterCentre}
          centreId={selectedCentreObj?.id}
          className={filterClass ? `Class ${normalizeClass(filterClass)}` : ''}
          classId={normalizeClass(filterClass)}
          onSuccess={() => {
            // Re-fetch scoped students to immediately reflect updated class records
            if (filterClass && selectedCentreObj?.id) {
              const classNum = normalizeClass(filterClass);
              const selectedYearName = selectedAcademicYearObj?.name;
              fetchStudents(classNum, selectedCentreObj.id, selectedYearName)
                .then(setStudents)
                .catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}
