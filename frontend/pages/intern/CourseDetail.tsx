import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, Users, Clock, ArrowRight } from 'lucide-react';
import { adminService } from '../../services/api';

interface InstructorAssignment {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

interface Course {
  id: number;
  title: string;
  description: string;
  level: string;
  streams?: string[];
  set_number?: number;
  instructors: InstructorAssignment[];
}

const CourseDetail: React.FC = () => {
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
      console.error('[CourseDetail] Failed to load course:', err);
      setError(err?.message || 'Failed to load course.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-center">Loading course...</div>;
  if (error) return <div className="p-12 text-center text-red-600">{error}</div>;
  if (!course) return <div className="p-12 text-center">Course not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="rounded-3xl bg-white shadow-sm border border-slate-200 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{course.title}</h1>
              <p className="mt-2 text-slate-500">{course.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <BookOpen className="mx-auto mb-2 text-primary" />
                <p className="text-sm text-slate-500">Level</p>
                <p className="text-xl font-semibold text-slate-900">{course.level}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <Clock className="mx-auto mb-2 text-primary" />
                <p className="text-sm text-slate-500">Streams</p>
                <p className="text-xl font-semibold text-slate-900">{course.streams?.join(', ') || 'General'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <Users className="mx-auto mb-2 text-primary" />
                <p className="text-sm text-slate-500">Assigned Instructors</p>
                <p className="text-xl font-semibold text-slate-900">{course.instructors?.length ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Course Instructors</h2>
              <p className="text-sm text-slate-500">Select an instructor to view their published course materials.</p>
            </div>
          </div>

          {course.instructors && course.instructors.length > 0 ? (
            <div className="grid gap-4">
              {course.instructors.map((instructor) => (
                <Link
                  key={instructor.id}
                  to={`/intern/courses/${course.id}/instructors/${instructor.id}`}
                  className="group block rounded-3xl border border-slate-200 p-4 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900 group-hover:text-primary">{instructor.first_name || instructor.username} {instructor.last_name || ''}</p>
                      <p className="text-sm text-slate-500">{instructor.username}</p>
                    </div>
                    <ArrowRight className="text-slate-400 group-hover:text-primary" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              No instructors have been assigned to this course yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
