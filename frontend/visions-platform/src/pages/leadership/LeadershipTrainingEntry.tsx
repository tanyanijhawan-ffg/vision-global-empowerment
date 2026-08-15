import { useState } from 'react';
import { Save, Plus } from 'lucide-react';
import PageHeader from '../../components/PageHeader';

const leadershipTopics = [
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

export default function LeadershipTrainingEntry() {
  const [trainingName, setTrainingName] = useState('Leadership Foundation Module');
  const [location, setLocation] = useState('BVista Kodaikanal');
  const [facilitator, setFacilitator] = useState('Archana');
  const [date, setDate] = useState('2026-08-13');
  const [duration, setDuration] = useState('3 Hours');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Leadership Training Entry"
        subtitle="Record leadership training schedules, topics covered, retention, and behavioral change observations."
        action={
          <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            <Save size={16} />
            Save Entry
          </button>
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Training Name</label>
            <input value={trainingName} onChange={(e) => setTrainingName(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Duration</label>
            <input value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Facilitator</label>
            <input value={facilitator} onChange={(e) => setFacilitator(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-base font-bold text-slate-900">Topics Covered</h3>
          <button className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600">
            <Plus size={16} />
            Add Topic
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {leadershipTopics.map((topic) => (
            <label key={topic} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              {topic}
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h3 className="text-base font-bold text-slate-900 mb-4">Behavioral Change Tracking</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            'Increased confidence',
            'Takes initiative',
            'Leads group',
            'Helps peers',
            'Improved discipline',
            'Emotional control',
          ].map((item) => (
            <label key={item} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              {item}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
