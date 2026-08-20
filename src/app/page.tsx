"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="w-5 h-5 flex-shrink-0"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.27c0-.71-.06-1.4-.18-2.06H12v3.9h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.15c1.85-1.7 2.9-4.2 2.9-7.23Z"
      />
      <path
        fill="#34A853"
        d="M12 21.7c2.64 0 4.86-.87 6.48-2.36l-3.15-2.45c-.87.58-1.98.92-3.33.92-2.56 0-4.73-1.73-5.51-4.06H3.24v2.53A9.8 9.8 0 0 0 12 21.7Z"
      />
      <path
        fill="#FBBC05"
        d="M6.49 13.75a5.9 5.9 0 0 1 0-3.5V7.72H3.24a9.8 9.8 0 0 0 0 8.56l3.25-2.53Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.2c1.44 0 2.73.5 3.75 1.49l2.81-2.81C16.86 3.3 14.64 2.3 12 2.3a9.8 9.8 0 0 0-8.76 5.42l3.25 2.53C7.27 7.93 9.44 6.2 12 6.2Z"
      />
    </svg>
  );
}

export default function Home() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    await signIn.social({ provider: "google", callbackURL: "/dashboard" });
    setIsSigningIn(false);
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background blobs */}
      <div className="fixed -top-1/4 -left-1/4 w-[50vw] h-[50vw] bg-radial from-indigo-500/15 to-transparent rounded-full pointer-events-none" />
      <div className="fixed -bottom-1/4 -right-1/4 w-[60vw] h-[60vw] bg-radial from-emerald-500/10 to-transparent rounded-full pointer-events-none" />

      {/* Hero */}
      <div className="animate-fade-up text-center max-w-lg mb-16 relative w-full">
        {/* Sign In Card */}
        <div className="bg-white/90 backdrop-blur-2xl border border-indigo-200/50 rounded-3xl p-8 max-w-sm mx-auto shadow-xl shadow-indigo-500/10">
          <div className="text-sm text-slate-600 mb-6 font-medium">
            Sign in with your VIT student account to get started.
          </div>

          <button
            id="google-sign-in-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full inline-flex items-center justify-center gap-3 px-6 py-3.5 text-base font-semibold text-slate-700 bg-white border border-indigo-200 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <GoogleIcon />
            {isSigningIn ? "Redirecting..." : "Continue with Google"}
          </button>

          <div className="mt-5 p-3 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs text-slate-500 flex items-start gap-2 text-left">
            <span>
              Only <strong className="text-slate-700 font-semibold">@vitstudent.ac.in</strong> accounts are permitted.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
