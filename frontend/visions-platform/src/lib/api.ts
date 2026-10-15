import { getAuthHeaders } from './auth';

export interface StudentListItem {
  id: string;
  name: string;
  email?: string;
  region: string;
  centre: string;
  centreId?: number;
  class: string;
  gender: string;
  age: number;
  attendancePercent: number;
  academicScore: number;
  status: string;
  vulnerabilities: string[];
  district: string;
  date: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late';
export type AttentionLevel = 'Focused' | 'Distracted' | 'Needs reminders';
export type Behaviour = 'Cooperative' | 'Disruptive' | 'Silent' | 'Leadership behavior';
export const learningBehaviourOptions = ['Completed homework', 'Completed classwork', 'Asked questions', 'Helped others'] as const;
export type LearningBehaviour = typeof learningBehaviourOptions[number];

export interface AttendanceRecord {
  attendance_id: number;
  student: StudentListItem;
  student_id: number;
  attendance_date: string;
  status: AttendanceStatus;
  absence_reason: string | null;
  late_reason: string | null;
  participation_level: string | null;
  attention_level: AttentionLevel | null;
  learning_behaviour: LearningBehaviour[];
  behaviour: Behaviour | null;
  tutor_observation: string | null;
  what_was_different: string | null;
  any_concern: string | null;
  any_positive_change: string | null;
}

export interface AbsenceAlert {
  student_id: number;
  student_name: string;
  centre_name: string;
  consecutive_absent_days: number;
  last_absent_date: string;
}

export interface AbsenceAlertSummary {
  enabled: boolean;
  threshold_days: number;
  alerts: AbsenceAlert[];
}

export interface AttendanceInput {
  student_id: number;
  attendance_date: string;
  status: AttendanceStatus;
  absence_reason?: string;
  late_reason?: string;
  participation_level?: string;
  attention_level?: AttentionLevel;
  learning_behaviour: LearningBehaviour[];
  behaviour?: Behaviour;
  tutor_observation?: string;
  what_was_different?: string;
  any_concern?: string;
  any_positive_change?: string;
}

export interface AttendanceCentre {
  id: number;
  name: string;
  district?: string;
  region?: string;
}

export interface StudentCreateInput {
  full_name: string;
  nick_name?: string;
  gender: string;
  dob: string;
  photo: File;
  school_name?: string;
  school_type?: string;
  class_grade?: string;
  medium_of_instruction?: string;
  attendance_pattern?: string;
  previous_academic_performance?: string;
  centre_id: number;
  family_data?: Record<string, string | number>;
  socio_economic_data?: Record<string, string | boolean>;
  vulnerabilities_data?: Array<{ name: string; remarks?: string }>;
  motivation_data?: Array<{ category: string; reason: string; narrative?: string }>;
  aspirations_data?: { career_goal?: string; interests?: string; strengths?: string };
}

export interface StudentRecord extends Omit<StudentCreateInput, 'photo' | 'centre_id'> {
  id: number;
  photo: string | null;
  age: number | null;
  centre: AttendanceCentre;
  centre_id?: number;
  family?: Record<string, string | number | null> | null;
  socio_economic?: Record<string, string | boolean | null> | null;
  vulnerabilities?: Array<{ name: string; remarks?: string | null }>;
  motivations?: Array<{ category: string; reason: string; narrative?: string | null }>;
  aspirations?: Array<{ career_goal?: string | null; interests?: string | null; strengths?: string | null }>;
  attendancePercent?: number;
  academicScore?: number;
}

export interface AttendanceIntelligenceSetting {
  setting_id: number;
  notification_mode: 'combined' | 'separate';
  notification_channels: string[];
  alert_student_mode: 'individual' | 'combined';
  alert_student_ids: number[];
  absence_alert_enabled: boolean;
  absence_alert_days: number;
  absence_alert_recipients: string[];
  engagement_alert_enabled: boolean;
  engagement_alert_level: number;
  engagement_alert_recipients: string[];
  updated_at?: string;
}

export interface AttendanceAlertRecipient {
  id: number;
  name: string;
  email: string;
}

export interface AttendanceAlertRecipients {
  community_educators: AttendanceAlertRecipient[];
  admin: { name: string; email: string };
}

export async function fetchAttendanceAlertRecipients(centreId: number): Promise<AttendanceAlertRecipients> {
  const response = await fetch(`${getApiBaseUrl()}/v1/attendance/alert-recipients/?centre_id=${centreId}`, {
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Failed to load attendance email recipients (${response.status})`);
  return response.json() as Promise<AttendanceAlertRecipients>;
}

export async function sendAttendanceDefaultingEmail(input: {
  centre_id: number;
  attendance_date: string;
  educator_id: number;
  class_grade?: string | null;
  student_ids: number[];
}): Promise<{ sent: boolean; recipient: string; student_count: number; subject: string }> {
  const response = await fetch(`${getApiBaseUrl()}/v1/attendance/defaulting-email/`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { detail?: string; student_ids?: string[] } | null;
    throw new Error(detail?.detail || detail?.student_ids?.[0] || `Failed to send attendance email (${response.status})`);
  }
  return response.json() as Promise<{ sent: boolean; recipient: string; student_count: number; subject: string }>;
}

export async function saveAttendanceBulk(date: string, centre: number, attendance: AttendanceInput[]): Promise<AttendanceRecord[]> {
  const response = await fetch(`${getApiBaseUrl()}/v1/attendance/bulk/`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, centre, attendance: attendance.map(({ student_id, ...record }) => ({ student: student_id, ...record, reason: record.absence_reason })) }),
  });
  if (!response.ok) throw new Error(`Failed to save attendance (${response.status})`);
  const records = await response.json() as AttendanceRecord[];
  window.dispatchEvent(new Event('vge-attendance-change'));
  return records;
}

export async function fetchAttendanceCentres(): Promise<AttendanceCentre[]> {
  const response = await fetch(`${getApiBaseUrl()}/v1/attendance/centres/`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Failed to load centres (${response.status})`);
  const payload = await response.json() as AttendanceCentre[] | { results?: AttendanceCentre[] };
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

export async function fetchAttendanceIntelligence(): Promise<AttendanceIntelligenceSetting> {
  const response = await fetch(`${getApiBaseUrl()}/v1/attendance/intelligence/`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Failed to load intelligence settings (${response.status})`);
  return response.json() as Promise<AttendanceIntelligenceSetting>;
}

export async function saveAttendanceIntelligence(setting: AttendanceIntelligenceSetting): Promise<AttendanceIntelligenceSetting> {
  const response = await fetch(`${getApiBaseUrl()}/v1/attendance/intelligence/`, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(setting),
  });
  if (!response.ok) throw new Error(`Failed to save intelligence settings (${response.status})`);
  return response.json() as Promise<AttendanceIntelligenceSetting>;
}

interface StudentApiRecord {
  id: number;
  gender?: string | null;
  age?: number | null;
  class_grade?: string | null;
  dob?: string | null;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  joined_at?: string;
  photo?: string | null;
  vulnerabilities?: Array<{ name: string }>;
  centre?: {
    id?: number;
    name?: string;
    district?: string;
    region?: string;
  };
  role?: {
    id?: number;
    name?: string;
  };
}

export async function fetchStudent(id: string): Promise<StudentRecord> {
  const response = await fetch(`${getApiBaseUrl()}/students/${id}/`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Failed to load student (${response.status})`);
  return response.json() as Promise<StudentRecord>;
}

export async function updateStudent(id: string, input: Partial<StudentCreateInput>): Promise<StudentRecord> {
  const body = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      body.append(key, value instanceof File ? value : typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
  });
  const response = await fetch(`${getApiBaseUrl()}/students/${id}/`, { method: 'PATCH', headers: { Accept: 'application/json' }, body });
  if (!response.ok) throw new Error(`Failed to update student (${response.status})`);
  return response.json() as Promise<StudentRecord>;
}

export async function deleteStudent(id: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/students/${id}/`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete student (${response.status})`);
}

export interface StudentSummary {
  attendance: { month: string; percent: number }[];
  academics: { subject: string; score: number }[];
  attendance_percent: number;
  academic_score: number;
}

export async function fetchStudentSummary(id: string): Promise<StudentSummary> {
  const response = await fetch(`${getApiBaseUrl()}/students/${id}/summary/`, { headers: { Accept: 'application/json', ...getAuthHeaders() } });
  if (!response.ok) throw new Error(`Failed to load student summary (${response.status})`);
  return response.json() as Promise<StudentSummary>;
}

export async function createStudent(input: StudentCreateInput): Promise<StudentApiRecord> {
  const body = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      body.append(key, value instanceof File ? value : typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
  });

