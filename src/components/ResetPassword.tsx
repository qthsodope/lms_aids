import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Lấy mã xác thực (oobCode) từ đường link email mà Firebase gửi về
  // Link sẽ có dạng: domain.com/reset-password?oobCode=...
  const oobCode = searchParams.get('oobCode');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidCode, setIsValidCode] = useState(false);

  // --- 1. KIỂM TRA MÃ OOBCODE KHI VỪA VÀO TRANG ---
  useEffect(() => {
    if (!oobCode) {
      setMessage({ type: 'error', text: 'Đường dẫn không hợp lệ hoặc bị thiếu mã xác thực.' });
      setIsVerifying(false);
      return;
    }

    // Gọi Firebase để kiểm tra xem link này còn hạn hay không
    verifyPasswordResetCode(auth, oobCode)
      .then(() => {
        setIsValidCode(true); // Mã ngon -> Hiện form nhập pass
        setIsVerifying(false);
      })
      .catch((error) => {
        console.error(error);
        setMessage({ type: 'error', text: 'Đường dẫn đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng.' });
        setIsVerifying(false);
      });
  }, [oobCode]);

  // --- 2. XỬ LÝ ĐỔI MẬT KHẨU ---
  const handleSubmit = async (e: React.FormEvent) => {
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
      // Gửi pass mới lên Firebase
      await confirmPasswordReset(auth, oobCode, newPassword);
      setMessage({ type: 'success', text: 'Thành công! Mật khẩu đã được thay đổi.' });
      
      // Chuyển hướng về trang chủ sau 3 giây
      setTimeout(() => navigate('/'), 3000); 
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // --- 3. MÀN HÌNH CHỜ (LOADING) ---
  if (isVerifying) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="text-slate-500 font-medium">Đang kiểm tra đường dẫn...</p>
            </div>
        </div>
    );
  }

  // --- 4. GIAO DIỆN CHÍNH ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-200 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        
        {/* Header Icon */}
        <div className="text-center mb-8">
            <div className="bg-indigo-100 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-4 ring-4 ring-indigo-50">
                <Lock className="w-10 h-10 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Đặt lại mật khẩu</h2>
            <p className="text-slate-500 text-sm mt-2">
                {isValidCode && !message?.type ? "Nhập mật khẩu mới cho tài khoản của bạn." : "Trạng thái yêu cầu."}
            </p>
        </div>

        {/* Khu vực thông báo (Lỗi hoặc Thành công) */}
        {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 animate-fadeIn ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                <span className="text-sm font-medium">{message.text}</span>
            </div>
        )}

        {/* Form nhập mật khẩu (Chỉ hiện khi Link hợp lệ và chưa đổi xong) */}
        {isValidCode && message?.type !== 'success' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
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

                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2">
                    Xác nhận đổi mật khẩu
                </button>
            </form>
        ) : (
            // Nút quay về khi Link lỗi hoặc Đã đổi xong
            <button onClick={() => navigate('/')} className="w-full flex items-center justify-center gap-2 text-slate-600 font-medium hover:bg-slate-100 py-3 rounded-lg transition-colors border border-slate-200">
                <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
            </button>
        )}
      </div>
    </div>
  );
}