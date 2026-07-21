import React, { useState, useEffect } from 'react';
import { Video, Calendar, Clock, Plus, Trash2, Users, ExternalLink, Monitor } from 'lucide-react';
import { authService, adminService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { UserRole, normalizeUserRole } from '../../types';
import { useNavigate } from 'react-router-dom';

interface LiveSessionData {
  id: number;
  topic: string;
  course_id: number;
  course_title: string;
  instructor_name: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
}

const LiveClassroom: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [sessions, setSessions] = useState<LiveSessionData[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    course: '',
    topic: '',
    date: '',
    time: '',
  });

  const isCreator = normalizeUserRole(user?.role) === UserRole.INSTRUCTOR || normalizeUserRole(user?.role) === UserRole.ADMIN;

  useEffect(() => {
    loadSessions();
    if (isCreator) {
      loadCourses();
    }
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const res = await adminService.getLiveSessions();
      setSessions(res?.sessions || []);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load live sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const res: any = await adminService.getCourses();
      const list = Array.isArray(res) ? res : (res?.courses || []);
      setCourses(list);
    } catch (err) {
      console.error('[LiveClassroom] Failed to load courses:', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.course || !formData.topic || !formData.date || !formData.time) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    try {
      setCreating(true);
      await adminService.createLiveSession(formData);
      showToast('Session scheduled', 'success');
      setShowModal(false);
      setFormData({ course: '', topic: '', date: '', time: '' });
      await loadSessions();
    } catch (err: any) {
      showToast(err?.message || 'Failed to schedule session', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Cancel this live session?')) return;
    try {
      setDeletingId(id);
      await adminService.deleteLiveSession(id);
      showToast('Session cancelled', 'success');
      await loadSessions();
    } catch (err: any) {
      showToast(err?.message || 'Failed to cancel session', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleJoin = (session: LiveSessionData) => {
    navigate(`/live-session/${session.id}`);
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading live sessions...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
            <span className="bg-red-600 text-white p-2 rounded-lg animate-pulse"><Video size={24} /></span>
            Live Classroom
          </h1>
          <p className="text-slate-500 mt-1">
            {isCreator ? 'Schedule and manage your live class sessions.' : 'Join your scheduled classes.'}
          </p>
        </div>

        {isCreator && (
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2"
          >
            <Plus size={20} /> Schedule Session
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.length > 0 ? sessions.map(session => (
          <div key={session.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="h-24 bg-navy text-white p-6 relative flex flex-col justify-center">
              <div className="flex justify-between items-start">
                <span className="bg-white/20 backdrop-blur px-2 py-0.5 rounded text-xs font-bold border border-white/10 flex items-center gap-1">
                  <Monitor size={12} /> {session.course_title}
                </span>
                {isCreator && (
                  <button
                    onClick={() => handleDelete(session.id)}
                    disabled={deletingId === session.id}
                    className="text-white/70 hover:text-white p-1 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <h3 className="font-bold text-lg text-white mt-2 truncate" title={session.topic}>{session.topic}</h3>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <Users size={16} className="text-slate-500" />
                </div>
                <div>
                  <p className="font-bold text-navy">{session.instructor_name}</p>
                  <p className="text-xs text-slate-400">Host</p>
                </div>
              </div>

              <div className="space-y-2 py-2 border-y border-slate-100">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Calendar size={16} className="text-primary" />
                  <span className="font-medium">{session.scheduled_date}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Clock size={16} className="text-primary" />
                  <span className="font-medium">{session.scheduled_time}</span>
                </div>
              </div>

              <div className="mt-auto pt-2">
                <button
                  onClick={() => handleJoin(session)}
                  className="w-full py-3 bg-navy text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-primary transition-colors"
                >
                  Enter Classroom <ExternalLink size={16} />
                </button>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-white border border-dashed border-slate-300 rounded-xl">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Video size={40} />
            </div>
            <h3 className="text-xl font-bold text-navy mb-2">No Scheduled Classes</h3>
            <p className="text-slate-500">
              {isCreator ? 'Schedule a new live session using the button above.' : 'Check back later for upcoming live sessions.'}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-navy p-6 flex justify-between items-center text-white">
              <h3 className="text-xl font-bold flex items-center gap-2"><Plus size={20} /> Schedule Session</h3>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white"><span className="text-2xl">&times;</span></button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-navy mb-1">Course</label>
                <select
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                  value={formData.course}
                  onChange={e => setFormData({ ...formData, course: e.target.value })}
                >
                  <option value="" disabled>Select a course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-navy mb-1">Session Topic</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                  value={formData.topic}
                  onChange={e => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="e.g. Marketing 101: SEO Basics"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-navy mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-navy mb-1">Time</label>
                  <input
                    type="time"
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 py-3 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg disabled:opacity-60">
                  {creating ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveClassroom;