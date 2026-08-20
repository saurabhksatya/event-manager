"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import AIInsights from "@/components/AIInsights";

interface CheckIn {
  id: string;
  checkedInAt: string;
  stationId: string | null;
  registration: {
    user: { id: string; name: string; email: string; image: string | null };
  };
}

interface EventDetails {
  id: string;
  title: string;
  registeredCount: number;
  isActive: boolean;
  isRegistrationOpen: boolean;
}

interface SSEAnalytics {
  registeredCount: number;
  checkedInCount: number;
  noShowCount: number;
  checkInRate: number;
  noShowRate: number;
  peakHour: string | null;
  checkInsByHour: { hour: string; count: number }[];
}

interface SSEUpdate {
  type: "update";
  event: {
    id: string;
    title: string;
    registeredCount: number;
    isActive?: boolean;
    isRegistrationOpen?: boolean;
  };
  checkedInCount: number;
  recentCheckIns: CheckIn[];
  analytics?: SSEAnalytics;
}

export default function OrganizerEventDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const [data, setData] = useState<SSEUpdate | null>(null);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [connected, setConnected] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Fetch full event info on mount
  useEffect(() => {
    fetch(`/api/events/${eventId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setEventDetails(d);
      })
      .catch(() => {});
  }, [eventId]);

  // SSE connection for live updates
  useEffect(() => {
    let es: EventSource;

    function connect() {
      es = new EventSource(`/api/events/${eventId}/stream`);
      es.onopen = () => setConnected(true);
      es.onmessage = (e) => {
        try {
          const update: SSEUpdate = JSON.parse(e.data);
          setData(update);
        } catch {
          // ignore parse errors
        }
      };
      es.onerror = () => {
        setConnected(false);
        es.close();
        setTimeout(connect, 5000);
      };
    }

    connect();
    return () => es?.close();
  }, [eventId]);

  async function handleExport() {
    setExportLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/export`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `event-${eventId}-attendees.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  }

  async function toggleActive() {
    if (!eventDetails || toggling) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !eventDetails.isActive }),
      });
      if (res.ok) {
        setEventDetails((prev) =>
          prev ? { ...prev, isActive: !prev.isActive } : null,
        );
      }
    } finally {
      setToggling(false);
    }
  }

  async function toggleRegistration() {
    if (!eventDetails || toggling) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isRegistrationOpen: !eventDetails.isRegistrationOpen,
        }),
      });
      if (res.ok) {
        setEventDetails((prev) =>
          prev
            ? { ...prev, isRegistrationOpen: !prev.isRegistrationOpen }
            : null,
        );
      }
    } finally {
      setToggling(false);
    }
  }

  const analytics = data?.analytics;
  const registeredCount =
    data?.event?.registeredCount ?? eventDetails?.registeredCount ?? 0;
  const checkedInCount = data?.checkedInCount ?? 0;
  const checkInRate =
    analytics?.checkInRate ??
    (registeredCount > 0
      ? Math.round((checkedInCount / registeredCount) * 100)
      : 0);
  const peakHour = analytics?.peakHour ?? "—";

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap md:flex-nowrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/organizer/events"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              ← Events
            </Link>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1.5 tracking-tight">
            {data?.event?.title ?? eventDetails?.title ?? "Loading..."}
          </h1>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3 py-1 rounded-full text-xs font-medium shrink-0">
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${connected ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              <span>{connected ? "Connected" : "Reconnecting SSE..."}</span>
            </div>

            {eventDetails && (
              <>
                <span className="text-slate-300">•</span>
                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border shrink-0 whitespace-nowrap min-w-[105px] text-center inline-block ${
                    eventDetails.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-300"
                  }`}
                >
                  {eventDetails.isActive
                    ? "● Event Active"
                    : "○ Event Disabled"}
                </span>

                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border shrink-0 whitespace-nowrap min-w-[145px] text-center inline-block ${
                    eventDetails.isRegistrationOpen
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {eventDetails.isRegistrationOpen
                    ? "✓ Registration Open"
                    : "🔒 Registration Closed"}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center shrink-0">
          {eventDetails && (
            <>
              <button
                type="button"
                disabled={toggling}
                onClick={toggleRegistration}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap min-w-[145px] text-center inline-flex items-center justify-center ${
                  eventDetails.isRegistrationOpen
                    ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                    : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                }`}
              >
                {eventDetails.isRegistrationOpen
                  ? "Stop Registrations"
                  : "Enable Registrations"}
              </button>

              <button
                type="button"
                disabled={toggling}
                onClick={toggleActive}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap min-w-[105px] text-center inline-flex items-center justify-center ${
                  eventDetails.isActive
                    ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                }`}
              >
                {eventDetails.isActive ? "Disable Event" : "Enable Event"}
              </button>
            </>
          )}

          <Link
            href={`/organizer/events/${eventId}/scan`}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-emerald-600/30 flex items-center gap-2 whitespace-nowrap"
          >
            Open Scanner
          </Link>
          <button
            id="export-csv-btn"
            onClick={handleExport}
            disabled={exportLoading}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {exportLoading ? (
              <span className="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
            ) : (
              "⬇ Export CSV"
            )}
          </button>
        </div>
      </div>

      {/* Live SSE Analytics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            value: data ? checkedInCount : "—",
            label: "Checked In",
            color: "text-emerald-600",
            badge: "SSE Stream",
          },
          {
            value: registeredCount,
            label: "Registered Attendees",
            color: "text-indigo-600",
            badge: "Live Count",
          },
          {
            value: data ? `${checkInRate}%` : "—",
            label: "Check-in Rate",
            color: "text-blue-600",
            badge: "Real-time %",
          },
          {
            value: peakHour ?? "—",
            label: "Peak Check-in Hour",
            color: "text-amber-600",
            badge: "Analytics",
          },
        ].map((s, i) => (
          <div
            key={s.label}
            className="bg-white/90 backdrop-blur-xl border border-indigo-100/80 rounded-2xl p-5 shadow-xs hover:border-indigo-200 transition-all animate-fade-up relative overflow-hidden"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1 flex items-center justify-between">
              <span>{s.label}</span>
              <span className="text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                {s.badge}
              </span>
            </div>
            <div
              className={`text-3xl md:text-4xl font-extrabold tracking-tight ${s.color}`}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* SSE Live Analytics Breakdown */}
      {analytics && analytics.checkInsByHour.length > 0 && (
        <div className="bg-white/90 backdrop-blur-xl border border-indigo-100/80 rounded-3xl p-6 mb-8 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Live Hourly Check-In Stream
              </h2>
              <p className="text-xs text-slate-500">
                Pushed automatically over SSE every 3 seconds
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              Peak: {peakHour}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {analytics.checkInsByHour.map((item) => (
              <div
                key={item.hour}
                className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center"
              >
                <div className="text-xs font-medium text-slate-500 mb-1">
                  {item.hour}
                </div>
                <div className="text-lg font-bold text-indigo-600">
                  {item.count}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    check-ins
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two column: check-ins + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Check-ins */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Recent Check-Ins (SSE Feed)
          </h2>

          {!data ? (
            <div className="flex justify-center p-12">
              <span className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : data.recentCheckIns.length === 0 ? (
            <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-8 text-center text-slate-500 text-sm">
              No check-ins yet. Waiting for attendees...
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
              {data.recentCheckIns.map((ci) => (
                <div
                  key={ci.id}
                  className="flex items-center gap-3 p-3 bg-white border border-indigo-100/80 rounded-2xl shadow-xs animate-fade-up"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                    {ci.registration.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ci.registration.user.image}
                        alt={ci.registration.user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      ci.registration.user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate">
                      {ci.registration.user.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {ci.registration.user.email}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 shrink-0">
                    {new Intl.DateTimeFormat("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    }).format(new Date(ci.checkedInAt))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">AI Insights</h2>
          <AIInsights eventId={eventId} />
        </div>
      </div>

      {/* Full attendee table */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          All Registrations
        </h2>
        <RegistrationsTable
          eventId={eventId}
          checkedInIds={new Set(data?.recentCheckIns.map((ci) => ci.id) ?? [])}
        />
      </div>
    </div>
  );
}

function RegistrationsTable({
  eventId,
  checkedInIds,
}: {
  eventId: string;
  checkedInIds: Set<string>;
}) {
  const [rows, setRows] = useState<
    {
      id: string;
      user: { name: string; email: string };
      registeredAt: string;
      checkIn: { checkedInAt: string } | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/events/${eventId}/registrations`)
      .then((r) => r.json())
      .then(setRows)
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    if (checkedInIds.size > 0) {
      fetch(`/api/events/${eventId}/registrations`)
        .then((r) => r.json())
        .then(setRows);
    }
  }, [checkedInIds.size, eventId]);

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <span className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200/80">
          <tr>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Attendee
            </th>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Email
            </th>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Registered
            </th>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Status
            </th>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Check-in Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
              <td className="px-4 py-3.5 font-semibold text-slate-900">
                {r.user.name}
              </td>
              <td className="px-4 py-3.5 text-slate-500">{r.user.email}</td>
              <td className="px-4 py-3.5">
                {new Date(r.registeredAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3.5">
                {r.checkIn ? (
                  <span className="px-2.5 py-0.5 font-semibold rounded-full text-emerald-700 bg-emerald-50 border border-emerald-200">
                    ✓ Checked In
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 font-semibold rounded-full text-amber-700 bg-amber-50 border border-amber-200">
                    Pending
                  </span>
                )}
              </td>
              <td className="px-4 py-3.5">
                {r.checkIn
                  ? new Intl.DateTimeFormat("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    }).format(new Date(r.checkIn.checkedInAt))
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
