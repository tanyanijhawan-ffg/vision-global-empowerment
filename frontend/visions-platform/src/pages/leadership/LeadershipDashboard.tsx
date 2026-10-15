import { useEffect, useState } from 'react';
import { Award, Users, TrendingUp } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { fetchStudents, type StudentListItem } from '../../lib/api';

export default function LeadershipDashboard() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudents()
      .then(setStudents)
      .catch(fetchError => setError(fetchError instanceof Error ? fetchError.message : 'Unable to load students.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Leadership & Life Skills"
        subtitle="Track leadership exposure, retention, confidence, behavioral change, and transformation outcomes."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Students Enrolled" value={String(students.length)} icon={Users} />
        <StatCard title="Avg Leadership Rating" value="-" icon={Award} trend="No ratings recorded yet" trendUp={true} />
        <StatCard title="Growth Trend" value="-" icon={TrendingUp} trend="No leadership assessments yet" trendUp={true} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
        {loading && <p className="text-sm text-slate-500">Loading students...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && (
          <>
            <p className="text-sm font-medium text-slate-700">No leadership assessments recorded yet.</p>
            <p className="mt-1 text-xs text-slate-500">
              {students.length
                ? `${students.length} students are enrolled. Record a leadership training entry to start tracking ratings and transformation outcomes.`
                : 'Register students and record a leadership training entry to start tracking ratings and transformation outcomes.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
