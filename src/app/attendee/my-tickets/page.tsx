"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import QRCodeDisplay from "@/components/QRCodeDisplay";

interface Registration {
  id: string;
  qrToken: string;
  qrTokenExpiresAt: string;
  registeredAt: string;
  event: {
    id: string;
    title: string;
    date: string;
    location: string | null;
  };
  checkIn: { checkedInAt: string } | null;
}

const QR_REFRESH_INTERVAL = 4 * 60 * 1000; // refresh 1 min before expiry (every 4 min)

function TicketCard({ reg }: { reg: Registration }) {
  const [token, setToken] = useState(reg.qrToken);
  const [expiresAt, setExpiresAt] = useState(new Date(reg.qrTokenExpiresAt));
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, new Date(reg.qrTokenExpiresAt).getTime() - Date.now()),
  );
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlightRef = useRef(false);

  const refreshToken = useCallback(async () => {
    if (reg.checkIn || refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/registrations/${reg.id}/refresh-token`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.qrToken);
        setExpiresAt(new Date(data.qrTokenExpiresAt));
      }
    } finally {
      refreshInFlightRef.current = false;
      setRefreshing(false);
    }
  }, [reg.id, reg.checkIn]);

  useEffect(() => {
    if (reg.checkIn) return;
    const update = () => {
      const ms = expiresAt.getTime() - Date.now();
      setTimeLeft(Math.max(0, ms));
      if (ms <= 30_000) {
        refreshToken();
      }
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [expiresAt, refreshToken, reg.checkIn]);

  useEffect(() => {
    if (reg.checkIn) return;
    const t = setInterval(refreshToken, QR_REFRESH_INTERVAL);
    return () => clearInterval(t);
  }, [refreshToken, reg.checkIn]);

  const qrValue = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/check-in?token=${token}`;
  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const timerPct = (timeLeft / (5 * 60 * 1000)) * 100;

  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-indigo-100/80 rounded-3xl p-7 max-w-sm w-full shadow-lg shadow-indigo-500/5 animate-fade-up">
      {/* Event info */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900 mb-1.5 leading-snug">
          {reg.event.title}
        </h2>
        <div className="flex flex-col gap-1 text-xs text-slate-500">
          <span>
            🗓{" "}
            {new Date(reg.event.date).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
          {reg.event.location && <span>📍 {reg.event.location}</span>}
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-4">
        {reg.checkIn ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full">
            ✓ Checked In at{" "}
            {new Intl.DateTimeFormat("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }).format(new Date(reg.checkIn.checkedInAt))}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200/80 rounded-full">
            Registered — Not Yet Checked In
          </span>
        )}
      </div>

      {/* QR code */}
      {reg.checkIn ? (
        <div className="p-6 text-center bg-slate-50 border border-slate-100 rounded-2xl text-slate-500 text-sm">
          <div className="text-4xl mb-2.5">✅</div>
          Already checked in. Thank you for attending!
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-4">
            <div className="relative rounded-2xl shadow-xl shadow-indigo-500/15 p-2 bg-white border border-indigo-100">
              <QRCodeDisplay value={qrValue} size={200} />
              {refreshing && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-2xl backdrop-blur-xs">
                  <span className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Token expiry timer */}
          <div className="mb-3">
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 transition-all duration-1000 linear rounded-full"
                style={{ width: `${timerPct}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
              <span>
                {refreshing
                  ? "Refreshing..."
                  : timeLeft > 0
                    ? `Refreshes in ${minutes}:${String(seconds).padStart(2, "0")}`
                    : "QR expired — refresh now"}
              </span>
              <button
                id={`refresh-qr-btn-${reg.id}`}
                onClick={refreshToken}
                disabled={refreshing}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer border-none"
              >
                ↺ Refresh Now
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function MyTicketsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/registrations")
      .then((r) => r.json())
      .then(setRegistrations)
      .finally(() => setLoading(false));
  }, []);

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
          My Tickets
        </h1>
      </div>

      {registrations.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl border border-indigo-100/80 rounded-3xl p-16 text-center shadow-sm">
          <div className="text-5xl mb-4">🎟️</div>
          <div className="text-lg font-bold text-slate-900">
            No tickets yet
          </div>
          <div className="text-sm text-slate-500 mt-2">
            Register for an event to get your QR ticket.
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-6">
          {registrations.map((reg) => (
            <TicketCard key={reg.id} reg={reg} />
          ))}
        </div>
      )}
    </div>
  );
}
