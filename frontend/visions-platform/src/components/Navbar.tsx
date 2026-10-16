import { Search, Bell, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clearCurrentUser, getCurrentUser, getUserInitials } from '../lib/auth';
import useAbsenceAlerts from '../hooks/useAbsenceAlerts';
import { absenceAlertReadStateEvent, getAbsenceAlertKey, getReadAbsenceAlertKeys, markAbsenceAlertsRead } from '../lib/absenceAlertReadState';

export default function Navbar({ toggleSidebar }: { toggleSidebar: () => void }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getCurrentUser);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readAlertKeys, setReadAlertKeys] = useState(getReadAbsenceAlertKeys);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const notificationPopoverRef = useRef<HTMLDivElement>(null);
  const { alerts, loading: notificationsLoading, error: notificationsError, summary } = useAbsenceAlerts();

  const unreadCount = alerts.filter(alert => !readAlertKeys.includes(getAbsenceAlertKey(alert))).length;

  const toggleNotifications = () => {
    if (!notificationsOpen) markAbsenceAlertsRead(alerts);
    setNotificationsOpen(!notificationsOpen);
  };

  useEffect(() => {
    const refreshUser = () => setCurrentUser(getCurrentUser());
    window.addEventListener('vge-auth-change', refreshUser);
    return () => window.removeEventListener('vge-auth-change', refreshUser);
  }, []);

  useEffect(() => {
    const refreshReadState = () => setReadAlertKeys(getReadAbsenceAlertKeys());
    window.addEventListener(absenceAlertReadStateEvent, refreshReadState);
    window.addEventListener('vge-auth-change', refreshReadState);
    return () => {
      window.removeEventListener(absenceAlertReadStateEvent, refreshReadState);
      window.removeEventListener('vge-auth-change', refreshReadState);
    };
  }, []);

  useEffect(() => {
    if (notificationsOpen && alerts.length > 0) markAbsenceAlertsRead(alerts);
  }, [alerts, notificationsOpen]);

  useEffect(() => {
    if (!notificationsOpen) return;

    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (notificationButtonRef.current?.contains(target) || notificationPopoverRef.current?.contains(target)) return;
      setNotificationsOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotificationsOpen(false);
    };

    document.addEventListener('pointerdown', handleOutsidePointer);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [notificationsOpen]);

  const handleLogout = () => {
    clearCurrentUser();
    navigate('/login');
  };

  return (
    <header className="relative h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-30 shrink-0">
      <div className="flex-1 flex items-center">
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search students, centres..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            ref={notificationButtonRef}
            type="button"
            aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
            aria-expanded={notificationsOpen}
            onClick={toggleNotifications}
            className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
          </button>
          {notificationsOpen && createPortal(
            <div ref={notificationPopoverRef} className="fixed right-2 top-[4.5rem] z-[1000] w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="font-semibold text-slate-900">Notifications</h2>
                <span className="text-xs text-slate-500">{alerts.length} active</span>
              </div>
              {notificationsLoading && <p className="p-4 text-sm text-slate-500">Checking attendance alerts…</p>}
              {notificationsError && <p role="alert" className="p-4 text-sm text-red-600">Unable to load notifications.</p>}
              {!notificationsLoading && !notificationsError && alerts.length === 0 && (
                <p className="p-4 text-sm text-slate-500">{summary?.enabled === false ? 'Absence alerts are disabled.' : 'No students currently meet the absence alert threshold.'}</p>
              )}
              {alerts.length > 0 && (
                <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                  {alerts.map(alert => (
                    <li key={alert.student_id}>
                      <Link to="/attendance" onClick={() => setNotificationsOpen(false)} className="block px-4 py-3 hover:bg-slate-50">
                        <p className="text-sm font-semibold text-slate-900">{alert.student_name} absent {alert.consecutive_absent_days} days</p>
                        <p className="mt-1 text-xs text-slate-500">{alert.centre_name} · Last absent {alert.last_absent_date}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/settings/notifications" onClick={() => setNotificationsOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-medium text-indigo-600 hover:bg-slate-50">
                View all notifications
              </Link>
            </div>,
            document.body,
          )}
        </div>
        <div className="h-8 w-px bg-slate-200"></div>
        <Link to="/settings/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm border border-indigo-200">
            {getUserInitials(currentUser)}
          </div>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}