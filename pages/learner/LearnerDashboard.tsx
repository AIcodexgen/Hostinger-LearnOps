import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';
import { api } from '../../services/storage';
import { Course, Enrollment } from '../../types';
import { LogOut, PlayCircle, Award, CheckCircle } from 'lucide-react';

const LearnerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      // Auto enroll in all courses for this demo simplicity
      const allCourses = await api.getCourses();
      const published = allCourses.filter(c => c.status === 'published');
      setCourses(published);
      
      // Get Enrollments (and create if missing for demo)
      for (const c of published) {
        await api.enrollUser(user.id, c.id);
      }
      
      const myEnrollments = await api.getEnrollments(user.id);
      setEnrollments(myEnrollments);
      setLoading(false);
    };
    init();
  }, [user]);

  const getProgress = (courseId: string) => {
    const enrollment = enrollments.find(e => e.courseId === courseId);
    const course = courses.find(c => c.id === courseId);
    if (!enrollment || !course) return 0;
    
    // Simple calculation: modules completed / total modules
    const total = course.modules.length;
    if (total === 0) return 0;
    const completed = enrollment.completedModuleIds.length;
    return Math.round((completed / total) * 100);
  };

  const isPassed = (courseId: string) => {
     return enrollments.find(e => e.courseId === courseId)?.passed;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="font-bold text-xl text-blue-600">LearnOps</div>
          <div className="flex items-center gap-4">
             <span className="text-sm font-medium text-gray-700">Hi, {user?.name}</span>
             <button onClick={logout} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full">
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Courses</h1>
        
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your learning path...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => {
              const progress = getProgress(course.id);
              const passed = isPassed(course.id);
              
              return (
                <div key={course.id} className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  <div className="h-40 bg-gray-200 relative">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                    )}
                    {passed && (
                      <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow flex items-center gap-1">
                        <Award size={12} /> CERTIFIED
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{course.title}</h3>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">{course.description}</p>
                    
                    <div className="space-y-4">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>

                      <Link 
                        to={`/learner/course/${course.id}`}
                        className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${passed ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                      >
                         {passed ? (
                           <>Review Course</>
                         ) : (
                           <>{progress === 0 ? 'Start Learning' : 'Continue Learning'} <PlayCircle size={18} /></>
                         )}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default LearnerDashboard;