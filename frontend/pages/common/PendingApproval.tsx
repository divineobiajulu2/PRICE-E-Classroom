import React from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authService, tokenService } from '../../services/api';
import { UserRole } from '../../types';

const getDashboardPath = (role?: string) => {
  const r = String(role || '').toUpperCase();
  if (r === UserRole.INTERN) return '/intern/dashboard';
  if (r === UserRole.ADMIN) return '/admin/dashboard';
  return '/instructor/dashboard';
};

const PendingApproval: React.FC = () => {
  const navigate = useNavigate();
  const token = tokenService.getToken();
  const user = authService.getCurrentUser();
  const isPending = user ? String(user.status || '').toLowerCase() === 'pending' || user.isActive === false : false;

  if (token && user && !isPending) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  const handleLogout = () => {
    tokenService.removeToken();
    localStorage.removeItem('userProfile');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-10 md:p-16 text-center">
          <div className="mx-auto mb-8 h-24 w-24 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-4xl font-bold">
            ⏳
          </div>
          <h1 className="text-4xl font-bold text-navy mb-4">Approval Pending</h1>
          <p className="text-slate-600 text-lg leading-relaxed mb-8">
            Your account is currently pending approval. An administrator will review your application and activate your access shortly.
          </p>
          <div className="space-y-4 sm:space-y-0 sm:flex sm:justify-center sm:gap-4">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Return to Login
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary"
            >
              Clear Session
            </button>
          </div>
          <div className="mt-10 text-sm text-slate-500">
            <p>If you have already been approved, please sign in again after a few minutes.</p>
            <p className="mt-2">If you believe this is an error, contact your administrator.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
