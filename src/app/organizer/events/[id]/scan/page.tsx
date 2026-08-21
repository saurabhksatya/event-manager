"use client";

import { useState, useEffect, use, useCallback, useRef } from "react";
import Link from "next/link";
import QRScanner from "@/components/QRScanner";
import {
  enqueueOfflineScan,
  syncOfflineScans,
  getPendingScans,
  type SyncResult,
  type OfflineScan,
} from "@/lib/offline-store";

type ScanStatus =
  | { kind: "idle" }
  | { kind: "processing" }
  | { kind: "success"; message: string; name: string }
  | { kind: "error"; message: string }
  | { kind: "duplicate"; message: string }
  | { kind: "expired" }
  | { kind: "offline-queued" };

const STATION_ID =
  typeof window !== "undefined"
    ? (localStorage.getItem("stationId") ??
      `station-${Math.random().toString(36).slice(2, 7)}`)
    : "unknown";

if (typeof window !== "undefined") {
  localStorage.setItem("stationId", STATION_ID);
}

export default function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const [status, setStatus] = useState<ScanStatus>({ kind: "idle" });
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingList, setPendingList] = useState<OfflineScan[]>([]);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [scanning, setScanning] = useState(true);
  const lastTokenRef = useRef<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const refreshPending = useCallback(async () => {
    const pending = await getPendingScans();
    const eventPending = pending.filter((s) => s.eventId === eventId);
    setPendingCount(eventPending.length);
    setPendingList(eventPending);
  }, [eventId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshPending();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshPending, status]);

  useEffect(() => {
    if (online && pendingCount > 0) {
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      const results = await syncOfflineScans(eventId);
      setSyncResults(results);
      await refreshPending();
    } finally {
      setSyncing(false);
    }
  }

  const handleScan = useCallback(
    async (rawText: string) => {
      if (rawText === lastTokenRef.current) return;
      lastTokenRef.current = rawText;
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
      cooldownRef.current = setTimeout(() => {
        lastTokenRef.current = null;
      }, 3000);

      setStatus({ kind: "processing" });
      setScanning(false);

      let token = rawText;
      try {
        const url = new URL(rawText, window.location.origin);
        token = url.searchParams.get("token") ?? rawText;
      } catch {
        // not a URL, use as-is
      }

      if (!online) {
        try {
          await enqueueOfflineScan({
            token,
            eventId,
            stationId: STATION_ID,
            scannedAt: new Date().toISOString(),
          });
          setStatus({ kind: "offline-queued" });
          await refreshPending();
        } catch (error) {
          setStatus({
            kind: "error",
            message:
              error instanceof Error ? error.message : "Unable to queue scan",
          });
        }
        setTimeout(() => {
          setStatus({ kind: "idle" });
          setScanning(true);
        }, 3000);
        return;
      }

      try {
        const res = await fetch(`/api/events/${eventId}/checkin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, stationId: STATION_ID }),
        });
        const data = await res.json();

        if (res.ok) {
          setStatus({
            kind: "success",
            message: data.message,
            name: data.checkIn?.registration?.user?.name ?? "Attendee",
          });
        } else if (res.status === 409) {
          setStatus({ kind: "duplicate", message: data.error });
        } else if (res.status === 410) {
          setStatus({ kind: "expired" });
        } else {
          setStatus({
            kind: "error",
            message: data.error ?? "Check-in failed",
          });
        }
      } catch {
        try {
          await enqueueOfflineScan({
            token,
            eventId,
            stationId: STATION_ID,
            scannedAt: new Date().toISOString(),
          });
          setStatus({ kind: "offline-queued" });
          await refreshPending();
        } catch (error) {
          setStatus({
            kind: "error",
            message:
              error instanceof Error ? error.message : "Unable to queue scan",
          });
        }
      }

      setTimeout(() => {
        setStatus({ kind: "idle" });
        setScanning(true);
      }, 3000);
    },
    [online, eventId, refreshPending],
  );

  const statusStyleConfig = {
    idle: {
      container: "bg-slate-100 border-slate-200 text-slate-600",
      text: "Ready to scan",
    },
    processing: {
      container: "bg-indigo-50 border-indigo-200 text-indigo-600",
      text: "Processing...",
    },
    success: {
      container: "bg-emerald-50 border-emerald-300 text-emerald-700",
      text: "",
    },
    error: {
      container: "bg-red-50 border-red-300 text-red-700",
      text: "",
    },
    duplicate: {
      container: "bg-amber-50 border-amber-300 text-amber-800",
      text: "",
    },
    expired: {
      container: "bg-amber-50 border-amber-300 text-amber-800",
      text: "QR code expired — attendee must refresh their ticket",
    },
    "offline-queued": {
      container: "bg-amber-50 border-amber-300 text-amber-800",
      text: "Scan saved offline — Pending sync when connected",
    },
  };

  const cfg = statusStyleConfig[status.kind];

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <Link
            href={`/organizer/events/${eventId}`}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1"
          >
            ← Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">
          QR Scanner
        </h1>

        {/* Status bar */}
        <div className="flex items-center gap-2.5 flex-wrap text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-semibold">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                online ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <span className={online ? "text-emerald-600" : "text-red-600"}>
              {online ? "Online" : "Offline — scans will queue"}
            </span>
          </div>
          <span className="text-slate-300">•</span>
          <span>
            Station: <strong className="text-slate-700">{STATION_ID}</strong>
          </span>
          {pendingCount > 0 && (
            <>
              <span className="text-slate-300">•</span>
              <span className="px-2 py-0.5 rounded-full text-amber-700 bg-amber-50 border border-amber-200 font-semibold inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {pendingCount} pending sync
              </span>
            </>
          )}
        </div>
      </div>

      {/* Scanner */}
      <div className="mb-5">
        <QRScanner onScan={handleScan} active={scanning} />
      </div>

      {/* Result panel */}
      <div
        className={`p-5 rounded-2xl border flex items-start gap-3.5 mb-5 min-h-[4.5rem] transition-all duration-300 ${cfg.container}`}
      >
        <div className="flex-1">
          {status.kind === "idle" && (
            <p className="text-sm font-semibold">{cfg.text}</p>
          )}
          {status.kind === "processing" && (
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-sm font-semibold">{cfg.text}</span>
            </div>
          )}
          {status.kind === "success" && (
            <>
              <p className="text-base font-bold text-emerald-800">
                Check-in Successful!
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                {(status as { kind: "success"; message: string }).message}
              </p>
            </>
          )}
          {status.kind === "duplicate" && (
            <>
              <p className="text-base font-bold text-amber-900">
                Already Checked In
              </p>
              <p className="text-xs text-amber-800 mt-1">
                {(status as { kind: "duplicate"; message: string }).message}
              </p>
            </>
          )}
          {status.kind === "error" && (
            <>
              <p className="text-base font-bold text-red-900">
                Check-in Failed
              </p>
              <p className="text-xs text-red-800 mt-1">
                {(status as { kind: "error"; message: string }).message}
              </p>
            </>
          )}
          {status.kind === "expired" && (
            <p className="text-sm font-semibold">{cfg.text}</p>
          )}
          {status.kind === "offline-queued" && (
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
                  ⏳ Pending (Offline)
                </span>
              </div>
              <p className="text-sm font-semibold text-amber-900">
                Scan queued offline — will auto-sync when online
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Offline sync section */}
      {(pendingCount > 0 || syncResults.length > 0) && (
        <div className="bg-white/90 backdrop-blur-xl border border-indigo-100/80 rounded-2xl p-5 mb-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Offline Queue
              </h3>
              {!online && pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Pending Sync ({pendingCount})
                </span>
              )}
            </div>

            {online && pendingCount > 0 ? (
              <button
                id="sync-offline-btn"
                onClick={handleSync}
                disabled={syncing}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {syncing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Syncing...
                  </>
                ) : (
                  `↑ Sync ${pendingCount} scan${pendingCount > 1 ? "s" : ""}`
                )}
              </button>
            ) : !online && pendingCount > 0 ? (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <span>⏳</span> Pending (Offline)
              </span>
            ) : null}
          </div>

          {/* Pending items when offline */}
          {!online && pendingList.length > 0 && (
            <div className="mb-3 flex flex-col gap-2">
              {pendingList.map((item, idx) => (
                <div
                  key={item.id ?? idx}
                  className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 text-sm">⏳</span>
                    <div>
                      <div className="font-mono text-[11px] text-slate-700 font-medium">
                        Token: {item.token.slice(0, 12)}...
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Scanned at{" "}
                        {new Date(item.scannedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Sync results */}
          {syncResults.map((r, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border text-xs mb-2 flex items-start gap-2 ${
                r.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : r.conflict
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <span>{r.success ? "✓" : r.conflict ? "⚡" : "✗"}</span>
              <div className="flex-1">
                <div className="text-[11px] text-slate-400 font-mono">
                  Token: {r.token.slice(0, 8)}...
                </div>
                <div className="font-medium mt-0.5">{r.message}</div>
                {r.conflict && (
                  <div className="text-[11px] mt-1 opacity-80">
                    Conflict: This attendee was already checked in at another
                    station. Your offline scan was not duplicated.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
