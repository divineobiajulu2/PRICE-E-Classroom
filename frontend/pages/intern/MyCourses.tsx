import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/api';
import { ChevronRight, BookOpen, AlertCircle, Loader } from 'lucide-react';

interface Course {
  id: number;
  title: string;
  description: string;
  level: string;
  instructor_username: string;
  status: string;
  total_lessons?: number;
  streams?: string[];
}


const MyCourses: React.FC = () => {
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError('');

      const enrolledResp = await adminService.getStudentCourses();
      const enrolled = enrolledResp.courses || [];
      setEnrolledCourses(enrolled);
    } catch (err: any) {
      console.error('[MyCourses] Failed to load courses:', err);
      setError(err?.message || 'Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCourse = (courseId: number) => {
    navigate(`/intern/courses/${courseId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Courses</h1>
          <p className="text-gray-600">View all courses auto-assigned for your stream and set.</p>
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

        <section>
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              Courses for Your Stream & Set ({enrolledCourses.length})
            </h2>
          </div>

          {enrolledCourses.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No courses are available for your stream and set yet.</p>
              <p className="text-sm text-gray-500 mt-2">Once an admin publishes a matching course, it will appear here automatically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-100"
                >
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>

                    <div className="space-y-2 mb-4 text-sm">
                      <p className="text-gray-700">
                        <span className="font-medium">Instructor:</span> {course.instructor_username}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Level:</span> {course.level}
                      </p>
                      {course.total_lessons && (
                        <p className="text-gray-700">
                          <span className="font-medium">Lessons:</span> {course.total_lessons}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenCourse(course.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      Open Course
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default MyCourses;
