import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { fetchStudentDashboard } from '../../lib/api';

type Dashboard = {
  student: { id: number; name: string; class: string; section: string };
  currentPerformance: { percentage: number };
  previousPerformance: { percentage: number };
  improvement: { percentage: number; trend: string };
  learningBehaviour: string;
  areasNeedingSupport: string[];
  observation: { keyImprovements: string; subjectsNeedingSupport: string; interventionPlan: string };
};

export default function AcademicProfile() {
  const { studentId } = useParams();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentId) return;
    fetchStudentDashboard(Number(studentId))
      .then((data) => setDashboard(data as unknown as Dashboard))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load student dashboard'));
  }, [studentId]);

  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!dashboard) return <div className="p-8 text-center text-slate-500">Loading academic profile...</div>;

  const cards = [
    ['Current performance', `${dashboard.currentPerformance.percentage}%`],
    ['Previous performance', `${dashboard.previousPerformance.percentage}%`],
    ['Improvement', `${dashboard.improvement.percentage}% ${dashboard.improvement.trend}`],
    ['Learning behaviour', dashboard.learningBehaviour],
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title={dashboard.student.name} subtitle={`${dashboard.student.class}, Section ${dashboard.student.section} · Student #${dashboard.student.id}`} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(([label, value]) => <div key={label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></div>)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><h2 className="font-bold text-slate-900">Areas needing support</h2><p className="mt-3 text-sm text-slate-600">{dashboard.areasNeedingSupport.length ? dashboard.areasNeedingSupport.join(', ') : 'No support areas recorded.'}</p></section>
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm md:col-span-2"><h2 className="font-bold text-slate-900">Observation</h2><dl className="mt-3 space-y-2 text-sm text-slate-600"><div><dt className="font-medium text-slate-800">Key improvements</dt><dd>{dashboard.observation.keyImprovements || 'Not recorded'}</dd></div><div><dt className="font-medium text-slate-800">Subjects needing support</dt><dd>{dashboard.observation.subjectsNeedingSupport || 'Not recorded'}</dd></div><div><dt className="font-medium text-slate-800">Intervention plan</dt><dd>{dashboard.observation.interventionPlan || 'Not recorded'}</dd></div></dl></section>
      </div>
    </div>
  );
}