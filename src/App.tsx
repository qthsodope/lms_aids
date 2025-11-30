import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BookOpen, LogOut, Plus, Trash2, Edit3, AlertCircle, Mail, ArrowLeft, RefreshCw, Folder, ChevronDown, ChevronRight, Menu, KeyRound, CheckCircle
} from 'lucide-react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';

import LessonEditor from './components/LessonEditor';
import LessonViewer from './components/LessonViewer';
import ResetPassword from './components/ResetPassword'; 
import { auth, db, firebaseInitialized } from './firebase';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload
} from 'firebase/auth';

import type { User as FirebaseUser } from 'firebase/auth';

import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  getDoc, setDoc, onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore';

// --- CẤU HÌNH HỆ THỐNG ---
const STRICT_PHENIKAA_CHECK = true; 
const PHENIKAA_EMAIL_REGEX = /^\d{8}@st\.phenikaa-uni\.edu\.vn$/;

type Role = 'teacher' | 'student';

// CẬP NHẬT INTERFACE
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

// --- COMPONENT CON ---
const LessonRouteWrapper = ({ lessons, role }: { lessons: Lesson[], role: Role }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const lesson = lessons.find(l => l.id === id);
  return (
    <LessonViewer 
      lesson={lesson} 
      role={role} 
      allLessons={lessons} 
      onNavigate={(nextId) => navigate(`/lesson/${nextId}`)} 
    />
  );
};

const EditorRouteWrapper = ({ lessons, onSave }: { lessons: Lesson[], onSave: (data: any, id?: string) => void }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const editingLesson = id ? lessons.find(l => l.id === id) : undefined;

  const existingChapters = useMemo(() => {
    const chapters = new Set<string>();
    lessons.forEach(l => {
        if(l.chapter) chapters.add(l.chapter);
    });
    return Array.from(chapters).sort();
  }, [lessons]);

  return (
    <LessonEditor 
      initialTitle={editingLesson?.title} 
      initialContent={editingLesson?.content} 
      initialVideoUrl={editingLesson?.videoUrl} 
      initialPythonCode={editingLesson?.pythonCode}
      initialChapter={editingLesson?.chapter}
      initialDocumentUrl={editingLesson?.documentUrl}
      existingChapters={existingChapters}
      onSave={(data) => onSave(data, id)} 
      onCancel={() => navigate(-1)} 
    />
  );
};

