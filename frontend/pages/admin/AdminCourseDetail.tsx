import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, FileText, ArrowLeft, Users } from 'lucide-react';
import { adminService } from '../../services/api';

interface MaterialItem {
  id: number;
  title: string;
  description: string;
  file_attachment_url?: string;
}

interface AssignmentItem {
  id: number;
  title: string;
  description: string;
  due_date?: string;
  assignment_type?: string;
}

interface InstructorContent {
  instructor_id: number;
  instructor_username: string;
  materials: MaterialItem[];
  assignments: AssignmentItem[];
}

interface Course {
  id: number;
  title: string;
  description: string;
  level: string;
  streams?: string[];
  set_number?: number;
  content_by_instructor?: InstructorContent[];
}

const AdminCourseDetail: React.FC = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!courseId) return;
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const data = await adminService.getCourse(courseId!);
      setCourse(data);
    } catch (err: any) {
      console.error('[AdminCourseDetail] Failed to load course:', err);
      setError(err?.message || 'Failed to load course.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-center">Loading course...</div>;
  if (error) return <div className="p-12 text-center text-red-600">{error}</div>;
  if (!course) return <div className="p-12 text-center">Course not found.</div>;

  const contentByInstructor = course.content_by_instructor || [];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <Link to="/admin/courses" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft size={16} /> Back to Courses
        </Link>

        <div className="rounded-3xl bg-white shadow-sm border border-slate-200 p-8">
          <h1 className="text-3xl font-bold text-slate-900">{course.title}</h1>
          <p className="mt-2 text-slate-500">{course.description}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
            <span>Set: <strong>{course.set_number}</strong></span>
            <span>Streams: <strong>{(course.streams || []).join(', ') || 'General'}</strong></span>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-6">
            <Users size={20} className="text-primary" /> Content by Instructor
          </h2>

          {contentByInstructor.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              No instructors have posted any content for this course yet.
            </div>
          ) : (
            <div className="space-y-6">
              {contentByInstructor.map((entry) => (
                <div key={entry.instructor_id} className="rounded-2xl border border-slate-200 p-5">
                  <h3 className="font-semibold text-slate-900 mb-3">{entry.instructor_username}</h3>

                  {entry.materials.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-2">
                        <BookOpen size={14} /> Materials ({entry.materials.length})
                      </p>
                      <div className="grid gap-2">
                        {entry.materials.map((m) => (
                          <div key={m.id} className="rounded-lg bg-slate-50 p-3">
                            <p className="font-medium text-sm text-slate-800">{m.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.assignments.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-2">
                        <FileText size={14} /> Assignments ({entry.assignments.length})
                      </p>
                      <div className="grid gap-2">
                        {entry.assignments.map((a) => (
                          <div key={a.id} className="rounded-lg bg-slate-50 p-3">
                            <p className="font-medium text-sm text-slate-800">{a.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.materials.length === 0 && entry.assignments.length === 0 && (
                    <p className="text-sm text-slate-400">No content posted yet.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCourseDetail;