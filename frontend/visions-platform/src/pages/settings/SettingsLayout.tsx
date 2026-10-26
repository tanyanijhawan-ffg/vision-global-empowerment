import { Link, Outlet, useLocation } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { User, Bell } from 'lucide-react';

const tabs = [
  { id: 'profile', name: 'Profile Settings', icon: User, path: '/settings/profile' },
  { id: 'notifications', name: 'Notifications', icon: Bell, path: '/settings/notifications' },
];

export default function SettingsLayout() {
  const location = useLocation();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader 
        title="Settings" 
        subtitle="Manage your personal preferences and system configuration."
      />

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Nav */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-1">
          {tabs.map(tab => {
            const isActive = location.pathname.includes(tab.path);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                {tab.name}
              </Link>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm min-h-[500px] w-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}