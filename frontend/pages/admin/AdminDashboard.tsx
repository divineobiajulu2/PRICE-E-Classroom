import React, { useState, useEffect, useMemo } from 'react';
import { Users, AlertCircle, Clock, Ban, MoreVertical, Edit2, Shield, Search, Trash2, Filter, Plus, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { adminService, notificationService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import AddUserModal from '../../components/AddUserModal';
import { UserRole, normalizeUserRole, User } from '../../types';

type AdminUser = User & {
  status: 'Active' | 'Pending' | 'Suspended' | string;
  admissionYear?: number | null;
  joined?: string;
  first_name?: string;
  last_name?: string;
  matric_number?: string | null;
  set_number?: string | null;
  study_stream?: string | null;
  profile_photo_url?: string | null;
  phCode?: string | null;
};

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [reviewUser, setReviewUser] = useState<AdminUser | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Load master users and pending approvals on mount
  useEffect(() => {
    let mounted = true;
    const loadAllUsers = async () => {
      try {
        const [allResp, pendingResp] = await Promise.allSettled([
          adminService.getUsers(),
          adminService.getPendingApprovals(),
        ]);

        if (!mounted) return;

        const allRaw = allResp.status === 'fulfilled' ? allResp.value : [];
        const pendingRaw = pendingResp.status === 'fulfilled' ? pendingResp.value : [];

        const usersArr: any[] = Array.isArray(allRaw) ? allRaw : (allRaw && Array.isArray((allRaw as any).users) ? (allRaw as any).users : []);
        const pendingArr: any[] = Array.isArray(pendingRaw) ? pendingRaw : (pendingRaw && Array.isArray((pendingRaw as any).users) ? (pendingRaw as any).users : []);

        const byId = new Map<string, AdminUser>();

        const format = (u: any): AdminUser => ({
          id: (u?.id || u?.user_id || '').toString(),
          username: u?.username || '',
          name: `${u?.first_name || u?.firstName || u?.username || ''} ${u?.last_name || u?.lastName || ''}`.trim() || '',
          role: normalizeUserRole(u?.role),
          avatar: u?.avatar || u?.profile_photo_url || '',
          email: u?.email || '',
          status: u?.is_active ? 'Active' : (u?.status || 'Pending'),
          admissionYear: u?.admission_year || u?.admissionYear || null,
          joined: u?.created_at || u?.joined || new Date().toLocaleDateString(),
          first_name: u?.first_name || u?.firstName || '',
          last_name: u?.last_name || u?.lastName || '',
          matric_number: u?.matric_number || null,
          set_number: u?.set_number || null,
          study_stream: u?.study_stream || null,
          profile_photo_url: u?.profile_photo_url || null,
        });

        usersArr.forEach((u: any) => byId.set(format(u).id, format(u)));
        pendingArr.forEach((u: any) => {
          const f = format(u);
          f.status = 'Pending';
          byId.set(f.id, { ...(byId.get(f.id) || {}), ...f });
        });

        setUsers(Array.from(byId.values()));
        // fetch assignment count for dashboard metrics
        try {
          const assignmentsResp = await notificationService.getAssignments().catch(() => []);
          (window as any).__admin_total_assignments = Array.isArray(assignmentsResp) ? assignmentsResp.length : 0;
        } catch (err) {
          // ignore assignment count errors
        }
      } catch (err) {
        console.error('Failed to load users', err);
      }
    };

    loadAllUsers();
    return () => { mounted = false; };
  }, []);

  // Derived metrics
  const pendingCount = users.filter(u => (u.status || '').toString().toLowerCase() === 'pending').length;
  const totalInternsCount = users.filter(u => normalizeUserRole(u.role) === UserRole.INTERN).length;
  const totalInstructorsCount = users.filter(u => normalizeUserRole(u.role) === UserRole.INSTRUCTOR).length;
  const suspendedCount = users.filter(u => (u.status || '').toString().toLowerCase() === 'suspended').length;

  // Group all interns (active + pending) from the local users state
  const groupedInterns = useMemo(() => {
    const setsMap: Record<string, any> = {};
    const interns = users.filter(u => normalizeUserRole(u.role) === UserRole.INTERN);
    
    interns.forEach(intern => {
      const setNum = intern.set_number || 'Unassigned';
      const stream = intern.study_stream || 'General';
      
      if (!setsMap[setNum]) {
        setsMap[setNum] = { set_number: setNum, streams: {} };
      }
      if (!setsMap[setNum].streams[stream]) {
        setsMap[setNum].streams[stream] = [];
      }
      setsMap[setNum].streams[stream].push(intern);
    });
    
    return Object.values(setsMap).sort((a: any, b: any) => {
      if (a.set_number === 'Unassigned') return 1;
      if (b.set_number === 'Unassigned') return -1;
      return Number(a.set_number) - Number(b.set_number);
    });
  }, [users]);

  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this user? This action is irreversible.')) return;
    try {
      await adminService.deleteUser(id);
      showToast('✅ User deleted', 'success');
      await handleRefreshUsers();
    } catch (err) {
      console.error('Delete failed', err);
      showToast('Failed to delete user', 'error');
    }
  };

  const handleRefreshUsers = async (): Promise<void> => {
    try {
      const all = await adminService.getUsers().catch(() => []);
      const formatted = Array.isArray(all) ? all : (all && Array.isArray((all as any).users) ? (all as any).users : []);
      const mapped: AdminUser[] = (formatted || []).map((u: any) => ({
        id: (u?.id || u?.user_id || '').toString(),
        username: u?.username || '',
        name: `${u?.first_name || u?.firstName || u?.username || ''} ${u?.last_name || u?.lastName || ''}`.trim() || '',
        role: normalizeUserRole(u?.role),
        avatar: u?.avatar || u?.profile_photo_url || '',
        email: u?.email || '',
        admissionYear: u?.admission_year || u?.admissionYear || null,
        joined: u?.created_at || new Date().toLocaleDateString(),
        status: u?.is_active ? 'Active' : 'Pending',
        set_number: u?.set_number || null,
        study_stream: u?.study_stream || null,
      } as AdminUser));
      setUsers(mapped);
      showToast('✅ User list refreshed', 'success');
    } catch (err) {
      console.error('Refresh failed', err);
      showToast('Failed to refresh users', 'error');
    }
  };

  const handleStatusChange = (id: string): void => {
    setUsers((prev) => prev.map(user => user.id === id ? { ...user, status: user.status === 'Active' ? 'Suspended' : 'Active' } : user));
    showToast('✅ Status updated locally', 'success');
  };

  const handleApprove = async (user: AdminUser) => {
    if (approvingId || decliningId) return;
    setApprovingId(user.id);
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    try {
      await adminService.approveUser(user.id);
      showToast(`Approved ${user.name || user.username}`, 'success', 2500);
      setReviewUser(null);
      await handleRefreshUsers();
    } catch (err) {
      console.error('Approve failed', err);
      showToast('Failed to approve user. Reverting.', 'error', 4000);
      setUsers((prev) => [user, ...prev]);
    } finally {
      setApprovingId(null);
    }
  };

  const handleDecline = async (user: AdminUser) => {
    if (approvingId || decliningId) return;
    setDecliningId(user.id);
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    try {
      await adminService.declineUser(user.id);
      showToast(`Declined ${user.name || user.username}`, 'success', 2500);
      setReviewUser(null);
      await handleRefreshUsers();
    } catch (err) {
      console.error('Decline failed', err);
      showToast('Failed to decline user. Reverting.', 'error', 4000);
      setUsers((prev) => [user, ...prev]);
    } finally {
      setDecliningId(null);
    }
  };

  const handleReview = async (user: AdminUser) => {
    try {
      const details = await adminService.getUser(user.id).catch(() => user);
      const formatted: AdminUser = {
        id: (details?.id || details?.user_id || user.id).toString(),
        username: details?.username || user.username || '',
        name: `${details?.first_name || details?.firstName || details?.username || user.name || ''} ${details?.last_name || details?.lastName || ''}`.trim() || '',
        role: normalizeUserRole(details?.role),
        avatar: details?.avatar || details?.profile_photo_url || user.avatar || '',
        email: details?.email || user.email || '',
        admissionYear: details?.admission_year || details?.admissionYear || user.admissionYear || null,
        joined: details?.created_at || details?.joined || user.joined || new Date().toLocaleDateString(),
        status: details?.is_active ? 'Active' : (details?.status || user.status || 'Pending'),
        first_name: details?.first_name || details?.firstName || user.first_name || '',
        last_name: details?.last_name || details?.lastName || user.last_name || '',
        matric_number: details?.matric_number || user.matric_number || null,
        set_number: details?.set_number || user.set_number || null,
        study_stream: details?.study_stream || user.study_stream || null,
        profile_photo_url: details?.profile_photo_url || user.profile_photo_url || null,
        phCode: details?.ph_code || details?.phCode || (user as any).phCode || null,
      } as AdminUser;
      setReviewUser(formatted);
    } catch (err) {
      console.error('Failed to load user details', err);
      showToast('Failed to load user details', 'error');
    }
  };

  const formatStreamLabel = (streamName: string) => {
    const normalized = streamName.toLowerCase();
    if (normalized === 'mechatronics') return 'Mechatronics';
    if (normalized === 'ict' || normalized === 'i.c.t') return 'I.C.T';
    if (normalized === 'pls' || normalized === 'physical & life sciences' || normalized === 'biosciences') return 'Physical & Life Sciences';
    if (normalized === 'general') return 'General';
    return streamName.charAt(0).toUpperCase() + streamName.slice(1);
  };

  const filteredUsers = users.filter(user => {
    const name = (user?.name || '').toString().toLowerCase();
    const email = (user?.email || '').toString().toLowerCase();
    const role = normalizeUserRole(user?.role);
    const selectedRole = filterRole === 'All' ? null : normalizeUserRole(filterRole);
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    const matchesRole = !selectedRole || role === selectedRole;
    return matchesSearch && matchesRole;
  });

  return (
    <>
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-navy to-primary rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide">Welcome back</p>
            <h1 className="text-3xl font-bold mt-1">Admin Dashboard</h1>
            <p className="text-sm opacity-90 mt-2">Manage instructors, interns, and platform approvals.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div></div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input 
               type="text" 
               placeholder="Search users..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary/20 outline-none"
             />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm whitespace-nowrap transition-colors"
          >
            <Plus size={18} /> Add User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-sm font-medium mb-1">Total Users</p>
          <p className="text-3xl font-bold text-navy">{users.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-sm font-medium mb-1">Total Interns</p>
          <p className="text-3xl font-bold text-secondary">{totalInternsCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-sm font-medium mb-1">Total Instructors</p>
          <p className="text-3xl font-bold text-blue-600">{totalInstructorsCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-sm font-medium mb-1">Pending Approvals</p>
          <p className="text-3xl font-bold text-amber-500">{pendingCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-sm font-medium mb-1">Suspended</p>
          <p className="text-3xl font-bold text-red-500">{suspendedCount}</p>
        </div>
      </div>

      {/* All Interns grouped view */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-3">All Interns (by Set & Stream)</h2>
        {groupedInterns.length === 0 ? (
          <div className="text-sm text-slate-500">No interns found.</div>
        ) : (
          <div className="space-y-4">
            {groupedInterns.map((set: any) => {
              const internCount = Object.values(set.streams || {}).reduce<number>((count, stream: any) => {
                return count + (Array.isArray(stream) ? stream.length : 0);
              }, 0);

              return (
                <div key={`set-${set.set_number}`} className="bg-white border border-slate-100 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h3 className="font-semibold">Set {set.set_number}</h3>
                    <span className="text-sm text-slate-500">{internCount} interns</span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(set.streams || {}).map(([streamName, students]: any) => (
                      <div key={streamName} className="p-3 border rounded-lg bg-slate-50">
                        <div className="flex items-center justify-between mb-3 gap-2">
                          <p className="text-sm font-medium">{formatStreamLabel(streamName)}</p>
                          <span className="text-xs text-slate-500">{students.length}</span>
                        </div>
                        <ul className="text-sm space-y-1">
                          {students.map((s: any) => (
                            <li key={s.id} className="flex items-center justify-between py-1">
                              <span className="flex items-center gap-2">
                                <span className="text-slate-800">{s.first_name ? `${s.first_name} ${s.last_name}` : s.username}</span>
                                {s.status === 'Pending' && (
                                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Pending</span>
                                )}
                              </span>
                              <span className="text-xs text-slate-500">{s.matric_number || s.email}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex gap-4">
           <button 
             onClick={() => setFilterRole('All')}
             className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${filterRole === 'All' ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
           >
             All Users
           </button>
           <button 
             onClick={() => setFilterRole('Instructor')}
             className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${filterRole === 'Instructor' ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Instructors
           </button>
           <button 
             onClick={() => setFilterRole('Intern')}
             className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${filterRole === 'Intern' ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Interns
           </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date Joined</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => {
                  const role = normalizeUserRole(user.role);
                  return (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={user.avatar || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover" alt="" />
                        <div>
                          <p className="font-bold text-slate-900">{user.name}</p>
                          {user.matric_number ? (
                            <p className="text-xs text-slate-500">{user.matric_number} {user.admissionYear ? `• Admission ${user.admissionYear}` : ''}</p>
                          ) : (
                            <p className="text-xs text-slate-500">{user.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${role === UserRole.INSTRUCTOR ? 'bg-blue-50 text-blue-700 border-blue-100' : role === UserRole.ADMIN ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{user.joined}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        user.status === 'Active' ? 'bg-green-100 text-green-700' : 
                        user.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                        user.status === 'Suspended' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {user.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => handleApprove(user)}
                              disabled={approvingId === user.id}
                              className={`bg-primary text-white text-xs font-bold px-3 py-1.5 rounded transition-colors ${approvingId === user.id ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                            >
                              {approvingId === user.id ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                'Approve'
                              )}
                            </button>
                            <button onClick={() => handleReview(user)} className="ml-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded hover:bg-slate-50 transition-colors">
                              Review
                            </button>
                            <button
                              onClick={() => handleDecline(user)}
                              disabled={decliningId === user.id}
                              className={`ml-2 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors ${decliningId === user.id ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-700'}`}
                            >
                              {decliningId === user.id ? 'Declining...' : 'Decline'}
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="hover:text-primary p-1" title="Edit"><Edit2 size={16} /></button>
                            <button 
                              onClick={() => handleStatusChange(user.id)} 
                              className={`p-1 ${user.status === 'Suspended' ? 'text-green-500 hover:text-green-700' : 'hover:text-amber-500'}`} 
                              title={user.status === 'Suspended' ? 'Activate' : 'Suspend'}
                            >
                              <Ban size={16} />
                            </button>
                            <button onClick={() => handleDelete(user.id)} className="hover:text-red-500 p-1" title="Delete"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing <span className="font-bold">{filteredUsers.length}</span> results</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-slate-200 rounded text-sm text-slate-400 cursor-not-allowed">Previous</button>
            <button className="px-3 py-1 bg-primary text-white rounded text-sm font-bold">1</button>
            <button className="px-3 py-1 border border-slate-200 rounded text-sm hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>

      <AddUserModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onUserAdded={handleRefreshUsers}
      />

      {reviewUser && (
        <div className="fixed inset-0 z-50 bg-navy/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-navy">Review Registration</h2>
                <p className="text-sm text-slate-500">{reviewUser.email}</p>
              </div>
              <button onClick={() => setReviewUser(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Name</p>
                <p className="font-semibold text-slate-800">{reviewUser.name || reviewUser.username || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Role</p>
                <p className="font-semibold text-slate-800">{reviewUser.role || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Matric Number</p>
                <p className="font-semibold text-slate-800">{reviewUser.matric_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">PH Code</p>
                <p className="font-semibold text-slate-800">{reviewUser.phCode ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Admission Year</p>
                <p className="font-semibold text-slate-800">{reviewUser.admissionYear || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Set</p>
                <p className="font-semibold text-slate-800">{reviewUser.set_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Stream</p>
                <p className="font-semibold text-slate-800">{reviewUser.study_stream || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Status</p>
                <p className="font-semibold text-slate-800">{reviewUser.status}</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => handleDecline(reviewUser)} disabled={decliningId === reviewUser.id} className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-70">
                {decliningId === reviewUser.id ? 'Declining...' : 'Decline'}
              </button>
              <button onClick={() => handleApprove(reviewUser)} disabled={approvingId === reviewUser.id} className="px-4 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-70">
                {approvingId === reviewUser.id ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default AdminDashboard;