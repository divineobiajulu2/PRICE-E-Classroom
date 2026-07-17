import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, Moon, Sun, Menu, X, Check, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/database';
import { authService } from '../services/api';

interface TopBarProps {
  onToggleSidebar?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    // Load user data
    const currentUser = db.auth.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setNotifications(db.features.getNotifications(currentUser.id));
    }

    // Click outside to close notifications
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    authService.logout();
    localStorage.removeItem('userProfile');
    localStorage.removeItem('auth_token');
    setShowProfileMenu(false);
    navigate('/#/login');
    window.location.reload(); // Ensure clean state
  };

  return (
    <header className="h-16 bg-white dark:bg-navy border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 transition-colors duration-200">
      <div className="flex items-center gap-4 flex-1 max-w-lg">
        {/* Sidebar Toggle Button - Visible ONLY on Mobile */}
        <button 
          onClick={onToggleSidebar}
          className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
        >
          <Menu size={24} />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white placeholder-slate-500 transition-colors"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4 ml-4">
        <button 
          onClick={() => setIsDark(!isDark)}
          className="p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"
          aria-label="Toggle Dark Mode"
        >
          {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-full transition-colors relative ${showNotifications ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Bell size={20} />
            {notifications.some(n => !n.read) && (
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-navy"></span>
            )}
          </button>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-navy rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-sm text-navy dark:text-white">Notifications</h3>
                <button className="text-xs text-primary font-bold hover:underline">Mark all read</button>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length > 0 ? notifications.map(notif => (
                  <div key={notif.id} className={`p-3 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!notif.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <div className="flex justify-between items-start mb-1">
                       <h4 className={`text-sm ${!notif.read ? 'font-bold text-primary' : 'font-medium text-slate-700 dark:text-slate-300'}`}>{notif.title}</h4>
                       <span className="text-[10px] text-slate-400">{notif.time}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{notif.message}</p>
                  </div>
                )) : (
                  <div className="p-8 text-center text-slate-400 text-sm">No new notifications</div>
                )}
              </div>
              <div className="p-2 text-center border-t border-slate-100 dark:border-slate-700">
                 <button className="text-xs font-bold text-slate-500 hover:text-navy dark:hover:text-white">View All History</button>
              </div>
            </div>
          )}
        </div>
        
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 md:mx-2"></div>
        
        {user && (
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role?.toLowerCase()}</p>
              </div>
              <img 
                src={user.avatar || 'https://via.placeholder.com/40'} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 shadow-sm object-cover"
              />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-navy rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-sm font-bold text-navy dark:text-white">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full capitalize">
                    {user.role?.toLowerCase()}
                  </span>
                </div>
                
                <div className="py-2">
                  <button 
                    onClick={() => {
                      navigate('/settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 flex items-center gap-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
                  >
                    <Settings size={18} />
                    Settings
                  </button>
                  
                  <button 
                    onClick={() => {
                      navigate('/settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 flex items-center gap-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
                  >
                    <UserIcon size={18} />
                    Edit Profile
                  </button>
                </div>

                <div className="p-2 border-t border-slate-100 dark:border-slate-700">
                  <button 
                    onClick={handleLogout}
                    className="w-full px-4 py-2 flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm font-medium rounded"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;