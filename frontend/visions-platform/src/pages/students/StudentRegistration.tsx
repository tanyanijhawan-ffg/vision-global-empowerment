import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, User, GraduationCap, Users, Briefcase, HeartPulse, BrainCircuit, Target, MapPin } from 'lucide-react';
import { createStudent, fetchAttendanceCentres, fetchStudent, updateStudent, type AttendanceCentre, type StudentCreateInput } from '../../lib/api';

const STEPS = [
  { id: 1, name: 'Identification', icon: User },
  { id: 2, name: 'Education', icon: GraduationCap },
  { id: 3, name: 'Family', icon: Users },
  { id: 4, name: 'Socio-Economic', icon: Briefcase },
  { id: 5, name: 'Vulnerabilities', icon: HeartPulse },
  { id: 6, name: 'Motivation', icon: BrainCircuit },
  { id: 7, name: 'Aspirations', icon: Target },
  { id: 8, name: 'Assignment', icon: MapPin },
];

const inputCls = 'w-full min-w-0 h-10 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm';
const labelCls = 'block text-sm font-medium text-slate-700 mb-1';
const sectionTitle = 'text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-6 first:mt-0';

type RegistrationData = Omit<StudentCreateInput, 'photo' | 'centre_id'> & {
  photo: File | null;
  centre_id: string;
  family_data: Record<string, string | number>;
  socio_economic_data: Record<string, string | boolean>;
  vulnerabilities_data: Array<{ name: string; remarks?: string }>;
  motivation_data: Array<{ category: string; reason: string; narrative?: string }>;
  aspirations_data: { career_goal: string; interests: string; strengths: string };
};

const initialRegistrationData: RegistrationData = {
  full_name: '', nick_name: '', gender: '', dob: '', photo: null, school_name: '',
  school_type: '', class_grade: '', medium_of_instruction: '', attendance_pattern: '',
  previous_academic_performance: '', centre_id: '',
  family_data: {}, socio_economic_data: {}, vulnerabilities_data: [],
  motivation_data: [],
  aspirations_data: { career_goal: '', interests: '', strengths: '' },
};

type FieldChange = (field: keyof RegistrationData, value: RegistrationData[keyof RegistrationData]) => void;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function calculateAge(dob: string) {
  if (!dob) return '';
  const birthDate = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return '';
  const today = new Date();
  const birthdayPassed = today.getMonth() > birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  return today.getFullYear() - birthDate.getFullYear() - (birthdayPassed ? 0 : 1);
}

function Step1({ data, onChange, studentId, existingPhoto }: { data: RegistrationData; onChange: FieldChange; studentId?: string; existingPhoto?: string | null }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Student ID (Auto-generated)">
          <input type="text" value={studentId ?? ''} readOnly className={inputCls + ' bg-slate-50 text-slate-500'} />
        </Field>
        <Field label="Full Name *">
          <input type="text" value={data.full_name} onChange={e => onChange('full_name', e.target.value)} placeholder="Enter full name" className={inputCls} />
        </Field>
        <Field label="Nickname / Call Name">
          <input type="text" value={data.nick_name} onChange={e => onChange('nick_name', e.target.value)} placeholder="Nickname" className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Date of Birth *">
          <input type="date" value={data.dob} onChange={e => onChange('dob', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Gender *">
          <select value={data.gender} onChange={e => onChange('gender', e.target.value)} className={inputCls}>
            <option value="">Select gender</option>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="Age (Auto-calculated)">
          <input type="text" value={calculateAge(data.dob) ? `${calculateAge(data.dob)} years` : ''} readOnly className={inputCls + ' bg-slate-50 text-slate-500'} />
        </Field>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:max-w-md"><Field label="Student Photograph *">
          <div className="flex items-center gap-3">
            {existingPhoto && <img src={existingPhoto} alt="Current student photograph" className="h-16 w-16 rounded-lg object-cover border border-slate-200 shrink-0" />}
            <input type="file" accept="image/*" onChange={e => onChange('photo', e.target.files?.[0] ?? null)} className={inputCls + ' px-2 text-xs file:mr-2 file:border-0 file:bg-transparent file:text-xs file:font-medium'} />
          </div>
          {existingPhoto && <p className="mt-1 text-xs text-slate-500">Current photo saved. Choose a new file only to replace it.</p>}
        </Field></div>
      </div>
    </div>
  );
}

function Step2({ data, onChange }: { data: RegistrationData; onChange: FieldChange }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Current Class / Grade *">
          <select value={data.class_grade} onChange={e => onChange('class_grade', e.target.value)} className={inputCls}>
            <option value="">Select class</option>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(c => (
              <option key={c}>Class {c}</option>
            ))}
            <option>Dropped Out</option>
            <option>Not Enrolled</option>
          </select>
        </Field>
        <Field label="School Name">
          <input type="text" value={data.school_name} onChange={e => onChange('school_name', e.target.value)} placeholder="School / institution name" className={inputCls} />
        </Field>
        <Field label="School Type">
          <select value={data.school_type} onChange={e => onChange('school_type', e.target.value)} className={inputCls}>
            <option value="">Select type</option>
            <option>Government</option>
            <option>Private</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Medium of Instruction">
          <select value={data.medium_of_instruction} onChange={e => onChange('medium_of_instruction', e.target.value)} className={inputCls}>
            <option value="">Select medium</option>
            <option>Tamil Medium</option>
            <option>English Medium</option>
          </select>
        </Field>
        <Field label="School Attendance Pattern">
          <select value={data.attendance_pattern} onChange={e => onChange('attendance_pattern', e.target.value)} className={inputCls}>
            <option value="">Select pattern</option>
            <option>Regular</option>
            <option>Irregular</option>
          </select>
        </Field>
      </div>
      <Field label="Previous Academic Performance">
        <textarea value={data.previous_academic_performance} onChange={e => onChange('previous_academic_performance', e.target.value)} rows={2} placeholder="Last known academic performance..." className={inputCls + ' h-auto'} />
      </Field>
    </div>
  );
}

