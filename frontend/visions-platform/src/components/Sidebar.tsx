import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Users, 
  CalendarCheck, 
  GraduationCap, 
  Settings, 
  ShieldAlert,
  Menu,
  ChevronDown,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentUser, getRoleLabel, getRouteAccess, getUserInitials } from '../lib/auth';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { 
    name: 'Masters', 
    icon: Map, 
    children: [
      { name: 'Regions', path: '/masters/regions' },
      { name: 'Districts', path: '/masters/districts' },
      { name: 'Centres', path: '/masters/centres' },
      { name: 'Assessments', path: '/masters/assessments' },
    ]
  },
  { name: 'Students', icon: Users, path: '/students' },
  { 
    name: 'Attendance', 
    icon: CalendarCheck, 
    children: [
      { name: 'Dashboard', path: '/attendance' },
      { name: 'Entry', path: '/attendance/entry' },
    ]
  },
  { 
    name: 'Academics', 
    icon: GraduationCap, 
    children: [
      { name: 'Dashboard', path: '/academics' },
      { name: 'Entry', path: '/academics/entry' }
    ]
  },
  { name: 'Users', icon: ShieldAlert, path: '/users' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];

export default function Sidebar({ isOpen, setIsOpen, isMobile = false }: { isOpen: boolean, setIsOpen: (v: boolean) => void, isMobile?: boolean }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(getCurrentUser);
  const userRole = currentUser?.role ?? 'FACILITATOR';
  const displayRole = getRoleLabel(currentUser?.role);

  // On mobile, close the drawer whenever the route changes (user picked a page).
  useEffect(() => {
    if (isMobile) setIsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    const refreshUser = () => setCurrentUser(getCurrentUser());
    window.addEventListener('vge-auth-change', refreshUser);
    return () => window.removeEventListener('vge-auth-change', refreshUser);
  }, []);

  const visibleNavItems = navItems
    .filter((item) => {
      if (item.children) {
        const filteredChildren = item.children.filter((child) => getRouteAccess(userRole, child.path));
        return filteredChildren.length > 0;
      }

      return item.path ? getRouteAccess(userRole, item.path) : true;
    })
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter((child) => getRouteAccess(userRole, child.path)),
        };
      }
      return item;
    });

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Masters: location.pathname.startsWith('/masters'),
    Attendance: location.pathname.startsWith('/attendance'),
    Academics: location.pathname.startsWith('/academics'),
  });

  const toggleGroup = (name: string) => {
    setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const expanded = isMobile ? true : isOpen;

  const panel = (
    <div className={cn(
      "flex flex-col bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out border-r border-slate-800 shadow-xl h-full",
      isMobile
        ? cn("fixed inset-y-0 left-0 z-40 w-64 transform", isOpen ? "translate-x-0" : "-translate-x-full")
        : cn("z-20", isOpen ? "w-64" : "w-20")
    )}>
      {/* Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
        {expanded && (
          <span className="text-white font-bold text-lg tracking-wide whitespace-nowrap overflow-hidden">
            Visions LEP
          </span>
        )}
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors mx-auto">
          {expanded ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <ul className="space-y-1 px-3">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            if (item.children) {
              const isGroupActive = item.children.some(child => location.pathname === child.path);
              return (
                <li key={item.name} className="mb-1">
                  <button
                    onClick={() => {
                      if (!expanded) setIsOpen(true);
                      toggleGroup(item.name);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group",
                      isGroupActive ? "text-white bg-slate-800/50" : "hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} className={cn("shrink-0", isGroupActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-300")} />
                      {expanded && <span className="font-medium text-sm">{item.name}</span>}
                    </div>
                    {expanded && (
                      <ChevronDown size={16} className={cn("transition-transform", openGroups[item.name] && "rotate-180")} />
                    )}
                  </button>
                  <AnimatePresence>
                    {expanded && openGroups[item.name] && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-1 space-y-1 pl-9 pr-2"
                      >
                        {item.children.map(child => {
                          const childActive = location.pathname === child.path;
                          return (
                            <li key={child.name}>
                              <Link
                                to={child.path}
                                className={cn(
                                  "block px-3 py-2 rounded-lg text-sm transition-colors",
                                  childActive ? "bg-indigo-600 text-white font-medium shadow-sm" : "text-slate-400 hover:text-white hover:bg-slate-800"
                                )}
                              >
                                {child.name}
                              </Link>
                            </li>
                          );
                        })}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </li>
              );
            }

            const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));
            return (
              <li key={item.name} className="mb-1">
                <Link
                  to={item.path!}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
                    active ? "bg-indigo-600 text-white shadow-sm" : "hover:bg-slate-800 hover:text-white"
                  )}
                  title={!expanded ? item.name : undefined}
                >
                  <Icon size={20} className={cn("shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-slate-300")} />
                  {expanded && <span className="font-medium text-sm">{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* User */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-500/30">
              {getUserInitials(currentUser)}
          </div>
          {expanded && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentUser?.name || 'User'}</p>
              <p className="text-xs text-slate-400 truncate">{displayRole}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!isMobile) return panel;

  // Mobile: off-canvas drawer with a tap-to-dismiss backdrop.
  return (
    <>
      <div
        aria-hidden="true"
        onClick={() => setIsOpen(false)}
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />
      {panel}
    </>
  );
}