import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/storage';
import { Course, Module, Question } from '../../types';
import { 
  ArrowLeft, Save, Plus, Trash2, Video, FileText, CheckSquare, 
  GripVertical, ChevronRight, Check, Eye, Share2, Calendar, 
  Settings, Award, Lock, Globe, MessageSquare, List, UploadCloud
} from 'lucide-react';

const STEPS = [
  { id: 'basic', title: 'Basic Information' },
  { id: 'content', title: 'Course Content' },
  { id: 'assessment', title: 'Assessments' },
  { id: 'publishing', title: 'Publishing' },
  { id: 'preview', title: 'Preview' }
];

// Interface for UI-only grouping (mapped to flat list on save)
interface UISection {
  id: string;
  title: string;
  lessons: Module[];
}

const CourseEditor = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Core Data (Persisted)
  const [course, setCourse] = useState<Course>({
    id: Math.random().toString(36).substr(2, 9),
    title: '',
    description: '',
    thumbnail: '',
    status: 'draft',
    modules: [], // This will be the flattened list of lessons
    createdAt: new Date().toISOString(),
    assessment: {
      id: Math.random().toString(36).substr(2, 9),
      courseId: '',
      questions: [],
      passingScore: 70
    }
  });

  // UI State for Content Hierarchy (Modules -> Lessons)
  const [sections, setSections] = useState<UISection[]>([
    { id: 'sec-1', title: 'Module 1', lessons: [] }
  ]);

  // Extended Form State (UI Only)
  const [extendedData, setExtendedData] = useState({
    category: '',
    difficulty: 'Beginner',
    duration: '',
    maxEnrollments: '',
    learningObjectives: '',
    prerequisites: '',
    // Publishing
    enrollmentType: 'open',
    visibility: 'public',
    enrollmentStart: '',
    enrollmentEnd: '',
    courseStart: '',
    courseEnd: '',
    certificate: true,
    certificateTitle: 'Certificate of Completion',
    minCompletion: 100,
    allowForum: false,
    sendNotifications: true,
    enableTracking: true,
    allowRating: true,
    sequential: false,
    instructorNotes: ''
  });

  useEffect(() => {
    if (courseId) {
      const load = async () => {
        const c = (await api.getCourses()).find(x => x.id === courseId);
        if (c) {
          setCourse(c);
          if (c.modules.length > 0) {
            setSections([{ id: 'sec-1', title: 'Course Modules', lessons: c.modules }]);
          }
        }
      };
      load();
    }
  }, [courseId]);

  const handleSave = async (isDraft = true) => {
    setLoading(true);
    const flatModules = sections.flatMap(s => s.lessons);
    const updatedCourse = { 
      ...course, 
      modules: flatModules,
      status: isDraft ? 'draft' : 'published' 
    } as Course;
    
    if (updatedCourse.assessment) {
      updatedCourse.assessment.courseId = updatedCourse.id;
    }
    
    await api.saveCourse(updatedCourse);
    setLoading(false);
    navigate('/admin');
  };

  // --- Helpers ---
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // --- Content Logic (Modules & Lessons) ---
  const addSection = () => {
    setSections([...sections, { 
      id: Math.random().toString(36).substr(2, 9), 
      title: `Module ${sections.length + 1}`, 
      lessons: [] 
    }]);
  };

  const deleteSection = (secIdx: number) => {
    const newSections = [...sections];
    newSections.splice(secIdx, 1);
    setSections(newSections);
  };

  const updateSectionTitle = (secIdx: number, title: string) => {
    const newSections = [...sections];
    newSections[secIdx].title = title;
    setSections(newSections);
  };

  const addLesson = (secIdx: number) => {
    const newLesson: Module = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New Lesson',
      type: 'text',
      content: '',
      duration: 10
    };
    const newSections = [...sections];
    newSections[secIdx].lessons.push(newLesson);
    setSections(newSections);
  };

  const updateLesson = (secIdx: number, lessonIdx: number, field: keyof Module, value: any) => {
    const newSections = [...sections];
    newSections[secIdx].lessons[lessonIdx] = { 
      ...newSections[secIdx].lessons[lessonIdx], 
      [field]: value 
    };
    setSections(newSections);
  };

  const removeLesson = (secIdx: number, lessonIdx: number) => {
    const newSections = [...sections];
    newSections[secIdx].lessons.splice(lessonIdx, 1);
    setSections(newSections);
  };

  // --- Assessment Logic ---
  const addQuestion = () => {
    if (!course.assessment) return;
    const newQ: Question = {
      id: Math.random().toString(36).substr(2, 9),
      text: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0
    };
    setCourse({
      ...course,
      assessment: {
        ...course.assessment,
        questions: [...course.assessment.questions, newQ]
      }
    });
  };

  const removeQuestion = (qIndex: number) => {
    if (!course.assessment) return;
    const qs = [...course.assessment.questions];
    qs.splice(qIndex, 1);
    setCourse({ 
      ...course, 
      assessment: { 
        ...course.assessment, 
        questions: qs 
      } 
    });
  };

  const updateQuestion = (qIndex: number, field: keyof Question, value: any) => {
    if (!course.assessment) return;
    const qs = [...course.assessment.questions];
    qs[qIndex] = { ...qs[qIndex], [field]: value };
    setCourse({ ...course, assessment: { ...course.assessment, questions: qs } });
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    if (!course.assessment) return;
    const qs = [...course.assessment.questions];
    qs[qIndex].options[oIndex] = value;
    setCourse({ ...course, assessment: { ...course.assessment, questions: qs } });
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        
        if (lines.length === 0) {
            alert("File is empty or invalid format.");
            e.target.value = '';
            return;
        }

        const newQuestions: Question[] = [];
        let errors = 0;
        let success = 0;

        // Detect header row (simple check if first cell starts with "Question")
        const firstRow = lines[0].split(',')[0].toLowerCase().trim();
        const startIndex = firstRow.includes('question') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            // Split by comma, ignoring commas inside double quotes
            // Regex explanation: Match a comma only if it's followed by an even number of quotes (meaning it's outside quotes)
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => {
                const trimmed = c.trim();
                // Remove surrounding quotes and unescape double quotes
                if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                    return trimmed.slice(1, -1).replace(/""/g, '"');
                }
                return trimmed;
            });

            // Ensure we have at least 6 columns (Question + 4 Options + Answer)
            if (cols.length < 6) {
                console.warn(`Skipping row ${i + 1}: Insufficient columns`);
                errors++;
                continue;
            }

            const [qText, optA, optB, optC, optD, rawAns] = cols;
            
            // Validate essential fields
            if (!qText || !optA || !optB || !rawAns) {
                console.warn(`Skipping row ${i + 1}: Missing required fields`);
                errors++;
                continue;
            }

            // Map Answer (A/B/C/D) to index with flexible parsing
            const ansNormalized = rawAns.toUpperCase().trim();
            let correctIndex = -1;
            
            if (ansNormalized.startsWith('A') || ansNormalized === '1' || ansNormalized === 'OPTION A') correctIndex = 0;
            else if (ansNormalized.startsWith('B') || ansNormalized === '2' || ansNormalized === 'OPTION B') correctIndex = 1;
            else if (ansNormalized.startsWith('C') || ansNormalized === '3' || ansNormalized === 'OPTION C') correctIndex = 2;
            else if (ansNormalized.startsWith('D') || ansNormalized === '4' || ansNormalized === 'OPTION D') correctIndex = 3;

            if (correctIndex === -1) {
                console.warn(`Skipping row ${i + 1}: Invalid answer key '${rawAns}' (Must be A, B, C, or D)`);
                errors++;
                continue; 
            }

            newQuestions.push({
                id: Math.random().toString(36).substr(2, 9),
                text: qText,
                options: [optA, optB, optC, optD],
                correctOptionIndex: correctIndex
            });
            success++;
        }

        if (success === 0) {
            alert(`Import failed. No valid questions found.\n\nErrors: ${errors}\n\nExpected Format:\nQuestion, Option A, Option B, Option C, Option D, Correct Answer (A/B/C/D)`);
        } else {
            setCourse(prev => {
                const baseAssessment = prev.assessment || {
                    id: Math.random().toString(36).substr(2, 9),
                    courseId: prev.id,
                    questions: [],
                    passingScore: 70
                };
                
                return {
                    ...prev,
                    assessment: {
                        ...baseAssessment,
                        questions: [...baseAssessment.questions, ...newQuestions]
                    }
                };
            });
            alert(`Import Complete!\n\n✅ Added: ${success}\n⚠️ Skipped: ${errors}`);
        }
    } catch (err) {
        console.error(err);
        alert("Critical Error: Could not process CSV file. Please check the format.");
    }
    
    // Reset file input
    e.target.value = '';
  };

  // --- Styles ---
  const inputStyle = "w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none";
  const labelStyle = "block text-sm font-medium text-gray-700 mb-1";

  // --- Render Steps ---
  const renderStep = () => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          <div className="bg-white p-8 rounded-xl shadow-sm border space-y-6 animate-in fade-in">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelStyle}>Course Title <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={course.title}
                  onChange={e => setCourse({...course, title: e.target.value})}
                  className={inputStyle}
                  placeholder="e.g. Advanced Leadership Skills"
                />
              </div>
              <div>
                <label className={labelStyle}>Category <span className="text-red-500">*</span></label>
                <select 
                  className={inputStyle}
                  value={extendedData.category}
                  onChange={e => setExtendedData({...extendedData, category: e.target.value})}
                >
                  <option value="">Select Category</option>
                  <option value="tech">Technology</option>
                  <option value="business">Business</option>
                  <option value="design">Design</option>
                  <option value="marketing">Marketing</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelStyle}>Difficulty Level <span className="text-red-500">*</span></label>
                <select 
                   className={inputStyle}
                   value={extendedData.difficulty}
                   onChange={e => setExtendedData({...extendedData, difficulty: e.target.value})}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className={labelStyle}>Estimated Duration</label>
                <input 
                   type="text" 
                   className={inputStyle} 
                   placeholder="e.g. 4 Weeks"
                   value={extendedData.duration}
                   onChange={e => setExtendedData({...extendedData, duration: e.target.value})}
                />
              </div>
              <div>
                <label className={labelStyle}>Maximum Enrollments</label>
                <input 
                   type="number" 
                   className={inputStyle} 
                   placeholder="Unlimited"
                   value={extendedData.maxEnrollments}
                   onChange={e => setExtendedData({...extendedData, maxEnrollments: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className={labelStyle}>Course Description <span className="text-red-500">*</span></label>
              <textarea 
                rows={4}
                value={course.description}
                onChange={e => setCourse({...course, description: e.target.value})}
                className={inputStyle}
                placeholder="What will learners achieve?"
              />
            </div>

            <div>
              <label className={labelStyle}>Learning Objectives <span className="text-red-500">*</span></label>
              <textarea 
                rows={3}
                className={inputStyle}
                placeholder="- Understand key concepts..."
                value={extendedData.learningObjectives}
                onChange={e => setExtendedData({...extendedData, learningObjectives: e.target.value})}
              />
            </div>

            <div>
               <label className={labelStyle}>Prerequisites (Optional)</label>
               <input 
                 type="text" 
                 className={inputStyle} 
                 placeholder="e.g. Basic JS knowledge"
                 value={extendedData.prerequisites}
                 onChange={e => setExtendedData({...extendedData, prerequisites: e.target.value})}
               />
            </div>

            <div>
              <label className={labelStyle}>Thumbnail URL</label>
              <input 
                type="text" 
                value={course.thumbnail}
                onChange={e => setCourse({...course, thumbnail: e.target.value})}
                className={inputStyle}
                placeholder="https://..."
              />
            </div>
          </div>
        );

      case 1: // Course Content (Modules & Lessons)
        return (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Course Modules</h2>
              <button 
                onClick={addSection}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2"
              >
                <Plus size={16} /> Add Module
              </button>
            </div>

            {sections.length === 0 && (
               <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                  <div className="text-gray-400 mb-4">No modules added yet</div>
                  <button onClick={addSection} className="text-blue-600 font-medium hover:underline">Add Your First Module</button>
               </div>
            )}

            {sections.map((section, secIdx) => (
              <div key={section.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {/* Module Header */}
                <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                   <div className="flex items-center gap-3 flex-1">
                      <GripVertical className="text-gray-400 cursor-move" size={20} />
                      <input 
                        type="text" 
                        value={section.title}
                        onChange={(e) => updateSectionTitle(secIdx, e.target.value)}
                        className="bg-transparent font-bold text-gray-800 focus:outline-none focus:border-b border-blue-500 px-1"
                        placeholder="Module Title"
                      />
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{section.lessons.length} Lessons</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <button onClick={() => deleteSection(secIdx)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={18} /></button>
                   </div>
                </div>

                {/* Lessons List */}
                <div className="p-4 space-y-4">
                   {section.lessons.map((lesson, lessonIdx) => (
                      <div key={lessonIdx} className="flex gap-4 p-4 border rounded-lg hover:border-blue-300 transition-colors bg-white">
                         <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                            <div className="md:col-span-6">
                               <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Lesson Title</label>
                               <input 
                                 type="text" 
                                 value={lesson.title}
                                 onChange={(e) => updateLesson(secIdx, lessonIdx, 'title', e.target.value)}
                                 className={inputStyle}
                                 placeholder="Introduction..."
                               />
                            </div>
                            <div className="md:col-span-3">
                               <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Content Type</label>
                               <select 
                                 value={lesson.type}
                                 onChange={(e) => updateLesson(secIdx, lessonIdx, 'type', e.target.value)}
                                 className={inputStyle}
                               >
                                 <option value="video">Video Lesson</option>
                                 <option value="text">Reading Material</option>
                                 <option value="pdf">Document / PDF</option>
                               </select>
                            </div>
                            <div className="md:col-span-3">
                               <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Duration (Min)</label>
                               <input 
                                 type="number"
                                 value={lesson.duration}
                                 onChange={(e) => updateLesson(secIdx, lessonIdx, 'duration', parseInt(e.target.value) || 0)}
                                 className={inputStyle}
                               />
                            </div>
                            
                            {/* Lesson Content Input - Fixed for File Upload */}
                            <div className="md:col-span-12">
                               <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                                 Lesson Content
                               </label>
                               
                               {lesson.type === 'text' && (
                                 <textarea 
                                   value={lesson.content}
                                   onChange={(e) => updateLesson(secIdx, lessonIdx, 'content', e.target.value)}
                                   className={inputStyle}
                                   rows={3}
                                   placeholder="Enter lesson content..."
                                 />
                               )}

                               {lesson.type === 'pdf' && (
                                 <div className="space-y-2">
                                    <input 
                                        type="file"
                                        accept=".pdf"
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if(file) {
                                                const base64 = await readFileAsBase64(file);
                                                updateLesson(secIdx, lessonIdx, 'content', base64);
                                            }
                                        }}
                                    />
                                    {lesson.content && lesson.content.startsWith('data:') && (
                                        <p className="text-xs text-green-600 flex items-center gap-1 bg-green-50 p-2 rounded w-fit">
                                          <Check size={12}/> PDF File Uploaded (Ready)
                                        </p>
                                    )}
                                 </div>
                               )}

                               {lesson.type === 'video' && (
                                 <div className="space-y-3">
                                    <input 
                                        type="file"
                                        accept="video/*"
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if(file) {
                                                const base64 = await readFileAsBase64(file);
                                                updateLesson(secIdx, lessonIdx, 'content', base64);
                                            }
                                        }}
                                    />
                                    
                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium uppercase">
                                        <div className="h-px bg-gray-200 flex-1"></div>
                                        OR USE URL
                                        <div className="h-px bg-gray-200 flex-1"></div>
                                    </div>

                                    <input 
                                       type="text"
                                       value={!lesson.content.startsWith('data:') ? lesson.content : ''}
                                       onChange={(e) => updateLesson(secIdx, lessonIdx, 'content', e.target.value)}
                                       className={inputStyle}
                                       placeholder="https://youtube.com/..."
                                    />

                                    {lesson.content && (
                                        <p className="text-xs text-green-600 flex items-center gap-1 bg-green-50 p-2 rounded w-fit">
                                          <Check size={12}/> {lesson.content.startsWith('data:') ? 'Video File Uploaded' : 'Video URL Set'}
                                        </p>
                                    )}
                                 </div>
                               )}
                            </div>
                         </div>
                         <button onClick={() => removeLesson(secIdx, lessonIdx)} className="text-gray-400 hover:text-red-500 self-center"><Trash2 size={18} /></button>
                      </div>
                   ))}
                   <button 
                     onClick={() => addLesson(secIdx)}
                     className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors font-medium flex justify-center items-center gap-2"
                   >
                     <Plus size={16} /> Add Lesson
                   </button>
                </div>
              </div>
            ))}
          </div>
        );

      case 2: // Assessments
        return (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Course Assessments</h2>
             </div>

             <div className="bg-white p-6 rounded-xl shadow-sm border space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                      <label className={labelStyle}>Assessment Title</label>
                      <input type="text" defaultValue="Final Exam" className={inputStyle} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>Passing Score (%) <span className="text-red-500">*</span></label>
                        <input 
                          type="number" 
                          min="0" max="100"
                          value={course.assessment?.passingScore || 70}
                          onChange={e => setCourse({
                            ...course, 
                            assessment: { ...course.assessment!, passingScore: parseInt(e.target.value) || 0 }
                          })}
                          className={inputStyle}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>Time Limit (Mins) <span className="text-red-500">*</span></label>
                        <input type="number" defaultValue={60} className={inputStyle} />
                      </div>
                   </div>
                </div>

                <div className="border-t pt-6">
                   <h3 className="font-bold text-gray-700 mb-4">Questions</h3>
                   
                   {course.assessment?.questions.map((q, qIdx) => (
                      <div key={q.id} className="mb-6 p-4 bg-gray-50 rounded-lg border">
                         <div className="mb-3 flex justify-between items-center">
                           <label className="text-xs font-bold text-gray-500 uppercase block">Question {qIdx + 1}</label>
                           <button onClick={() => removeQuestion(qIdx)} className="text-red-500 hover:text-red-700 p-1">
                             <Trash2 size={16} />
                           </button>
                         </div>
                         <div className="mb-3">
                           <input 
                              type="text"
                              value={q.text}
                              onChange={e => updateQuestion(qIdx, 'text', e.target.value)}
                              className={inputStyle}
                              placeholder="Enter question text..."
                           />
                         </div>
                         <div className="pl-4 border-l-2 border-gray-300 space-y-2">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2">
                                <input 
                                  type="radio" 
                                  name={`q-${q.id}-correct`}
                                  checked={q.correctOptionIndex === oIdx}
                                  onChange={() => updateQuestion(qIdx, 'correctOptionIndex', oIdx)}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <input 
                                  type="text"
                                  value={opt}
                                  onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                                  className={`flex-1 text-sm px-3 py-1.5 border rounded ${inputStyle}`}
                                  placeholder={`Option ${oIdx + 1}`}
                                />
                              </div>
                            ))}
                         </div>
                      </div>
                   ))}

                   <div className="flex gap-3">
                      <button 
                        onClick={addQuestion}
                        className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium flex justify-center items-center gap-2"
                      >
                        <Plus size={16} /> Add Question
                      </button>
                      
                      {/* Fixed Bulk Import */}
                      <div className="relative">
                         <input 
                            type="file" 
                            accept=".csv"
                            id="bulk-import"
                            className="hidden"
                            onChange={handleBulkImport}
                         />
                         <label 
                            htmlFor="bulk-import"
                            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium flex items-center gap-2 cursor-pointer bg-white"
                         >
                           <UploadCloud size={16} /> Bulk Import (CSV)
                         </label>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        );

      case 3: // Publishing
        return (
          <div className="space-y-6 animate-in fade-in">
             <h2 className="text-lg font-semibold text-gray-800">Publishing Settings</h2>
             
             <div className="bg-white p-6 rounded-xl shadow-sm border space-y-6">
                {/* Enrollment & Visibility */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                      <label className={labelStyle}>Enrollment Type <span className="text-red-500">*</span></label>
                      <select 
                         className={inputStyle}
                         value={extendedData.enrollmentType}
                         onChange={e => setExtendedData({...extendedData, enrollmentType: e.target.value})}
                      >
                         <option value="open">Open Enrollment</option>
                         <option value="approval">Requires Approval</option>
                         <option value="invite">Invitation Only</option>
                      </select>
                   </div>
                   <div>
                      <label className={labelStyle}>Course Visibility <span className="text-red-500">*</span></label>
                      <select 
                         className={inputStyle}
                         value={extendedData.visibility}
                         onChange={e => setExtendedData({...extendedData, visibility: e.target.value})}
                      >
                         <option value="public">Public Catalog</option>
                         <option value="private">Private</option>
                         <option value="internal">Internal Only</option>
                      </select>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                   <div>
                      <label className={labelStyle}>Enrollment Start</label>
                      <input type="date" className={inputStyle} />
                   </div>
                   <div>
                      <label className={labelStyle}>Enrollment End</label>
                      <input type="date" className={inputStyle} />
                   </div>
                   <div>
                      <label className={labelStyle}>Course Start</label>
                      <input type="date" className={inputStyle} />
                   </div>
                   <div>
                      <label className={labelStyle}>Course End</label>
                      <input type="date" className={inputStyle} />
                   </div>
                </div>

                <hr />

                {/* Certificate */}
                <div>
                   <div className="flex items-center gap-2 mb-4">
                      <input 
                         type="checkbox" 
                         id="cert" 
                         className="w-5 h-5 text-blue-600 rounded"
                         checked={extendedData.certificate}
                         onChange={e => setExtendedData({...extendedData, certificate: e.target.checked})}
                      />
                      <label htmlFor="cert" className="font-bold text-gray-800">Issue Certificate Upon Completion</label>
                   </div>
                   
                   {extendedData.certificate && (
                      <div className="pl-7 grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label className={labelStyle}>Certificate Template</label>
                            <select className={inputStyle}>
                               <option>Standard Professional</option>
                               <option>Modern Blue</option>
                               <option>Classic</option>
                            </select>
                         </div>
                         <div>
                            <label className={labelStyle}>Certificate Title</label>
                            <input 
                               type="text" 
                               value={extendedData.certificateTitle}
                               onChange={e => setExtendedData({...extendedData, certificateTitle: e.target.value})}
                               className={inputStyle}
                            />
                         </div>
                      </div>
                   )}
                </div>

                <hr />

                {/* Additional Settings */}
                <div className="space-y-3">
                   <h3 className="font-bold text-gray-700">Additional Settings</h3>
                   {[
                      { label: 'Allow Discussion Forum', key: 'allowForum' },
                      { label: 'Send Enrollment Notifications', key: 'sendNotifications' },
                      { label: 'Enable Progress Tracking', key: 'enableTracking' },
                      { label: 'Allow Course Rating', key: 'allowRating' },
                      { label: 'Require Sequential Completion', key: 'sequential' },
                   ].map((item: any) => (
                      <div key={item.key} className="flex items-center gap-2">
                         <input 
                            type="checkbox" 
                            checked={(extendedData as any)[item.key]} 
                            onChange={e => setExtendedData({...extendedData, [item.key]: e.target.checked})}
                            className="w-4 h-4 text-blue-600 rounded"
                         />
                         <span className="text-sm text-gray-700">{item.label}</span>
                      </div>
                   ))}
                </div>

                <div>
                   <label className={labelStyle}>Instructor Notes (Internal Only)</label>
                   <textarea 
                     rows={3} 
                     className={inputStyle}
                     value={extendedData.instructorNotes}
                     onChange={e => setExtendedData({...extendedData, instructorNotes: e.target.value})}
                     placeholder="Notes for other admins..."
                   />
                </div>
             </div>
          </div>
        );

      case 4: // Preview
        const totalLessons = sections.reduce((acc, s) => acc + s.lessons.length, 0);
        const totalDuration = sections.reduce((acc, s) => acc + s.lessons.reduce((d, l) => d + l.duration, 0), 0);

        return (
          <div className="bg-white p-8 rounded-xl shadow-sm border space-y-8 animate-in fade-in">
             <div className="text-center border-b pb-8">
               <h2 className="text-2xl font-bold text-gray-900 mb-2">{course.title || 'Untitled Course'}</h2>
               <p className="text-gray-500 max-w-2xl mx-auto">{course.description || 'No description provided.'}</p>
               
               <div className="flex justify-center gap-8 mt-6 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><Calendar size={16} /> Duration: {totalDuration} min</span>
                  <span className="flex items-center gap-1"><List size={16} /> Modules: {sections.length}</span>
                  <span className="flex items-center gap-1"><FileText size={16} /> Lessons: {totalLessons}</span>
                  <span className="flex items-center gap-1"><CheckSquare size={16} /> Assessment: {course.assessment?.questions.length || 0} Qs</span>
               </div>
             </div>

             <div className="space-y-4">
                <h3 className="font-bold text-gray-800">Course Structure Preview</h3>
                {sections.map((s, idx) => (
                   <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-bold text-gray-700 mb-2">{s.title}</h4>
                      <div className="space-y-1 ml-4">
                         {s.lessons.map((l, lIdx) => (
                            <div key={lIdx} className="text-sm text-gray-600 flex items-center gap-2">
                               <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                               {l.title} <span className="text-gray-400 text-xs">({l.duration} min)</span>
                            </div>
                         ))}
                      </div>
                   </div>
                ))}
             </div>

             <div className="flex gap-4 justify-center pt-8 border-t">
                <button 
                  onClick={() => handleSave(false)} // Just save/publish, the preview logic is mainly visual here
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
                >
                  <Eye size={18} /> Preview as Learner
                </button>
                <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2">
                  <Share2 size={18} /> Share Preview Link
                </button>
                <button 
                  onClick={() => handleSave(false)}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-200"
                >
                  Publish Course
                </button>
             </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">{course.title || 'New Course'}</h1>
            <span className="text-xs text-gray-500">{STEPS[currentStep].title}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => handleSave(true)} className="text-gray-500 hover:text-gray-900 px-4 py-2 text-sm font-medium">Save as Draft</button>
        </div>
      </header>

      {/* Steps Indicator */}
      <div className="bg-white border-b px-8 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between relative">
           {/* Line */}
           <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-0 transform -translate-y-1/2 hidden md:block"></div>
           
           {STEPS.map((step, idx) => {
             const isActive = idx === currentStep;
             const isCompleted = idx < currentStep;
             return (
               <button 
                 key={step.id} 
                 onClick={() => setCurrentStep(idx)}
                 className="flex flex-col items-center relative z-10 bg-white px-4 focus:outline-none group"
               >
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 transition-all border-2 ${isActive ? 'bg-blue-600 text-white border-blue-600 scale-110' : isCompleted ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-400 border-gray-300 group-hover:border-gray-400'}`}>
                    {isCompleted ? <Check size={16} /> : idx + 1}
                 </div>
                 <span className={`text-xs font-semibold ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>{step.title}</span>
               </button>
             );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 max-w-5xl mx-auto w-full pb-20">
        {renderStep()}
        
        <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 flex justify-between items-center z-20 px-8">
           <button 
             onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
             disabled={currentStep === 0}
             className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-medium"
           >
             Previous Step
           </button>
           
           {currentStep < STEPS.length - 1 ? (
             <button 
               onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
               className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md"
             >
               Next Step
             </button>
           ) : (
             <span className="text-sm text-gray-500">End of Wizard</span>
           )}
        </div>
      </div>
    </div>
  );
};

export default CourseEditor;