function Step3({ data, onChange }: { data: RegistrationData; onChange: FieldChange }) {
  return (
    <div className="space-y-4">
      <p className={sectionTitle}>Parent / Guardian Details</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Father's Name">
          <input type="text" value={data.family_data.father_name ?? ''} onChange={e => onChange('family_data', { ...data.family_data, father_name: e.target.value })} placeholder="Father's full name" className={inputCls} />
        </Field>
        <Field label="Father's Occupation">
          <input type="text" value={data.family_data.father_occupation ?? ''} onChange={e => onChange('family_data', { ...data.family_data, father_occupation: e.target.value })} placeholder="e.g. Daily wage labourer" className={inputCls} />
        </Field>
        <Field label="Father's Education">
          <select value={data.family_data.father_education ?? ''} onChange={e => onChange('family_data', { ...data.family_data, father_education: e.target.value })} className={inputCls}>
            <option value="">Select</option>
            <option>Primary</option>
            <option>Upper Primary</option>
            <option>Graduation</option>
            <option>Post graduation</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Mother's Name">
          <input type="text" value={data.family_data.mother_name ?? ''} onChange={e => onChange('family_data', { ...data.family_data, mother_name: e.target.value })} placeholder="Mother's full name" className={inputCls} />
        </Field>
        <Field label="Mother's Occupation">
          <input type="text" value={data.family_data.mother_occupation ?? ''} onChange={e => onChange('family_data', { ...data.family_data, mother_occupation: e.target.value })} placeholder="e.g. Homemaker, Domestic worker" className={inputCls} />
        </Field>
        <Field label="Mother's Education">
          <select value={data.family_data.mother_education ?? ''} onChange={e => onChange('family_data', { ...data.family_data, mother_education: e.target.value })} className={inputCls}>
            <option value="">Select</option>
            <option>Primary</option>
            <option>Upper Primary</option>
            <option>Graduation</option>
            <option>Post graduation</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Guardian (if applicable)">
          <input value={data.family_data.guardian ?? ''} onChange={e => onChange('family_data', { ...data.family_data, guardian: e.target.value })} placeholder="Guardian name" className={inputCls} />
        </Field>
        <Field label="Parent Phone Number">
          <input type="tel" value={data.family_data.parent_phone ?? ''} onChange={e => onChange('family_data', { ...data.family_data, parent_phone: e.target.value })} placeholder="Phone number" className={inputCls} />
        </Field>
        <Field label="School-Going Children">
          <input type="number" min={0} value={data.family_data.school_going_children ?? ''} onChange={e => onChange('family_data', { ...data.family_data, school_going_children: e.target.value ? Number(e.target.value) : '' })} placeholder="Number" className={inputCls} />
        </Field>
      </div>
      <p className={sectionTitle}>Family Composition</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Number of Family Members">
          <input type="number" min={1} max={50} value={data.family_data.family_members ?? ''} onChange={e => onChange('family_data', { ...data.family_data, family_members: e.target.value ? Number(e.target.value) : '' })} placeholder="Number" className={inputCls} />
        </Field>
        <Field label="Birth Order">
          <input type="number" min={1} max={20} value={data.family_data.birth_order ?? ''} onChange={e => onChange('family_data', { ...data.family_data, birth_order: e.target.value ? Number(e.target.value) : '' })} placeholder="e.g. 2 (second child)" className={inputCls} />
        </Field>
      </div>
    </div>
  );
}

