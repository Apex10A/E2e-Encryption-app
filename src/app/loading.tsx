'use client';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-6 font-sans">
      <div className="flex flex-col items-center space-y-8">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse" />
          
          <div className="relative w-20 h-20 bg-[#16161a] border border-[#23232a] rounded-2xl flex items-center justify-center shadow-2xl">
            <svg 
              className="w-10 h-10 text-indigo-500 animate-pulse" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="1.5" 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </div>

          <div className="absolute -inset-2 border-t-2 border-indigo-500/40 border-r-2 border-transparent rounded-full animate-spin [animation-duration:1.5s]" />
        </div>

        <div className="flex flex-col items-center space-y-3">
          <h2 className="text-2xl font-bold tracking-tight text-white">MutterBox</h2>
          <div className="flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
            <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
            <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" />
            <span className="ml-2 text-[#9494a0] text-sm font-medium tracking-wide uppercase">
              Loading...
            </span>
          </div>
        </div>

       
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { left: -100%; }
          50% { left: 100%; }
          100% { left: -100%; }
        }
      `}</style>
    </div>
  );
}
