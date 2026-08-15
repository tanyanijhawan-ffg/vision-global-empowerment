import { useMemo, useState } from 'react';
import { Award, Users, TrendingUp, Sparkles } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { students } from '../../data/mockData';

const topics = [
  'Self-awareness',
  'Vision for life',
  'Goal setting',
  'Communication skills',
  'Confidence building',
  'Decision making',
  'Problem solving',
  'Teamwork',
  'Responsibility',
  'Time management',
  'Emotional control',
  'Respect and values',
  'Public speaking',
  'Social responsibility',
];

const mockLeadershipData = students.slice(0, 6).map((student, index) => ({
  id: student.id,
  student: student.name,
  confidence: 4 + (index % 2),
  communication: 3 + (index % 3),
  leadership: 4,
  responsibility: 4 + (index % 2),
  teamwork: 5,
  emotionalMaturity: 3 + (index % 3),
  discipline: 4,
  values: 5,
  transformation: 'Developed greater confidence in speaking and taking initiative in class activities.',
  mentoring: 'Encourage more public speaking practice and peer leadership opportunities.',
  topics: topics.slice(0, 6 + (index % 4)),
}));

export default function LeadershipDashboard() {
  const [selectedStudent, setSelectedStudent] = useState(mockLeadershipData[0].id);
  const [selectedTopic, setSelectedTopic] = useState(topics[0]);

  const selectedProfile = useMemo(
    () => mockLeadershipData.find((entry) => entry.id === selectedStudent) ?? mockLeadershipData[0],
    [selectedStudent],
  );

  const avgLeadership = Math.round(
    mockLeadershipData.reduce((sum, item) => sum + (item.confidence + item.communication + item.leadership + item.responsibility + item.teamwork + item.emotionalMaturity + item.discipline + item.values) / 8, 0) /
      mockLeadershipData.length,
  );

  const emergingLeaders = mockLeadershipData.filter((entry) => entry.leadership >= 4).length;
  const growthRate = Math.round((emergingLeaders / mockLeadershipData.length) * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Leadership & Life Skills"
        subtitle="Track leadership exposure, retention, confidence, behavioral change, and transformation outcomes."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Avg Leadership Rating" value={`${avgLeadership}/5`} icon={Award} trend="Current quarter" trendUp={true} />
        <StatCard title="Emerging Leaders" value={emergingLeaders} icon={Users} trend="Leadership score ≥4" trendUp={true} />
        <StatCard title="Growth Trend" value={`${growthRate}%`} icon={TrendingUp} trend="Quarterly improvement" trendUp={true} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
            <h3 className="text-base font-bold text-slate-900">Quarterly Leadership Rating</h3>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              {mockLeadershipData.map((item) => (
                <option key={item.id} value={item.id}>{item.student}</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Confidence', value: selectedProfile.confidence },
              { label: 'Communication', value: selectedProfile.communication },
              { label: 'Leadership', value: selectedProfile.leadership },
              { label: 'Responsibility', value: selectedProfile.responsibility },
              { label: 'Teamwork', value: selectedProfile.teamwork },
              { label: 'Emotional maturity', value: selectedProfile.emotionalMaturity },
              { label: 'Discipline', value: selectedProfile.discipline },
              { label: 'Values', value: selectedProfile.values },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="mb-1 flex justify-between text-sm text-slate-700">
                  <span>{metric.label}</span>
                  <span className="font-semibold">{metric.value}/5</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                    style={{ width: `${(metric.value / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Narrative Transformation</h3>
          </div>
          <div className="space-y-3 text-sm text-slate-700">
            <p><span className="font-semibold text-slate-900">Transformation story:</span> {selectedProfile.transformation}</p>
            <p><span className="font-semibold text-slate-900">Mentoring needs:</span> {selectedProfile.mentoring}</p>
            <p><span className="font-semibold text-slate-900">Topic coverage:</span> {selectedProfile.topics.join(', ')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className="text-base font-bold text-slate-900">Retention Tracking by Topic</h3>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            {topics.map((topic) => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Can recall</th>
                <th className="px-4 py-3">Can explain concept</th>
                <th className="px-4 py-3">Applies in real life</th>
                <th className="px-4 py-3">Shares with others</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {mockLeadershipData.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{student.student}</td>
                  <td className="px-4 py-3">Yes</td>
                  <td className="px-4 py-3">{student.leadership >= 4 ? '4/5' : '3/5'}</td>
                  <td className="px-4 py-3">{student.responsibility >= 4 ? '4/5' : '3/5'}</td>
                  <td className="px-4 py-3">Yes</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