// --- COMPONENT CHÍNH ---
function LMSApp() {
  const navigate = useNavigate();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<Role>('student');
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  // Auth UI State
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [major, setMajor] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Verification State
  const [verificationSent, setVerificationSent] = useState(false);
  const [verifyingUser, setVerifyingUser] = useState<FirebaseUser | null>(null);
  const [isResending, setIsResending] = useState(false);

  const isJustRegistered = useRef(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean; lessonId: string | null}>({
    show: false, lessonId: null
  });

  // STATE ĐỂ ĐÓNG/MỞ CHƯƠNG TRONG SIDEBAR
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});
  
  // STATE MỚI: ĐÓNG/MỞ SIDEBAR (Mặc định là mở - true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- 1. THEO DÕI TRẠNG THÁI ĐĂNG NHẬP ---
  useEffect(() => {
    if (firebaseInitialized) {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (isJustRegistered.current) return;

        if (currentUser && currentUser.email) {
          if (!currentUser.emailVerified) {
            setVerifyingUser(currentUser);
            setVerificationSent(true);
            setLoading(false);
            return;
          }

          setUser(currentUser);
          try {
            const userDoc = await getDoc(doc(db, "users", currentUser.email));
            if (userDoc.exists()) {
              setRole(userDoc.data().role as Role);
            } else {
              setRole('student');
            }
          } catch (e) {
            console.error("Error fetching role:", e);
          }
        } else {
          setUser(null);
          setVerificationSent(false);
          setVerifyingUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  // --- 2. TẢI BÀI HỌC ---
  useEffect(() => {
    if (user && db) {
      const q = query(collection(db, "lessons"), orderBy("createdAt", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setLessons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lesson[]);
      }, (error) => {
        console.error("Firestore error", error);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const groupedLessons = useMemo(() => {
    const groups: Record<string, Lesson[]> = {};
    lessons.forEach(lesson => {
      const chap = lesson.chapter && lesson.chapter.trim() !== "" ? lesson.chapter : "Bài học chung";
      if (!groups[chap]) groups[chap] = [];
      groups[chap].push(lesson);
    });
    return groups;
  }, [lessons]);

  const toggleChapter = (chap: string) => {
    setCollapsedChapters(prev => ({
      ...prev,
      [chap]: !prev[chap]
    }));
  }

  // --- AUTH HANDLERS ---
  const handleResendEmail = async () => {
    if (!verifyingUser) return;
    setIsResending(true);
    try {
      await sendEmailVerification(verifyingUser);
      alert(`Đã gửi lại email tới ${verifyingUser.email}!\n\nHãy kiểm tra hộp thư.`);
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') alert("Bạn gửi quá nhanh. Vui lòng đợi một chút.");
      else alert("Lỗi: " + error.message);
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email) {
      setErrorMsg("Vui lòng nhập email để đặt lại mật khẩu.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg("Email đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư.");
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/user-not-found') setErrorMsg("Email này chưa được đăng ký.");
      else setErrorMsg("Lỗi: " + error.message);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      if (isRegistering) {
        if (STRICT_PHENIKAA_CHECK && !PHENIKAA_EMAIL_REGEX.test(email)) {
           setErrorMsg("Email không hợp lệ! Phải có dạng: 8_số_sv@st.phenikaa-uni.edu.vn");
           return;
        }
        if (!fullName.trim() || !major.trim()) {
            setErrorMsg("Vui lòng nhập đầy đủ Họ tên và Ngành học.");
            return;
        }

        isJustRegistered.current = true; 
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        
        await setDoc(doc(db, "users", email), {
          uid: newUser.uid,
          email: email,
          fullName: fullName,
          major: major,
          role: 'student', 
          createdAt: serverTimestamp()
        });

        await sendEmailVerification(newUser);
        setVerifyingUser(newUser);
        setVerificationSent(true);
        isJustRegistered.current = false; 
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const currentUser = userCredential.user;
        if (currentUser.email) {
          const userDocRef = doc(db, "users", currentUser.email);
          const userDocSnap = await getDoc(userDocRef);
          if (!userDocSnap.exists()) {
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              fullName: currentUser.email.split('@')[0], 
              major: 'Cần cập nhật', 
              role: 'student',
              createdAt: serverTimestamp()
            });
            setRole('student');
          }
        }
        if (!currentUser.emailVerified) {
             setVerifyingUser(currentUser);
             setVerificationSent(true);
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      isJustRegistered.current = false;
      let msg = err.message;
      if (err.code === 'auth/invalid-credential') msg = "Sai email hoặc mật khẩu.";
      if (err.code === 'auth/email-already-in-use') msg = "Email này đã được đăng ký. Hãy chuyển sang ĐĂNG NHẬP.";
      if (err.code === 'auth/weak-password') msg = "Mật khẩu quá yếu.";
      setErrorMsg(msg);
    }
  };

  const handleCheckVerification = async () => {
    if (!verifyingUser || !verifyingUser.email) return;
    try {
        await reload(verifyingUser); 
        if (verifyingUser.emailVerified) {
            alert("Xác thực thành công!");
            setUser(verifyingUser);
            const userDoc = await getDoc(doc(db, "users", verifyingUser.email));
            if (userDoc.exists()) setRole(userDoc.data().role as Role);
            setVerificationSent(false);
            setVerifyingUser(null);
            window.location.reload();
        } else {
            setErrorMsg("Hệ thống chưa thấy xác thực. Vui lòng bấm vào link trong email.");
        }
    } catch (e) {
        console.error(e);
        setErrorMsg("Lỗi kết nối.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setLessons([]);
    setRole('student');
    setVerificationSent(false);
    navigate('/');
  };

  const handleSaveLesson = async (data: any, id?: string) => {
    try { 
      if (id) { 
        await updateDoc(doc(db, "lessons", id), { ...data }); 
        navigate(`/lesson/${id}`); 
      } else { 
        const docRef = await addDoc(collection(db, "lessons"), { ...data, createdAt: serverTimestamp() }); 
        navigate(`/lesson/${docRef.id}`);
      } 
    } catch (err) { 
      alert("Lỗi lưu bài học."); 
    }
  };
  
  const handleDeleteLesson = async (id: string, e: React.MouseEvent) => { e.stopPropagation(); setDeleteConfirm({ show: true, lessonId: id }); };
  const confirmDelete = async () => {
    const id = deleteConfirm.lessonId; if (!id) return; setDeleteConfirm({ show: false, lessonId: null });
    const prev = [...lessons]; setLessons(p => p.filter(l => l.id !== id));
    try { 
      await deleteDoc(doc(db, "lessons", id)); 
      navigate('/'); 
    } catch (err) { setLessons(prev); alert("Xóa thất bại!"); }
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  if (verificationSent) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-slate-100">
                <div className="bg-indigo-100 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6">
                    <Mail className="w-10 h-10 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Kiểm tra email của bạn</h2>
                <p className="text-slate-500 mb-2">Chúng tôi đã gửi email tới <strong>{verifyingUser?.email || email}</strong>.</p>
                <p className="text-sm text-amber-600 bg-amber-50 py-2 px-3 rounded-md mb-6 inline-block border border-amber-100">
                   Lưu ý: Vui lòng kiểm tra cả mục <strong>Spam</strong> hoặc <strong>Thư rác</strong> nếu không thấy email.
                </p>
                <div className="mb-6"><button onClick={handleResendEmail} disabled={isResending} className="flex items-center justify-center gap-2 mx-auto text-indigo-600 font-medium hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />{isResending ? 'Đang gửi...' : 'Gửi lại email xác thực'}</button></div>
                <button onClick={handleCheckVerification} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg mb-4 shadow-md active:scale-95">Tôi đã xác thực xong</button>
                <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600 text-sm flex items-center justify-center gap-1 mx-auto"><ArrowLeft className="w-4 h-4" /> Quay lại (Đăng xuất)</button>
            </div>
        </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-200 p-4">
        {/* Nơi render Routes công khai (như reset password) */}
        <Routes>
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
                  <div className="flex justify-center mb-6"><div className="bg-indigo-600 p-3 rounded-lg shadow-lg"><BookOpen className="w-8 h-8 text-white" /></div></div>
                  <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">LMS CODEAHOLICS</h2>
                  <p className="text-center text-slate-500 mb-8">Hệ thống học tập trực tuyến</p>
                  
                  {errorMsg && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-start"><AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" /><span>{errorMsg}</span></div>}
                  {successMsg && <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100 flex items-start"><CheckCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" /><span>{successMsg}</span></div>}

                  {isResettingPassword ? (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div><label className="block text-sm font-medium text-slate-700 mb-1">Nhập email của bạn</label><input type="text" required className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Email..." value={email} onChange={e => setEmail(e.target.value)} /></div>
                      <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all shadow-md active:scale-95">Gửi link đặt lại mật khẩu</button>
                      <button type="button" onClick={() => { setIsResettingPassword(false); setErrorMsg(''); setSuccessMsg(''); }} className="w-full text-slate-500 hover:text-slate-700 text-sm mt-2">Quay lại Đăng nhập</button>
                    </form>
                  ) : (
                    <form onSubmit={handleAuth} className="space-y-4">
                      {isRegistering && (
                          <>
                              <div><label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label><input type="text" required className="w-full bg-slate-50 text-gray-900 border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nguyễn Văn A" value={fullName} onChange={e => setFullName(e.target.value)} /></div>
                              <div><label className="block text-sm font-medium text-slate-700 mb-1">Ngành học</label><input type="text" required className="w-full bg-slate-50 text-gray-900 border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="CNTT..." value={major} onChange={e => setMajor(e.target.value)} /></div>
                          </>
                      )}
                      <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="text" required className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder={isRegistering ? "2301xxxx@st.phenikaa-uni.edu.vn" : "Email..."} value={email} onChange={e => setEmail(e.target.value)} /></div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
                        <input type="password" required className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                        {!isRegistering && (
                          <div className="text-right mt-1">
                            <button type="button" onClick={() => { setIsResettingPassword(true); setErrorMsg(''); setSuccessMsg(''); }} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Quên mật khẩu?</button>
                          </div>
                        )}
                      </div>
                      <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all shadow-md active:scale-95">{isRegistering ? 'Gửi Email Xác Thực' : 'Đăng Nhập'}</button>
                    </form>
                  )}
                  
                  {!isResettingPassword && (
                    <div className="mt-6 text-center text-sm text-slate-500"><button type="button" onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); setSuccessMsg(''); }} className="text-indigo-600 font-semibold hover:underline">{isRegistering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}</button></div>
                  )}
                </div>
            } />
        </Routes>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {deleteConfirm.show && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"><h3 className="text-xl font-bold text-slate-800 mb-2">Xác nhận xóa?</h3><div className="flex gap-3 justify-end mt-6"><button onClick={() => setDeleteConfirm({show:false, lessonId:null})} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">Hủy</button><button onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Xóa</button></div></div></div>}
      
      <aside className={`${isSidebarOpen ? 'w-96' : 'w-0'} bg-slate-900 text-white flex flex-col shadow-2xl z-10 transition-all duration-300 overflow-hidden relative`}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-indigo-500 p-2 rounded-lg shrink-0"><BookOpen className="w-5 h-5 text-white" /></div>
          <div className="whitespace-nowrap overflow-hidden"><h1 className="font-bold text-lg">LMS CODEAHOLICS</h1><span className="text-xs text-slate-400 uppercase tracking-wider font-medium">{role === 'teacher' ? 'Giáo Viên' : 'Học Viên'}</span></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {role === 'teacher' && <button onClick={() => navigate('/create')} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg mb-6 shadow-lg whitespace-nowrap"><Plus className="w-4 h-4" /> Tạo bài mới</button>}
          {Object.entries(groupedLessons).map(([chapterName, chapterLessons]) => (
            <div key={chapterName} className="mb-2">
              <button onClick={() => toggleChapter(chapterName)} className="w-full flex items-center justify-between p-2 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-white transition-colors select-none whitespace-nowrap">
                <span className="flex items-center gap-2 overflow-hidden text-ellipsis"><Folder className="w-3 h-3 text-indigo-400 shrink-0" /> {chapterName}</span>
                {collapsedChapters[chapterName] ? <ChevronRight className="w-3 h-3 shrink-0"/> : <ChevronDown className="w-3 h-3 shrink-0"/>}
              </button>
              {!collapsedChapters[chapterName] && (
                <div className="space-y-1 mt-1 pl-2 border-l border-slate-700 ml-2 animate-fadeIn">
                  {chapterLessons.map(lesson => (
                    <Link key={lesson.id} to={`/lesson/${lesson.id}`} className={`block group p-2 rounded-lg cursor-pointer transition-all border border-transparent hover:bg-slate-800/50 focus:bg-slate-800 focus:border-indigo-500/50`}>
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-sm text-slate-300 group-hover:text-white truncate flex-1">{lesson.title}</div>
                        {role === 'teacher' && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.preventDefault(); navigate(`/edit/${lesson.id}`); }} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-indigo-400"><Edit3 className="w-3 h-3" /></button>
                            <button onClick={(e) => { e.preventDefault(); handleDeleteLesson(lesson.id, e); }} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-800"><button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white w-full px-2 py-2 whitespace-nowrap"><LogOut className="w-4 h-4" /> Đăng xuất</button></div>
      </aside>

      <main className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative transition-all duration-300">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors" title={isSidebarOpen ? "Thu gọn menu" : "Mở menu"}><Menu className="w-6 h-6" /></button>
            <div className="text-slate-500 text-sm hidden sm:block">{role === 'teacher' ? 'Quản lý đào tạo' : 'Học viên'}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">{user.email?.[0].toUpperCase()}</div>
            <span className="text-sm font-medium text-slate-700 hidden sm:inline">{user.email}</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth">
          <Routes>
            <Route path="/" element={<div className="flex flex-col items-center justify-center h-full text-slate-400 pb-20"><div className="bg-white p-6 rounded-full shadow-sm mb-4"><BookOpen className="w-12 h-12 text-indigo-200" /></div><p className="text-lg font-medium">Chọn một bài học để bắt đầu</p></div>} />
            <Route path="/lesson/:id" element={<LessonRouteWrapper lessons={lessons} role={role} />} />
            {role === 'teacher' && (
              <>
                <Route path="/create" element={<EditorRouteWrapper lessons={lessons} onSave={handleSaveLesson} />} />
                <Route path="/edit/:id" element={<EditorRouteWrapper lessons={lessons} onSave={handleSaveLesson} />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() { return <BrowserRouter><LMSApp /></BrowserRouter>; }