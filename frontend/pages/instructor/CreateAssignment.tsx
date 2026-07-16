import React, { useState, useEffect } from 'react';
import { Calendar, FileUp, MessageSquare, BookOpen, Plus, X, Save } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import QuizBuilder from '../../components/QuizBuilder';
import { notificationService, adminService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { errorHandler } from '../../services/errorHandler';

interface FormData {
  title: string;
  description: string;
  due_date: string;
  assignment_type: 'STANDARD' | 'QUIZ';
  resource_file?: File;
  questions?: any[];
}

const CreateAssignment: React.FC = () => {
  const navigate = useNavigate();
  const { id: courseId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    due_date: '',
    assignment_type: (searchParams.get('type') as 'STANDARD' | 'QUIZ') || 'STANDARD',
    resource_file: undefined,
    questions: [],
  });

  const [courseTitle, setCourseTitle] = useState<string>('');
  const [courseLoading, setCourseLoading] = useState(true);

  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId) {
        setCourseLoading(false);
        return;
      }
      try {
        setCourseLoading(true);
        const course: any = await adminService.getCourse(courseId);
        setCourseTitle(course?.title || '');
      } catch (err) {
        console.error('[CreateAssignment] Failed to load course:', err);
      } finally {
        setCourseLoading(false);
      }
    };
    loadCourse();
  }, [courseId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'set_number' ? parseInt(value) : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({
        ...prev,
        resource_file: e.target.files![0],
      }));
    }
  };

  const handleAssignmentTypeChange = (type: 'STANDARD' | 'QUIZ') => {
    setFormData((prev) => ({
      ...prev,
      assignment_type: type,
      questions: type === 'QUIZ' ? prev.questions || [] : [],
    }));
  };

  const handleQuestionsChange = (questions: any[]) => {
    setFormData((prev) => ({
      ...prev,
      questions,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        showToast('Title is required', 'error');
        setIsLoading(false);
        return;
      }

      if (!formData.description.trim()) {
        showToast('Description is required', 'error');
        setIsLoading(false);
        return;
      }

      if (!formData.due_date) {
        showToast('Due date is required', 'error');
        setIsLoading(false);
        return;
      }

      if (!courseId) {
        showToast('Course not found. Please open this page from a course.', 'error');
        setIsLoading(false);
        return;
      }

      if (formData.assignment_type === 'QUIZ' && (!formData.questions || formData.questions.length === 0)) {
        showToast('Quiz must have at least one question', 'error');
        setIsLoading(false);
        return;
      }

      // Create FormData for multipart submission
      const multipartData = new FormData();
      multipartData.append('title', formData.title);
      multipartData.append('description', formData.description);
      multipartData.append('course', courseId);
      multipartData.append('due_date', formData.due_date);
      multipartData.append('assignment_type', formData.assignment_type);


      if (formData.resource_file) {
        multipartData.append('resource_file', formData.resource_file);
      }

      // If quiz, include questions
      if (formData.assignment_type === 'QUIZ' && formData.questions) {
        multipartData.append('questions', JSON.stringify(formData.questions));
      }

      await notificationService.createAssignment(multipartData);
      showToast('Assignment created successfully! ✓', 'success');
      
      // Notify other pages that assignments were updated and navigate back
      try {
        window.dispatchEvent(new CustomEvent('assignments:updated'));
      } catch (e) {
        // fallback: no-op
      }
      // Redirect to instructor dashboard
      setTimeout(() => {
        navigate(`/instructor/courses/${courseId}`);
      }, 1500);
    } catch (err: any) {
      // Handle validation errors with field-level details
      if (err?.status === 400 || err?.status === 422) {
        // Check if we have field-level validation errors
        const fieldErrors = errorHandler.extractFieldErrors(err?.data);
        if (Object.keys(fieldErrors).length > 0) {
          const errorMessage = errorHandler.getValidationMessage(err?.data);
          showToast(errorMessage, 'error');
        } else {
          // Fall back to generic error message if present
          showToast(err?.message || 'Validation failed. Please check your input.', 'error');
        }
      } else {
        showToast(err?.message || 'Failed to create assignment', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Create Assignment</h1>
          <p className="text-slate-600">Choose the format and build your assignment</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <BookOpen size={24} className="text-primary" />
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Week 1 - Introduction to Algorithms"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Provide detailed instructions for the assignment..."
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Course</p>
                <p className="text-sm font-semibold text-slate-800">
                  {courseLoading ? 'Loading course...' : (courseTitle || 'Unknown course')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Due Date *</label>
                <input
                  type="datetime-local"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Assignment Type Selection */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-2xl font-bold mb-6">Assignment Format</h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Standard Upload Option */}
              <button
                type="button"
                onClick={() => handleAssignmentTypeChange('STANDARD')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  formData.assignment_type === 'STANDARD'
                    ? 'border-primary bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <FileUp size={32} className={formData.assignment_type === 'STANDARD' ? 'text-primary' : 'text-slate-400'} />
                <h3 className="text-lg font-bold mt-3 mb-1">File/Text Upload</h3>
                <p className="text-sm text-slate-600">
                  Students submit via text input or file upload
                </p>
                {formData.assignment_type === 'STANDARD' && (
                  <div className="mt-3 inline-block bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Selected
                  </div>
                )}
              </button>

              {/* Quiz Option */}
              <button
                type="button"
                onClick={() => handleAssignmentTypeChange('QUIZ')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  formData.assignment_type === 'QUIZ'
                    ? 'border-primary bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <MessageSquare size={32} className={formData.assignment_type === 'QUIZ' ? 'text-primary' : 'text-slate-400'} />
                <h3 className="text-lg font-bold mt-3 mb-1">Interactive Quiz</h3>
                <p className="text-sm text-slate-600">
                  Multiple choice, short answer, or paragraph questions
                </p>
                {formData.assignment_type === 'QUIZ' && (
                  <div className="mt-3 inline-block bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Selected
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Format-Specific Content */}
          {formData.assignment_type === 'STANDARD' && (
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <FileUp size={24} className="text-primary" />
                Resource Material (Optional)
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                Attach a file for students to download (e.g., template, starter code)
              </p>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-input"
                  accept="*/*"
                />
                <label htmlFor="file-input" className="cursor-pointer block">
                  <FileUp size={32} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-slate-700 font-semibold">
                    {formData.resource_file ? formData.resource_file.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Any file type accepted</p>
                </label>
              </div>
            </div>
          )}

          {formData.assignment_type === 'QUIZ' && (
            <QuizBuilder onQuestionsChange={handleQuestionsChange} initialQuestions={formData.questions || []} />
          )}

          {/* Submit Button */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => navigate(`/instructor/courses/${courseId}`)}
              className="px-6 py-3 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
                isLoading
                  ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-blue-700'
              }`}
            >
              <Save size={18} />
              {isLoading ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAssignment;
