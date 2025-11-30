import { useState, useEffect } from 'react';
import { Save, Video, Code, Type, X, FileCode, Eye, Folder, Link as LinkIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

interface LessonEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialVideoUrl?: string;
  initialPythonCode?: string;
  initialChapter?: string; 
  initialDocumentUrl?: string;
  existingChapters?: string[]; // MỚI: Nhận danh sách chương để gợi ý
  onSave: (data: { 
    title: string; 
    content: string; 
    videoUrl: string; 
    pythonCode: string;
    chapter: string; 
    documentUrl: string; 
  }) => void;
  onCancel: () => void;
}

export default function LessonEditor({
  initialTitle = '',
  initialContent = '',
  initialVideoUrl = '',
  initialPythonCode = '',
  initialChapter = '',
  initialDocumentUrl = '',
  existingChapters = [],
  onSave,
  onCancel
}: LessonEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
  const [pythonCode, setPythonCode] = useState(initialPythonCode);
  const [chapter, setChapter] = useState(initialChapter);
  const [documentUrl, setDocumentUrl] = useState(initialDocumentUrl);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
    setVideoUrl(initialVideoUrl);
    setPythonCode(initialPythonCode);
    setChapter(initialChapter);
    setDocumentUrl(initialDocumentUrl);
  }, [initialTitle, initialContent, initialVideoUrl, initialPythonCode, initialChapter, initialDocumentUrl]);

  const handleSaveClick = () => {
    if (!title.trim()) {
      alert("Vui lòng nhập tiêu đề bài học");
      return;
    }
    onSave({ 
      title, 
      content, 
      videoUrl, 
      pythonCode, 
      chapter: chapter.trim() || "Bài học chung",
      documentUrl 
    });
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
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          {initialTitle ? 'Chỉnh sửa bài học' : 'Tạo bài học mới'}
        </h2>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors font-medium">
            <X className="w-5 h-5" /> Hủy
          </button>
          <button onClick={handleSaveClick} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-md hover:shadow-lg transform active:scale-95">
            <Save className="w-5 h-5" /> Lưu bài
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50">
        
        {/* Hàng 1: Chương & Tiêu đề */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
              <Folder className="w-4 h-4 text-indigo-500" /> Tên Chương / Module
            </label>
            <input 
              type="text" 
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base shadow-sm transition-all"
              placeholder="Nhập hoặc chọn chương..."
              list="chapter-suggestions" 
            />
            {/* DANH SÁCH GỢI Ý TỰ ĐỘNG */}
            <datalist id="chapter-suggestions">
              {existingChapters.map((chap, index) => (
                <option key={index} value={chap} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
              <Type className="w-4 h-4 text-indigo-500" /> Tiêu đề bài học
            </label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base font-medium shadow-sm transition-all"
              placeholder="VD: Giới thiệu về Python..."
            />
          </div>
        </div>

        {/* Hàng 2: Link Video & Link Tài liệu */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
              <Video className="w-4 h-4 text-indigo-500" /> Link Video (YouTube)
            </label>
            <input 
              type="text" 
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm shadow-sm transition-all"
              placeholder="https://youtube.com/..."
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
              <LinkIcon className="w-4 h-4 text-indigo-500" /> Link Tài liệu (Google Drive)
            </label>
            <input 
              type="text" 
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm shadow-sm transition-all"
              placeholder="https://drive.google.com/..."
            />
          </div>
        </div>

        {/* Nội dung */}
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-1">
             <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
              <FileCode className="w-4 h-4 text-indigo-500" /> Nội dung bài giảng
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
              className={`w-full bg-white text-gray-900 border-2 border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-base leading-relaxed shadow-sm transition-all resize-y ${showPreview ? 'h-[500px]' : 'h-[500px] lg:col-span-2'}`}
              placeholder="# Nhập nội dung bài học..."
            />
            {showPreview && (
              <div className="h-[500px] overflow-y-auto p-6 bg-white border border-slate-200 rounded-lg shadow-inner markdown-body">
                 {content ? renderMarkdown(content) : <p className="text-slate-400 italic text-center mt-20">Bản xem trước...</p>}
              </div>
            )}
          </div>
        </div>

        {/* Code Python */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
            <Code className="w-4 h-4 text-indigo-500" /> Code Python (Mẫu)
          </label>
          <textarea 
            value={pythonCode}
            onChange={(e) => setPythonCode(e.target.value)}
            className="w-full bg-slate-50 text-gray-900 border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm shadow-inner h-[200px]"
            placeholder="def hello(): ..."
          />
        </div>
      </div>
    </div>
  );
}