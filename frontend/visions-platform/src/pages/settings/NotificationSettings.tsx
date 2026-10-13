import { AlertTriangle, Bell, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAbsenceAlerts from '../../hooks/useAbsenceAlerts';

export default function NotificationSettings() {
	const { summary, alerts, loading, error } = useAbsenceAlerts();

	return (
		<section className="p-6 sm:p-8">
			<div className="mb-6 flex items-start gap-3">
				<span className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><Bell size={20} /></span>
				<div>
					<h2 className="text-lg font-bold text-slate-900">Notifications</h2>
					<p className="mt-1 text-sm text-slate-500">Active student attendance alerts for your region.</p>
				</div>
			</div>

			<div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
				<div className="flex items-start gap-2">
					<AlertTriangle size={18} className="mt-0.5 shrink-0" />
					<p>
						{summary?.enabled === false
							? 'Absence notifications are currently disabled in Attendance settings.'
							: `A notification appears after more than ${summary?.threshold_days ?? 3} consecutive recorded attendance sessions are marked absent. A Present or Late record resets the streak.`}
					</p>
				</div>
				<Link to="/attendance/entry" className="mt-3 inline-block font-semibold text-amber-950 underline underline-offset-2">
					Manage attendance alert settings
				</Link>
			</div>

			{loading && <p className="py-8 text-center text-sm text-slate-500">Loading notifications…</p>}
			{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
			{!loading && !error && alerts.length === 0 && (
				<div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
					<Bell className="mx-auto mb-3 text-slate-300" size={28} />
					<p className="font-medium text-slate-700">You’re all caught up</p>
					<p className="mt-1 text-sm text-slate-500">Students with a qualifying absence streak will appear here.</p>
				</div>
			)}
			{alerts.length > 0 && (
				<ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
					{alerts.map(alert => (
						<li key={alert.student_id} className="flex items-start gap-3 p-4">
							<span className="rounded-lg bg-amber-100 p-2 text-amber-700"><CalendarDays size={18} /></span>
							<div className="min-w-0 flex-1">
								<p className="font-semibold text-slate-900">{alert.student_name} has been absent for {alert.consecutive_absent_days} consecutive attendance days</p>
								<p className="mt-1 text-sm text-slate-500">{alert.centre_name} · Last absent {alert.last_absent_date}</p>
							</div>
							<Link to="/attendance" className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-700">View attendance</Link>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}