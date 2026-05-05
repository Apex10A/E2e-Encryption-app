'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/api';
import { getPrivateKey, savePrivateKey } from '@/lib/storage';
import { deriveWrappingKey, unwrapPrivateKey } from '@/lib/crypto';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [tempData, setTempData] = useState<{
    userId: string;
    wrappedKey: string;
    iv: string;
    salt: string;
  } | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowWarning(false);

    try {
      const response = await loginUser({ username, password });
      
      // Store tokens
      sessionStorage.setItem('access_token', response.access_token);
      sessionStorage.setItem('refresh_token', response.refresh_token);
      sessionStorage.setItem('user_id', response.user.id);

      // Check IndexedDB for private key
      const existingKey = await getPrivateKey(response.user.id);
      
      if (!existingKey) {
        // Key missing - we could restore it now or just warn
        setTempData({
          userId: response.user.id,
          wrappedKey: response.user.wrapped_private_key || '',
          iv: response.user.wrapped_private_key_iv || '',
          salt: response.user.pbkdf2_salt || ''
        });
        setShowWarning(true);
        setLoading(false);
        return;
      }

      router.push('/messages');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  const handleRestoreAndProceed = async () => {
    setLoading(true);
    try {
      if (tempData && tempData.wrappedKey && tempData.salt && tempData.iv) {
        const wrappingKey = await deriveWrappingKey(password, tempData.salt);
        const privateKey = await unwrapPrivateKey(tempData.wrappedKey, wrappingKey, tempData.iv);
        await savePrivateKey(tempData.userId, privateKey);
      }
      router.push('/messages');
    } catch (err) {
      setError('Failed to restore private key. You may not be able to read old messages.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#0a0a0c] text-white font-sans">
      <div className="w-full max-w-[440px] p-10 space-y-8 bg-[#16161a] rounded-xl shadow-2xl border border-[#23232a]">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">MutterBox</h1>
          <p className="text-[#9494a0] text-sm">Secure messaging, end-to-end encrypted</p>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        {showWarning ? (
          <div className="space-y-6">
            <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-yellow-500 font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Private Key Missing
              </div>
              <p className="text-sm text-yellow-200/80 leading-relaxed">
                Your encryption key was not found on this device. You won&apos;t be able to decrypt your messages unless you restore it.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleRestoreAndProceed}
                disabled={loading}
                className="w-full py-3 px-4 text-white bg-[#4f46e5] hover:bg-[#4338ca] rounded-lg font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {loading ? 'Restoring...' : 'Restore Key & Continue'}
              </button>
              <button
                onClick={() => router.push('/messages')}
                className="w-full py-3 px-4 text-[#c0c0cf] bg-[#23232a] hover:bg-[#2d2d35] rounded-lg font-medium transition-all"
              >
                Continue Without Decryption
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#c0c0cf]">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-[#1c1c21] border border-[#2d2d35] rounded-lg focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent outline-none transition-all placeholder-[#52525e]"
                placeholder="Your username"
                data-testid="username-input"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#c0c0cf]">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-[#1c1c21] border border-[#2d2d35] rounded-lg focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent outline-none transition-all placeholder-[#52525e]"
                placeholder="Your password"
                data-testid="password-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 text-white bg-[#4f46e5] hover:bg-[#4338ca] rounded-lg font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              data-testid="login-button"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        )}

        <div className="pt-6 space-y-4 border-t border-[#2d2d35]">
          <div className="flex items-start gap-3 text-[#9494a0] text-sm leading-tight">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p>Your messages are end-to-end encrypted. We never see them.</p>
          </div>

          <p className="text-sm text-center text-[#9494a0]">
            Don&apos;t have an account?{' '}
            <a href="/signup" className="text-[#4f46e5] hover:text-[#6366f1] font-medium transition-colors">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
