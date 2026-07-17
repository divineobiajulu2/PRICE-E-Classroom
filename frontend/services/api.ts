import { User, UserRole, LiveSession, Group, Message, normalizeUserRole } from '../types';

// Custom Error class to preserve validation error details
class ApiRequestError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

// Extracts a readable message from a DRF-style error response — handles both
// { detail/error/message: "..." } shapes and field-error shapes like
// { matric_number: ["Matric number must be in the format: XX/00/000"] }.
const extractErrorMessage = (error: any, fallback: string): string => {
  if (!error || typeof error !== 'object') return fallback;
  if (error.detail) return error.detail;
  if (error.error) return error.error;
  if (error.message) return error.message;

  const fieldErrors = Object.entries(error)
    .filter(([, value]) => Array.isArray(value) && value.length > 0)
    .map(([field, messages]) => `${field}: ${(messages as string[]).join(' ')}`);

  return fieldErrors.length > 0 ? fieldErrors.join(' | ') : fallback;
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const BACKEND_BASE_URL = configuredApiUrl.replace(/\/$/, '').replace(/\/api$/, '');
const API_BASE_URL = configuredApiUrl.replace(/\/$/, '').endsWith('/api')
  ? configuredApiUrl.replace(/\/$/, '')
  : `${configuredApiUrl.replace(/\/$/, '')}/api`;

// Store token in localStorage (matches database.ts KEYS)
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'userProfile';

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

export const tokenService = {
  getToken: (): string | null => {
    const token = localStorage.getItem(TOKEN_KEY);
    console.log('[TokenService] getToken:', token ? `${token.substring(0, 20)}...` : 'null');
    return token;
  },

  setToken: (token: string): void => {
    console.log('[TokenService] setToken:', `${token.substring(0, 20)}...`);
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken: (): void => {
    console.log('[TokenService] removeToken');
    localStorage.removeItem(TOKEN_KEY);
  },

  isTokenValid: (): boolean => {
    const token = localStorage.getItem(TOKEN_KEY);
    return !!token;
  },
};

// ============================================================================
// HTTP REQUEST HELPER
// ============================================================================

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

const buildAbsoluteUrl = (value?: string | null): string => {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `${BACKEND_BASE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
};

const request = async (
  endpoint: string,
  options: RequestOptions = {}
): Promise<any> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = tokenService.getToken();

  console.log(`[API Request] ${options.method || 'GET'} ${endpoint}`, {
    tokenExists: !!token,
    tokenValue: token ? `${token.substring(0, 20)}...` : null,
  });

  const headers: Record<string, string> = {
    ...options.headers,
  };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  } else if (options.body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  // Add auth token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - token expired or invalid
  if (response.status === 401) {
    console.error('[API] 401 Unauthorized - clearing auth');
    tokenService.removeToken();
    localStorage.removeItem(USER_KEY);
    window.location.href = '/#/login';
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const errorMessage = extractErrorMessage(error, `HTTP ${response.status}: ${response.statusText}`);
    // Throw ApiRequestError with full error data for field-level validation errors
    throw new ApiRequestError(errorMessage, response.status, error);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

const unsupportedBackendEndpoint = (feature: string): never => {
  throw new Error(`${feature} is awaiting Django backend implementation.`);
};

const normalizeRole = (role: string): UserRole => {
  const normalized = normalizeUserRole(role);
  return normalized === UserRole.GUEST ? UserRole.INTERN : normalized;
};

const normalizeRawApiUser = (rawUser: any): any => {
  if (!rawUser) return rawUser;
  const url = rawUser.profile_photo_url || rawUser.avatar || '';
  const absoluteUrl = buildAbsoluteUrl(url);
  return {
    ...rawUser,
    profile_photo_url: absoluteUrl,
    avatar: absoluteUrl,
  };
};

const normalizeUser = (rawUser: any): User | null => {
  if (!rawUser) return null;

  const firstName = rawUser.first_name || rawUser.firstName || rawUser.username || '';
  const lastName = rawUser.last_name || rawUser.lastName || '';
  const avatarUrl = rawUser.profile_photo_url || rawUser.avatar || '';

  const user: User = {
    id: rawUser.id?.toString() || '',
    username: rawUser.username || '',
    name: `${firstName} ${lastName}`.trim() || (rawUser.username || 'User'),
    // Normalize role strings from backend into the `UserRole` enum
    role: normalizeRole(String(rawUser.role || rawUser.role_type || rawUser.user_type || '').trim()),
    avatar: buildAbsoluteUrl(avatarUrl),
    email: rawUser.email || '',
    isActive: rawUser.is_active !== undefined ? Boolean(rawUser.is_active) : String(rawUser.status || '').toLowerCase() !== 'pending',
    status: rawUser.status || (rawUser.is_active ? 'Active' : 'Pending'),
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    setNumber: rawUser.set_number || rawUser.setNumber || undefined,
    stream: rawUser.study_stream || rawUser.studyStream || rawUser.stream || undefined,
    matricNo: rawUser.matric_number || rawUser.matricNumber || rawUser.matricNo || undefined,
    phCode: rawUser.ph_code || rawUser.phCode || undefined,
  };

  return user;
};

const streamToBackend = (stream?: string): string => {
  const normalized = (stream || '').toLowerCase();
  if (normalized.includes('ict') || normalized.includes('computer')) return 'ict';
  if (normalized.includes('mechatronics')) return 'mechatronics';
  if (normalized.includes('physical') || normalized.includes('life') || normalized.includes('pls')) return 'pls';
  return 'general';
};

const parseSetNumber = (value?: string): number => {
  const match = String(value || '').match(/\d+/);
  return match ? Number(match[0]) : 1;
};

// ============================================================================
// AUTHENTICATION APIs
// ============================================================================

export const authService = {
  login: async (identifier: string, password: string): Promise<{ access_token: string; token_type: string; user: User | null }> => {
    const payload: any = { identifier, password };
    const response = await fetch(`${API_BASE_URL}/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Login error:', data);
      const message = data.detail || data.error || 'Login failed';
      const error = new Error(message) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
    // Log the raw role string returned by the backend for debugging
    console.log('[authService.login] backend raw user.role:', data?.user?.role);

    const user = normalizeUser(data.user);
    console.log('[authService.login] normalized user.role:', user?.role);
    const accessToken = data.tokens?.access || data.access_token;

    console.log('Login successful:', user);
    tokenService.setToken(accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return { access_token: accessToken, token_type: 'Bearer', user };
  },

  signup: async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
    setNumber?: string;
    stream?: string;
    phone?: string;
    country?: string;
    state?: string;
    dob?: string;
    gender?: string;
    guardianName?: string;
    matricNo?: string;
    admissionYear?: string;
    phCode?: string;
    qualification?: string;
    bio?: string;
    profilePhoto?: File;
  }): Promise<{ user?: User; message: string }> => {
    const role = normalizeUserRole(userData.role);
    const isInstructor = role === UserRole.INSTRUCTOR;
    const isAdmin = role === UserRole.ADMIN;

    if (isAdmin) {
      throw new Error('Admin accounts must be created from Django admin.');
    }

    const endpoint = isInstructor ? '/register/staff/' : '/register/student/';
    const payload = isInstructor
      ? {
          ph_code: userData.phCode,
          email: userData.email,
          password: userData.password,
          first_name: userData.firstName,
          last_name: userData.lastName,
          gender: (userData as any).gender?.toLowerCase() || 'male',
          date_of_birth: userData.dob,
          country: userData.country || 'Nigeria',
        }
      : {
          matric_number: userData.matricNo,
          email: userData.email,
          password: userData.password,
          first_name: userData.firstName,
          last_name: userData.lastName,
          gender: (userData as any).gender?.toLowerCase() || 'male',
          date_of_birth: userData.dob,
          country: userData.country || 'Nigeria',
          state: userData.state || 'Not Applicable',
          study_stream: streamToBackend(userData.stream),
          set_number: parseSetNumber(userData.setNumber),
          admission_year: userData.admissionYear ? Number(userData.admissionYear) : undefined,
        };

    if (userData.profilePhoto && !isInstructor) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      formData.append('profile_photo', userData.profilePhoto);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(extractErrorMessage(error, `HTTP ${response.status}: ${response.statusText}`));
      }
      return response.json();
    }

    const response = await request(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response;
  },

  me: async (): Promise<User | null> => {
    const data = await request('/auth/me');
    return normalizeUser(data);
  },

  refreshCurrentUser: async (): Promise<User | null> => {
    const user = await authService.me();
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return user;
  },

  uploadProfilePhoto: async (file: File): Promise<any> => {
    const url = `${API_BASE_URL}/auth/profile/photo/`;
    const token = tokenService.getToken();
    const form = new FormData();
    form.append('profile_photo', file);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || err.message || `HTTP ${res.status}`);
    }
    const body = await res.json();
    if (body?.url) {
      body.url = buildAbsoluteUrl(body.url);
    }
    return body;
  },

  logout: (): void => {
    console.log('[AuthService] Logging out user');
    tokenService.removeToken();
    localStorage.removeItem(USER_KEY);
    // Redirect to login page
    window.location.href = '/#/login';
  },

  getCurrentUser: (): User | null => {
    const user = localStorage.getItem(USER_KEY);
    if (!user) return null;
    const parsed = JSON.parse(user) as User;
    if (parsed.avatar) {
      parsed.avatar = buildAbsoluteUrl(parsed.avatar);
    }
    return parsed;
  },
};

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const notificationService = {
  getNotifications: async (): Promise<any[]> => {
    return request('/notifications/');
  },

  getClassroomMaterials: async (): Promise<any[]> => {
    return request('/classroom/materials/');
  },

  getAssignments: async (): Promise<any[]> => {
    return request('/assignments/');
  },

  getInternAssignments: async (): Promise<any[]> => {
    return request('/assignments/submissions/');
  },

  createClassroomMaterial: async (payload: { title: string; description?: string; course: string; file_attachment?: File | null }): Promise<any> => {
    const formData = new FormData();
    formData.append('title', payload.title);
    if (payload.description) {
      formData.append('description', payload.description);
    }
    formData.append('course', payload.course);
    if (payload.file_attachment) {
      formData.append('file_attachment', payload.file_attachment);
    }

    return request('/classroom/materials/', {
      method: 'POST',
      body: formData,
    });
  },

  createAssignment: async (payload: FormData): Promise<any> => {
    return request('/assignments/', {
      method: 'POST',
      body: payload,
    });
  },

  createSubmission: async (payload: FormData): Promise<any> => {
    return request('/assignments/submissions/', {
      method: 'POST',
      body: payload,
    });
  },

  saveSubmissionDraft: async (payload: FormData): Promise<any> => {
    return request('/assignments/submissions/draft/', {
      method: 'POST',
      body: payload,
    });
  },

  markRead: async (notificationId: string): Promise<any> => {
    return request(`/notifications/${notificationId}/mark-read/`, { method: 'POST' });
  },

  markAllRead: async (): Promise<any> => {
    // Not implemented server-side yet; placeholder
    return unsupportedBackendEndpoint('Mark all notifications read');
  }
};

