import React, { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { User } from './types';
import { api } from './services/storage';

// Pages
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import CourseEditor from './pages/admin/CourseEditor';
import LearnerDashboard from './pages/learner/LearnerDashboard';
import CourseRoom from './pages/learner/CourseRoom';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Icons
import { Loader2 } from 'lucide-react';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = api.getCurrentUser();
    if (storedUser) setUser(storedUser);
    setIsLoading(false);
  }, []);

  const login = (u: User) => setUser(u);
  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Protected Route Components ---

const RequireAuth: React.FC<{ children: React.ReactNode; role?: 'admin' | 'learner' }> = ({ children, role }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    // Redirect to correct dashboard if role doesn't match
    return <Navigate to={user.role === 'admin' ? '/admin' : '/learner'} replace />;
  }

  return <>{children}</>;
};

// --- Main App ---

const App = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <RequireAuth role="admin"><AdminDashboard /></RequireAuth>
          } />
          <Route path="/admin/courses/new" element={
            <RequireAuth role="admin"><CourseEditor /></RequireAuth>
          } />
          <Route path="/admin/courses/:courseId" element={
            <RequireAuth role="admin"><CourseEditor /></RequireAuth>
          } />

          {/* Learner Routes */}
          <Route path="/learner" element={
            <RequireAuth role="learner"><LearnerDashboard /></RequireAuth>
          } />
          <Route path="/learner/course/:courseId" element={
            <RequireAuth role="learner"><CourseRoom /></RequireAuth>
          } />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;