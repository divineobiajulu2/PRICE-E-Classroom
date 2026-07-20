import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/api';
import { AlertCircle, Loader } from 'lucide-react';

interface InstructorOption {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

interface CourseFormData {
  title: string;
  description: string;
  stream: string;
  setNumber: number;
  status: string;
}

const CreateCourse: React.FC = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    stream: 'general',
    setNumber: 1,
    status: 'Draft',
  });
  const [selectedInstructorIds, setSelectedInstructorIds] = useState<number[]>([]);
  const [instructorOptions, setInstructorOptions] = useState<InstructorOption[]>([]);
  const [loading, setLoading] = useState(!!courseId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInstructorOptions();

    if (courseId) {
      loadCourse();
    }
  }, [courseId]);

  const loadInstructorOptions = async () => {
    try {
      const instructors = await adminService.getActiveInstructors();
      // backend returns { total: N, instructors: [...] }
      if (Array.isArray(instructors)) {
        setInstructorOptions(instructors as any);
      } else if (instructors && Array.isArray((instructors as any).instructors)) {
        setInstructorOptions((instructors as any).instructors);
      } else if (Array.isArray((instructors as any).users)) {
        setInstructorOptions((instructors as any).users);
      } else {
        setInstructorOptions([]);
      }
    } catch (err: any) {
      console.error('[CreateCourse] Failed to load instructors:', err);
    }
  };

  const loadCourse = async () => {
    try {
      const course = await adminService.getCourse(courseId!);
      setFormData({
        title: course.title,
        description: course.description,
        stream: Array.isArray(course.streams) && course.streams.length > 0 ? course.streams[0] : 'general',
        setNumber: course.set_number || 1,
        status: course.status || 'Draft',
      });
      if (Array.isArray(course.instructors) && course.instructors.length > 0) {
        setSelectedInstructorIds(course.instructors.map((inst: any) => Number(inst.id)));
      } else if (course.instructor) {
        setSelectedInstructorIds([Number(course.instructor)]);
      }
    } catch (err: any) {
      console.error('[CreateCourse] Failed to load course:', err);
      setError('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('description', formData.description);
      payload.append('set_number', String(formData.setNumber));
      payload.append('streams', JSON.stringify([formData.stream]));
      payload.append('level', 'Beginner');
      payload.append('status', formData.status);

  

      if (!courseId) {
        payload.append('instructor_ids', JSON.stringify(selectedInstructorIds));
      }

      if (courseId) {
        await adminService.updateCourse(courseId, payload);
        await adminService.setCourseInstructors(courseId, selectedInstructorIds);
      } else {
        await adminService.createCourse(payload);
      }
      navigate('/admin/courses');
    } catch (err: any) {
      console.error('[CreateCourse] Failed to save course:', err);
      setError(err?.message || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {courseId ? 'Edit Course' : 'Create Course'}
        </h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Set
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.setNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, setNumber: Number(e.target.value) })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stream
                </label>
                <select
                  value={formData.stream}
                  onChange={(e) =>
                    setFormData({ ...formData, stream: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="general">General</option>
                  <option value="mechatronics">Mechatronics</option>
                  <option value="ict">I.C.T</option>
                  <option value="pls">Physical and Life Sciences</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Draft">Draft (hidden from students)</option>
                <option value="Published">Published (visible to matching students)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned Instructor(s)
              </label>
              <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
                {instructorOptions.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">No instructors available yet.</p>
                ) : (
                  instructorOptions.map((instructor) => {
                    const checked = selectedInstructorIds.includes(Number(instructor.id));
                    return (
                      <label
                        key={instructor.id}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedInstructorIds((prev) =>
                              checked
                                ? prev.filter((id) => id !== Number(instructor.id))
                                : [...prev, Number(instructor.id)]
                            );
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-800">
                          {instructor.first_name ? `${instructor.first_name} ${instructor.last_name}` : instructor.username}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {selectedInstructorIds.length} instructor{selectedInstructorIds.length === 1 ? '' : 's'} selected. Click to add or remove.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving...' : courseId ? 'Update Course' : 'Create Course'}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCourse;