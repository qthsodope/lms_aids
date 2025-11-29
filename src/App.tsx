import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, LogOut, Plus, Trash2, Edit3, AlertCircle, CheckCircle, Mail, ArrowLeft, RefreshCw
} from 'lucide-react';

import LessonEditor from './components/LessonEditor';
import LessonViewer from './components/LessonViewer';
import { auth, db, firebaseInitialized } from './firebase';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload
} from 'firebase/auth';

import type { User as FirebaseUser } from 'firebase/auth';

import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  getDoc, setDoc, onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore';

// --- CẤU HÌNH HỆ THỐNG ---
const STRICT_PHENIKAA_CHECK = false; 
const PHENIKAA_EMAIL_REGEX = /^\d{8}@st\.phenikaa-uni\.edu\.vn$/;

type Role = 'teacher' | 'student';

interface Lesson {
  id: string;
  title: string;
  content: string;
  videoUrl?: string;
  pythonCode?: string;
  createdAt?: any;
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<Role>('student');
  const [loading, setLoading] = useState(true);

  // Lesson Data
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Auth UI State
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [major, setMajor] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Verification State
  const [verificationSent, setVerificationSent] = useState(false);
  const [verifyingUser, setVerifyingUser] = useState<FirebaseUser | null>(null);
  const [isResending, setIsResending] = useState(false);

  const isJustRegistered = useRef(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean; lessonId: string | null}>({
    show: false, lessonId: null
  });

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

  // --- 2. TẢI BÀI HỌC (Sắp xếp cũ nhất lên đầu) ---
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

  // --- 3. GỬI LẠI EMAIL ---
  const handleResendEmail = async () => {
    if (!verifyingUser) return;
    setIsResending(true);
    try {
      await sendEmailVerification(verifyingUser);
      alert(`Đã gửi lại email tới ${verifyingUser.email}!\n\nHãy kiểm tra hộp thư.`);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/too-many-requests') {
        alert("Bạn gửi quá nhanh. Vui lòng đợi một chút.");
      } else {
        alert("Lỗi: " + error.message);
      }
    } finally {
      setIsResending(false);
    }
  };

  // --- 4. XỬ LÝ AUTH ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      if (isRegistering) {
        if (STRICT_PHENIKAA_CHECK && !PHENIKAA_EMAIL_REGEX.test(email)) {
           setErrorMsg("Vui lòng nhập đúng Email sinh viên Phenikaa");
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

  // --- 5. KIỂM TRA LINK MAIL ---
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
    setSelectedLessonId(null);
    setIsEditing(false);
    setRole('student');
    setVerificationSent(false);
  };

  // --- CÁC HÀM XỬ LÝ BÀI HỌC (CRUD) ---
  const startEditing = (lesson?: Lesson) => { 
    if (lesson) setSelectedLessonId(lesson.id); 
    else setSelectedLessonId(null); 
    setIsEditing(true); 
  };
  
  // --- ĐÃ SỬA LỖI NHẢY BÀI TẠI ĐÂY ---
  const handleSaveLesson = async (data: any) => {
    try { 
      if (selectedLessonId) { 
        // Khi SỬA: KHÔNG cập nhật createdAt để giữ nguyên vị trí
        await updateDoc(doc(db, "lessons", selectedLessonId), {
           ...data,
           // updatedAt: serverTimestamp() // (Tùy chọn) Lưu thời gian sửa nếu cần
        }); 
      } else { 
        // Khi TẠO MỚI: Mới thêm createdAt
        await addDoc(collection(db, "lessons"), {
           ...data, 
           createdAt: serverTimestamp() 
        }); 
      } 
      setIsEditing(false); 
    } catch (err) { 
      alert("Lỗi lưu bài học."); 
    }
  };
  
  const handleDeleteLesson = async (id: string, e: React.MouseEvent) => { e.stopPropagation(); setDeleteConfirm({ show: true, lessonId: id }); };
  const confirmDelete = async () => {
    const id = deleteConfirm.lessonId; if (!id) return; setDeleteConfirm({ show: false, lessonId: null });
    const prev = [...lessons]; setLessons(p => p.filter(l => l.id !== id)); if (selectedLessonId === id) { setSelectedLessonId(null); setIsEditing(false); }
    try { await deleteDoc(doc(db, "lessons", id)); } catch (err) { setLessons(prev); alert("Xóa thất bại!"); }
  };

  const activeLesson = lessons.find(l => l.id === selectedLessonId);
  const editingLessonData = selectedLessonId ? lessons.find(l => l.id === selectedLessonId) : undefined;

  // RENDER UI
  if (loading) return <div className="flex justify-center items-center h-screen bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  if (verificationSent) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-slate-100">
                <div className="bg-indigo-100 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6">
                    <Mail className="w-10 h-10 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Kiểm tra email của bạn</h2>
                <p className="text-slate-500 mb-4">Chúng tôi đã gửi email tới <strong>{verifyingUser?.email || email}</strong>.</p>
                <div className="mb-6"><button onClick={handleResendEmail} disabled={isResending} className="flex items-center justify-center gap-2 mx-auto text-indigo-600 font-medium hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />{isResending ? 'Đang gửi...' : 'Gửi lại email xác thực'}</button></div>
                {errorMsg && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 justify-center"><AlertCircle className="w-4 h-4"/>{errorMsg}</div>}
                <button onClick={handleCheckVerification} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg mb-4 shadow-md active:scale-95">Tôi đã xác thực xong</button>
                <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600 text-sm flex items-center justify-center gap-1 mx-auto"><ArrowLeft className="w-4 h-4" /> Quay lại (Đăng xuất)</button>
            </div>
        </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-200 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
          <div className="flex justify-center mb-6"><div className="bg-indigo-600 p-3 rounded-lg shadow-lg"><BookOpen className="w-8 h-8 text-white" /></div></div>
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">LMS CODEAHOLICS</h2>
          <p className="text-center text-slate-500 mb-8">Hệ thống học tập trực tuyến</p>
          {errorMsg && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-start"><AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" /><span>{errorMsg}</span></div>}
          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
                <>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label><input type="text" required className="w-full bg-slate-50 text-gray-900 border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nguyễn Văn A" value={fullName} onChange={e => setFullName(e.target.value)} /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Ngành học</label><input type="text" required className="w-full bg-slate-50 text-gray-900 border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="CNTT..." value={major} onChange={e => setMajor(e.target.value)} /></div>
                </>
            )}
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="text" required className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder={isRegistering ? "2301xxxx@st.phenikaa-uni.edu.vn" : "Email..."} value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label><input type="password" required className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} /></div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all shadow-md active:scale-95">{isRegistering ? 'Gửi Email Xác Thực' : 'Đăng Nhập'}</button>
          </form>
          <div className="mt-6 text-center text-sm text-slate-500"><button type="button" onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); }} className="text-indigo-600 font-semibold hover:underline">{isRegistering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {deleteConfirm.show && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"><h3 className="text-xl font-bold text-slate-800 mb-2">Xác nhận xóa?</h3><div className="flex gap-3 justify-end mt-6"><button onClick={() => setDeleteConfirm({show:false, lessonId:null})} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">Hủy</button><button onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Xóa</button></div></div></div>}
      <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3"><div className="bg-indigo-500 p-2 rounded-lg"><BookOpen className="w-5 h-5 text-white" /></div><div><h1 className="font-bold text-lg">LMS CODEAHOLICS</h1><span className="text-xs text-slate-400 uppercase tracking-wider font-medium">{role === 'teacher' ? 'Giáo Viên' : 'Học Viên'}</span></div></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {role === 'teacher' && <button onClick={() => startEditing()} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg mb-6 shadow-lg"><Plus className="w-4 h-4" /> Tạo bài mới</button>}
          
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Danh sách bài học</div>
          
          {lessons.map(lesson => (
            <div 
              key={lesson.id} 
              onClick={() => { setSelectedLessonId(lesson.id); if (role === 'teacher') startEditing(lesson); else setIsEditing(false); }} 
              className={`group p-2 rounded-lg cursor-pointer transition-all border border-transparent mb-1 ${selectedLessonId === lesson.id ? 'bg-slate-800 border-indigo-500/50' : 'hover:bg-slate-800/50'}`}
            >
              <div className="flex justify-between items-center">
                <div className="font-medium text-sm text-slate-200 group-hover:text-white truncate flex-1">{lesson.title}</div>
                {role === 'teacher' && (
                  <button onClick={(e) => handleDeleteLesson(lesson.id, e)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-800"><button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white w-full px-2 py-2"><LogOut className="w-4 h-4" /> Đăng xuất</button></div>
      </aside>
      <main className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0"><div className="text-slate-500 text-sm">{role === 'teacher' ? (isEditing ? 'Soạn bài' : 'Xem chi tiết') : 'Học viên'}</div><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">{user.email?.[0].toUpperCase()}</div><span className="text-sm font-medium text-slate-700">{user.email}</span></div></header>
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          {role === 'teacher' && isEditing ? (
             <LessonEditor initialTitle={editingLessonData?.title} initialContent={editingLessonData?.content} initialVideoUrl={editingLessonData?.videoUrl} initialPythonCode={editingLessonData?.pythonCode} onSave={handleSaveLesson} onCancel={() => setIsEditing(false)} />
          ) : (
             <LessonViewer lesson={activeLesson} role={role} allLessons={lessons} onNavigate={setSelectedLessonId} />
          )}
        </div>
      </main>
    </div>
  );
}