import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../App';
import { api } from '../../services/storage';
import { Course, Enrollment, Module } from '../../types';
import { ArrowLeft, CheckCircle, Circle, Play, FileText, File, Award, Download, Printer, LogOut, Eye, AlertCircle } from 'lucide-react';

const CourseRoom = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [viewMode, setViewMode] = useState<'content' | 'assessment' | 'certificate'>('content');
  
  // Assessment State
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [score, setScore] = useState<number | null>(null);

  // Video Player State
  const [videoError, setVideoError] = useState(false);

  const isPreview = new URLSearchParams(location.search).get('preview') === 'true';

  useEffect(() => {
    if (user && courseId) {
      loadData();
    }
  }, [user, courseId]);

  // Reset video error state when switching modules
  useEffect(() => {
    setVideoError(false);
  }, [activeModule]);

  const loadData = async () => {
    const courses = await api.getCourses();
    const c = courses.find(x => x.id === courseId);
    if (!c) return;
    setCourse(c);
    
    if (isPreview) {
      // Mock enrollment for preview
      setEnrollment({
        userId: 'preview',
        courseId: c.id,
        completedModuleIds: [],
        passed: false,
        enrolledAt: new Date().toISOString()
      });
    } else {
      const enr = await api.getEnrollments(user!.id);
      const myEnr = enr.find(e => e.courseId === courseId);
      setEnrollment(myEnr || null);
    }

    if (c.modules.length > 0) {
      setActiveModule(c.modules[0]);
    }
  };

  const markComplete = async (modId: string) => {
    if (isPreview) return; // Disable in preview
    if (!enrollment || !user || !courseId) return;
    const completed = new Set<string>(enrollment.completedModuleIds);
    completed.add(modId);
    
    const updated = await api.updateProgress(user.id, courseId, {
      completedModuleIds: Array.from(completed) as string[]
    });
    setEnrollment(updated);
  };

  const isModuleComplete = (modId: string) => enrollment?.completedModuleIds.includes(modId);
  const allModulesComplete = isPreview ? true : (course && enrollment && course.modules.every(m => enrollment.completedModuleIds.includes(m.id)));

  const handleAssessmentSubmit = async () => {
     if (isPreview) {
       alert("Assessment submission is disabled in preview mode.");
       return;
     }
     if (!course || !course.assessment || !user || !courseId) return;
     
     let correctCount = 0;
     course.assessment.questions.forEach((q, idx) => {
        if (answers[q.id] === q.correctOptionIndex) correctCount++;
     });

     const finalScore = Math.round((correctCount / course.assessment.questions.length) * 100);
     const passed = finalScore >= course.assessment.passingScore;
     
     setScore(finalScore);
     
     await api.updateProgress(user.id, courseId, {
       assessmentScore: finalScore,
       passed: passed,
       certifiedAt: passed ? new Date().toISOString() : undefined
     });
     
     // Refresh enrollment
     const enr = await api.getEnrollments(user.id);
     setEnrollment(enr.find(e => e.courseId === courseId) || null);
  };

  if (!course || !enrollment) return <div className="p-10">Loading...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100 no-print">
      {/* Top Bar */}
      <header className={`border-b h-16 flex items-center px-6 justify-between flex-shrink-0 ${isPreview ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => isPreview ? navigate('/admin') : navigate('/learner')} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="font-bold text-gray-800 line-clamp-1">{course.title}</h1>
            {isPreview && <span className="text-xs font-bold text-orange-600 uppercase tracking-wide flex items-center gap-1"><Eye size={10} /> Preview Mode (Read Only)</span>}
          </div>
        </div>
        <div>
           {enrollment.passed && (
             <button onClick={() => setViewMode('certificate')} className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
               <Award size={16} /> Certificate Available
             </button>
           )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-80 bg-white border-r overflow-y-auto flex-shrink-0">
          <div className="p-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Course Content</h2>
            <div className="space-y-2">
              {course.modules.map((mod, idx) => (
                <button
                  key={mod.id}
                  onClick={() => { setActiveModule(mod); setViewMode('content'); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${activeModule?.id === mod.id && viewMode === 'content' ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-gray-50'}`}
                >
                  <div className={`flex-shrink-0 ${isModuleComplete(mod.id) ? 'text-green-500' : 'text-gray-300'}`}>
                    {isModuleComplete(mod.id) ? <CheckCircle size={20} /> : <Circle size={20} />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${activeModule?.id === mod.id && viewMode === 'content' ? 'text-blue-700' : 'text-gray-700'}`}>
                      {idx + 1}. {mod.title}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                       {mod.type === 'video' && <Play size={10} />}
                       {mod.type === 'text' && <FileText size={10} />}
                       {mod.type === 'pdf' && <File size={10} />}
                       <span>{mod.duration} min</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t">
              <button
                disabled={!allModulesComplete}
                onClick={() => setViewMode('assessment')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${viewMode === 'assessment' ? 'bg-purple-50 border border-purple-200' : ''} ${!allModulesComplete ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}
              >
                 <div className="text-purple-500"><Award size={20} /></div>
                 <div>
                   <p className="text-sm font-bold text-gray-800">Final Assessment</p>
                   <p className="text-xs text-gray-500">
                     {allModulesComplete ? 'Ready to begin' : 'Complete all modules to unlock'}
                   </p>
                 </div>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
          {viewMode === 'content' && activeModule && (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border p-8 min-h-[500px] flex flex-col">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{activeModule.title}</h2>
              
              <div className="flex-1 prose max-w-none mb-8">
                {activeModule.type === 'text' && (
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{activeModule.content}</div>
                )}
                {activeModule.type === 'video' && (
                   <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-lg flex items-center justify-center relative">
                     {!videoError ? (
                       <video
                         key={activeModule.id} // Re-render on module change
                         controls
                         className="w-full h-full object-contain"
                         src={activeModule.content}
                         onError={() => setVideoError(true)}
                       >
                         Your browser does not support the video tag.
                       </video>
                     ) : (
                       <div className="text-center p-6 text-white w-full">
                         <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                           <Play size={32} className="ml-1 opacity-50" />
                         </div>
                         <h3 className="font-bold text-lg mb-2">Unable to Play Inline</h3>
                         <p className="text-gray-400 text-sm mb-6">The source video format is not supported for inline playback or the URL is invalid.</p>
                         <a 
                           href={activeModule.content} 
                           target="_blank" 
                           rel="noreferrer" 
                           className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition-colors font-medium text-sm"
                         >
                           Watch on External Player <Eye size={16} />
                         </a>
                       </div>
                     )}
                   </div>
                )}
                {activeModule.type === 'pdf' && (
                   <div className="bg-gray-100 p-8 rounded-xl text-center">
                      <File size={48} className="mx-auto mb-4 text-gray-400" />
                      <p className="font-medium text-gray-900">PDF Resource</p>
                      <a href={activeModule.content} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Download / View PDF</a>
                   </div>
                )}
              </div>

              <div className="border-t pt-6 flex justify-end">
                {!isModuleComplete(activeModule.id) ? (
                   <button 
                     onClick={() => markComplete(activeModule.id)}
                     disabled={isPreview}
                     className={`px-6 py-2 rounded-lg font-medium transition-colors ${isPreview ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                   >
                     {isPreview ? 'Mark Complete (Disabled in Preview)' : 'Mark as Complete'}
                   </button>
                ) : (
                   <button disabled className="bg-green-50 text-green-700 px-6 py-2 rounded-lg font-medium flex items-center gap-2">
                     <CheckCircle size={18} /> Completed
                   </button>
                )}
              </div>
            </div>
          )}

          {viewMode === 'assessment' && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Final Assessment</h2>
              <p className="text-gray-500 mb-8">Pass mark: {course.assessment?.passingScore}%</p>
              
              {score === null ? (
                <div className="space-y-8">
                  {course.assessment?.questions.map((q, qIdx) => (
                    <div key={q.id} className="space-y-4">
                      <p className="font-medium text-gray-900 text-lg">{qIdx + 1}. {q.text}</p>
                      <div className="space-y-2">
                        {q.options.map((opt, oIdx) => (
                           <label key={oIdx} className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors ${answers[q.id] === oIdx ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                             <input 
                               type="radio" 
                               name={q.id} 
                               checked={answers[q.id] === oIdx}
                               onChange={() => setAnswers({...answers, [q.id]: oIdx})}
                               className="w-4 h-4 text-blue-600"
                             />
                             <span className="text-gray-700">{opt}</span>
                           </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={handleAssessmentSubmit}
                    disabled={isPreview}
                    className={`w-full py-3 rounded-xl font-bold text-lg shadow-lg ${isPreview ? 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
                  >
                    {isPreview ? 'Submit Assessment (Disabled in Preview)' : 'Submit Assessment'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-12">
                   {score >= (course.assessment?.passingScore || 0) ? (
                     <div className="space-y-6">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                          <Award size={40} />
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold text-gray-900 mb-2">Congratulations!</h3>
                          <p className="text-gray-500">You passed with a score of <span className="text-green-600 font-bold">{score}%</span></p>
                        </div>
                        <button 
                          onClick={() => setViewMode('certificate')}
                          className="bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 font-bold shadow-lg shadow-green-200"
                        >
                          View Certificate
                        </button>
                     </div>
                   ) : (
                     <div className="space-y-6">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                          <LogOut size={40} />
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold text-gray-900 mb-2">Not quite there yet</h3>
                          <p className="text-gray-500">You scored <span className="text-red-600 font-bold">{score}%</span>. You need {course.assessment?.passingScore}% to pass.</p>
                        </div>
                        <button 
                          onClick={() => { setScore(null); setAnswers({}); }}
                          className="bg-gray-900 text-white px-8 py-3 rounded-xl hover:bg-gray-800 font-bold"
                        >
                          Try Again
                        </button>
                     </div>
                   )}
                </div>
              )}
            </div>
          )}

          {viewMode === 'certificate' && enrollment && enrollment.passed && (
            <div className="flex flex-col items-center justify-center h-full">
               <div id="certificate-print" className="bg-white p-12 landscape:w-[1000px] portrait:w-full shadow-2xl border-8 border-double border-gray-200 text-center relative max-w-4xl mx-auto">
                  <div className="absolute top-0 left-0 w-full h-full border-[20px] border-blue-50 pointer-events-none"></div>
                  
                  <div className="mb-8">
                     <Award size={64} className="mx-auto text-blue-600 mb-4" />
                     <h1 className="text-4xl font-serif text-gray-900 tracking-widest uppercase mb-2">Certificate</h1>
                     <span className="text-xl text-gray-500 font-serif italic">of Completion</span>
                  </div>

                  <p className="text-gray-600 text-lg mb-4">This certifies that</p>
                  <h2 className="text-4xl font-bold text-blue-900 mb-2 font-serif">{user?.name}</h2>
                  
                  <div className="w-64 h-1 bg-blue-100 mx-auto mb-8"></div>

                  <p className="text-gray-600 text-lg mb-2">has successfully completed the course</p>
                  <h3 className="text-2xl font-bold text-gray-800 mb-12">{course.title}</h3>

                  <div className="flex justify-between items-end text-left px-12 mt-12">
                     <div>
                        <p className="text-sm text-gray-500 mb-1">Date</p>
                        <p className="font-medium text-gray-900 border-t pt-2 w-32">
                           {new Date(enrollment.certifiedAt || new Date()).toLocaleDateString()}
                        </p>
                     </div>
                     <div className="text-right">
                        <div className="h-12 w-32 mb-2">
                           {/* Signature Image Placeholder or Script Font */}
                           <span className="font-serif italic text-2xl text-blue-800 opacity-70">LearnOps</span>
                        </div>
                        <p className="font-medium text-gray-900 border-t pt-2 w-48">LearnOps Administrator</p>
                     </div>
                  </div>
               </div>

               <div className="mt-8 flex gap-4 no-print">
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow"
                  >
                    <Printer size={18} /> Print Certificate
                  </button>
               </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #certificate-print, #certificate-print * {
            visibility: visible;
          }
          #certificate-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none;
            border: 4px solid #ddd;
          }
        }
      `}</style>
    </div>
  );
};

export default CourseRoom;