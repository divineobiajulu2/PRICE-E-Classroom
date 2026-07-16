import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, FileText, Clock, ArrowLeft } from 'lucide-react';
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
  resource_file_url?: string;
}

interface GroupContent {
  instructor_id: number;
  instructor_username: string;
  materials: MaterialItem[];
  assignments: AssignmentItem[];
}

const CourseInstructorView: React.FC = () => {
  const { id: courseId, instructorId } = useParams<{ id: string; instructorId: string }>();
  const [group, setGroup] = useState<GroupContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!courseId || !instructorId) return;
    loadContent();
  }, [courseId, instructorId]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const data = await adminService.getCourse(courseId!);
      const groupMatch = (data.content_by_instructor || []).find((item: any) => String(item.instructor_id) === String(instructorId));
      if (!groupMatch) {
        setError('Instructor content not found for this course.');
        return;
      }
      setGroup(groupMatch);
    } catch (err: any) {
      console.error('[CourseInstructorView] Failed to load content:', err);
      setError(err?.message || 'Failed to load instructor content.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-center">Loading instructor content...</div>;
  if (error) return <div className="p-12 text-center text-red-600">{error}</div>;
  if (!group) return <div className="p-12 text-center">No instructor content available.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Link to={`/intern/courses/${courseId}`} className="inline-flex items-center gap-2 text-primary hover:underline">
            <ArrowLeft size={16} /> Back to Course
          </Link>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{group.instructor_username}'s Materials</h1>
              <p className="text-slate-500 mt-1">Published materials and assignments available to you.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <BookOpen className="mx-auto mb-2 text-primary" />
                <p className="text-sm text-slate-500">Materials</p>
                <p className="text-xl font-semibold text-slate-900">{group.materials.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <FileText className="mx-auto mb-2 text-primary" />
                <p className="text-sm text-slate-500">Assignments</p>
                <p className="text-xl font-semibold text-slate-900">{group.assignments.length}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Materials</h2>
                <span className="text-sm text-slate-500">{group.materials.length} items</span>
              </div>
              {group.materials.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">No materials have been published by this instructor yet.</div>
              ) : (
                <div className="grid gap-4">
                  {group.materials.map((material) => (
                    <div key={material.id} className="rounded-3xl border border-slate-200 p-5 shadow-sm hover:border-primary transition-colors bg-white">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{material.title}</h3>
                          <p className="mt-2 text-sm text-slate-500">{material.description}</p>
                        </div>
                        {material.file_attachment_url ? (
                          <a href={material.file_attachment_url} target="_blank" rel="noreferrer" className="text-primary font-semibold text-sm hover:underline">Download</a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Assignments</h2>
                <span className="text-sm text-slate-500">{group.assignments.length} items</span>
              </div>
              {group.assignments.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">No assignments are available from this instructor yet.</div>
              ) : (
                <div className="grid gap-4">
                  {group.assignments.map((assignment) => (
                    <div key={assignment.id} className="rounded-3xl border border-slate-200 p-5 shadow-sm bg-white">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{assignment.title}</h3>
                          <p className="mt-1 text-sm text-slate-500">{assignment.assignment_type || 'Assignment'}</p>
                        </div>
                        <div className="text-sm text-slate-500">Due {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'TBD'}</div>
                      </div>
                      <p className="mt-4 text-slate-600">{assignment.description}</p>
                      {assignment.resource_file_url ? (
                        <a href={assignment.resource_file_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline">View Resource</a>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseInstructorView;