function Step4({ data, onChange }: { data: RegistrationData; onChange: FieldChange }) {
  const setSocio = (field: string, value: string | boolean) => onChange('socio_economic_data', { ...data.socio_economic_data, [field]: value });
  const booleanValue = (field: string) => data.socio_economic_data[field] === true ? 'Yes' : data.socio_economic_data[field] === false ? 'No' : '';
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Caste Category">
          <input value={typeof data.socio_economic_data.caste_category === 'string' ? data.socio_economic_data.caste_category : ''} onChange={e => setSocio('caste_category', e.target.value)} placeholder="SC, ST, BC, General" className={inputCls} />
        </Field>
        <Field label="Tribe Name (if applicable)">
          <input value={typeof data.socio_economic_data.tribe_name === 'string' ? data.socio_economic_data.tribe_name : ''} onChange={e => setSocio('tribe_name', e.target.value)} placeholder="Tribe name" className={inputCls} />
        </Field>
        <Field label="Religion">
          <input value={typeof data.socio_economic_data.religion === 'string' ? data.socio_economic_data.religion : ''} onChange={e => setSocio('religion', e.target.value)} placeholder="Religion" className={inputCls} />
        </Field>
        <Field label="Monthly Household Income (₹)">
          <select value={typeof data.socio_economic_data.income_range === 'string' ? data.socio_economic_data.income_range : ''} onChange={e => setSocio('income_range', e.target.value)} className={inputCls}>
            <option value="">Select range</option>
            <option>Below ₹72,000</option>
            <option>₹72,000 – ₹3,00,000</option>
            <option>Above ₹3,00,000</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Housing Condition">
          <select value={typeof data.socio_economic_data.house_type === 'string' ? data.socio_economic_data.house_type : ''} onChange={e => setSocio('house_type', e.target.value)} className={inputCls}>
            <option value="">Select</option>
            <option>Permanent (Pucca)</option>
            <option>Semi-permanent (Semi-Pucca)</option>
            <option>Temporary (Kutcha)</option>
          </select>
        </Field>
        <Field label="Ownership">
          <select value={typeof data.socio_economic_data.ownership === 'string' ? data.socio_economic_data.ownership : ''} onChange={e => setSocio('ownership', e.target.value)} className={inputCls}>
            <option value="">Select</option>
            <option>Own</option>
            <option>Rent</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Access to Electricity">
          <select value={booleanValue('electricity')} onChange={e => setSocio('electricity', e.target.value === 'Yes')} className={inputCls}>
            <option>Yes</option>
            <option>No</option>
            <option>Partial</option>
          </select>
        </Field>
        <Field label="Access to Clean Water">
          <select value={booleanValue('drinking_water')} onChange={e => setSocio('drinking_water', e.target.value === 'Yes')} className={inputCls}>
            <option>Yes</option>
            <option>No</option>
            <option>Partial</option>
          </select>
        </Field>
        <Field label="Study Space at Home">
          <select value={booleanValue('study_space')} onChange={e => setSocio('study_space', e.target.value === 'Yes')} className={inputCls}>
            <option>Yes</option>
            <option>No</option>
            <option value="">Select</option>
          </select>
        </Field>
      </div>
      <Field label="Access to Toilet">
        <select value={booleanValue('toilet')} onChange={e => setSocio('toilet', e.target.value === 'Yes')} className={inputCls}>
          <option value="">Select</option><option>Yes</option><option>No</option>
        </select>
      </Field>
    </div>
  );
}

const VULNERABILITIES = [
  'First-generation learner',
  'Single parent',
  'Orphan / semi-orphan',
  'Migrant family',
  'Child labour risk',
  'Disability',
  'Chronic illness',
  'Extreme poverty',
];

