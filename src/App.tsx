import React, { useState, useEffect } from 'react';
import {
  BookOpen, LogOut, Plus, Trash2, Edit3, AlertCircle
} from 'lucide-react';

import LessonEditor from './components/LessonEditor';
import LessonViewer from './components/LessonViewer';
import { auth, db, firebaseInitialized } from './firebase';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from 'firebase/auth';

import type { User as FirebaseUser } from 'firebase/auth';

import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  getDoc, setDoc, onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore';

// STRICT PHENIKAA REGEX
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

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean; lessonId: string | null}>({
    show: false, lessonId: null
  });

  useEffect(() => {
    if (firebaseInitialized) {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          if (!currentUser.emailVerified) {
            await signOut(auth);
            setUser(null);
            setLoading(false);
            return;
          }

          setUser(currentUser);
          try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
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
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && db) {
      const q = query(collection(db, "lessons"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedLessons = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Lesson[];
        setLessons(loadedLessons);
      }, (error) => {
        console.error("Firestore read failed", error);
        setErrorMsg("Lỗi kết nối dữ liệu.");
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      if (isRegistering) {
        // --- ĐÃ TẠM TẮT REGEX PHENIKAA ĐỂ BẠN TEST ---
        // Xóa "true ||" đi nếu muốn bật lại chặn email
        if (true || !PHENIKAA_EMAIL_REGEX.test(email)) {
           // Pass qua bước này để test
        } else {
           const msg = "Vui lòng nhập đúng Email sinh viên Phenikaa";
           setErrorMsg(msg);
           return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        
        // --- CHỈNH 'student' THÀNH 'teacher' NẾU MUỐN TEST QUYỀN GV ---
        await setDoc(doc(db, "users", newUser.uid), {
          uid: newUser.uid,
          email: email,
          role: 'student', 
          name: email.split("@")[0],
          createdAt: serverTimestamp()
        });

        try {
          await sendEmailVerification(newUser);
          alert(`Đăng ký thành công! Hãy kiểm tra email ${email} để xác thực.`);
        } catch (mailError) {
          alert("Tài khoản đã tạo nhưng lỗi gửi mail xác thực.");
        }

        await signOut(auth);
        setIsRegistering(false);
        setEmail('');
        setPassword('');

      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const currentUser = userCredential.user;

        if (!currentUser.emailVerified) {
          await signOut(auth);
          throw new Error("Tài khoản chưa được xác thực email.");
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let displayMessage = err.message;
      if (err.code === 'auth/invalid-credential') displayMessage = "Sai email hoặc mật khẩu.";
      if (err.code === 'auth/email-already-in-use') displayMessage = "Email đã tồn tại.";
      if (err.code === 'auth/weak-password') displayMessage = "Mật khẩu quá yếu.";
      setErrorMsg(displayMessage);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setLessons([]);
    setSelectedLessonId(null);
    setIsEditing(false);
    setRole('student');
  };

  const startEditing = (lesson?: Lesson) => {
    if (lesson) setSelectedLessonId(lesson.id);
    else setSelectedLessonId(null);
    setIsEditing(true);
  };

  const handleSaveLesson = async (data: any) => {
    const lessonData = { ...data, createdAt: serverTimestamp() };
    try {
      if (selectedLessonId) {
        const lessonRef = doc(db, "lessons", selectedLessonId);
        const { createdAt, ...updateData } = lessonData;
        await updateDoc(lessonRef, updateData);
      } else {
        await addDoc(collection(db, "lessons"), lessonData);
      }
      setIsEditing(false);
    } catch (err) {
      alert("Lỗi khi lưu bài học.");
    }
  };

  const handleDeleteLesson = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ show: true, lessonId: id });
  };

  const confirmDelete = async () => {
    const id = deleteConfirm.lessonId;
    if (!id) return;
    setDeleteConfirm({ show: false, lessonId: null });
    const previousLessons = [...lessons];
    setLessons(prev => prev.filter(l => l.id !== id));
    if (selectedLessonId === id) {
      setSelectedLessonId(null);
      setIsEditing(false);
    }
    try {
      await deleteDoc(doc(db, "lessons", id));
    } catch (err: any) {
      setLessons(previousLessons);
      alert("Xóa thất bại!");
    }
  };

  const activeLesson = lessons.find(l => l.id === selectedLessonId);
  const editingLessonData = selectedLessonId ? lessons.find(l => l.id === selectedLessonId) : undefined;

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-200 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
          <div className="flex justify-center mb-6">
            <div className="bg-indigo-600 p-3 rounded-lg shadow-lg">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">LMS Phenikaa</h2>
          <p className="text-center text-slate-500 mb-8">Hệ thống học tập trực tuyến</p>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="text" required
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Email..."
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
              <input
                type="password" required
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all shadow-md active:scale-95">
              {isRegistering ? 'Đăng Ký' : 'Đăng Nhập'}
            </button>
          </form>
          <div className="mt-6 text-center text-sm text-slate-500">
            <button onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); }} className="text-indigo-600 font-semibold hover:underline">
              {isRegistering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Xác nhận xóa?</h3>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setDeleteConfirm({show:false, lessonId:null})} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">Hủy</button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Xóa</button>
            </div>
          </div>
        </div>
      )}

      <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-indigo-500 p-2 rounded-lg"><BookOpen className="w-5 h-5 text-white" /></div>
          <div>
            <h1 className="font-bold text-lg">LMS Phenikaa</h1>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">{role === 'teacher' ? 'Giáo Viên' : 'Học Viên'}</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {role === 'teacher' && (
            <button onClick={() => startEditing()} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg mb-6 shadow-lg">
              <Plus className="w-4 h-4" /> Tạo bài mới
            </button>
          )}

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Danh sách bài học</div>
          
          {lessons.map(lesson => (
            <div key={lesson.id} onClick={() => { setSelectedLessonId(lesson.id); if (role === 'teacher') startEditing(lesson); else setIsEditing(false); }}
              className={`group p-3 rounded-lg cursor-pointer transition-all border border-transparent ${selectedLessonId === lesson.id ? 'bg-slate-800 border-indigo-500/50' : 'hover:bg-slate-800/50'}`}>
              <div className="flex justify-between items-center">
                <div className="font-medium text-slate-200 truncate flex-1">{lesson.title}</div>
                {role === 'teacher' && (
                  <div className="flex gap-1 ml-2">
                    <button onClick={(e) => handleDeleteLesson(lesson.id, e)} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white w-full px-2 py-2"><LogOut className="w-4 h-4" /> Đăng xuất</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0">
          <div className="text-slate-500 text-sm">{role === 'teacher' ? (isEditing ? 'Soạn bài' : 'Xem chi tiết') : 'Học viên'}</div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">{user.email?.[0].toUpperCase()}</div>
            <span className="text-sm font-medium text-slate-700">{user.email}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          {role === 'teacher' && isEditing ? (
            <LessonEditor 
              initialTitle={editingLessonData?.title}
              initialContent={editingLessonData?.content}
              initialVideoUrl={editingLessonData?.videoUrl}
              initialPythonCode={editingLessonData?.pythonCode}
              onSave={handleSaveLesson}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <LessonViewer lesson={activeLesson} role={role} />
          )}
        </div>
      </main>
    </div>
  );
}