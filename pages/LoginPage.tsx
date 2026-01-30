import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { api } from '../services/storage';
import { BookOpen, ShieldCheck, Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<'admin' | 'learner'>('learner');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register State
  const [name, setName] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Pass the selected role to api.login to enforce strict role authentication
      const user = await api.login(email, password, role);
      login(user);
      navigate(user.role === 'admin' ? '/admin' : '/learner');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await api.register(email, password, name);
      login(user);
      navigate('/learner');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    // Register / Login Flow
    return (
      <>
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </h2>
            {!isRegistering && (
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button 
                  onClick={() => setRole('learner')}
                  className={`px-4 py-1 text-sm rounded-md transition-colors ${role === 'learner' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500'}`}
                >
                  Learner
                </button>
                <button 
                  onClick={() => setRole('admin')}
                  className={`px-4 py-1 text-sm rounded-md transition-colors ${role === 'admin' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500'}`}
                >
                  Admin
                </button>
              </div>
            )}
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center">
              ⚠️ {error}
            </div>
        )}

        {isRegistering ? (
            // Register Flow
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    required 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input 
                    type="email" 
                    required 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input 
                    type="password" 
                    required 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium transition-colors">
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </button>
            </form>
          ) : (
            // Login Flow
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input 
                    type="email" 
                    required 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input 
                    type="password" 
                    required 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {/* Admin-Managed Password Notice */}
                {role === 'learner' && (
                  <div className="mt-2 text-xs text-gray-500">
                    Forgot your password? Please contact your administrator.
                  </div>
                )}
              </div>
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors">
                {loading ? 'Logging in...' : (
                   <>Login <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            {isRegistering ? (
               <p className="text-sm text-gray-600">
                 Already have an account? <button onClick={() => setIsRegistering(false)} className="text-blue-600 font-medium hover:underline">Log in</button>
               </p>
            ) : (
               role === 'learner' && (
                <p className="text-sm text-gray-600">
                  New here? <button onClick={() => { setIsRegistering(true); setEmail(''); setPassword(''); }} className="text-blue-600 font-medium hover:underline">Register now</button>
                </p>
               )
            )}
          </div>
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Left Side - Brand */}
      <div className="md:w-1/2 bg-blue-600 text-white flex flex-col justify-center p-12">
        <div className="mb-6">
          <BookOpen size={64} />
        </div>
        <h1 className="text-4xl font-bold mb-4">LearnOps</h1>
        <p className="text-blue-100 text-lg mb-8">
          Empowering teams with seamless learning experiences. 
          Manage courses, track progress, and certify skills in one place.
        </p>
        <div className="flex gap-4 text-sm text-blue-200">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} /> Secure
          </div>
          <div className="flex items-center gap-2">
             <span>⚡</span> Fast
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;