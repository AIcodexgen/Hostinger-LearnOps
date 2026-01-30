import { User, Course, Enrollment, Role } from '../types';

// CONFIGURATION: Connected Mode
// This uses the NodeJS server.js backend.

const STORAGE_KEYS = {
  CURRENT_USER: 'lms_current_user',
};

// Helper for API calls - Uses real fetch to server.js
const request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  // Ensure headers exist
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(endpoint, config);

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  // Handle 204 or empty bodies
  if (response.status === 204) return {} as T;
  
  const text = await response.text();
  return text ? JSON.parse(text) : {} as T;
};

// --- Migration & Seeding ---
const initializeData = async () => {
  try {
    // 1. Fetch current state from Server
    const users = await request<User[]>('/api/users');
    const courses = await request<Course[]>('/api/courses');

    // 2. Seed Users if empty (First run on server)
    if (users.length === 0) {
       console.log("Seeding Users (Server)...");
       const admin: User = {
        id: 'admin-1',
        email: 'admin@lms.com',
        name: 'System Administrator',
        role: 'admin',
        password: 'admin123',
        joinedAt: new Date().toISOString(),
      };
      await request('/api/users', { method: 'POST', body: JSON.stringify(admin) });
      
      const learner: User = {
        id: 'learner-1',
        email: 'learner@lms.com',
        name: 'John Learner',
        role: 'learner',
        password: 'learner123',
        joinedAt: new Date().toISOString(),
      };
      await request('/api/users', { method: 'POST', body: JSON.stringify(learner) });
    }

    // 3. Seed Demo Course if empty
    if (courses.length === 0) {
        console.log("Seeding Demo Course (Server)...");
        const demoCourse: Course = {
            id: 'demo-1',
            title: 'Welcome to LearnOps (Demo)',
            description: 'Experience the learner journey with this interactive demo course. Watch videos, read content, and take a quiz to see how the platform works.',
            thumbnail: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            status: 'published',
            createdAt: new Date().toISOString(),
            modules: [
                {
                    id: 'm-1',
                    title: 'Video Introduction',
                    type: 'video',
                    // Using a reliable CDN link for demo purposes
                    content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                    duration: 10
                },
                {
                    id: 'm-2',
                    title: 'Platform Documentation',
                    type: 'text',
                    content: 'This is a text module. Instructors can use this to provide reading materials, instructions, or supplementary information to the video content.',
                    duration: 5
                }
            ],
            assessment: {
                id: 'a-1',
                courseId: 'demo-1',
                passingScore: 70,
                questions: [
                    {
                        id: 'q-1',
                        text: 'What media type was shown in the first module?',
                        options: ['Audio', 'Video', 'Text', 'None'],
                        correctOptionIndex: 1
                    }
                ]
            }
        };
        await request('/api/courses', { method: 'POST', body: JSON.stringify(demoCourse) });
    }

  } catch (err) {
    console.warn("Initialization failed or server not reachable.", err);
  }
};

initializeData();

// --- API Methods ---

export const api = {
  // User Auth & Management
  login: async (email: string, password: string, requiredRole?: Role): Promise<User> => {
    // 1. Fetch users from server
    let users = await request<User[]>('/api/users');
    
    // 2. Find user (Client-side auth logic for simplicity)
    let user = users.find(u => u.email === email && u.password === password);
    
    // Fallback for demo if server is wiped but admin tries to login
    if (!user && email === 'admin@lms.com' && password === 'admin123') {
         // Try to heal
         await initializeData();
         users = await request<User[]>('/api/users');
         user = users.find(u => u.email === email);
    }
    
    if (user) {
      if (requiredRole && user.role !== requiredRole) {
        throw new Error('Access Denied. Please log in using the correct portal for your role.');
      }
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    } else {
      throw new Error('Invalid credentials');
    }
  },

  register: async (email: string, password: string, name: string): Promise<User> => {
    const users = await request<User[]>('/api/users');
    if (users.find(u => u.email === email)) {
      throw new Error('User already exists');
    }
    
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name,
      role: 'learner',
      password,
      joinedAt: new Date().toISOString(),
    };
    
    // Send to Server
    await request('/api/users', { method: 'POST', body: JSON.stringify(newUser) });
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
    return newUser;
  },

  adminResetUserPassword: async (userId: string, newPassword: string): Promise<void> => {
    await request(`/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ password: newPassword })
    });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  getCurrentUser: (): User | null => {
    const u = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return u ? JSON.parse(u) : null;
  },
  
  getUsers: async (): Promise<User[]> => {
    return request<User[]>('/api/users');
  },

  getCourses: async (): Promise<Course[]> => {
    return request<Course[]>('/api/courses');
  },

  saveCourse: async (course: Course): Promise<Course> => {
    const courses = await request<Course[]>('/api/courses');
    const existing = courses.find(c => c.id === course.id);

    if (existing) {
      await request(`/api/courses/${course.id}`, { method: 'PUT', body: JSON.stringify(course) });
    } else {
      await request('/api/courses', { method: 'POST', body: JSON.stringify(course) });
    }
    return course;
  },

  deleteCourse: async (courseId: string): Promise<void> => {
    await request(`/api/courses/${courseId}`, { method: 'DELETE' });
  },

  getEnrollments: async (userId?: string): Promise<Enrollment[]> => {
    const all = await request<Enrollment[]>('/api/enrollments');
    if (userId) return all.filter(e => e.userId === userId);
    return all;
  },

  enrollUser: async (userId: string, courseId: string): Promise<Enrollment> => {
    const enrollments = await request<Enrollment[]>('/api/enrollments');
    const existing = enrollments.find(e => e.userId === userId && e.courseId === courseId);
    if (existing) return existing;

    const newEnrollment: Enrollment = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      courseId,
      completedModuleIds: [],
      passed: false,
      enrolledAt: new Date().toISOString(),
    };
    
    await request('/api/enrollments', { method: 'POST', body: JSON.stringify(newEnrollment) });
    return newEnrollment;
  },

  updateProgress: async (userId: string, courseId: string, updates: Partial<Enrollment>): Promise<Enrollment> => {
    const enrollments = await request<Enrollment[]>('/api/enrollments');
    const existing = enrollments.find(e => e.userId === userId && e.courseId === courseId);
    
    if (!existing) throw new Error("Enrollment not found");
    
    const id = existing.id; 
    
    if (id) {
        const updated = { ...existing, ...updates };
        await request(`/api/enrollments/${id}`, { method: 'PUT', body: JSON.stringify(updated) });
        return updated;
    } else {
        return existing; 
    }
  },

  getStats: async () => {
     const [users, courses, enrollments] = await Promise.all([
       request<User[]>('/api/users'),
       request<Course[]>('/api/courses'),
       request<Enrollment[]>('/api/enrollments')
     ]);
     
     return {
       totalLearners: users.filter(u => u.role === 'learner').length,
       totalCourses: courses.length,
       activeEnrollments: enrollments.filter(e => !e.passed).length,
       certificationsIssued: enrollments.filter(e => e.passed).length,
     };
  },
  
  importData: async (courses: Course[]) => {
    for (const c of courses) {
       await request('/api/courses', { method: 'POST', body: JSON.stringify(c) });
    }
  },
  
  requestPasswordReset: async (email?: string) => Promise.resolve(),
  completePasswordReset: async (token: string, newPassword: string) => Promise.reject(new Error("Contact Admin")),
  sendOtp: async () => Promise.resolve(),
  verifyOtp: async () => Promise.resolve(true),
};