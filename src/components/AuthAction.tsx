import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase';
import { Lock, CheckCircle, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function AuthAction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get('mode'); 
  const oobCode = searchParams.get('oobCode');

  const [isVerifying, setIsVerifying] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // State cho Reset Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isResetCodeValid, setIsResetCodeValid] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setMessage({ type: 'error', text: 'Thiếu mã xác thực. Đường dẫn không hợp lệ.' });
      setIsVerifying(false);
      return;
    }

    if (mode === 'verifyEmail') {
      applyActionCode(auth, oobCode)
        .then(() => {
          setMessage({ type: 'success', text: 'Bạn đã xác thực tài khoản thành công! Vui lòng quay lại để đăng nhập.' });
          setIsVerifying(false);
        })
        .catch((error) => {
          console.error(error);
          setMessage({ type: 'error', text: 'Mã xác thực không hợp lệ hoặc đã hết hạn.' });
          setIsVerifying(false);
        });
    } 
    else if (mode === 'resetPassword') {
      verifyPasswordResetCode(auth, oobCode)
        .then(() => {
          setIsResetCodeValid(true);
          setIsVerifying(false);
        })
        .catch((error) => {
          console.error(error);
          setMessage({ type: 'error', text: 'Link đặt lại mật khẩu đã hết hạn.' });
          setIsVerifying(false);
        });
    } else {
      setMessage({ type: 'error', text: 'Hành động không được hỗ trợ.' });
      setIsVerifying(false);
    }
  }, [mode, oobCode]);

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu tối thiểu 6 ký tự.' });
      return;
    }
    if (!oobCode) return;

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công! Đang chuyển hướng...' });
      setTimeout(() => navigate('/'), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium">Đang xử lý...</p>
        </div>
      </div>
    );
  }

  // --- XÁC THỰC EMAIL ---
  if (mode === 'verifyEmail') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center border border-slate-100">
          <div className={`mx-auto w-16 h-16 flex items-center justify-center rounded-full mb-4 ${message?.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {message?.type === 'success' ? <CheckCircle className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
          </div>
          
          <p className="text-slate-600 text-base">
            {message?.text}
          </p>

          <button 
            onClick={() => navigate('/')}
            className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all shadow-md active:scale-95"
          >
            Quay trở lại
          </button>
        </div>
      </div>
    );
  }

  // --- RESET PASSWORD ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-200 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <div className="bg-indigo-100 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-4 ring-4 ring-indigo-50">
            <Lock className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Đặt lại mật khẩu</h2>
        </div>

        {message && message.type !== 'success' && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5"/> {message.text}
            </div>
        )}

        {mode === 'resetPassword' && isResetCodeValid && message?.type !== 'success' ? (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-5">
             <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Mật khẩu mới</label>
                <div className="relative">
                    <input type={showPass ? "text" : "password"} required className="w-full border border-gray-300 rounded-lg p-3 pr-10 focus:ring-2 focus:ring-indigo-500 outline-none" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3.5 text-gray-400">{showPass ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}</button>
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Xác nhận mật khẩu</label>
                <input type="password" required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md transition-all active:scale-95">Xác nhận đổi</button>
          </form>
        ) : (
           <button onClick={() => navigate('/')} className="w-full flex items-center justify-center gap-2 text-slate-600 font-medium hover:bg-slate-100 py-3 rounded-lg transition-colors border border-slate-200 mt-4">
              <ArrowLeft className="w-4 h-4" /> Về trang chủ
           </button>
        )}
      </div>
    </div>
  );
}