  const response = await fetch(`${getApiBaseUrl()}/students/`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as Record<string, string[] | string> | null;
    const detail = payload ? Object.entries(payload).map(([field, message]) => `${field}: ${Array.isArray(message) ? message.join(', ') : message}`).join('; ') : '';
    throw new Error(detail || `Failed to create student (${response.status})`);
  }
  return response.json() as Promise<StudentApiRecord>;
}

export interface AcademicYear {
  id: number;
  name: string;
  isCurrent?: boolean;
}

export interface AssessmentType {
  id: number;
  code: string;
  name: string;
  academicYearId?: number | null;
  academicYearName?: string | null;
  isActive?: boolean;
  maxMarks?: number;
}

export interface Subject {
  id: number;
  name: string;
  code?: string;
  maxMarks?: number;
}

export interface Assessment {
  id: number;
  status: string;
  academicYear: string;
  academicYearId?: number;
  class: string;
  classId?: number;
  assessmentType: string;
  assessmentTypeId?: number;
  assessmentDate?: string;
  centreId?: number | null;
  centreName?: string;
  maxMarks?: number;
  totalStudents?: number;
}

export interface AssessmentScoreInput {
  subjectId: number;
  obtainedMarks: number;
  maxMarks?: number;
}

export interface AssessmentStudentScores {
  studentId: number;
  admissionNumber?: string;
  studentName?: string;
  scores: Array<AssessmentScoreInput & { subject?: string; maxMarks: number }>;
  total?: number;
  totalMarks?: number;
  maxMarks?: number;
  percentage: number;
}

