'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/lib/api';
import { 
  generateKeyPair, 
  exportPublicKey, 
  generateSalt, 
  deriveWrappingKey, 
  wrapPrivateKey 
} from '@/lib/crypto';
import { savePrivateKey } from '@/lib/storage';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Generate RSA-OAEP keypair
      const keyPair = await generateKeyPair();
      
      // 2. Export public key as base64
      const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
      
      // 3. Generate 128-bit PBKDF2 salt
      const saltBase64 = generateSalt();
      
      // 4. Derive wrapping key and wrap private key
      const wrappingKey = await deriveWrappingKey(password, saltBase64);
      const { wrappedKey, iv } = await wrapPrivateKey(keyPair.privateKey, wrappingKey);
      
      // 5. Register user on server
      const response = await registerUser({
        username,
        display_name: displayName,
        password,
        public_key: publicKeyBase64,
        wrapped_private_key: wrappedKey,
        wrapped_private_key_iv: iv,
        pbkdf2_salt: saltBase64,
      });

      // 6. Save raw private key to IndexedDB for the session
      await savePrivateKey(response.user.id, keyPair.privateKey);

      // 7. Store tokens in sessionStorage
      sessionStorage.setItem('access_token', response.access_token);
      sessionStorage.setItem('refresh_token', response.refresh_token);
      sessionStorage.setItem('user_id', response.user.id);

      // 8. Redirect to messages
      router.push('/messages');
    } catch (err) {
      console.error('Signup failed:', err);
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#0a0a0c] text-white font-sans">
      <div className="w-full max-w-[440px] p-10 space-y-8 bg-[#16161a] rounded-xl shadow-2xl border border-[#23232a]">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">MutterBox</h1>
          <p className="text-[#9494a0] text-sm">Welcome, Create your account</p>
        </div>
        
        {error && (
          <div className="p-4 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#c0c0cf]">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-[#1c1c21] border border-[#2d2d35] rounded-lg focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent outline-none transition-all placeholder-[#52525e]"
              placeholder="Choose your username"
              data-testid="username-input"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#c0c0cf]">Display Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-3 bg-[#1c1c21] border border-[#2d2d35] rounded-lg focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent outline-none transition-all placeholder-[#52525e]"
              placeholder="Your display name"
              data-testid="display-name-input"
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
              placeholder="Choose a strong password"
              data-testid="password-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 text-white bg-[#4f46e5] hover:bg-[#4338ca] rounded-lg font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="signup-button"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating account...
              </span>
            ) : 'Sign Up'}
          </button>
        </form>

        <div className="pt-6 space-y-4 border-t border-[#2d2d35]">
          <div className="flex items-start gap-3 text-[#9494a0] text-sm leading-tight">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p>Your messages are end-to-end encrypted. We never see them.</p>
          </div>
          
          <p className="text-sm text-center text-[#9494a0]">
            Already have an account?{' '}
            <a href="/login" className="text-[#4f46e5] hover:text-[#6366f1] font-medium transition-colors">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
