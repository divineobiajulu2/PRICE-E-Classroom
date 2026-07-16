import { User, UserRole, Note, LiveSession, Assessment, AssessmentType, normalizeUserRole } from '../types';

// --- DATABASE KEYS ---
const KEYS = {
  USERS: 'price_db_users',
  CHATS: 'price_db_chats',
  MESSAGES: 'price_db_messages',
  COURSES: 'price_db_courses',
  ASSESSMENTS: 'price_db_assessments',
  NOTES: 'price_db_notes',
  SESSIONS: 'price_db_sessions',
  NOTIFICATIONS: 'price_db_notifications',
  CURRENT_USER: 'userProfile',
  SETTINGS: 'price_db_settings',
};

// --- TYPES (Extended) ---
// ... (Keeping existing types, adding generic helpers)

// --- SEED DATA ---
const SEED_USERS = [
  { id: 'u1', firstName: 'Alex', lastName: 'Johnson', email: 'alex@test.com', password: 'password', role: 'Intern', setNumber: 'Set 12-A', stream: 'Marketing', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop', status: 'Active' },
  { id: 'u2', firstName: 'Jamie', lastName: 'Lee', email: 'jamie@test.com', password: 'password', role: 'Intern', setNumber: 'Set 12-A', stream: 'Marketing', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop', status: 'Active' },
  { 
    id: 'u3', 
    firstName: 'Sarah', 
    lastName: 'Miller', 
    email: 'sarah@test.com', 
    password: 'password', 
    role: 'Instructor', 
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=100&auto=format&fit=crop', 
    status: 'Active',
    phCode: 'PH-INST-2023-089',
    qualification: 'PhD in Digital Theology',
    bio: 'Over 15 years of experience bridging the gap between faith-based initiatives and modern digital strategies.'
  },
  { id: 'u4', firstName: 'Admin', lastName: 'User', email: 'admin@test.com', password: 'password', role: 'Administrator', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&auto=format&fit=crop', status: 'Active' },
  { id: 'u5', firstName: 'Pending', lastName: 'User', email: 'pending@test.com', password: 'password', role: 'Intern', setNumber: 'Set 12-B', stream: 'Theology', avatar: '', status: 'Pending', country: 'Nigeria', state: 'Lagos', phone: '08012345678', dob: '1999-05-12', guardianName: 'Mr. User', matricNo: 'INT-005', admissionYear: '2023' },
];

const SEED_ASSESSMENTS: any[] = [
  { id: 'a1', title: 'Midterm Exam: Biology 101', type: 'OBJECTIVE', status: 'Published', dueDate: 'Oct 25, 2023', submissions: 45, instructorId: 'u3', questions: [] },
  { id: 'a2', title: 'Project Alpha Proposal', type: 'WRITTEN', status: 'Draft', dueDate: 'Nov 01, 2023', submissions: 0, instructorId: 'u3', instructions: 'Upload PDF' },
];

const SEED_SESSIONS: LiveSession[] = [
  { id: 's1', topic: 'Orientation for Set 12-A', instructorName: 'Admin User', platform: 'PRICE Connect', meetingLink: 'internal', date: new Date().toISOString().split('T')[0], time: '10:00', targetSet: 'Set 12-A', targetStream: 'All', status: 'Live' },
  { id: 's2', topic: 'Marketing Fundamentals', instructorName: 'Sarah Miller', platform: 'PRICE Connect', meetingLink: 'internal', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '14:00', targetSet: 'Set 12-A', targetStream: 'Marketing', status: 'Upcoming' },
];

const SEED_COURSES = [
  {
    id: 'c1',
    title: "Advanced Marketing Analytics",
    instructorName: "Sarah Miller",
    instructorId: 'u3',
    progress: 0,
    students: 120,
    rating: 4.8,
    totalLessons: 12,
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop",
    category: "Marketing",
    status: "Published"
  },
  {
    id: 'c2',
    title: "Biblical Foundations",
    instructorName: "Sarah Miller",
    instructorId: 'u3',
    progress: 0,
    students: 85,
    rating: 4.9,
    totalLessons: 8,
    thumbnail: "https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?q=80&w=2574&auto=format&fit=crop",
    category: "Theology",
    status: "Draft"
  }
];

// --- HELPER FUNCTIONS ---
const getStorage = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setStorage = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

// --- API SERVICE ---
export const db = {
  init: () => {
    if (!localStorage.getItem(KEYS.USERS)) {
      setStorage(KEYS.USERS, SEED_USERS);
      if(!localStorage.getItem(KEYS.ASSESSMENTS)) setStorage(KEYS.ASSESSMENTS, SEED_ASSESSMENTS);
      if(!localStorage.getItem(KEYS.COURSES)) setStorage(KEYS.COURSES, SEED_COURSES);
      setStorage(KEYS.SESSIONS, SEED_SESSIONS);
      console.log('Database seeded.');
    }
  },

  utils: {
    fileToBase64: (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });
    }
  },

  admin: {
    getSettings: () => {
        return JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{"allowRegistration": true, "maintenanceMode": false}');
    },
    updateSettings: (settings: any) => {
        setStorage(KEYS.SETTINGS, settings);
        return settings;
    }
  },

  auth: {
    login: async (email: string, password: string): Promise<any> => {
      await new Promise(resolve => setTimeout(resolve, 800));
      const users = getStorage(KEYS.USERS);
      const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      
      if (!user) {
        throw new Error('Invalid email or password.');
      }

      if (user.status === 'Pending') {
        throw new Error('Account is pending approval. Please contact the administrator.');
      }

      if (user.status === 'Suspended') {
        throw new Error('Account has been suspended. Please contact support.');
      }

      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    },

    signup: async (userData: any): Promise<any> => {
      const settings = db.admin.getSettings();
      if (!settings.allowRegistration) {
          throw new Error('Registration is currently disabled by the administrator.');
      }

      await new Promise(resolve => setTimeout(resolve, 800));
      const users = getStorage(KEYS.USERS);
      
      // Check for existing email
      if (users.find((u: any) => u.email.toLowerCase() === userData.email.toLowerCase())) {
        throw new Error('Email already registered.');
      }

      const newUser = {
        id: `u${Date.now()}`,
        ...userData,
        // If avatar is not provided, generate one or use default
        avatar: userData.avatar || `https://ui-avatars.com/api/?name=${userData.firstName}+${userData.lastName}&background=0D59F2&color=fff`,
        status: [UserRole.INTERN, UserRole.INSTRUCTOR].includes(normalizeUserRole(userData.role)) ? 'Pending' : 'Active' 
      };
      
      users.push(newUser);
      setStorage(KEYS.USERS, users);
      
      // DO NOT auto-login for pending users
      if (newUser.status === 'Active') {
        localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(newUser));
      }
      
      return newUser;
    },

    resetPassword: async (email: string, newPassword: string): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const users = getStorage(KEYS.USERS);
        const index = users.findIndex((u: any) => u.email.toLowerCase() === email.toLowerCase());
        
        if (index === -1) {
            throw new Error('Email not found.');
        }

        users[index].password = newPassword;
        setStorage(KEYS.USERS, users);
    },

    getCurrentUser: () => {
      const u = localStorage.getItem(KEYS.CURRENT_USER);
      return u ? JSON.parse(u) : null;
    },

    getUserById: (id: string) => {
      return getStorage(KEYS.USERS).find((u: any) => u.id === id);
    },

    getAllUsers: () => getStorage(KEYS.USERS),

    updateUser: (id: string, updates: any) => {
        const users = getStorage(KEYS.USERS);
        const index = users.findIndex((u: any) => u.id === id);
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            setStorage(KEYS.USERS, users);
            // Update current user if it matches
            const currentUser = db.auth.getCurrentUser();
            if (currentUser && currentUser.id === id) {
                localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(users[index]));
            }
            return users[index];
        }
        return null;
    }
  },

  content: {
    getCourses: (user: any) => {
        const courses = JSON.parse(localStorage.getItem(KEYS.COURSES) || '[]');
        if (normalizeUserRole(user.role) === UserRole.INSTRUCTOR) {
          return courses.filter((c: any) => c.instructorId === user.id);
        }
        return courses; // Admin/Intern sees all (for now)
    },

    createCourse: (courseData: any) => {
        const courses = getStorage(KEYS.COURSES);
        courses.push(courseData);
        setStorage(KEYS.COURSES, courses);
        return courseData;
    },

    getAssessments: (user: any) => {
      const assessments = getStorage(KEYS.ASSESSMENTS);
      const role = normalizeUserRole(user?.role);
      if (role === UserRole.ADMIN) return assessments;
      if (role === UserRole.INSTRUCTOR) return assessments.filter((a: any) => a.instructorId === user.id);
      return assessments.filter((a:any) => a.status === 'Published');
    },

    getAssessmentById: (id: string) => {
        const assessments = getStorage(KEYS.ASSESSMENTS);
        return assessments.find((a: any) => a.id.toString() === id);
    },

    saveAssessment: (assessment: any) => {
        const list = getStorage(KEYS.ASSESSMENTS);
        list.push(assessment);
        setStorage(KEYS.ASSESSMENTS, list);
        return assessment;
    }
  },

  chat: {
      getChats: (userId: string) => {
        const chats = JSON.parse(localStorage.getItem(KEYS.CHATS) || '[]');
        return chats; 
      },
      getMessages: (chatId: string) => {
          const msgs = JSON.parse(localStorage.getItem(KEYS.MESSAGES) || '[]');
          return msgs.filter((m: any) => m.chatId === chatId);
      },
      sendMessage: (chatId: string, senderId: string, content: any, type: string) => {
          const msgs = JSON.parse(localStorage.getItem(KEYS.MESSAGES) || '[]');
          const newMsg = { id: Date.now(), chatId, senderId, text: content, type, time: 'Just now' };
          msgs.push(newMsg);
          setStorage(KEYS.MESSAGES, msgs);
          return newMsg;
      },
      createChat: (type: string, participants: string[], set?: string, stream?: string) => {
           const newChat = { id: `c${Date.now()}`, type, participants, set, stream, lastMessage: '', unreadCount: 0 };
           const chats = JSON.parse(localStorage.getItem(KEYS.CHATS) || '[]');
           chats.push(newChat);
           setStorage(KEYS.CHATS, chats);
           return newChat;
      },
      addReaction: (msgId: number, emoji: string) => null
  },

  features: {
    getNotes: (userId: string) => {
        const notes = JSON.parse(localStorage.getItem(KEYS.NOTES) || '[]');
        return notes.filter((n: Note) => n.userId === userId);
    },
    saveNote: (note: Note) => {
        const notes = JSON.parse(localStorage.getItem(KEYS.NOTES) || '[]');
        notes.unshift(note);
        setStorage(KEYS.NOTES, notes);
    },
    updateNote: (note: Note) => {
        const notes = JSON.parse(localStorage.getItem(KEYS.NOTES) || '[]');
        const index = notes.findIndex((n: Note) => n.id === note.id);
        if (index !== -1) {
            notes[index] = note;
            setStorage(KEYS.NOTES, notes);
        }
    },
    deleteNote: (id: string) => {
         const notes = JSON.parse(localStorage.getItem(KEYS.NOTES) || '[]');
         setStorage(KEYS.NOTES, notes.filter((n: Note) => n.id !== id));
    },
    getSessions: (user: any) => JSON.parse(localStorage.getItem(KEYS.SESSIONS) || '[]'),
    createSession: (s: any) => {
        const list = JSON.parse(localStorage.getItem(KEYS.SESSIONS) || '[]');
        list.push(s);
        setStorage(KEYS.SESSIONS, list);
    },
    deleteSession: (id: string) => {
        const list = JSON.parse(localStorage.getItem(KEYS.SESSIONS) || '[]');
        setStorage(KEYS.SESSIONS, list.filter((s:any) => s.id !== id));
    },
    getNotifications: (userId: string) => {
        return [
            { id: 1, title: 'Assignment Due', message: 'Project Alpha is due tomorrow.', time: '2h ago', read: false },
            { id: 2, title: 'New Course', message: 'Biblical Leadership has been assigned to you.', time: '1d ago', read: true }
        ];
    },
    getSessionById: (id: string) => {
        const sessions = JSON.parse(localStorage.getItem(KEYS.SESSIONS) || '[]');
        return sessions.find((s: any) => s.id === id);
    }
  }
};
