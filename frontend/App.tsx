import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { ToastProvider } from './contexts/ToastContext';
import { authService, tokenService } from './services/api';
import Landing from './pages/Landing';
import Join from './pages/Join';
import Login from './pages/auth/Login';
import InternSignup from './pages/auth/InternSignup';
import InstructorSignup from './pages/auth/InstructorSignup';
import InternDashboard from './pages/intern/Dashboard';
import InstructorDashboard from './pages/instructor/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import MyCourses from './pages/intern/MyCourses';
import AdminCourseDetail from './pages/admin/AdminCourseDetail';
import CreateCourse from './pages/instructor/CreateCourse';
import CourseDetail from './pages/intern/CourseDetail';
import CourseInstructorView from './pages/intern/CourseInstructorView';
import InstructorCourses from './pages/instructor/InstructorCourses';
import InstructorCourseDetail from './pages/instructor/InstructorCourseDetail';
import CreateAssignment from './pages/instructor/CreateAssignment';
import Profile from './pages/common/Profile';
import PendingApproval from './pages/common/PendingApproval';
import NotificationsInbox from './pages/common/NotificationsInbox';
import RequireAuth from './components/RequireAuth';
import { UserRole } from './types';

const SESSION_VERSION = 'price-real-backend-v2';

const DashboardLayout: React.FC<{ role: UserRole }> = ({ role }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex bg-slate-50 dark:bg-background-dark min-h-screen font-sans transition-colors duration-200">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-navy/50 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <Sidebar
        role={role}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out ml-0 md:ml-20 h-screen overflow-hidden">
        <TopBar onToggleSidebar={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-auto bg-white dark:bg-navy">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const getDashboardPath = (role?: string) => {
  const r = String(role || '').toUpperCase();
  if (r === UserRole.INTERN) return '/intern/dashboard';
  if (r === UserRole.ADMIN) return '/admin/dashboard';
  return '/instructor/dashboard';
};

const ProtectedPublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = tokenService.getToken();
  const user = authService.getCurrentUser();
  const isPending = user ? String(user.status || '').toLowerCase() === 'pending' || user.isActive === false : false;

  if (token && user) {
    if (isPending) {
      return <Navigate to="/pending-approval" replace />;
    }
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedSessionVersion = localStorage.getItem('price_session_version');

    if (storedSessionVersion !== SESSION_VERSION) {
      tokenService.removeToken();
      localStorage.removeItem('userProfile');
      localStorage.removeItem('currentUser');
      localStorage.setItem('price_session_version', SESSION_VERSION);
    }

    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ProtectedPublicRoute><Landing /></ProtectedPublicRoute>} />
          <Route path="/join" element={<ProtectedPublicRoute><Join /></ProtectedPublicRoute>} />
          <Route path="/login" element={<ProtectedPublicRoute><Login /></ProtectedPublicRoute>} />
          <Route path="/signup/intern" element={<ProtectedPublicRoute><InternSignup /></ProtectedPublicRoute>} />
          <Route path="/signup/instructor" element={<ProtectedPublicRoute><InstructorSignup /></ProtectedPublicRoute>} />

          <Route path="/intern" element={<RequireAuth allowedRoles={[UserRole.INTERN]} />}>
            <Route element={<DashboardLayout role={UserRole.INTERN} />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<InternDashboard />} />
              <Route path="courses" element={<MyCourses />} />
              <Route path="courses/:id" element={<CourseDetail />} />
              <Route path="courses/:id/instructors/:instructorId" element={<CourseInstructorView />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="/instructor" element={<RequireAuth allowedRoles={[UserRole.INSTRUCTOR, UserRole.ADMIN]} />}>
            <Route element={<DashboardLayout role={UserRole.INSTRUCTOR} />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<InstructorDashboard />} />
              <Route path="courses" element={<InstructorCourses />} />
              <Route path="courses/:id" element={<InstructorCourseDetail />} />
              <Route path="courses/:id/assignments/create" element={<CreateAssignment />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="/admin" element={<RequireAuth allowedRoles={[UserRole.ADMIN]} />}>
            <Route element={<DashboardLayout role={UserRole.ADMIN} />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="courses" element={<InstructorCourses />} />
              <Route path="courses/create" element={<CreateCourse />} />
              <Route path="courses/:id/edit" element={<CreateCourse />} />
              <Route path="courses/:id" element={<AdminCourseDetail />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="/pending-approval" element={<PendingApproval />} />

          <Route path="/notifications" element={<RequireAuth allowedRoles={[UserRole.INTERN, UserRole.INSTRUCTOR, UserRole.ADMIN]} />}>
            <Route element={<DashboardLayout role={UserRole.INTERN} />}>
              <Route index element={<NotificationsInbox />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
};

export default App;