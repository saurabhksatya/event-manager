"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
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
    await signIn.social({ provider: "google", callbackURL: "/" });
    setIsSigningIn(false);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f7f2] px-6 py-12 text-[#17251f]">
      <div className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-[#d9e9d8] opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-24 size-[32rem] rounded-full bg-[#f4d9bd] opacity-60 blur-3xl" />

      <section className="relative w-full max-w-md rounded-[2rem] border border-[#d9e1d9] bg-white/90 p-8 shadow-[0_24px_80px_rgba(35,57,45,0.12)] backdrop-blur sm:p-10">
        <p className="text-[15px] leading-7 text-[#66756d]">
          Sign in to discover events, manage registrations, and stay connected
          with campus life.
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="mt-9 flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-[#cfd8d1] bg-white text-sm font-semibold text-[#26352d] shadow-sm transition hover:border-[#1f5b45] hover:bg-[#f8fbf8] focus:outline-none focus:ring-4 focus:ring-[#1f5b45]/15 disabled:cursor-wait disabled:opacity-60"
        >
          <GoogleIcon />
          {isSigningIn ? "Redirecting..." : "Continue with Google"}
        </button>

        <div className="mt-7 flex gap-3 rounded-xl bg-[#f3f6f1] p-4 text-xs leading-5 text-[#617068]">
          <span className="mt-0.5 text-base text-[#1f5b45]">i</span>
          <p>
            Access is limited to VIT students. Only Google accounts ending in
            <strong className="font-semibold text-[#344d40]">
              {" "}
              @vitstudent.ac.in
            </strong>{" "}
            are allowed.
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-[#8a968f]">
          By continuing, you agree to use your official VIT student account.
        </p>
      </section>
    </main>
  );
}
