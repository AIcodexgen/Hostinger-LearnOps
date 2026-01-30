import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';
import { api } from '../../services/storage';
import { Course, User, Enrollment } from '../../types';
import { 
  LayoutDashboard, Plus, Users, BookOpen, Award, 
  Trash2, Edit, LogOut, Search, MoreVertical, Eye, Upload, X, Loader2, Key
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type TabView = 'courses' | 'learners' | 'certifications';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [activeTab, setActiveTab] = useState<TabView>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [stats, setStats] = useState({ totalLearners: 0, totalCourses: 0, activeEnrollments: 0, certificationsIssued: 0 });
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  // Password Reset Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Refresh data whenever the active tab changes or when the window regains focus/storage updates
  useEffect(() => {
    loadData();

    const handleRefresh = () => {
      // Small delay to ensure storage writes have propagated
      setTimeout(loadData, 100);
    };

    // Listen for storage changes from other tabs
    window.addEventListener('storage', handleRefresh);
    // Listen for window focus (e.g. user switching tabs back to admin)
    window.addEventListener('focus', handleRefresh);

    return () => {
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [activeTab]);

  const loadData = async () => {
    try {
      // Parallel data fetching for speed, but ensuring users are fetched fresh
      const [c, s, u, e] = await Promise.all([
        api.getCourses(),
        api.getStats(),
        api.getUsers(),
        api.getEnrollments()
      ]);
      
      setCourses(c);
      setStats(s);
      setUsers(u);
      setEnrollments(e);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      await api.deleteCourse(id);
      loadData();
    }
  };

  const handleOpenResetModal = (learner: User) => {
    setSelectedUserForReset(learner);
    setResetPassword('');
    setResetConfirm('');
    setResetModalOpen(true);
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassword || resetPassword !== resetConfirm) {
      alert("Passwords do not match or are empty.");
      return;
    }
    if (!selectedUserForReset) return;

    setResetLoading(true);
    try {
      await api.adminResetUserPassword(selectedUserForReset.id, resetPassword);
      setResetModalOpen(false);
      alert(`Password for ${selectedUserForReset.name} has been updated.`);
      loadData(); // Refresh users data just in case
    } catch (err) {
      console.error("Failed to reset password", err);
      alert("Failed to reset password. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  const chartData = [
    { name: 'Courses', value: stats.totalCourses },
    { name: 'Learners', value: stats.totalLearners },
    { name: 'Active', value: stats.activeEnrollments },
    { name: 'Certified', value: stats.certificationsIssued },
  ];

  const getTabButtonClass = (tabName: TabView) => {
    const base = "flex items-center gap-3 w-full px-4 py-2 rounded-lg font-medium transition-colors";
    return activeTab === tabName 
      ? `${base} bg-blue-50 text-blue-700` 
      : `${base} text-gray-600 hover:bg-gray-50`;
  };

  // Helper to find name from ID
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Unknown User';
  const getCourseTitle = (courseId: string) => courses.find(c => c.id === courseId)?.title || 'Unknown Course';

  // Derived Data for Views
  const learnersList = users.filter(u => u.role === 'learner');
  const certificationsList = enrollments.filter(e => e.passed);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r hidden md:flex flex-col">
        <div className="p-6 border-b flex items-center gap-2">
           <div className="bg-blue-600 text-white p-1 rounded"><LayoutDashboard size={20} /></div>
           <span className="font-bold text-lg text-gray-800">Admin Portal</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('courses')}
            className={getTabButtonClass('courses')}
          >
            <BookOpen size={18} /> Courses
          </button>
          <button 
            onClick={() => setActiveTab('learners')}
            className={getTabButtonClass('learners')}
          >
            <Users size={18} /> Learners
          </button>
          <button 
            onClick={() => setActiveTab('certifications')}
            className={getTabButtonClass('certifications')}
          >
            <Award size={18} /> Certifications
          </button>
        </nav>
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4 px-4">
             <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
               {user?.name.charAt(0)}
             </div>
             <div className="text-sm">
               <p className="font-medium text-gray-900">{user?.name}</p>
               <p className="text-gray-500 text-xs truncate w-24">{user?.email}</p>
             </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto relative">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Overview of your learning ecosystem</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'courses' && (
              <>
                <button 
                  onClick={() => setShowImportModal(true)}
                  className="bg-white border text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2 shadow-sm"
                >
                  <Upload size={18} /> Bulk Import
                </button>
                <Link to="/admin/courses/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 shadow-sm transition-all hover:shadow">
                  <Plus size={18} /> Create New Course
                </Link>
              </>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard icon={<BookOpen />} label="Total Courses" value={stats.totalCourses} color="blue" />
              <StatCard icon={<Users />} label="Total Learners" value={stats.totalLearners} color="green" />
              <StatCard icon={<LayoutDashboard />} label="Active Learners" value={stats.activeEnrollments} color="yellow" />
              <StatCard icon={<Award />} label="Certifications" value={stats.certificationsIssued} color="purple" />
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* View: Courses */}
              {activeTab === 'courses' && (
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="font-semibold text-gray-800">Course Management</h2>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      <input type="text" placeholder="Search..." className="pl-9 pr-4 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-gray-500 bg-gray-50">
                          <th className="px-6 py-3 font-medium">Title</th>
                          <th className="px-6 py-3 font-medium">Status</th>
                          <th className="px-6 py-3 font-medium">Modules</th>
                          <th className="px-6 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {courses.map(course => (
                          <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">{course.title}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${course.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {course.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500">{course.modules.length}</td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                              <button title="View as Learner" onClick={() => navigate(`/learner/course/${course.id}?preview=true`)} className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded"><Eye size={16} /></button>
                              <button title="Edit" onClick={() => navigate(`/admin/courses/${course.id}`)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                              <button title="Delete" onClick={() => handleDelete(course.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        ))}
                        {courses.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No courses found. Create one!</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* View: Learners */}
              {activeTab === 'learners' && (
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="font-semibold text-gray-800">Learners Directory</h2>
                    <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">{learnersList.length} Total</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-gray-500 bg-gray-50">
                          <th className="px-6 py-3 font-medium">Name</th>
                          <th className="px-6 py-3 font-medium">Email</th>
                          <th className="px-6 py-3 font-medium">Enrolled</th>
                          <th className="px-6 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {learnersList.map(learner => {
                          const enrolledCount = enrollments.filter(e => e.userId === learner.id).length;
                          return (
                            <tr key={learner.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-gray-900">{learner.name}</td>
                              <td className="px-6 py-4 text-gray-500">{learner.email}</td>
                              <td className="px-6 py-4 text-gray-500">{enrolledCount} Courses</td>
                              <td className="px-6 py-4 flex items-center gap-2">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 mr-2">Active</span>
                                <button 
                                  onClick={() => handleOpenResetModal(learner)}
                                  className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors text-xs font-medium border border-blue-100"
                                  title="Reset Password"
                                >
                                  <Key size={14} /> Reset Password
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {learnersList.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400">No learners registered yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* View: Certifications */}
              {activeTab === 'certifications' && (
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="font-semibold text-gray-800">Issued Certifications</h2>
                    <div className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-bold">{certificationsList.length} Issued</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-gray-500 bg-gray-50">
                          <th className="px-6 py-3 font-medium">Learner</th>
                          <th className="px-6 py-3 font-medium">Course</th>
                          <th className="px-6 py-3 font-medium">Certificate Title</th>
                          <th className="px-6 py-3 font-medium">Issued Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {certificationsList.map((cert, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">{getUserName(cert.userId)}</td>
                            <td className="px-6 py-4 text-gray-600">{getCourseTitle(cert.courseId)}</td>
                            <td className="px-6 py-4 text-gray-500">Certificate of Completion</td>
                            <td className="px-6 py-4 text-gray-500">{new Date(cert.certifiedAt || '').toLocaleDateString()}</td>
                          </tr>
                        ))}
                        {certificationsList.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400">No certifications issued yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Mini Chart (Persistent across tabs) */}
              <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col min-h-[350px]">
                <h2 className="font-semibold text-gray-800 mb-6">System Overview</h2>
                <div className="flex-1 w-full min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Import Modal */}
        {showImportModal && activeTab === 'courses' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
             <div className="bg-white rounded-xl p-8 max-w-lg w-full shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-bold">Bulk Import Courses</h2>
                   <button onClick={() => setShowImportModal(false)}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Upload a CSV file with the following columns:<br/>
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">Course Title, Description, Module Title, Module Type, Content</code>
                  </p>
                  <input 
                    type="file" 
                    accept=".csv"
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                    onChange={async (e) => {
                       const file = e.target.files?.[0];
                       if (!file) return;
                       const text = await file.text();
                       // Simple CSV parser for demo
                       const lines = text.split('\n').slice(1); // skip header
                       const coursesMap = new Map<string, Course>();
                       
                       lines.forEach(line => {
                          const [cTitle, cDesc, mTitle, mType, mContent] = line.split(',').map(s => s?.trim());
                          if (!cTitle) return;
                          
                          if (!coursesMap.has(cTitle)) {
                             coursesMap.set(cTitle, {
                               id: Math.random().toString(36).substr(2, 9),
                               title: cTitle,
                               description: cDesc || '',
                               thumbnail: '',
                               status: 'draft',
                               createdAt: new Date().toISOString(),
                               modules: [],
                               assessment: { id: Math.random().toString(), courseId: '', questions: [], passingScore: 70 }
                             });
                          }
                          
                          if (mTitle) {
                            coursesMap.get(cTitle)!.modules.push({
                              id: Math.random().toString(36).substr(2, 9),
                              title: mTitle,
                              type: (mType as any) || 'text',
                              content: mContent || '',
                              duration: 5
                            });
                          }
                       });
                       
                       await api.importData(Array.from(coursesMap.values()));
                       loadData();
                       setShowImportModal(false);
                       alert(`Successfully imported ${coursesMap.size} courses!`);
                    }}
                  />
                  <div className="text-xs text-gray-400 mt-2">
                    Note: This is a simulation. Ensure your CSV is formatted correctly.
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* Admin Password Reset Modal */}
        {resetModalOpen && selectedUserForReset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
             <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-bold">Reset Password</h2>
                   <button onClick={() => setResetModalOpen(false)}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Set a new password for learner <b>{selectedUserForReset.name}</b> ({selectedUserForReset.email}).
                </p>
                <form onSubmit={handleExecuteReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input 
                      type="password" 
                      required 
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input 
                      type="password" 
                      required 
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                      value={resetConfirm}
                      onChange={(e) => setResetConfirm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setResetModalOpen(false)}
                      className="flex-1 px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={resetLoading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {resetLoading ? 'Saving...' : 'Set Password'}
                    </button>
                  </div>
                </form>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: any, label: string, value: number, color: string }) => {
  const colorClasses: any = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-600",
    purple: "bg-purple-100 text-purple-600",
  };
  
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

export default AdminDashboard;