export interface DiagnosticOptions {
  understandingLevels: Array<{ code: string; name: string }>;
  applicationAbilities: Array<{ code: string; name: string }>;
  interestLevels: Array<{ code: string; name: string }>;
}

export interface LearningBehaviourOption {
  code: string;
  name: string;
}

export interface AssessmentObservation {
  studentId: number;
  keyImprovements: string;
  subjectsNeedingSupport: string;
  interventionPlan: string;
  comments?: string;
}

export interface AssessmentStatistics {
  studentCount: number;
  averagePercentage: number;
  previousAverage: number;
  improvement: number;
  highestPercentage: number;
  lowestPercentage: number;
  passPercentage: number;
}

function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  return "/api";
}

function mapStudentRecord(record: StudentApiRecord): StudentListItem {
  const fullName = [record.full_name, record.first_name, record.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  const centerName = record.centre?.name || "Unknown centre";
  const className = record.class_grade || "Not provided";
  const registeredDate = record.joined_at || record.dob;
  const joinedAt = registeredDate ? new Date(registeredDate).toLocaleDateString("en-IN") : "Unknown";

  return {
    id: String(record.id),
    name: fullName || record.email || `Student ${record.id}`,
    email: record.email,
    region: record.centre?.region || "Unknown region",
    centre: centerName,
    centreId: record.centre?.id,
    class: className,
    gender: record.gender || "Not provided",
    age: record.age || 0,
    attendancePercent: 0,
    academicScore: 0,
    status: "Active",
    vulnerabilities: record.vulnerabilities?.map(item => item.name) || [],
    district: record.centre?.district || "Unknown district",
    date: joinedAt,
  };
}

export async function fetchAttendance(params: { date?: string; centreId?: string } = {}): Promise<AttendanceRecord[]> {
  const search = new URLSearchParams();
  if (params.date) search.set('attendance_date', params.date);
  if (params.centreId) search.set('centre_id', params.centreId);
  const response = await fetch(`${getApiBaseUrl()}/attendance/?${search.toString()}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Failed to load attendance (${response.status})`);
  const payload = await response.json() as AttendanceRecord[] | { results?: AttendanceRecord[] };
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

export async function fetchAbsenceAlerts(): Promise<AbsenceAlertSummary> {
  const response = await fetch(`${getApiBaseUrl()}/attendance/alerts/absence/`, {
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Failed to load absence notifications (${response.status})`);
  return response.json() as Promise<AbsenceAlertSummary>;
}

export async function saveAttendance(input: AttendanceInput): Promise<AttendanceRecord> {
  const response = await fetch(`${getApiBaseUrl()}/attendance/record/`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(detail?.detail || `Failed to save attendance (${response.status})`);
  }
  const record = await response.json() as AttendanceRecord;
  window.dispatchEvent(new Event('vge-attendance-change'));
  return record;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as Record<string, unknown>;
      if (payload && typeof payload === 'object') {
        if (typeof payload.error === 'string') {
          message = payload.error;
        } else if (typeof payload.detail === 'string') {
          message = payload.detail;
        } else {
          const details = Object.entries(payload)
            .map(([field, errs]) => {
              const errStr = Array.isArray(errs) ? errs.join(', ') : String(errs);
              return `${field}: ${errStr}`;
            })
            .join('; ');
          if (details) {
            message = details;
          }
        }
        if (Array.isArray(payload.missing) && payload.missing.length > 0) {
          message += ` Missing: ${payload.missing.join(', ')}.`;
        }
      }
    } catch {
      // Keep the default HTTP error message when response is not JSON
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function fetchStudents(classId?: number | string, centreId?: number | string, academicYear?: string): Promise<StudentListItem[]> {
  const params = new URLSearchParams();
  if (classId !== undefined && classId !== '') params.append('classGrade', String(classId));
  if (centreId !== undefined && centreId !== '') {
    params.append('centreId', String(centreId));
  }
  if (academicYear !== undefined && academicYear !== '') {
    params.append('academicYear', academicYear);
  }
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const payload = await apiRequest<StudentApiRecord[] | { results?: StudentApiRecord[] }>(`/students/${queryString}`);
  const records = Array.isArray(payload) ? payload : payload.results ?? [];

  return records.map(mapStudentRecord);
}

export const fetchAcademicYears = () => apiRequest<AcademicYear[]>("/v1/academic-years/");
export const fetchAssessmentTypes = (params?: {
  academicYearId?: number | string;
  academicYear?: string;
  classId?: number | string;
  onlyCreated?: boolean;
}) => {
  const query = new URLSearchParams();
  if (params?.academicYearId) query.set('academicYearId', String(params.academicYearId));
  if (params?.academicYear) query.set('academicYear', params.academicYear);
  if (params?.classId) query.set('classId', String(params.classId));
  if (params?.onlyCreated) query.set('onlyCreated', 'true');
  const qs = query.toString();
  return apiRequest<AssessmentType[]>(`/v1/assessment-types/${qs ? `?${qs}` : ''}`);
};
export const fetchSubjects = (classId?: number | string, examId?: number | string, centreId?: number | string) => {
  const query = new URLSearchParams();
  if (classId) query.set('classId', String(classId));
  if (examId) {
    query.set('examId', String(examId));
    query.set('assessmentTypeId', String(examId));
  }
  if (centreId) query.set('centreId', String(centreId));
  const qs = query.toString();
  return apiRequest<Subject[]>(`/v1/subjects/${qs ? `?${qs}` : ''}`);
};
export const createAssessment = (payload: {
  academicYearId: number;
  classId?: number;
  classIds?: number[];
  assessmentTypeId?: number;
  assessmentTypeIds?: number[];
  assessmentDate: string;
  centreId?: number | string;
  subjectIds?: number[];
  maxMarks?: number;
}) => apiRequest<Assessment>("/v1/assessments/", { method: "POST", body: JSON.stringify(payload) });
export const fetchAssessments = (params?: {
  classId?: number;
  centreId?: number | string;
  assessmentTypeId?: number | '';
  status?: string;
  academicYearId?: number | string;
}) => {
  const query = new URLSearchParams();
  if (params?.classId) query.set('classId', String(params.classId));
  if (params?.centreId) query.set('centreId', String(params.centreId));
  if (params?.assessmentTypeId) query.set('assessmentTypeId', String(params.assessmentTypeId));
  if (params?.status) query.set('status', params.status);
  if (params?.academicYearId) query.set('academicYearId', String(params.academicYearId));
  const qs = query.toString();
  return apiRequest<Assessment[]>(`/v1/assessments/${qs ? `?${qs}` : ''}`);
};
export const fetchAssessmentDetail = (assessmentId: number) =>
  apiRequest<Assessment & { subjectIds?: number[]; maxMarks?: number; totalStudents?: number }>(`/v1/assessments/${assessmentId}/`);
export const updateAssessment = (
  assessmentId: number,
  payload: {
    academicYearId?: number;
    classId?: number;
    assessmentTypeId?: number;
    assessmentDate?: string;
    centreId?: number | string;
    subjectIds?: number[];
    maxMarks?: number;
    status?: string;
  }
) => apiRequest<Assessment>(`/v1/assessments/${assessmentId}/`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteAssessment = (assessmentId: number) =>
  apiRequest<{ message: string }>(`/v1/assessments/${assessmentId}/`, { method: "DELETE" });
export const fetchAssessmentScores = (assessmentId: number) => apiRequest<{ assessmentId: number; students: AssessmentStudentScores[] }>(`/v1/assessments/${assessmentId}/scores/`);
export const saveAssessmentScores = (assessmentId: number, studentsPayload: Array<{ studentId: number; scores: AssessmentScoreInput[] }>) =>
  apiRequest<{ assessmentId: number; students: AssessmentStudentScores[]; savedStudents: number; savedScores: number; status: string }>(`/v1/assessments/${assessmentId}/scores/bulk`, {
    method: "PUT",
    body: JSON.stringify({ students: studentsPayload }),
  });
export const fetchDiagnosticOptions = () => apiRequest<DiagnosticOptions>("/v1/diagnostic-options/");
export const fetchAssessmentDiagnostics = (assessmentId: number) => apiRequest<{ assessmentId: number; diagnostics: Array<{ studentId: number; studentName: string; subjectId: number; subject: string; understandingLevel: string; applicationAbility: string; interestLevel: string }> }>(`/v1/assessments/${assessmentId}/diagnostics/`);
export const saveAssessmentDiagnostics = (assessmentId: number, studentsPayload: Array<Record<string, number | string>>) =>
  apiRequest<{ assessmentId: number; saved: number; status: string }>(`/v1/assessments/${assessmentId}/diagnostics/bulk`, {
    method: "PUT",
    body: JSON.stringify({ students: studentsPayload }),
  });
export const fetchLearningBehaviours = () => apiRequest<LearningBehaviourOption[]>("/v1/learning-behaviours/");
export const fetchAssessmentBehaviours = (assessmentId: number) => apiRequest<{ assessmentId: number; students: Array<{ studentId: number; studentName: string; behaviour: string }> }>(`/v1/assessments/${assessmentId}/behaviours/`);
export const fetchAssessmentObservations = (assessmentId: number) => apiRequest<{ assessmentId: number; students: AssessmentObservation[] }>(`/v1/assessments/${assessmentId}/observations/`);
export const saveAssessmentBehaviours = (assessmentId: number, studentsPayload: Array<{ studentId: number; behaviour: string }>) =>
  apiRequest<{ assessmentId: number; saved: number; status: string }>(`/v1/assessments/${assessmentId}/behaviours/bulk`, {
    method: "PUT",
    body: JSON.stringify({ students: studentsPayload }),
  });
export const saveAssessmentObservations = (assessmentId: number, studentsPayload: Array<{ studentId: number; keyImprovements?: string; subjectsNeedingSupport?: string; interventionPlan?: string; comments?: string }>) =>
  apiRequest<{ assessmentId: number; saved: number; status: string }>(`/v1/assessments/${assessmentId}/observations/bulk`, {
    method: "PUT",
    body: JSON.stringify({ students: studentsPayload }),
  });
export const fetchAssessmentObservation = (assessmentId: number, studentId: number) => apiRequest<AssessmentObservation>(`/v1/assessments/${assessmentId}/students/${studentId}/observation`);
export const saveAssessmentObservation = (assessmentId: number, studentId: number, observation: Omit<AssessmentObservation, "studentId">) =>
  apiRequest<AssessmentObservation>(`/v1/assessments/${assessmentId}/students/${studentId}/observation`, {
    method: "PUT",
    body: JSON.stringify(observation),
  });
export const submitAssessment = (assessmentId: number) => apiRequest<{ assessmentId: number; status: string; submittedAt: string }>(`/v1/assessments/${assessmentId}/submit`, { method: "POST" });
export const reopenAssessment = (assessmentId: number) => apiRequest<{ assessmentId: number; status: string; message: string }>(`/v1/assessments/${assessmentId}/reopen`, { method: "POST" });
export const fetchAssessmentStatistics = (assessmentId: number) => apiRequest<AssessmentStatistics>(`/v1/assessments/${assessmentId}/statistics`);
export const fetchAssessmentComparison = (assessmentId: number) => apiRequest<Record<string, unknown>>(`/v1/assessments/${assessmentId}/comparison`);
export const fetchSubjectComparison = (assessmentId: number) => apiRequest<unknown[]>(`/v1/assessments/${assessmentId}/comparison/subjects`);
export const fetchStudentComparison = (assessmentId: number) => apiRequest<unknown[]>(`/v1/assessments/${assessmentId}/comparison/students`);
export const fetchStudentDashboard = (studentId: number) => apiRequest<Record<string, unknown>>(`/v1/students/${studentId}/dashboard`);
export const fetchStudentPerformanceTrends = (studentId: number, subjectId?: number) => apiRequest<unknown[]>(`/v1/students/${studentId}/performance/trends${subjectId ? `?subjectId=${subjectId}` : ""}`);
export const fetchAssessmentDetails = (assessmentId: number) => apiRequest<Record<string, unknown>>(`/v1/assessments/${assessmentId}/details`);

export interface CentrePerformanceReportItem {
  id: number;
  name: string;
  region: string;
  district: string;
  studentsCount: number;
  avgScore: number | null;
  passRate: number | null;
  topSubject: string;
  status: string;
  hasData: boolean;
  rank: number;
}

export interface RegionComparisonReportItem {
  name: string;
  centresCount: number;
  studentsCount: number;
  avgScore: number | null;
  passRate: number | null;
  lowCount: number;
  hasData: boolean;
  level: string;
}

export const fetchCentrePerformanceReport = (
  assessmentId?: number | null,
  params?: {
    classId?: number | string;
    assessmentTypeId?: number | string;
    academicYearId?: number | string;
  }
) => {
  const query = new URLSearchParams();
  if (params?.classId) query.set('classId', String(params.classId));
  if (params?.assessmentTypeId) query.set('assessmentTypeId', String(params.assessmentTypeId));
  if (params?.academicYearId) query.set('academicYearId', String(params.academicYearId));
  const qs = query.toString();
  const endpoint = assessmentId
    ? `/v1/assessments/${assessmentId}/centre-performance/${qs ? `?${qs}` : ''}`
    : `/v1/assessments/centre-performance/${qs ? `?${qs}` : ''}`;
  return apiRequest<{
    assessmentId: number | null;
    classId: number;
    assessmentTypeId: number | null;
    academicYearId: number | null;
    centres: CentrePerformanceReportItem[];
    regions: RegionComparisonReportItem[];
  }>(endpoint);
};

export interface SchoolClass {
  id: number;
  name: string;
  code?: string;
  isActive?: boolean;
}

export const fetchSchoolClasses = () => apiRequest<SchoolClass[]>("/v1/classes/");
export const fetchAllSubjects = () => apiRequest<Subject[]>("/v1/metadata/subjects/");
export const createSubjectMetadata = (payload: { name: string; code: string }) =>
  apiRequest<Subject>("/v1/metadata/subjects/", { method: "POST", body: JSON.stringify(payload) });
export const createExamMetadata = (payload: { name: string; code: string; academicYearId?: number }) =>
  apiRequest<AssessmentType>("/v1/metadata/assessment-types/", { method: "POST", body: JSON.stringify(payload) });
export const createAssessmentSubjectMetadata = (payload: {
  academicYearId?: number;
  classId?: number;
  classIds?: number[];
  examId?: number;
  examIds?: number[];
  subjectIds: number[];
  maxMarks?: number;
  isActive?: boolean;
}) => apiRequest<any>("/v1/metadata/assessment-subjects/", { method: "POST", body: JSON.stringify(payload) });

export const createAcademicYearMetadata = (payload: {
  name: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  isActive?: boolean;
}) => apiRequest<AcademicYear>("/v1/metadata/academic-years/", { method: "POST", body: JSON.stringify(payload) });

export const createAcademicYear = createAcademicYearMetadata;

