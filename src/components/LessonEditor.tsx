import React, { useState, useEffect } from 'react';
import { Save, Video, Code, Type, X, FileCode, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

interface LessonEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialVideoUrl?: string;
  initialPythonCode?: string;
  onSave: (data: { title: string; content: string; videoUrl: string; pythonCode: string }) => void;
  onCancel: () => void;
}

export default function LessonEditor({
  initialTitle = '',
  initialContent = '',
  initialVideoUrl = '',
  initialPythonCode = '',
  onSave,
  onCancel
}: LessonEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
  const [pythonCode, setPythonCode] = useState(initialPythonCode);
  const [showPreview, setShowPreview] = useState(false);

  // Reset state when props change
  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
    setVideoUrl(initialVideoUrl);
    setPythonCode(initialPythonCode);
  }, [initialTitle, initialContent, initialVideoUrl, initialPythonCode]);

  const handleSaveClick = () => {
    if (!title.trim()) {
      alert("Vui lòng nhập tiêu đề bài học");
      return;
    }
    onSave({ title, content, videoUrl, pythonCode });
  };

  const renderMarkdown = (text: string) => (
    <div className="markdown-body">
      <ReactMarkdown 
        remarkPlugins={[remarkMath, remarkGfm]} 
        rehypePlugins={[rehypeKatex]}
        children={text}
      />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-full my-4">
      {/* HEADER */}
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          {initialTitle ? 'Chỉnh sửa bài học' : 'Tạo bài học mới'}
        </h2>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors font-medium"
          >
            <X className="w-5 h-5" /> Hủy
          </button>
          <button 
            onClick={handleSaveClick}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-md hover:shadow-lg transform active:scale-95"
          >
            <Save className="w-5 h-5" /> Lưu bài
          </button>
        </div>
      </div>

      {/* FORM AREA */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50">
        
        {/* TITLE */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
            <Type className="w-4 h-4 text-indigo-500" /> Tiêu đề bài học
          </label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-lg font-medium shadow-sm transition-all"
            placeholder="Ví dụ: Giới thiệu về Python..."
          />
        </div>

        {/* VIDEO URL */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
            <Video className="w-4 h-4 text-indigo-500" /> Link Video (YouTube)
          </label>
          <input 
            type="text" 
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm shadow-sm transition-all"
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        {/* MARKDOWN CONTENT */}
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-1">
             <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
              <FileCode className="w-4 h-4 text-indigo-500" /> Nội dung bài giảng (Markdown & LaTeX)
            </label>
            <button 
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100"
            >
              <Eye className="w-3 h-3" /> {showPreview ? 'Tắt xem trước' : 'Bật xem trước'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full bg-white text-gray-900 border-2 border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-base leading-relaxed shadow-sm transition-all resize-y ${showPreview ? 'h-[600px]' : 'h-[600px] lg:col-span-2'}`}
              placeholder="# Nhập nội dung bài học tại đây...&#10;&#10;**Hỗ trợ:**&#10;- Markdown cơ bản&#10;- Công thức toán: $E = mc^2$"
            />
            {showPreview && (
              <div className="h-[600px] overflow-y-auto p-6 bg-white border border-slate-200 rounded-lg shadow-inner markdown-body">
                 {content ? renderMarkdown(content) : <p className="text-slate-400 italic text-center mt-20">Bản xem trước sẽ hiện ở đây...</p>}
              </div>
            )}
          </div>
        </div>

        {/* PYTHON CODE */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
            <Code className="w-4 h-4 text-indigo-500" /> Code Python (Mẫu)
          </label>
          <textarea 
            value={pythonCode}
            onChange={(e) => setPythonCode(e.target.value)}
            className="w-full bg-slate-50 text-gray-900 border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm shadow-inner h-[300px]"
            placeholder="def hello_world():&#10;    print('Hello LMS!')"
          />
        </div>

      </div>
    </div>
  );
}