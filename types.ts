export type Role = 'admin' | 'learner';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  password?: string; // In a real app, this would be hashed
  joinedAt: string;
}

export interface Module {
  id: string;
  title: string;
  type: 'text' | 'video' | 'pdf';
  content: string; // URL or text content
  duration: number; // minutes
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
}

export interface Assessment {
  id: string;
  courseId: string;
  questions: Question[];
  passingScore: number; // Percentage
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  status: 'draft' | 'published';
  modules: Module[];
  assessment?: Assessment;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  completedModuleIds: string[];
  assessmentScore?: number;
  passed: boolean;
  certifiedAt?: string;
  enrolledAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}