function Step5({ data, onChange }: { data: RegistrationData; onChange: FieldChange }) {
  const selected = data.vulnerabilities_data.map(item => item.name);
  const toggle = (name: string) => {
    const next = selected.includes(name) ? data.vulnerabilities_data.filter(item => item.name !== name) : [...data.vulnerabilities_data, { name }];
    onChange('vulnerabilities_data', next);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className={sectionTitle}>Select All Applicable Vulnerabilities</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {VULNERABILITIES.map(v => (
            <label key={v} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
              selected.includes(v) ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-slate-300 text-slate-700'
            }`}>
              <input
                type="checkbox"
                checked={selected.includes(v)}
                onChange={() => toggle(v)}
                className="w-4 h-4 accent-indigo-600"
              />
              <span className="text-sm font-medium">{v}</span>
            </label>
          ))}
        </div>
      </div>
      <Field label="Other Vulnerability">
        <textarea value={data.vulnerabilities_data.find(item => item.name === 'Other')?.remarks ?? ''} onChange={e => {
          const withoutOther = data.vulnerabilities_data.filter(item => item.name !== 'Other');
          onChange('vulnerabilities_data', e.target.value ? [...withoutOther, { name: 'Other', remarks: e.target.value }] : withoutOther);
        }} rows={3} placeholder="Describe any other vulnerability..." className={inputCls + ' h-auto'} />
      </Field>
    </div>
  );
}

const MOTIVATION_GROUPS = {
  'Academic Reasons': ['Unable to understand school lessons', 'Poor academic performance', 'Weak in reading/writing', 'Weak in specific subjects'],
  'Home Environment': ['No study support at home', 'Parents are not educated', 'No quiet place to study'],
  Vulnerability: ['Risk of dropping out', 'Irregular schooling'],
  'Personal Motivation': ['Interested in learning', 'Wants to improve English', 'Wants to read books', 'Curious learner'],
  'Social Influence': ['Friends attend', 'Parent insisted', 'Teacher recommended'],
  'Developmental Needs': ['Needs discipline', 'Needs confidence building', 'Needs guidance'],
} as const;

const NARRATIVE_FIELDS = ['Child’s life situation before joining', 'Family challenges', 'Academic challenges', 'Behavioral challenges', 'Expectations from program'];

function Step6({ data, onChange }: { data: RegistrationData; onChange: FieldChange }) {
  const selected = data.motivation_data.filter(item => !item.category.startsWith('Narrative')).map(item => item.reason);
  const toggle = (category: string, reason: string) => {
    const exists = data.motivation_data.some(item => item.category === category && item.reason === reason);
    const next = exists
      ? data.motivation_data.filter(item => !(item.category === category && item.reason === reason))
      : [...data.motivation_data, { category, reason }];
    onChange('motivation_data', next);
  };
  const setNarrative = (reason: string, narrative: string) => {
    const without = data.motivation_data.filter(item => !(item.category === 'Narrative' && item.reason === reason));
    onChange('motivation_data', [...without, { category: 'Narrative', reason, narrative }]);
  };
  return (
    <div className="space-y-5">
      <div>
        <p className={sectionTitle}>Select All Applicable Reasons</p>
        {Object.entries(MOTIVATION_GROUPS).map(([category, reasons]) => <div key={category} className="mb-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">{category}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {reasons.map(reason => (
              <label key={reason} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                selected.includes(reason) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}>
                <input type="checkbox" checked={selected.includes(reason)} onChange={() => toggle(category, reason)} className="w-4 h-4 accent-emerald-600" />
                <span className="text-sm font-medium">{reason}</span>
              </label>
            ))}
          </div>
        </div>)}
      </div>
      <div>
        <p className={sectionTitle}>Mandatory Facilitator Narratives</p>
        <div className="space-y-3">
          {NARRATIVE_FIELDS.map(field => <Field key={field} label={`${field} *`}>
            <textarea value={data.motivation_data.find(item => item.category === 'Narrative' && item.reason === field)?.narrative ?? ''} onChange={e => setNarrative(field, e.target.value)} rows={2} className={inputCls + ' h-auto'} />
          </Field>)}
        </div>
      </div>
    </div>
  );
}

function Step7({ data, onChange }: { data: RegistrationData; onChange: FieldChange }) {
  const setAspiration = (field: 'career_goal' | 'interests' | 'strengths', value: string) => onChange('aspirations_data', { ...data.aspirations_data, [field]: value });
  return (
    <div className="space-y-4">
      <Field label="What do you want to become?">
        <textarea value={data.aspirations_data.career_goal} onChange={e => setAspiration('career_goal', e.target.value)} rows={3} placeholder="Record the student's aspiration..." className={inputCls + ' h-auto'} />
      </Field>
      <Field label="Interests (sports, arts, reading, etc.)">
        <textarea value={data.aspirations_data.interests} onChange={e => setAspiration('interests', e.target.value)} rows={3} placeholder="Sports, arts, reading, or other interests..." className={inputCls + ' h-auto'} />
      </Field>
      <Field label="Strengths Observed">
        <textarea value={data.aspirations_data.strengths} onChange={e => setAspiration('strengths', e.target.value)} rows={3} placeholder="Strengths observed by the facilitator..." className={inputCls + ' h-auto'} />
      </Field>
    </div>
  );
}

function Step8({ data, centres, onChange }: { data: RegistrationData; centres: AttendanceCentre[]; onChange: FieldChange }) {
  const selectedCentre = centres.find(centre => centre.id === Number(data.centre_id));
  const [selectedRegion, setSelectedRegion] = useState(selectedCentre?.region ?? '');
  const [selectedDistrict, setSelectedDistrict] = useState(selectedCentre?.district ?? '');
  useEffect(() => {
    if (selectedCentre) {
      setSelectedRegion(selectedCentre.region ?? '');
      setSelectedDistrict(selectedCentre.district ?? '');
    }
  }, [selectedCentre?.id]);
  const regions = [...new Set(centres.map(centre => centre.region).filter(Boolean))] as string[];
  const districts = [...new Set(centres.filter(centre => centre.region === selectedRegion).map(centre => centre.district).filter(Boolean))] as string[];
  const filteredCentres = centres.filter(centre => centre.region === selectedRegion && centre.district === selectedDistrict);
  return (
    <div className="space-y-4">
      <p className={sectionTitle}>Assign to Region & Centre</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Region *">
          <select className={inputCls} value={selectedRegion} onChange={e => { setSelectedRegion(e.target.value); setSelectedDistrict(''); onChange('centre_id', ''); }}>
            <option value="">Select region</option>
            {regions.map(region => <option key={region} value={region}>{region}</option>)}
          </select>
        </Field>
        <Field label="District *">
          <select className={inputCls} value={selectedDistrict} onChange={e => { setSelectedDistrict(e.target.value); onChange('centre_id', ''); }}>
            <option value="">Select district</option>
            {districts.map(district => <option key={district} value={district}>{district}</option>)}
          </select>
        </Field>
        <Field label="Centre *">
          <select className={inputCls} value={data.centre_id} onChange={e => onChange('centre_id', e.target.value)}>
            <option value="">Select centre</option>
            {filteredCentres.map(centre => <option key={centre.id} value={centre.id}>{centre.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="mt-2 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
        <p className="text-sm font-semibold text-indigo-700 mb-1">✓ Ready to submit</p>
        <p className="text-xs text-indigo-600">Review all steps before submitting. The student record will be created and a unique ID will be assigned.</p>
      </div>
    </div>
  );
}

export default function StudentRegistration() {
  const { id } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<RegistrationData>(initialRegistrationData);
  const [centres, setCentres] = useState<AttendanceCentre[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(Boolean(id));
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAttendanceCentres().then(setCentres).catch(() => setError('Unable to load centres. Please try again.'));
  }, []);

  useEffect(() => {
    if (!id) return;
    fetchStudent(id).then(student => {
      const cleanRecord = <T extends Record<string, unknown>>(record: T | null | undefined) => Object.fromEntries(Object.entries(record ?? {}).filter(([, value]) => value !== null)) as T;
      setData({
        ...initialRegistrationData,
        ...student,
        centre_id: String(student.centre.id),
        photo: null,
        family_data: cleanRecord(student.family) as RegistrationData['family_data'],
        socio_economic_data: cleanRecord(student.socio_economic) as RegistrationData['socio_economic_data'],
        vulnerabilities_data: (student.vulnerabilities ?? []).map(item => ({ name: item.name, ...(item.remarks ? { remarks: item.remarks } : {}) })),
        motivation_data: (student.motivations ?? []).map(item => ({ category: item.category, reason: item.reason, ...(item.narrative ? { narrative: item.narrative } : {}) })),
        aspirations_data: { career_goal: student.aspirations?.[0]?.career_goal ?? '', interests: student.aspirations?.[0]?.interests ?? '', strengths: student.aspirations?.[0]?.strengths ?? '' },
      });
      setExistingPhoto(student.photo);
    }).catch(err => setError(err instanceof Error ? err.message : 'Unable to load student.')).finally(() => setLoadingStudent(false));
  }, [id]);

  const updateField: FieldChange = (field, value) => setData(current => ({ ...current, [field]: value }));

  const renderStep = () => {
    if (currentStep === 1) return <Step1 data={data} onChange={updateField} studentId={id} existingPhoto={existingPhoto} />;
    if (currentStep === 2) return <Step2 data={data} onChange={updateField} />;
    if (currentStep === 8) return <Step8 data={data} centres={centres} onChange={updateField} />;
    if (currentStep === 3) return <Step3 data={data} onChange={updateField} />;
    if (currentStep === 4) return <Step4 data={data} onChange={updateField} />;
    if (currentStep === 5) return <Step5 data={data} onChange={updateField} />;
    if (currentStep === 6) return <Step6 data={data} onChange={updateField} />;
    return <Step7 data={data} onChange={updateField} />;
  };

  const handleNext = async () => {
    setError('');
    if (currentStep === 1 && (!data.full_name || !data.dob || !data.gender || (!data.photo && !existingPhoto))) {
      setError('Full name, date of birth, gender, and student photograph are required.');
      return;
    }
    if (currentStep === 2 && !data.class_grade) {
      setError('Current class / grade is required.');
      return;
    }
    if (currentStep === 6 && NARRATIVE_FIELDS.some(field => !data.motivation_data.find(item => item.category === 'Narrative' && item.reason === field)?.narrative?.trim())) {
      setError('All five facilitator narratives are required.');
      return;
    }
    if (currentStep < 8) setCurrentStep(c => c + 1);
    else {
      if (!data.centre_id) { setError('Centre is required.'); return; }
      if (!data.photo && !existingPhoto) { setError('Student photograph is required.'); return; }
      setSaving(true);
      try {
        if (id) {
          const { photo, ...editableData } = data;
          await updateStudent(id, { ...editableData, centre_id: Number(data.centre_id), ...(photo ? { photo } : {}) });
          navigate(`/students/${id}`);
        } else {
          if (!data.photo) throw new Error('Student photograph is required.');
          await createStudent({ ...data, centre_id: Number(data.centre_id), photo: data.photo });
          navigate('/students');
        }
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : 'Unable to save student.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(c => c - 1);
  };

  if (loadingStudent) return <div className="max-w-4xl mx-auto p-8 text-slate-500">Loading student...</div>;

  return <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/students')}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{id ? 'Edit Student' : 'Student Registration'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{id ? 'Update the student profile.' : 'Enroll a new student into the LEP system.'}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row">

        {/* Sidebar Step Indicator */}
        <div className="bg-slate-50 w-full md:w-56 border-b md:border-b-0 md:border-r border-slate-200 p-5 shrink-0">
          <ul className="space-y-1">
            {STEPS.map((step, idx) => {
              const isPast = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              const Icon = step.icon;
              return (
                <li key={step.id} className="relative">
                  {idx !== STEPS.length - 1 && (
                    <div className={`absolute left-[18px] top-9 w-px h-3 ${isPast ? 'bg-indigo-400' : 'bg-slate-200'}`} />
                  )}
                  <button
                    onClick={() => setCurrentStep(step.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                      isCurrent ? 'bg-indigo-600 text-white' :
                      isPast ? 'text-slate-700 hover:bg-slate-100' :
                      'text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isCurrent ? 'bg-white/20' :
                      isPast ? 'bg-indigo-100 text-indigo-600' :
                      'bg-slate-200 text-slate-400'
                    }`}>
                      {isPast ? <Check size={12} strokeWidth={3} className="text-indigo-600" /> : <Icon size={12} />}
                    </div>
                    <span className="text-xs font-medium">{step.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Form Content */}
        <div className="flex-1 p-6 md:p-8 flex flex-col min-h-[560px]">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                {STEPS.find(s => s.id === currentStep)?.name} Details
              </h2>
              <span className="text-xs font-medium text-slate-400">Step {currentStep} of 8</span>
            </div>
            {renderStep()}
            {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentStep === 1
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm'
              }`}
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              {saving ? 'Saving...' : currentStep === 8 ? id ? 'Save Changes' : 'Submit Registration' : 'Next Step →'}
            </button>
          </div>
        </div>
      </div>
    </div>;
}
