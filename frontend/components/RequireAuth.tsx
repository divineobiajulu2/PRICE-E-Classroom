import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authService, tokenService } from '../services/api';
import { UserRole, normalizeUserRole } from '../types';

interface RequireAuthProps {
  allowedRoles?: UserRole[];
}

const RequireAuth: React.FC<RequireAuthProps> = ({ allowedRoles }) => {
  const token = tokenService.getToken();
  if (!token) {
    console.log('[RequireAuth] No token found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  const user = authService.getCurrentUser();
  const location = useLocation();

  if (!user) {
    console.log('[RequireAuth] No user found, redirecting to login');
    tokenService.removeToken();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user.role) {
    console.error('[RequireAuth] User has no role, clearing session');
    tokenService.removeToken();
    localStorage.removeItem('userProfile');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdminUser = normalizeUserRole(user.role) === UserRole.ADMIN;
  const isPending = !isAdminUser && (String(user.status || '').toLowerCase() === 'pending' || user.isActive === false);
  if (isPending) {
    console.warn('[RequireAuth] User has pending approval, redirecting to pending approval page');
    return <Navigate to="/pending-approval" replace />;
  }

  console.log('[RequireAuth] User authenticated:', user.email, 'role:', user.role);
  const roleStr = String(user.role || '').toUpperCase();
  let userRoleEnum = UserRole.INTERN;
  if (roleStr === UserRole.INSTRUCTOR) userRoleEnum = UserRole.INSTRUCTOR;
  else if (roleStr === UserRole.ADMIN) userRoleEnum = UserRole.ADMIN;
  else if (roleStr === UserRole.INTERN) userRoleEnum = UserRole.INTERN;

  if (allowedRoles && !allowedRoles.includes(userRoleEnum)) {
    console.log(`[RequireAuth] User role ${userRoleEnum} not in allowed roles [${allowedRoles.join(', ')}]`);
    if (userRoleEnum === UserRole.ADMIN) return <Navigate to="/admin/dashboard" replace />;
    if (userRoleEnum === UserRole.INSTRUCTOR) return <Navigate to="/instructor/dashboard" replace />;
    return <Navigate to="/intern/dashboard" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;