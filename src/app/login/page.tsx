'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMe, loginUser } from '@/lib/api';
import { getPrivateKey, savePrivateKey } from '@/lib/storage';
import { deriveWrappingKey, unwrapPrivateKey } from '@/lib/crypto';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await loginUser({ username, password });

      sessionStorage.setItem('access_token', response.access_token);
      sessionStorage.setItem('refresh_token', response.refresh_token);
      sessionStorage.setItem('user_id', response.user.id);

      const existingKey = await getPrivateKey(response.user.id);

      if (!existingKey) {
        let wrapped = response.user.wrapped_private_key;
        let salt = response.user.pbkdf2_salt;
        let iv = response.user.wrapped_private_key_iv;
        if (!wrapped || !salt || !iv) {
          try {
            const me = await fetchMe();
            wrapped = wrapped ?? me.wrapped_private_key;
            salt = salt ?? me.pbkdf2_salt;
            iv = iv ?? me.wrapped_private_key_iv;
          } catch {
            /* use login payload only */
          }
        }
        try {
          if (wrapped && salt && iv) {
            const wrappingKey = await deriveWrappingKey(password, salt);
            const privateKey = await unwrapPrivateKey(wrapped, wrappingKey, iv);
            await savePrivateKey(response.user.id, privateKey);
          }
        } catch (err) {
          console.warn('Could not restore private key:', err);
        }
      }

      setLoading(false);
      router.push('/messages');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#0a0a0c] text-white font-sans">
      <div className="w-full max-w-[440px] p-10  space-y-8 bg-[#16161a] rounded-xl shadow-2xl border border-[#23232a]">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">MutterBox</h1>
          <p className="text-[#9494a0] text-sm">Please login to your acount.</p>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

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
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 bg-[#1c1c21] border border-[#2d2d35] rounded-lg focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent outline-none transition-all placeholder-[#52525e] pr-12"
                  placeholder="Your password"
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9494a0] hover:text-[#c0c0cf] transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
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

        <div className="pt-6 space-y-4 border-t border-[#2d2d35]">
          <div className="p-4 bg-[#4f46e5]/5 border border-[#4f46e5]/10 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-[#4f46e5] font-bold text-xs uppercase tracking-widest">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              End-to-end encrypted
            </div>
            <p className="text-[#9494a0] text-xs leading-relaxed">
              Your messages are encrypted on your device and can only be decrypted by the intended recipient. We never have access to your private keys or unencrypted messages.
            </p>
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
