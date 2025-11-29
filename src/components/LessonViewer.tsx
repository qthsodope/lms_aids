import React from 'react';
import { Video, Code, BookOpen, ArrowLeft, ArrowRight, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

// Interface Lesson
interface Lesson {
  id: string;
  title: string;
  content: string;
  videoUrl?: string;
  pythonCode?: string;
  createdAt?: any;
}

interface LessonViewerProps {
  lesson: Lesson | undefined;
  role: 'teacher' | 'student';
  allLessons?: Lesson[]; 
  onNavigate?: (id: string) => void;
}

export default function LessonViewer({ lesson, role, allLessons = [], onNavigate }: LessonViewerProps) {
  
  const renderMarkdown = (content: string) => (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        children={content}
      />
    </div>
  );

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 pb-20">
        <div className="bg-white p-6 rounded-full shadow-sm mb-4">
          <BookOpen className="w-12 h-12 text-indigo-200" />
        </div>
        <p className="text-lg font-medium">Chọn một bài học từ danh sách bên trái</p>
        {role === 'teacher' && <p className="text-sm mt-2">Hoặc bấm "Tạo bài mới" để bắt đầu soạn giáo án</p>}
      </div>
    );
  }

  // --- LOGIC ĐIỀU HƯỚNG ---
  const currentIndex = allLessons.findIndex(l => l.id === lesson.id);
  const prevLesson = allLessons[currentIndex - 1]; // Bài cũ hơn (do sort ASC thì index nhỏ là cũ)
  const nextLesson = allLessons[currentIndex + 1]; // Bài mới hơn

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Lesson Header */}
        <div className="p-8 border-b border-slate-100 bg-white">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{lesson.title}</h1>

          {/* NÚT VIDEO */}
          {lesson.videoUrl && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={() => window.open(lesson.videoUrl, '_blank')}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-full font-medium text-sm transition-all shadow-md hover:shadow-lg transform active:scale-95 group"
              >
                <Video className="w-4 h-4 group-hover:animate-pulse" />
                Xem Video bài giảng
              </button>
            </div>
          )}
        </div>

        {/* Lesson Content */}
        <div className="p-8 bg-white min-h-[300px]">
          {renderMarkdown(lesson.content)}

          {/* Python Code Section */}
          {lesson.pythonCode && lesson.pythonCode.trim() !== '' && (
            <div className="mt-10 border-t border-slate-100 pt-8">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-600" /> Code Python tham khảo
              </h3>
              <div className="bg-slate-900 rounded-lg overflow-hidden shadow-lg border border-slate-700">
                <div className="bg-slate-800 px-4 py-2 text-xs text-slate-400 font-mono border-b border-slate-700 flex justify-between">
                  <span>main.py</span>
                  <span>Python 3</span>
                </div>
                <pre className="p-6 overflow-x-auto text-sm font-mono text-emerald-400 leading-relaxed">
                  <code>{lesson.pythonCode}</code>
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* --- PHẦN ĐIỀU HƯỚNG BÀI HỌC (Đã sửa logic cho sort ASC) --- */}
        <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-between items-center gap-4">
          {/* Nút lùi về bài trước (Index nhỏ hơn) */}
          {prevLesson ? (
             <button 
               onClick={() => onNavigate && onNavigate(prevLesson.id)}
               className="flex-1 flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all group text-left"
             >
               <div className="bg-slate-100 p-2 rounded-full group-hover:bg-indigo-50 transition-colors">
                 <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-indigo-600" />
               </div>
               <div className="min-w-0">
                 <div className="text-xs text-slate-400 font-semibold uppercase">Bài trước</div>
                 <div className="text-slate-700 font-medium truncate group-hover:text-indigo-700">{prevLesson.title}</div>
               </div>
             </button>
          ) : (
            <div className="flex-1"></div>
          )}

          {/* Nút tiến tới bài sau (Index lớn hơn) */}
          {nextLesson ? (
             <button 
               onClick={() => onNavigate && onNavigate(nextLesson.id)}
               className="flex-1 flex items-center justify-end gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all group text-right"
             >
               <div className="min-w-0">
                 <div className="text-xs text-slate-400 font-semibold uppercase">Bài tiếp theo</div>
                 <div className="text-slate-700 font-medium truncate group-hover:text-indigo-700">{nextLesson.title}</div>
               </div>
               <div className="bg-slate-100 p-2 rounded-full group-hover:bg-indigo-50 transition-colors">
                 <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-600" />
               </div>
             </button>
          ) : (
            <div className="flex-1"></div>
          )}
        </div>
      </div>

      {/* --- PHẦN LIÊN HỆ ZALO (ĐÃ CẬP NHẬT GỌN HƠN) --- */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-full shadow-md shadow-blue-200">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Thắc mắc bài học?</h3>
            <p className="text-slate-600 text-xs">Liên hệ trực tiếp giảng viên để được hỗ trợ.</p>
          </div>
        </div>
        
        <a 
          href="https://zalo.me/0354219504" 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 whitespace-nowrap"
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Icon_of_Zalo.svg/1200px-Icon_of_Zalo.svg.png" className="w-5 h-5 object-contain invert brightness-0 grayscale opacity-0" alt="" style={{filter: 'none', opacity: 1}}/>
          Chat Zalo ngay
        </a>
      </div>

    </div>
  );
}