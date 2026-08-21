"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  registeredCount: number;
  isRegistrationOpen: boolean;
  isActive: boolean;
  _count: { registrations: number };
}

function CreateEventModal({
  onCreated,
  onClose,
}: {
  onCreated: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-fade-up">
        <h2 className="text-xl font-bold text-slate-900 mb-1">
          Create New Event
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Fill in the details below to create your event.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Event Title *
            </label>
            <input
              id="event-title-input"
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-slate-900 outline-none transition-all"
              placeholder="Event"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Description
            </label>
            <textarea
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-slate-900 outline-none transition-all resize-y min-h-20"
              placeholder="What's this event about?"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Date & Time *
            </label>
            <input
              id="event-date-input"
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-slate-900 outline-none transition-all"
              type="datetime-local"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Location
            </label>
            <input
              id="event-location-input"
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-slate-900 outline-none transition-all"
              placeholder="Kamraj, Kasturba"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2.5 justify-end mt-2">
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all border-none bg-transparent cursor-pointer"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              id="create-event-submit-btn"
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                  Creating...
                </>
              ) : (
                "Create Event"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrganizerEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      setEvents(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  async function toggleActive(eventId: string, currentActive: boolean) {
    setUpdatingId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId ? { ...e, isActive: !currentActive } : e,
          ),
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function toggleRegistration(eventId: string, currentOpen: boolean) {
    setUpdatingId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRegistrationOpen: !currentOpen }),
      });
      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId ? { ...e, isRegistrationOpen: !currentOpen } : e,
          ),
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Your Events
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage events, toggle registration status, view dashboards, and
            export data.
          </p>
        </div>
        <button
          id="create-event-btn"
          className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          onClick={() => setShowCreate(true)}
        >
          + Create Event
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-16">
          <span className="w-9 h-9 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl border border-indigo-100/80 rounded-3xl p-8 sm:p-16 text-center shadow-sm">
          <div className="text-5xl mb-4">📅</div>
          <div className="text-lg font-bold text-slate-900 mb-2">
            No events yet
          </div>
          <div className="text-sm text-slate-500 mb-6">
            Create your first event to get started.
          </div>
          <button
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-indigo-600/30 inline-flex items-center justify-center gap-2 cursor-pointer"
            onClick={() => setShowCreate(true)}
          >
            Create Event
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {events.map((ev, i) => (
            <div
              key={ev.id}
              className="bg-white/90 backdrop-blur-xl border border-indigo-100 rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all animate-fade-up overflow-hidden"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-900 break-words">
                      {ev.title}
                    </h2>

                    {/* Active toggle badge/button */}
                    <button
                      type="button"
                      disabled={updatingId === ev.id}
                      onClick={() => toggleActive(ev.id, ev.isActive)}
                      title="Click to toggle Event Active status"
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border transition-all cursor-pointer text-center inline-block ${
                        ev.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {ev.isActive ? "● Event Active" : "○ Event Disabled"}
                    </button>

                    {/* Registration Open toggle badge/button */}
                    <button
                      type="button"
                      disabled={updatingId === ev.id}
                      onClick={() =>
                        toggleRegistration(ev.id, ev.isRegistrationOpen ?? true)
                      }
                      title="Click to toggle Registration status"
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border transition-all cursor-pointer text-center inline-block ${
                        (ev.isRegistrationOpen ?? true)
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                          : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                      }`}
                    >
                      {(ev.isRegistrationOpen ?? true)
                        ? "✓ Registration Open"
                        : "🔒 Registration Closed"}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-2">
                    {ev.location && <span>📍 {ev.location}</span>}
                    <span>🗓 {new Date(ev.date).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    type="button"
                    disabled={updatingId === ev.id}
                    onClick={() =>
                      toggleRegistration(ev.id, ev.isRegistrationOpen ?? true)
                    }
                    className={`flex-1 sm:flex-initial px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center inline-flex items-center justify-center ${
                      (ev.isRegistrationOpen ?? true)
                        ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                    }`}
                  >
                    {(ev.isRegistrationOpen ?? true)
                      ? "Stop Registrations"
                      : "Enable Registrations"}
                  </button>

                  <button
                    type="button"
                    disabled={updatingId === ev.id}
                    onClick={() => {
                      if (
                        ev.isActive === true &&
                        ev.isRegistrationOpen === true
                      ) {
                        toggleRegistration(ev.id, true);
                      }
                      toggleActive(ev.id, ev.isActive);
                    }}
                    className={`flex-1 sm:flex-initial px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center inline-flex items-center justify-center ${
                      ev.isActive
                        ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {ev.isActive ? "Disable Event" : "Enable Event"}
                  </button>

                  <Link
                    href={`/organizer/events/${ev.id}/scan`}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all shadow-sm shadow-emerald-600/30 inline-flex items-center justify-center gap-1.5"
                  >
                    Scan
                  </Link>
                  <Link
                    href={`/organizer/events/${ev.id}`}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-all shadow-sm shadow-indigo-600/30 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    Dashboard →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateEventModal
          onCreated={() => {
            setShowCreate(false);
            fetchEvents();
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
