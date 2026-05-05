import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-6 font-sans">
      <main className="max-w-4xl w-full space-y-12 flex flex-col items-center">
        
        <div className="flex flex-col items-center space-y-6">
          <div className="flex items-center gap-4">
            {/* <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div> */}
            <h1 className="text-4xl font-bold tracking-tight">MutterBox</h1>
          </div>
          <p className="text-[#9494a0] text-lg text-center max-w-2xl">
            Secure, end-to-end encrypted messaging that respects your privacy
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 w-full">
          <div className="bg-[#16161a] border border-[#23232a] p-8 rounded-2xl space-y-4">
            <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-lg font-bold">End-to-End Encryption</h3>
            <p className="text-[#9494a0] text-sm leading-relaxed">
              Your messages are encrypted on your device. Only you and the recipient can read them.
            </p>
          </div>

          <div className="bg-[#16161a] border border-[#23232a] p-8 rounded-2xl space-y-4">
            <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 className="text-lg font-bold">Maximum Privacy</h3>
            <p className="text-[#9494a0] text-sm leading-relaxed">
              We never store, see, or access your messages. Zero-knowledge architecture.
            </p>
          </div>

          <div className="bg-[#16161a] border border-[#23232a] p-8 rounded-2xl space-y-4">
            <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <h3 className="text-lg font-bold">Secure Messaging</h3>
            <p className="text-[#9494a0] text-sm leading-relaxed">
              Clean, minimal interface designed for security-conscious users.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-8 pt-4">
          <div className="flex gap-4">
            <Link 
              href="/signup" 
              className="px-8 py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold rounded-lg transition-all"
            >
              Get Started
            </Link>
            <Link 
              href="/login" 
              className="px-8 py-3 bg-[#16161a] border border-[#23232a] hover:bg-[#1c1c21] text-white font-semibold rounded-lg transition-all"
            >
              Sign In
            </Link>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <span className="text-[#9494a0] text-sm">Or view the app demo:</span>
            <Link 
              href="/messages" 
              className="px-8 py-3 bg-transparent border border-[#23232a] hover:bg-[#16161a] text-white font-semibold rounded-lg transition-all"
            >
              View Messages Demo
            </Link>
          </div>
        </div>

        <footer className="pt-16 border-t border-[#23232a] w-full text-center">
          <p className="text-[#9494a0] text-xs tracking-widest uppercase">
            MutterBox • Secure Messaging • Built for Privacy
          </p>
        </footer>
      </main>
    </div>
  );
}
