import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminService, authService } from '../../services/api';
import { BookOpen, Plus, Edit2, Trash2, Eye, EyeOff, AlertCircle, Loader } from 'lucide-react';
import { UserRole, normalizeUserRole } from '../../types';

interface Course {
  id: number;
  title: string;
  description: string;
  level: string;
  status: 'Draft' | 'Published';
  total_lessons?: number;
  streams?: string[];
  set_number?: number;
  created_at?: string;
}

const InstructorCourses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const currentUser = authService.getCurrentUser();
  const isAdmin = normalizeUserRole(currentUser?.role) === UserRole.ADMIN;

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all courses - backend should filter for instructor's courses
      const response: any = await adminService.getCourses();
      const allCourses = Array.isArray(response) ? response : (response?.courses || []);
      
      // Filter to show only instructor's courses (backend should do this, but we filter on frontend too for safety)
      setCourses(allCourses);
    } catch (err: any) {
      console.error('[InstructorCourses] Failed to load courses:', err);
      setError(err?.message || 'Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = () => {
    navigate(isAdmin ? '/admin/courses/create' : '/instructor/courses/create');
  };

  const handleEditCourse = (courseId: number) => {
    navigate(isAdmin ? `/admin/courses/${courseId}/edit` : `/instructor/courses/${courseId}/edit`);
  };

  const handleDeleteCourse = async (courseId: number) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;

    try {
      setDeletingId(courseId);
      await adminService.deleteCourse(courseId.toString());
      setCourses(courses.filter(c => c.id !== courseId));
    } catch (err: any) {
      console.error('[InstructorCourses] Failed to delete course:', err);
      setError(err?.message || 'Failed to delete course.');
    } finally {
      setDeletingId(null);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Courses</h1>
            <p className="text-gray-600">{isAdmin ? 'Create and manage courses' : 'Courses you are assigned to teach'}</p>
          </div>
          {isAdmin && (
            <button
              onClick={handleCreateCourse}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-md"
            >
              <Plus className="w-5 h-5" />
              Create Course
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Courses List */}
        {courses.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium mb-2">No courses yet</p>
            <p className="text-gray-500 mb-6">
              {isAdmin ? 'Create your first course to get started' : 'No courses have been assigned to you yet'}
            </p>
            {isAdmin && (
              <button
                onClick={handleCreateCourse}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Course
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-100 overflow-hidden"
              >
                <div className="p-6 flex items-start justify-between">
                  {/* Course Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{course.title}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          course.status === 'Published'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {course.status === 'Published' ? (
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> Published
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <EyeOff className="w-3 h-3" /> Draft
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{course.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span>Level: <strong>{course.level}</strong></span>
                      {course.set_number !== undefined && (
                        <span>Set: <strong>{course.set_number}</strong></span>
                      )}
                      {course.total_lessons && (
                        <span>Lessons: <strong>{course.total_lessons}</strong></span>
                      )}
                      {course.streams && course.streams.length > 0 && (
                        <span>Streams: <strong>{course.streams.join(', ')}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      to={isAdmin ? `/admin/courses/${course.id}` : `/instructor/courses/${course.id}`}
                      className="px-3 py-2 text-sm font-semibold text-primary hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Open Course
                    </Link>
                    {isAdmin && (
                      <button
                        onClick={() => handleEditCourse(course.id)}
                        title="Edit course"
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        disabled={deletingId === course.id}
                        title="Delete course"
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingId === course.id ? (
                          <Loader className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorCourses;
