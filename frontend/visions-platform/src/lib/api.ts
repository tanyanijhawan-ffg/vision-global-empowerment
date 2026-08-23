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

export async function saveAttendanceBulk(date: string, centre: number, attendance: AttendanceInput[]): Promise<AttendanceRecord[]> {
  const response = await fetch(`${getApiBaseUrl()}/v1/attendance/bulk/`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, centre, attendance: attendance.map(({ student_id, ...record }) => ({ student: student_id, ...record, reason: record.absence_reason })) }),
  });
  if (!response.ok) throw new Error(`Failed to save attendance (${response.status})`);
  return response.json() as Promise<AttendanceRecord[]>;
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
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  joined_at?: string;
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
  const roleName = record.role?.name || "Student";
  const joinedAt = record.joined_at ? new Date(record.joined_at).toLocaleDateString("en-IN") : "Unknown";

  return {
    id: String(record.id),
    name: fullName || record.email || `Student ${record.id}`,
    email: record.email,
    region: record.centre?.region || "Unknown region",
    centre: centerName,
    centreId: record.centre?.id,
    class: roleName,
    gender: "Unknown",
    age: 0,
    attendancePercent: 0,
    academicScore: 0,
    status: "Active",
    vulnerabilities: [],
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
  return response.json() as Promise<AttendanceRecord>;
}

export async function fetchStudents(): Promise<StudentListItem[]> {
  const response = await fetch(`${getApiBaseUrl()}/students/`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load students (${response.status})`);
  }

  const payload = (await response.json()) as StudentApiRecord[] | { results?: StudentApiRecord[] };
  const records = Array.isArray(payload) ? payload : payload.results ?? [];

  return records.map(mapStudentRecord);
}