// ============================================================================
// ADMIN APIs
// ============================================================================

export const adminService = {
  // User Management
  createUser: async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
    setNumber?: string;
    stream?: string;
    matricNumber?: string;
    phCode?: string;
  }): Promise<any> => {
    const normalizedRole = normalizeUserRole(userData.role);
    const payload: any = {
      first_name: userData.firstName,
      last_name: userData.lastName,
      email: userData.email,
      password: userData.password,
      role: normalizedRole === UserRole.ADMIN ? 'admin' : normalizedRole === UserRole.INSTRUCTOR ? 'instructor' : 'intern',
    };

    if (normalizedRole === UserRole.INTERN) {
      if (!userData.matricNumber) {
        throw new Error('Matric number is required for intern creation.');
      }
      if (!userData.setNumber) {
        throw new Error('Set number is required for intern creation.');
      }
      if (!userData.stream) {
        throw new Error('Study stream is required for intern creation.');
      }
      payload.matric_number = userData.matricNumber;
      payload.set_number = parseSetNumber(userData.setNumber);
      payload.study_stream = streamToBackend(userData.stream);
      payload.country = 'Nigeria';
      payload.state = 'Not Applicable';
    }

    if (normalizedRole === UserRole.INSTRUCTOR) {
      if (!userData.phCode) {
        throw new Error('PH Code is required for instructor creation.');
      }
      payload.ph_code = userData.phCode;
    }

    return request('/admin/users/create/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getUsers: async (): Promise<any[]> => {
    try {
      const resp = await request('/admin/users/');
      const users = Array.isArray(resp) ? resp : (resp && Array.isArray(resp.users) ? resp.users : []);
      return users.map(normalizeRawApiUser);
    } catch (err) {
      console.error('[adminService.getUsers] failed', err);
      throw err;
    }
  },

  getUser: async (userId: string): Promise<any> => {
    try {
      const resp = await request(`/admin/users/${userId}/`);
      return normalizeRawApiUser(resp);
    } catch (err) {
      console.error(`[adminService.getUser] failed for ${userId}`, err);
      throw err;
    }
  },

  updateUser: async (userId: string, updates: any): Promise<any> => {
    // TODO: Awaiting Django Backend Implementation: PATCH /api/admin/users/:id
    return unsupportedBackendEndpoint('Admin user update');
  },

  deleteUser: async (userId: string): Promise<{ message: string }> => {
    return request(`/admin/users/${userId}/`, { method: 'DELETE' });
  },

  // Course Management
  getCourses: async (): Promise<any[]> => {
    return request('/admin/courses/');
  },

  getCourse: async (courseId: string): Promise<any> => {
    return request(`/admin/courses/${courseId}/`);
  },

  // Fetch lessons for a course (flattens modules -> lessons)
  getCourseLessons: async (courseId: string): Promise<any> => {
    return request(`/admin/courses/${courseId}/lessons/`);
  },

  // Mark a lesson complete for the current student
  completeLesson: async (courseId: string, lessonId: string): Promise<any> => {
    return request(`/admin/courses/${courseId}/lessons/${encodeURIComponent(lessonId)}/complete/`, { method: 'POST' });
  },

  // Get courses available for student (filtered by stream)
  getAvailableCourses: async (): Promise<any> => {
    return request('/courses/available/');
  },

  // Get student's courses matched by set/stream
  getStudentCourses: async (): Promise<any> => {
    return request('/courses/my/');
  },

  createCourse: async (courseData: any): Promise<any> => {
    return request('/admin/courses/', {
      method: 'POST',
      body: courseData instanceof FormData ? courseData : JSON.stringify(courseData),
    });
  },

  updateCourse: async (courseId: string, courseData: any): Promise<any> => {
    return request(`/admin/courses/${courseId}/`, {
      method: 'PATCH',
      body: courseData instanceof FormData ? courseData : JSON.stringify(courseData),
    });
  },

  deleteCourse: async (courseId: string): Promise<any> => {
    return request(`/admin/courses/${courseId}/`, {
      method: 'DELETE',
    });
  },

  deleteMaterial: async (materialId: string | number): Promise<any> => {
    return request(`/classroom/materials/${materialId}/`, {
      method: 'DELETE',
    });
  },

  deleteAssignment: async (assignmentId: string | number): Promise<any> => {
    return request(`/assignments/${assignmentId}/`, {
      method: 'DELETE',
    });
  },

  getCourseInstructors: async (courseId: string): Promise<any> => {
    return request(`/admin/courses/${courseId}/instructors/`);
  },

  setCourseInstructors: async (courseId: string, instructorIds: number[]): Promise<any> => {
    return request(`/admin/courses/${courseId}/instructors/`, {
      method: 'POST',
      body: JSON.stringify({ instructor_ids: instructorIds }),
    });
  },

  removeCourseInstructor: async (courseId: string, instructorId: string): Promise<any> => {
    return request(`/admin/courses/${courseId}/instructors/${instructorId}/`, {
      method: 'DELETE',
    });
  },

  getCourseGrades: async (courseId: string): Promise<any[]> => {
    return request(`/admin/courses/${courseId}/grades/`);
  },

  createOrUpdateGrade: async (courseId: string, payload: any): Promise<any> => {
    // POST to grades endpoint will create or update (server handles update_or_create)
    return request(`/admin/courses/${courseId}/grades/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteGrade: async (courseId: string, gradeId: string): Promise<any> => {
    return request(`/admin/courses/${courseId}/grades/${gradeId}/`, { method: 'DELETE' });
  },

  patchGrade: async (courseId: string, gradeId: string, payload: any): Promise<any> => {
    return request(`/admin/courses/${courseId}/grades/${gradeId}/`, { method: 'PATCH', body: JSON.stringify(payload) });
  },

  getInstructorDashboard: async (): Promise<any> => {
    return request('/admin/dashboard/instructor/');
  },

  getStudentDashboard: async (): Promise<any> => {
    return request('/dashboard/student/');
  },

  // Student Course Management (Enrollment) - REMOVED DUPLICATES
  getActiveInterns: async (): Promise<any> => {
    return request('/admin/active-interns/');
  },

  getActiveInstructors: async (): Promise<any> => {
    return request('/admin/active-instructors/');
  },

  

  // Live Sessions
  getLiveSessions: async (): Promise<any[]> => {
    // TODO: Awaiting Django Backend Implementation: GET /api/admin/live-sessions
    return unsupportedBackendEndpoint('Admin live session listing');
  },

  stopLiveSession: async (sessionId: string): Promise<any> => {
    // TODO: Awaiting Django Backend Implementation: POST /api/admin/live-sessions/:id/stop
    return unsupportedBackendEndpoint('Admin live session stop');
  },

  // Health Check
  health: async (): Promise<{ status: string }> => {
    // TODO: Awaiting Django Backend Implementation: GET /api/admin/health
    return unsupportedBackendEndpoint('Admin health check');
  },
  // Admin approval helpers
  getPendingApprovals: async (): Promise<any> => {
    return request('/admin/pending-users/');
  },

  approveUser: async (userId: string): Promise<any> => {
    return request(`/admin/approve/${userId}/`, { method: 'POST' });
  },

  declineUser: async (userId: string): Promise<any> => {
    return request(`/admin/decline/${userId}/`, { method: 'POST' });
  },
};

// ============================================================================
// LIVE SESSIONS APIs
// ============================================================================

export const liveSessionsService = {
  create: async (sessionData: {
    topic: string;
    meeting_link?: string;
    meeting_passcode?: string;
    setNumber: string;
    stream?: string;
    scheduled_time: string;
  }): Promise<LiveSession> => {
    // TODO: Awaiting Django Backend Implementation: POST /api/live-sessions/create
    return unsupportedBackendEndpoint('Live session creation');
  },

  getSession: async (sessionId: string): Promise<LiveSession> => {
    // TODO: Awaiting Django Backend Implementation: GET /api/live-sessions/:id
    return unsupportedBackendEndpoint('Live session detail');
  },

  getUserScheduledSessions: async (): Promise<LiveSession[]> => {
    // TODO: Awaiting Django Backend Implementation: GET /api/live-sessions/user/scheduled
    return unsupportedBackendEndpoint('Scheduled live sessions');
  },

  joinSession: async (sessionId: string, passcode: string): Promise<{ message: string; attendee_id: string }> => {
    // TODO: Awaiting Django Backend Implementation: POST /api/live-sessions/:id/join
    return unsupportedBackendEndpoint('Live session join');
  },

  leaveSession: async (sessionId: string): Promise<{ message: string }> => {
    // TODO: Awaiting Django Backend Implementation: POST /api/live-sessions/:id/leave
    return unsupportedBackendEndpoint('Live session leave');
  },
};

// ============================================================================
// VIDEO MEETINGS APIs (LiveKit)
// ============================================================================

export const videoMeetingsService = {
  create: async (meetingData: {
    topic: string;
    description?: string;
    setNumber: string;
    stream?: string;
    scheduled_date: string;
    duration_minutes?: number;
  }): Promise<any> => {
    // TODO: Awaiting Django Backend Implementation: POST /api/video-meetings/create
    return unsupportedBackendEndpoint('Video meeting creation');
  },

  start: async (sessionId: string): Promise<{ message: string; room_name: string; meeting_link: string }> => {
    // TODO: Awaiting Django Backend Implementation: POST /api/video-meetings/:id/start
    return unsupportedBackendEndpoint('Video meeting start');
  },

  end: async (sessionId: string): Promise<{ message: string }> => {
    // TODO: Awaiting Django Backend Implementation: POST /api/video-meetings/:id/end
    return unsupportedBackendEndpoint('Video meeting end');
  },

  getJoinToken: async (sessionId: string): Promise<{ token: string; url: string; room_name: string }> => {
    // TODO: Awaiting Django Backend Implementation: POST /api/video-meetings/:id/join-token
    return unsupportedBackendEndpoint('Video meeting join token');
  },

  getStatus: async (sessionId: string): Promise<any> => {
    // TODO: Awaiting Django Backend Implementation: GET /api/video-meetings/:id/status
    return unsupportedBackendEndpoint('Video meeting status');
  },
};

// ============================================================================
// MESSAGING & GROUPS APIs
// ============================================================================

export const messagingService = {
  getGroups: async (): Promise<Group[]> => {
    // TODO: Awaiting Django Backend Implementation: GET /api/messages/groups
    return unsupportedBackendEndpoint('Message groups');
  },

  getGroupMessages: async (groupId: string, limit: number = 50): Promise<Message[]> => {
    // TODO: Awaiting Django Backend Implementation: GET /api/messages/groups/:id/messages
    return unsupportedBackendEndpoint('Group messages');
  },

  sendMessage: async (groupId: string, content: string): Promise<Message> => {
    // TODO: Awaiting Django Backend Implementation: POST /api/messages/groups/:id/send
    return unsupportedBackendEndpoint('Send group message');
  },

  autoAddUserToGroups: async (userId: string): Promise<{ message: string }> => {
    // TODO: Awaiting Django Backend Implementation: POST /api/messages/auto-add-user
    return unsupportedBackendEndpoint('Auto-add user to groups');
  },
};

// ============================================================================
// WEBSOCKET SERVICE FOR REAL-TIME MESSAGING
// ============================================================================

export const websocketService = {
  connect: (groupId: string, userId: string, onMessage: (message: Message) => void): WebSocket => {
    const wsProtocol = new URL(API_BASE_URL).protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${new URL(API_BASE_URL).host}/api/messages/ws/${groupId}/${userId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`Connected to group ${groupId}`);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        onMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log(`Disconnected from group ${groupId}`);
    };

    return ws;
  },

  disconnect: (ws: WebSocket): void => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  },

  send: (ws: WebSocket, message: string): void => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  },
};

// ============================================================================
// HEALTH CHECK
// ============================================================================

export const healthService = {
  check: async (): Promise<{ status: string }> => {
    try {
      // TODO: Awaiting Django Backend Implementation: GET /api/health
      return unsupportedBackendEndpoint('Public health check');
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },
};
