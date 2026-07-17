import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, FileText, Plus, ArrowLeft, Award, X } from 'lucide-react';
import { adminService, authService, notificationService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

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

interface Course {
  id: number;
  title: string;
  description: string;
  level: string;
  streams?: string[];
  set_number?: number;
  content_by_instructor?: {
    instructor_id: number;
    instructor_username: string;
    materials: MaterialItem[];
    assignments: AssignmentItem[];
  }[];
}

interface GradeItem {
  id: number;
  student_username: string;
  title: string;
  score: number;
  feedback?: string;
}

const InstructorCourseDetail: React.FC = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDescription, setMaterialDescription] = useState('');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [postingMaterial, setPostingMaterial] = useState(false);

  const { showToast } = useToast();
  const currentUser = authService.getCurrentUser();
  const [deletingMaterialId, setDeletingMaterialId] = useState<number | null>(null);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<number | null>(null);

  const handleDeleteMaterial = async (materialId: number) => {
    if (!window.confirm('Delete this material? This cannot be undone.')) return;
    try {
      setDeletingMaterialId(materialId);
      await adminService.deleteMaterial(materialId);
      showToast('Material deleted', 'success');
      await loadCourse();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete material.', 'error');
    } finally {
      setDeletingMaterialId(null);
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!window.confirm('Delete this assignment? This cannot be undone.')) return;
    try {
      setDeletingAssignmentId(assignmentId);
      await adminService.deleteAssignment(assignmentId);
      showToast('Assignment deleted', 'success');
      await loadCourse();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete assignment.', 'error');
    } finally {
      setDeletingAssignmentId(null);
    }
  };

  useEffect(() => {
    if (!courseId) return;
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const [courseData, gradesData] = await Promise.all([
        adminService.getCourse(courseId!),
        adminService.getCourseGrades(courseId!).catch(() => []),
      ]);
      setCourse(courseData);
      setGrades(Array.isArray(gradesData) ? gradesData : []);
    } catch (err: any) {
      console.error('[InstructorCourseDetail] Failed to load course:', err);
      setError(err?.message || 'Failed to load course.');
    } finally {
      setLoading(false);
    }
  };

  const handlePostMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialTitle.trim() || !courseId) return;

    try {
      setPostingMaterial(true);
      await notificationService.createClassroomMaterial({
        title: materialTitle.trim(),
        description: materialDescription.trim(),
        course: courseId,
        file_attachment: materialFile,
      });
      showToast('Material posted successfully', 'success');
      setMaterialTitle('');
      setMaterialDescription('');
      setMaterialFile(null);
      setShowMaterialForm(false);
      await loadCourse();
    } catch (err: any) {
      showToast(err?.message || 'Failed to post material.', 'error');
    } finally {
      setPostingMaterial(false);
    }
  };

  if (loading) return <div className="p-12 text-center">Loading course...</div>;
  if (error) return <div className="p-12 text-center text-red-600">{error}</div>;
  if (!course) return <div className="p-12 text-center">Course not found.</div>;

  const myContent = (course.content_by_instructor || []).find(
    (entry) => String(entry.instructor_id) === String(currentUser?.id)
  );
  const materials = myContent?.materials || [];
  const assignments = myContent?.assignments || [];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <Link to="/instructor/courses" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft size={16} /> Back to My Courses
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <BookOpen size={20} className="text-primary" /> My Materials
            </h2>
            <button
              onClick={() => setShowMaterialForm((prev) => !prev)}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              {showMaterialForm ? <X size={16} /> : <Plus size={16} />}
              {showMaterialForm ? 'Cancel' : 'Post Material'}
            </button>
          </div>

          {showMaterialForm && (
            <form onSubmit={handlePostMaterial} className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                placeholder="Material title (e.g. Week 3 Notes)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <textarea
                value={materialDescription}
                onChange={(e) => setMaterialDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <label className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600">
                <span className="font-medium text-slate-700">Attach a file or video (optional)</span>
                <input
                  type="file"
                  onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                  className="text-sm"
                />
                {materialFile && <span className="text-primary">{materialFile.name}</span>}
              </label>
              <button
                type="submit"
                disabled={postingMaterial || !materialTitle.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {postingMaterial ? 'Posting...' : 'Post Material'}
              </button>
            </form>
          )}

          {materials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
              You haven't posted any materials for this course yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {materials.map((m) => (
                <div key={m.id} className="rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{m.title}</p>
                    <p className="text-sm text-slate-500 mt-1">{m.description}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteMaterial(m.id)}
                    disabled={deletingMaterialId === m.id}
                    className="text-xs font-semibold text-red-600 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                  >
                    {deletingMaterialId === m.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <FileText size={20} className="text-primary" /> My Assignments
            </h2>
            <Link
              to={`/instructor/courses/${courseId}/assignments/create`}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              <Plus size={16} /> Create Assignment
            </Link>
          </div>
          {assignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
              You haven't created any assignments for this course yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {assignments.map((a) => (
                <div key={a.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap justify-between items-start gap-2">
                  <p className="font-semibold text-slate-900">{a.title}</p>
                   <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-400">
                        Due {a.due_date ? new Date(a.due_date).toLocaleDateString() : 'TBD'}
                      </span>
                      <button
                        onClick={() => handleDeleteAssignment(a.id)}
                        disabled={deletingAssignmentId === a.id}
                        className="text-xs font-semibold text-red-600 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                      >
                        {deletingAssignmentId === a.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{a.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Award size={20} className="text-primary" /> Grades
          </h2>
          {grades.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
              No grades recorded for this course yet.
            </div>
          ) : (
            <div className="grid gap-2">
              {grades.map((g) => (
                <div key={g.id} className="flex justify-between items-center rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div>
                    <p className="font-semibold text-slate-800">{g.student_username}</p>
                    <p className="text-xs text-slate-500">{g.title}</p>
                  </div>
                  <p className="font-bold text-slate-900">{g.score}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorCourseDetail;