import React from 'react';
import { Video, Code, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

interface LessonViewerProps {
  lesson: {
    title: string;
    content: string;
    videoUrl?: string;
    pythonCode?: string;
  } | undefined;
  role: 'teacher' | 'student';
}

export default function LessonViewer({ lesson, role }: LessonViewerProps) {
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Lesson Header */}
        <div className="p-8 border-b border-slate-100 bg-white">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{lesson.title}</h1>

          {lesson.videoUrl && (
            <button
              type="button"
              onClick={() => window.open(lesson.videoUrl, '_blank')}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg transform active:scale-95 group"
            >
              <Video className="w-5 h-5 group-hover:animate-pulse" />
              Xem Video trên YouTube
            </button>
          )}
        </div>

        {/* Lesson Content */}
        <div className="p-8 bg-white min-h-[400px]">
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
      </div>
    </div>
  );
}