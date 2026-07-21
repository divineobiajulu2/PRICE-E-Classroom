import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, LogOut, User as UserIcon, X, FileText, Video } from 'lucide-react';
import { UserRole } from '../types';
import { authService } from '../services/api';
import BrandText from './BrandText';

interface SidebarProps {
  role: UserRole;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, isMobileOpen, onCloseMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dashboardPath = role === UserRole.INTERN ? '/intern/dashboard' : role === UserRole.ADMIN ? '/admin/dashboard' : '/instructor/dashboard';

  const navItems = role === UserRole.INTERN
    ? [
        { path: '/intern/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/intern/courses', icon: ClipboardList, label: 'My Courses' },
        { path: '/live-class', icon: Video, label: 'Live Class' },
        { path: '/intern/profile', icon: UserIcon, label: 'My Profile' },
      ]
    : role === UserRole.ADMIN
      ? [
          { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/admin/courses', icon: ClipboardList, label: 'Courses' },
          { path: '/admin/profile', icon: UserIcon, label: 'My Profile' },
        ]
      : [
          { path: '/instructor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/instructor/courses', icon: ClipboardList, label: 'My Courses' },
          { path: '/live-class', icon: Video, label: 'Live Class' },
          { path: '/instructor/profile', icon: UserIcon, label: 'My Profile' },
        ];

  const handleLogout = () => {
    authService.logout();
    onCloseMobile();
    navigate('/login', { replace: true });
  };

  const renderNavItem = ({ path, icon: Icon, label }: { path: string; icon: React.ElementType; label: string }) => {
    const active = location.pathname === path || location.pathname.startsWith(`${path}/`);

    return (
      <Link
        to={path}
        onClick={onCloseMobile}
        className={`flex items-center h-12 px-4 rounded-lg transition-all duration-200 relative group/item ${
          active
            ? 'bg-primary/10 dark:bg-primary/20 text-primary'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
        title={label}
      >
        <div className="min-w-[24px] flex items-center justify-center">
          <Icon size={20} />
        </div>
        <span className="ml-4 font-medium whitespace-nowrap opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
          {label}
        </span>
      </Link>
    );
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white dark:bg-navy border-r border-slate-200 dark:border-slate-800 z-40 transition-all duration-300 ease-in-out shadow-xl md:shadow-none ${
        isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'
      } md:translate-x-0 md:w-20 md:hover:w-64 group`}
    >
      <div className="flex flex-col h-full p-4">
        <Link
          to={dashboardPath}
          className="h-16 flex items-center mb-4 md:justify-center md:group-hover:justify-start transition-all overflow-hidden relative cursor-pointer"
          onClick={onCloseMobile}
        >
          <div className="min-w-[48px] h-12 flex items-center justify-center">
            <img src="/logo.png" alt="PRICE Logo" className="w-10 h-10 object-contain hover:scale-110 transition-transform duration-200" />
          </div>
          <div className="ml-2 flex flex-col md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            <BrandText className="text-lg leading-tight" primaryClassName="text-slate-900 dark:text-white" accentClassName="text-amber-500" />
          </div>
          <button
            onClick={(event) => {
              event.preventDefault();
              onCloseMobile();
            }}
            className="md:hidden absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </Link>

        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {navItems.map((item) => (
            <React.Fragment key={item.path}>{renderNavItem(item)}</React.Fragment>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center h-12 px-4 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="min-w-[24px] flex items-center justify-center">
              <LogOut size={20} />
            </div>
            <span className="ml-4 font-medium whitespace-nowrap md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
              Logout
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;