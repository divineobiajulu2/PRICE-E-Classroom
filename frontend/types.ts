export enum UserRole {
  ADMIN = 'ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  INTERN = 'INTERN',
  GUEST = 'GUEST'
}

export const normalizeUserRole = (role?: string | UserRole | null): UserRole => {
  const normalized = String(role || '').toLowerCase();
  if (normalized.includes('admin') || normalized.includes('administrator')) return UserRole.ADMIN;
  if (normalized.includes('instructor') || normalized.includes('teacher') || normalized.includes('staff')) return UserRole.INSTRUCTOR;
  if (normalized.includes('intern') || normalized.includes('student')) return UserRole.INTERN;
  return UserRole.GUEST;
};

export interface User {
  id: string;
  username?: string;
  name: string;
  role: UserRole;
  avatar: string;
  email: string;
  isActive?: boolean;
  status?: 'Active' | 'Pending' | 'Suspended' | string;
  firstName?: string;
  lastName?: string;
  setNumber?: string;
  stream?: string;
  matricNo?: string;
  phCode?: string;
  admissionYear?: number | null;
}

export interface Course {
  id: string;
  title: string;
  progress: number;
  students: number;
  thumbnail: string;
  instructor: string;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  status: 'In Progress' | 'Submitted' | 'Not Started' | 'Graded';
}

// Assessment Types
export enum AssessmentType {
  STANDARD = 'STANDARD',
  QUIZ = 'QUIZ',
  WRITTEN = 'WRITTEN',
  OBJECTIVE = 'OBJECTIVE',
  MCQ = 'MCQ',
  PROJECT = 'PROJECT'
}

export interface Question {
  id: string;
  text: string;
  type: 'TRUE_FALSE' | 'MCQ' | 'SHORT_ANSWER';
  options?: string[];
  correctAnswer?: string | boolean;
  points: number;
}

export interface Assessment {
  id: string;
  title: string;
  type: AssessmentType;
  courseId: string;
  dueDate: string;
  totalPoints: number;
  status: 'DRAFT' | 'PUBLISHED';
  questions?: Question[];
  instructions?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string; // e.g., 'bg-yellow-100'
  date: string;
  userId: string;
}

export interface LiveSession {
  id: string;
  topic: string;
  instructorName: string;
  platform: 'PRICE Connect' | 'Zoom' | 'Google Meet' | 'Microsoft Teams';
  meetingLink: string;
  date: string;
  time: string;
  targetSet: string;
  targetStream: string; // 'All', 'Marketing', etc.
  status: 'Upcoming' | 'Live' | 'Ended';
}

export interface Group {
  id: string;
  name: string;
  type: 'SET' | 'STREAM';
  description?: string;
  memberCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  avatar?: string;
}

export interface Notification {
  id: string;
  recipient?: string | null;
  role_target?: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}
