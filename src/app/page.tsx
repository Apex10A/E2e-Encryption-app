import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0c] text-white font-sans">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(79,70,229,0.22),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-1/3 h-[420px] w-[420px] rounded-full bg-indigo-600/10 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-0 h-[320px] w-[320px] rounded-full bg-violet-600/8 blur-[100px]"
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
        <span className="text-lg font-semibold tracking-tight">MutterBox</span>
        <Link
          href="/login"
          className="text-sm text-[#9494a0] transition-colors hover:text-white"
        >
          Sign in
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-180px)] max-w-6xl flex-col justify-center px-6 pb-16 pt-8">
        <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div className="max-w-xl space-y-8">
            <div className="space-y-5">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400/90">
                End-to-end encrypted
              </p>
              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Your conversations,{" "}
                <span className="bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-300 bg-clip-text text-transparent">
                  truly private.
                </span>
              </h1>
              <p className="max-w-md text-lg leading-relaxed text-[#9494a0]">
                Messages are encrypted on your device before they leave. The
                server only ever sees ciphertext.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-xl bg-[#4f46e5] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-colors hover:bg-[#4338ca]"
              >
                Get started
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-[#2d2d35] bg-[#111114]/80 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-[#3d3d48] hover:bg-[#16161a]"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              aria-hidden
              className="absolute inset-4 rounded-3xl bg-indigo-500/10 blur-2xl"
            />
            <div className="relative overflow-hidden rounded-3xl border border-[#23232a] bg-[#111114]/90 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
              <div className="mb-6 flex items-center justify-between border-b border-[#23232a] pb-4">
                <div>
                  <p className="text-sm font-medium text-white">Secure thread</p>
                  <p className="text-xs text-[#52525e]">Encrypted on device</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  E2EE
                </span>
              </div>

              <div className="space-y-4 font-mono text-xs leading-relaxed">
                <div className="rounded-2xl rounded-tl-md bg-[#16161a] px-4 py-3 text-[#9494a0]">
                  <span className="text-[#52525e]">ciphertext:</span>{" "}
                  U2FsdGVkX1+8k3mR9pL2nQ7vH4xW1yT6...
                </div>
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md border border-indigo-500/20 bg-indigo-950/40 px-4 py-3 text-indigo-100/90">
                  Hey — are we still on for tonight?
                </div>
                <div className="rounded-2xl rounded-tl-md bg-[#16161a] px-4 py-3 text-[#9494a0]">
                  <span className="text-[#52525e]">ciphertext:</span>{" "}
                  U2FsdGVkX1+qW8nF3jK5mP9rL2xV7...
                </div>
              </div>

              <div className="mt-6 border-t border-[#23232a] pt-4">
                <div className="h-10 rounded-xl border border-[#23232a] bg-[#0a0a0c]/60 px-4 flex items-center text-xs text-[#52525e]">
                  Type a message — encrypted before send
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-[#23232a]/80 px-6 py-8 text-center">
        <p className="text-xs text-[#52525e]">
          MutterBox · Built by{" "}
          <Link
            href="https://praise-ngvu.vercel.app/"
            className="text-[#9494a0] transition-colors hover:text-white"
          >
            Praise Afolabi
          </Link>
        </p>
      </footer>
    </div>
  );
}
