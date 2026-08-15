import { useMemo, useState } from 'react';
import { BookOpen, BarChart3, TrendingUp, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { students } from '../../data/mockData';

const subjectList = ['Tamil', 'English', 'Mathematics', 'Science', 'Social Science'];
const understandingOptions = ['Understands clearly', 'Needs repetition', 'Does not understand'];
const applicationOptions = ['Applies concepts', 'Memorises only', 'Cannot apply'];
const interestOptions = ['Interested', 'Neutral', 'Disinterested'];
const behaviorOptions = ['Studies independently', 'Needs supervision', 'Irregular', 'Highly motivated'];

type SubjectAssessment = {
  subject: string;
  score: number;
  understanding: string;
  application: string;
  interest: string;
  behavior: string;
};

type StudentAssessment = {
  id: string;
  student: string;
  term: string;
  subjects: SubjectAssessment[];
  narrative: string;
  support: string;
};

const initialRows: StudentAssessment[] = students.slice(0, 4).map((student, index) => ({
  id: student.id,
  student: student.name,
  term: index % 2 === 0 ? 'Quarterly' : 'Half-Yearly',
  subjects: [
    { subject: 'Tamil', score: 82, understanding: 'Understands clearly', application: 'Applies concepts', interest: 'Interested', behavior: 'Highly motivated' },
    { subject: 'English', score: 74, understanding: 'Needs repetition', application: 'Memorises only', interest: 'Neutral', behavior: 'Needs supervision' },
    { subject: 'Mathematics', score: 89, understanding: 'Understands clearly', application: 'Applies concepts', interest: 'Interested', behavior: 'Studies independently' },
    { subject: 'Science', score: 80, understanding: 'Understands clearly', application: 'Applies concepts', interest: 'Interested', behavior: 'Highly motivated' },
    { subject: 'Social Science', score: 78, understanding: 'Understands clearly', application: 'Applies concepts', interest: 'Neutral', behavior: 'Studies independently' },
  ],
  narrative: 'Strong reasoning and improved consistency in class participation.',
  support: 'Continue enrichment in English reading and sentence framing.',
}));

const getTotalPercentage = (subjects: SubjectAssessment[]) => {
  const total = subjects.reduce((sum, subject) => sum + subject.score, 0);
  return Math.round(total / subjects.length);
};

export default function AcademicTracking() {
  const [rows, setRows] = useState<StudentAssessment[]>(initialRows);
  const [selectedTerm, setSelectedTerm] = useState('Quarterly');
  const [selectedSubjectByStudent, setSelectedSubjectByStudent] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialRows.map((row) => [row.id, row.subjects[0]?.subject ?? '']))
  );

  const filteredRows = useMemo(
    () => rows.filter((row) => row.term === selectedTerm),
    [rows, selectedTerm],
  );

  const summaryRows = filteredRows.map((row) => ({
    ...row,
    percentage: getTotalPercentage(row.subjects),
  }));

  const avgPercentage = summaryRows.length
    ? Math.round(summaryRows.reduce((sum, row) => sum + row.percentage, 0) / summaryRows.length)
    : 0;

  const atRisk = summaryRows.filter((row) => row.percentage < 60).length;
  const improved = summaryRows.filter((row) => row.percentage >= 75).length;

  const subjectSummary = subjectList.map((subject) => {
    const avg = filteredRows.length
      ? Math.round(
          filteredRows.reduce((sum, row) => {
            const match = row.subjects.find((item) => item.subject === subject);
            return sum + (match ? match.score : 0);
          }, 0) / filteredRows.length,
        )
      : 0;

    return { subject, avg };
  });

  const onSubjectFieldChange = (studentId: string, subjectName: string, field: keyof SubjectAssessment, value: string | number) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== studentId) return row;

        return {
          ...row,
          subjects: row.subjects.map((subject) => {
            if (subject.subject !== subjectName) return subject;
            return { ...subject, [field]: value } as SubjectAssessment;
          }),
        };
      }),
    );
  };

  const onSubjectSelect = (studentId: string, subjectName: string) => {
    setSelectedSubjectByStudent((prev) => ({
      ...prev,
      [studentId]: subjectName,
    }));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Academic Tracking"
        subtitle="Track quarterly, half-yearly, and annual academic performance with subject-wise diagnostic observations and learning behavior notes."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Average Performance" value={`${avgPercentage}%`} icon={TrendingUp} trend="Current term" trendUp={avgPercentage >= 70} />
        <StatCard title="High Performing" value={improved} icon={BookOpen} trend="≥75%" trendUp={true} />
        <StatCard title="Needs Support" value={atRisk} icon={AlertCircle} trend="<60%" trendUp={false} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Academic Assessment Filters</h3>
          </div>
          <div className="flex gap-2">
            {['Quarterly', 'Half-Yearly', 'Annual'].map((term) => (
              <button
                key={term}
                onClick={() => setSelectedTerm(term)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTerm === term ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3 text-center">Score</th>
                <th className="px-4 py-3">Understanding</th>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Interest</th>
                <th className="px-4 py-3">Learning Behaviour</th>
                <th className="px-4 py-3 text-center">Total %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {summaryRows.map((row) => {
                const currentSubjectName = selectedSubjectByStudent[row.id] ?? row.subjects[0]?.subject ?? '';
                const currentSubject = row.subjects.find((subject) => subject.subject === currentSubjectName) ?? row.subjects[0];

                if (!currentSubject) return null;

                return (
                  <tr key={row.id} className="align-top hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.student}</td>
                    <td className="px-4 py-3">{row.term}</td>
                    <td className="px-4 py-3">
                      <select
                        value={currentSubject.subject}
                        onChange={(e) => onSubjectSelect(row.id, e.target.value)}
                        className="w-full min-w-[150px] rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      >
                        {row.subjects.map((subject) => (
                          <option key={`${row.id}-${subject.subject}`} value={subject.subject}>{subject.subject}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={currentSubject.score}
                        onChange={(e) => onSubjectFieldChange(row.id, currentSubject.subject, 'score', Number(e.target.value))}
                        className="w-16 mx-auto rounded border border-slate-300 bg-white px-2 py-1 text-center outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="w-full min-w-[160px] rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        value={currentSubject.understanding}
                        onChange={(e) => onSubjectFieldChange(row.id, currentSubject.subject, 'understanding', e.target.value)}
                      >
                        {understandingOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="w-full min-w-[150px] rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        value={currentSubject.application}
                        onChange={(e) => onSubjectFieldChange(row.id, currentSubject.subject, 'application', e.target.value)}
                      >
                        {applicationOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="w-full min-w-[140px] rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        value={currentSubject.interest}
                        onChange={(e) => onSubjectFieldChange(row.id, currentSubject.subject, 'interest', e.target.value)}
                      >
                        {interestOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="w-full min-w-[170px] rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        value={currentSubject.behavior}
                        onChange={(e) => onSubjectFieldChange(row.id, currentSubject.subject, 'behavior', e.target.value)}
                      >
                        {behaviorOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-indigo-600">{row.percentage}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Subject-wise Trend</h3>
          </div>
          <div className="space-y-4">
            {subjectSummary.map((entry) => (
              <div key={entry.subject}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{entry.subject}</span>
                  <span className="text-slate-500">{entry.avg}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" style={{ width: `${entry.avg}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Narrative Intervention Notes</h3>
          <div className="space-y-4">
            {summaryRows.map((row) => (
              <div key={`notes-${row.id}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold text-slate-800">{row.student}</p>
                  <span className="text-xs bg-indigo-100 text-indigo-700 rounded-full px-2 py-1">{row.percentage}%</span>
                </div>
                <p className="text-sm text-slate-600 mb-2"><span className="font-semibold text-slate-700">Key improvement:</span> {row.narrative}</p>
                <p className="text-sm text-slate-600"><span className="font-semibold text-slate-700">Support needed:</span> {row.support}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
