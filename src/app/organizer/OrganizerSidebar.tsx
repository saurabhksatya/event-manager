"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

interface Props {
  user: { name: string; email: string; image?: string | null };
}

const navItems = [{ href: "/organizer/events", icon: "📅", label: "Events" }];

export default function OrganizerSidebar({ user }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const router = useRouter();

  // Close mobile drawer when route changes
  useEffect(() => {
    const timeoutId = window.setTimeout(() => setMobileOpen(false), 0);
    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  // Close mobile drawer if window resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* Mobile Top Navigation Bar (Hidden on desktop md:hidden) */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-indigo-100 px-4 h-14 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="text-lg font-extrabold text-slate-900 tracking-tight">
            Event<span className="text-indigo-600">Check</span>
          </div>
          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full uppercase">
            Organizer
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer focus:outline-none"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile Drawer (Only rendered when mobileOpen is true on mobile) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <aside className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col p-5 shadow-2xl border-r border-indigo-100 z-10 animate-fade-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="text-lg font-extrabold text-slate-900 tracking-tight">
                Event<span className="text-indigo-600">Check</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Organizer badge */}
            <div className="p-3 mb-3 bg-indigo-50/80 rounded-xl border border-indigo-100/80">
              <div className="text-[10px] font-bold text-indigo-600 tracking-wider mb-0.5 uppercase">
                ORGANIZER
              </div>
              <div className="text-sm font-semibold text-slate-900 truncate">
                {user.name}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {user.email}
              </div>
            </div>

            {/* Nav items */}
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex-1" />

            <button
              type="button"
              onClick={() =>
                signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      router.push("/");
                    },
                  },
                })
              }
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all cursor-pointer border-none bg-transparent w-full text-left pt-4 border-t border-slate-100"
            >
              <span className="text-base">🚪</span>
              Sign Out
            </button>
          </aside>
        </div>
      )}

      {/* Desktop Fixed Sidebar */}
      <aside className="w-60 min-h-screen bg-white border-r border-indigo-100 flex-col p-4 gap-1 fixed top-0 left-0 bottom-0 z-30 hidden md:flex">
        <div className="text-lg font-extrabold text-slate-900 px-3 pt-2 pb-6 tracking-tight">
          Event<span className="text-indigo-600">Check</span>
        </div>

        {/* Organizer badge */}
        <div className="p-3 mb-2 bg-indigo-50/80 rounded-xl border border-indigo-100/80">
          <div className="text-[10px] font-bold text-indigo-600 tracking-wider mb-0.5 uppercase">
            ORGANIZER
          </div>
          <div className="text-sm font-semibold text-slate-900 truncate">
            {user.name}
          </div>
          <div className="text-xs text-slate-500 truncate">{user.email}</div>
        </div>

        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-50 text-indigo-600 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        <div className="flex-1" />

        <button
          onClick={() =>
            fetch("/api/role", { method: "POST" }).then((res) => {
              if (res.ok) {
                router.push("/attendee/events");
              } else {
                console.error("Failed to change role");
              }
            })
          }
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-blue-600 hover:bg-red-50 transition-all cursor-pointer border-none bg-transparent w-full text-left"
        >
          Change Role
        </button>

        <button
          onClick={() =>
            signOut({
              fetchOptions: {
                onSuccess: () => {
                  router.push("/");
                },
              },
            })
          }
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all cursor-pointer border-none bg-transparent w-full text-left"
        >
          Sign Out
        </button>
      </aside>
    </>
  );
}
