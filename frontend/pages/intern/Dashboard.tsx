import React, { useEffect, useState } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authService, adminService } from '../../services/api';
import FullPageSkeleton from '../../components/ui/FullPageSkeleton';
import { useToast } from '../../contexts/ToastContext';

interface RecentGrade {
  assessment: { title: string; max_points: number };
  submission: {
    id: number;
    score: number | null;
    graded_at: string | null;
    feedback: string | null;
  };
}

const InternDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [userState, setUserState] = useState(authService.getCurrentUser());
  const [courses, setCourses] = useState<any[]>([]);
  const [recentGraded, setRecentGraded] = useState<RecentGrade[]>([]);
  const [gpaAverage, setGpaAverage] = useState<number | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const [meRes, coursesRes, studentStats] = await Promise.all([
          authService.me().catch(() => authService.getCurrentUser()),
          adminService.getStudentCourses().catch(() => ({ courses: [] })),
          adminService.getStudentDashboard().catch(() => null),
        ]);

        if (!mounted) return;

        const me = meRes || authService.getCurrentUser();
        const coursesArr = Array.isArray(coursesRes) ? coursesRes : (coursesRes?.courses || []);

        setUserState(me);
        setCourses(coursesArr);

        if (studentStats) {
          if (Array.isArray(studentStats.recent_grades)) {
            const mapped: RecentGrade[] = studentStats.recent_grades.map((g: any) => ({
              assessment: { title: g.title || g.assignment_title || 'Grade', max_points: g.max_points || 100 },
              submission: {
                id: g.id,
                score: g.score,
                graded_at: g.graded_at,
                feedback: g.feedback,
              },
            }));
            setRecentGraded(mapped);
          }
          if (studentStats.gpa_average !== undefined) {
            setGpaAverage(studentStats.gpa_average);
          }
        }
      } catch (err: any) {
        console.error('Dashboard load error', err);
        showToast(err?.message || 'Failed to load dashboard data', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <FullPageSkeleton />;

  const user = userState || authService.getCurrentUser();
  const safeUser: any = user || {};
  const matricNumber = safeUser.matricNo || safeUser.matricNumber || safeUser.matric_number || 'N/A';
  const setNumber = safeUser.setNumber || safeUser.set_number || 'N/A';
  const studyStream = safeUser.stream || safeUser.studyStream || safeUser.study_stream || 'N/A';

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 bg-gradient-to-r from-navy to-primary rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide">Welcome back</p>
            <h1 className="text-3xl font-bold mt-1">
              {[safeUser.firstName, safeUser.lastName].filter(Boolean).join(' ') || safeUser.username || 'Student'}
            </h1>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm opacity-90 mt-2">
              <div>Matric: <span className="font-semibold">{matricNumber}</span></div>
              <div>Set: <span className="font-semibold">{setNumber}</span></div>
              <div>Stream: <span className="font-semibold">{studyStream}</span></div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-white/80">Student Dashboard</div>
            <Link to="/intern/courses" className="bg-white text-primary px-4 py-2 rounded-lg font-bold">
              My Courses
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">My Courses</h3>
              <Link to="/intern/courses" className="text-sm text-primary font-semibold hover:underline">
                View All →
              </Link>
            </div>
            {courses.length === 0 ? (
              <div className="text-slate-500">No courses are available for your stream and set yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.slice(0, 4).map((c: any) => (
                  <div key={c.id} className="p-4 rounded-lg border border-slate-100 bg-white">
                    <p className="font-semibold text-lg">{c.title}</p>
                    <div className="mt-3 flex justify-end">
                      <Link
                        to={`/intern/courses/${c.id}`}
                        className="text-sm text-primary hover:underline inline-flex items-center gap-2"
                      >
                        Open Course <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4">Recent Performance</h3>
            {recentGraded.length === 0 ? (
              <div className="text-slate-500">No recent graded submissions.</div>
            ) : (
              <div className="space-y-3">
                {recentGraded.map((r) => (
                  <div key={r.submission.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{r.assessment.title}</p>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {r.submission.score ?? '—'}/{r.assessment.max_points ?? '—'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {r.submission.graded_at ? new Date(r.submission.graded_at).toLocaleDateString() : ''}
                        </p>
                      </div>
                    </div>
                    {r.submission.feedback && (
                      <p className="mt-2 text-sm text-slate-600 italic">"{r.submission.feedback.slice(0, 120)}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="lg:col-span-1 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-3">Academic Summary</h3>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">GPA Average</p>
                <p className="font-bold text-lg">{gpaAverage !== null ? gpaAverage.toFixed(2) : '—'}</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-4">
              Open a course to view assignments, materials, and grades from each instructor.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default InternDashboard;