import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase';
import { Lock, CheckCircle, AlertCircle, ArrowLeft, MailCheck, Eye, EyeOff } from 'lucide-react';

export default function AuthAction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Lấy thông tin từ URL do Firebase gửi về
  // mode: 'resetPassword' | 'verifyEmail' | 'recoverEmail'
  const mode = searchParams.get('mode'); 
  const oobCode = searchParams.get('oobCode');

  // --- STATE CHUNG ---
  const [isVerifying, setIsVerifying] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // --- STATE CHO RESET PASSWORD ---
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isResetCodeValid, setIsResetCodeValid] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setMessage({ type: 'error', text: 'Thiếu mã xác thực (oobCode). Đường dẫn không hợp lệ.' });
      setIsVerifying(false);
      return;
    }

    // --- TRƯỜNG HỢP 1: XÁC THỰC EMAIL ---
    if (mode === 'verifyEmail') {
      applyActionCode(auth, oobCode)
        .then(() => {
          setMessage({ type: 'success', text: 'Email của bạn đã được xác thực thành công! Bạn có thể đăng nhập ngay.' });
          setIsVerifying(false);
        })
        .catch((error) => {
          console.error(error);
          setMessage({ type: 'error', text: 'Mã xác thực không hợp lệ hoặc đã hết hạn.' });
          setIsVerifying(false);
        });
    }
    
    // --- TRƯỜNG HỢP 2: ĐẶT LẠI MẬT KHẨU ---
    else if (mode === 'resetPassword') {
      // Kiểm tra mã code trước khi cho nhập pass mới
      verifyPasswordResetCode(auth, oobCode)
        .then(() => {
          setIsResetCodeValid(true); // Mã ngon -> Hiện form
          setIsVerifying(false);
        })
        .catch((error) => {
          console.error(error);
          setMessage({ type: 'error', text: 'Đường dẫn đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng.' });
          setIsVerifying(false);
        });
    }
    
    // --- TRƯỜNG HỢP KHÁC ---
    else {
      setMessage({ type: 'error', text: 'Hành động không được hỗ trợ.' });
      setIsVerifying(false);
    }
  }, [mode, oobCode]);

  // Xử lý khi bấm nút "Đổi mật khẩu"
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự.' });
      return;
    }
    if (!oobCode) return;

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setMessage({ type: 'success', text: 'Thành công! Mật khẩu đã được thay đổi. Đang chuyển hướng...' });
      setTimeout(() => navigate('/'), 3000); // Về trang chủ sau 3s
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // GIAO DIỆN LOADING
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium">Đang xử lý yêu cầu...</p>
        </div>
      </div>
    );
  }

  // GIAO DIỆN CHÍNH
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-200 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        
        {/* Header Icon thay đổi theo mode */}
        <div className="text-center mb-8">
          <div className="bg-indigo-100 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-4 ring-4 ring-indigo-50">
            {mode === 'verifyEmail' ? <MailCheck className="w-10 h-10 text-indigo-600" /> : <Lock className="w-10 h-10 text-indigo-600" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            {mode === 'verifyEmail' ? 'Xác thực Email' : 'Đặt lại mật khẩu'}
          </h2>
        </div>

        {/* Thông báo (Lỗi hoặc Thành công) */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 animate-fadeIn ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Form nhập Pass (Chỉ hiện khi reset password + mã đúng + chưa xong) */}
        {mode === 'resetPassword' && isResetCodeValid && message?.type !== 'success' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-5">
             <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Mật khẩu mới</label>
                <div className="relative">
                    <input 
                        type={showPass ? "text" : "password"} 
                        required
                        className="w-full border border-gray-300 rounded-lg p-3 pr-10 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-800"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors">
                        {showPass ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                    </button>
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Xác nhận mật khẩu</label>
                <input 
                    type="password" 
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-800"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95">
                Xác nhận đổi mật khẩu
            </button>
          </form>
        )}

        {/* Nút quay về (Hiện khi đã xong hoặc có lỗi) */}
        {(!isResetCodeValid || message?.type === 'success' || mode === 'verifyEmail') && (
           <button onClick={() => navigate('/')} className="w-full flex items-center justify-center gap-2 text-slate-600 font-medium hover:bg-slate-100 py-3 rounded-lg transition-colors border border-slate-200 mt-4">
              <ArrowLeft className="w-4 h-4" /> Về trang chủ
           </button>
        )}

      </div>
    </div>
  );
}