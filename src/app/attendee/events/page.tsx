"use client";

import { useState, useEffect } from "react";

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  registeredCount: number;
  isRegistrationOpen?: boolean;
  isActive: boolean;
  organizer: { name: string };
}

export default function AttendeeEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    eventId: string;
    text: string;
    kind: "success" | "error";
  } | null>(null);
  const [myEventIds, setMyEventIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/me/registrations").then((r) => r.json()),
    ])
      .then(([evs, regs]) => {
        setEvents(evs);
        setMyEventIds(
          new Set(regs.map((r: { event: { id: string } }) => r.event.id)),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleRegister(eventId: string) {
    setRegistering(eventId);
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({
          eventId,
          text: "Registered! Check My Tickets for your QR code.",
          kind: "success",
        });
        setMyEventIds((prev) => new Set([...prev, eventId]));
      } else {
        setMessage({
          eventId,
          text: data.error ?? "Registration failed",
          kind: "error",
        });
      }
    } finally {
      setRegistering(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <span className="w-9 h-9 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Browse Events
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Register for upcoming events and get your QR ticket.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl border border-indigo-100/80 rounded-3xl p-16 text-center shadow-sm">
          <div className="text-5xl mb-4">🎪</div>
          <div className="text-lg font-bold text-slate-900">
            No events available
          </div>
          <div className="text-sm text-slate-500 mt-2">
            Check back soon for upcoming events!
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((ev, i) => {
            const registered = myEventIds.has(ev.id);
            const canRegister = (ev.isRegistrationOpen ?? true) && ev.isActive;

            return (
              <div
                key={ev.id}
                className="bg-white/90 backdrop-blur-xl border border-indigo-100 rounded-3xl p-6 flex flex-col shadow-sm hover:shadow-md transition-all animate-fade-up"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2.5 gap-2">
                    <h2 className="text-lg font-bold text-slate-900 leading-snug">
                      {ev.title}
                    </h2>
                    {registered ? (
                      <span className="shrink-0 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full">
                        ✓ Registered
                      </span>
                    ) : !canRegister ? (
                      <span className="shrink-0 px-2.5 py-0.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
                        🔒 Registration Closed
                      </span>
                    ) : null}
                  </div>

                  {ev.description && (
                    <p className="text-xs text-slate-600 mb-3.5 leading-relaxed line-clamp-2">
                      {ev.description}
                    </p>
                  )}

                  <div className="flex flex-col gap-1.5 text-xs text-slate-500 mb-4">
                    <span>
                      🗓{" "}
                      {new Date(ev.date).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    {ev.location && <span>📍 {ev.location}</span>}
                    <span>👤 By {ev.organizer.name}</span>
                  </div>
                </div>

                {message?.eventId === ev.id && (
                  <div
                    className={`mb-3 p-3 rounded-xl text-xs flex items-center gap-2 border ${
                      message.kind === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-red-50 border-red-200 text-red-700"
                    }`}
                  >
                    <span>{message.kind === "success" ? "✓" : "⚠"}</span>
                    <span>{message.text}</span>
                  </div>
                )}

                <button
                  id={`register-btn-${ev.id}`}
                  disabled={registering === ev.id || registered || !canRegister}
                  onClick={() => handleRegister(ev.id)}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    registered
                      ? "bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed"
                      : !canRegister
                      ? "bg-amber-50 text-amber-700 border border-amber-200 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-sm shadow-indigo-600/30"
                  }`}
                >
                  {registering === ev.id ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Registering...
                    </>
                  ) : registered ? (
                    "✓ Already Registered"
                  ) : !canRegister ? (
                    "Registration Closed"
                  ) : (
                    "Register Now →"
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
