import { useMemo } from 'react';
import { Video, Code, BookOpen, ArrowLeft, ArrowRight, MessageCircle, FileText, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

interface Lesson {
  id: string;
  title: string;
  content: string;
  videoUrl?: string;
  pythonCode?: string;
  chapter?: string; 
  documentUrl?: string; 
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

  // --- LOGIC ĐIỀU HƯỚNG MỚI (CHỈ TRONG CÙNG 1 MODULE) ---
  const { prevLesson, nextLesson } = useMemo(() => {
    if (!lesson || allLessons.length === 0) return { prevLesson: undefined, nextLesson: undefined };

    // 1. Xác định tên chương của bài hiện tại (Nếu không có thì là "Bài học chung")
    const currentChapterName = lesson.chapter || "Bài học chung";

    // 2. Lọc ra danh sách các bài học thuộc cùng chương đó
    const sameChapterLessons = allLessons.filter(l => {
      const lChapter = l.chapter || "Bài học chung";
      return lChapter === currentChapterName;
    });

    // 3. Tìm vị trí của bài hiện tại trong danh sách ĐÃ LỌC
    const currentIndex = sameChapterLessons.findIndex(l => l.id === lesson.id);

    // 4. Lấy bài trước/sau trong phạm vi chương đó
    return {
      prevLesson: sameChapterLessons[currentIndex - 1],
      nextLesson: sameChapterLessons[currentIndex + 1]
    };
  }, [lesson, allLessons]);


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

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2 mb-2">
             <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
               {lesson.chapter || "Bài học chung"}
             </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-6">{lesson.title}</h1>

          {/* Cụm nút chức năng: Video & Tài liệu */}
          <div className="flex flex-wrap gap-3">
            {lesson.videoUrl && (
              <button
                type="button"
                onClick={() => window.open(lesson.videoUrl, '_blank')}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-full font-medium text-sm transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <Video className="w-4 h-4" /> Xem Video Youtube
              </button>
            )}
            
            {/* NÚT TÀI LIỆU */}
            {lesson.documentUrl && (
              <button
                type="button"
                onClick={() => window.open(lesson.documentUrl, '_blank')}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-full font-medium text-sm transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <FileText className="w-4 h-4" /> Tài liệu đính kèm (Drive) <ExternalLink className="w-3 h-3 opacity-70"/>
              </button>
            )}
          </div>
        </div>

        {/* Nội dung chính */}
        <div className="p-8 bg-white min-h-[300px]">
          {renderMarkdown(lesson.content)}

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

        {/* Footer điều hướng (ĐÃ UPDATE LOGIC) */}
        <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-between items-center gap-4">
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
          ) : (<div className="flex-1"></div>)}

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
          ) : (<div className="flex-1"></div>)}
        </div>
      </div>

      <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-full shadow-md shadow-blue-200"><MessageCircle className="w-5 h-5 text-white" /></div>
          <div><h3 className="text-base font-bold text-slate-800">Thắc mắc bài học?</h3><p className="text-slate-600 text-xs">Liên hệ trực tiếp giảng viên.</p></div>
        </div>
        <a href="https://zalo.me/0354219504" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 whitespace-nowrap">
          Chat Zalo ngay
        </a>
      </div>
    </div>
  );
}