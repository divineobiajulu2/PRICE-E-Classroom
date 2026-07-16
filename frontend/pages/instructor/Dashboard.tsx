import React, { useEffect, useState } from 'react';
import { Clock, Paperclip } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationService, adminService } from '../../services/api';
import FullPageSkeleton from '../../components/ui/FullPageSkeleton';

const InstructorDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [posting, setPosting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [courses, setCourses] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    const loadMaterials = async () => {
      try {
        setLoading(true);
        const materialsRes = await notificationService.getClassroomMaterials();
        const statsRes = await adminService.getInstructorDashboard().catch(() => null);

        if (!mounted) return;
        setMaterials(Array.isArray(materialsRes) ? materialsRes : []);
        if (statsRes) setStats(statsRes);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || 'Failed to load classroom materials');
      } finally {
        setLoading(false);
      }
    };

    loadMaterials();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setCoursesLoading(true);
        const response: any = await adminService.getCourses();
        const list = Array.isArray(response) ? response : (response?.courses || []);
        setCourses(list);
      } catch (err) {
        console.error('[InstructorDashboard] Failed to load courses:', err);
      } finally {
        setCoursesLoading(false);
      }
    };
    loadCourses();
  }, []);

  const handlePostMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!selectedCourseId) {
      setError('Please select a course.');
      return;
    }

    try {
      setPosting(true);
      const created = await notificationService.createClassroomMaterial({
        title: title.trim(),
        description: description.trim(),
        course: selectedCourseId,
        file_attachment: selectedFile,
      });

      setMaterials((prev) => [created, ...prev]);
      setTitle('');
      setDescription('');
      setSelectedCourseId('');
      setSelectedFile(null);
      setError('');
    } catch (err: any) {
      const permissionMsg = err?.status === 403
        ? 'Permission denied: only instructors may post classroom materials.'
        : err?.message || 'Unable to post material.';
      setError(permissionMsg);
    } finally {
      setPosting(false);
    }
  };

  if (loading) return <FullPageSkeleton />;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-navy rounded-xl p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Courses</p>
            <p className="text-2xl font-bold">{stats?.total_courses_taught ?? '—'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-navy rounded-xl p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 11c1.657 0 3-1.343 3-3S17.657 5 16 5s-3 1.343-3 3 1.343 3 3 3zM8 21v-2a4 4 0 014-4h0a4 4 0 014 4v2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <p className="text-sm text-slate-500">Students</p>
            <p className="text-2xl font-bold">{stats?.total_students_enrolled ?? '—'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-navy rounded-xl p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Pending Submissions</p>
            <p className="text-2xl font-bold">{stats?.pending_submissions_count ?? 0}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-navy rounded-xl p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Recent Grades</p>
            <p className="text-2xl font-bold">{(stats?.recent_grades || []).length}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <p className="text-sm text-slate-500">Post classroom materials or create a new assessment</p>
        </div>
        <div className="flex gap-3">
          <Link to="/instructor/courses" className="px-4 py-2 bg-primary text-white rounded-lg font-semibold">Go to My Courses</Link>
        </div>
      </div>

      <section className="bg-white dark:bg-navy border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-xl font-bold mb-4">Classroom Feed</h3>
        <form onSubmit={handlePostMaterial} className="space-y-3 mb-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Lesson title"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Add a short description"
            rows={3}
          />
          <label className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Attach a file (optional)</span>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
            />
            {selectedFile && (
              <span className="inline-flex items-center gap-2 text-primary">
                <Paperclip size={14} />
                {selectedFile.name}
              </span>
            )}
          </label>
          <div className="flex items-center gap-3">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              disabled={coursesLoading}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="">
                {coursesLoading ? 'Loading courses...' : 'Select a course...'}
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={posting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {posting ? 'Posting...' : 'Post Material'}
            </button>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>

        {materials.length === 0 ? (
          <div className="text-sm text-slate-500">No class materials posted yet.</div>
        ) : (
          <div className="space-y-3">
            {materials.map((item: any) => (
              <div key={item.id} className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{item.title}</p>
                  <span className="text-xs uppercase tracking-wide text-slate-500">{item.study_stream}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{item.description || 'No description provided.'}</p>
                <p className="text-xs text-slate-400 mt-2">Posted {new Date(item.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default InstructorDashboard;
