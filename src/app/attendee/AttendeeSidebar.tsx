"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-client";

interface Props {
  user: { name: string; email: string; image?: string | null };
}

const navItems = [
  { href: "/attendee/events", icon: "📅", label: "Browse Events" },
  { href: "/attendee/my-tickets", icon: "🎟️", label: "My Tickets" },
];

export default function AttendeeSidebar({ user }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-indigo-100 flex flex-col p-4 gap-1 fixed top-0 left-0 bottom-0 z-40 hidden md:flex">
      <div className="text-lg font-extrabold text-slate-900 px-3 pt-2 pb-6 tracking-tight">
        Event<span className="text-indigo-600">Check</span>
      </div>

      <div className="p-3 mb-2 bg-emerald-50/80 rounded-xl border border-emerald-100/80">
        <div className="text-[10px] font-bold text-emerald-600 tracking-wider mb-0.5 uppercase">
          ATTENDEE
        </div>
        <div className="text-sm font-semibold text-slate-900 truncate">
          {user.name}
        </div>
        <div className="text-xs text-slate-500 truncate">
          {user.email}
        </div>
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
        onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } })}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all cursor-pointer border-none bg-transparent w-full text-left"
      >
        <span className="text-base">🚪</span>
        Sign Out
      </button>
    </aside>
  );
}
