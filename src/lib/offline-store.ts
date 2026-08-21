const STORAGE_KEY = "event-checkin-offline-scan-queue";
const MAX_PENDING_SCANS = 5;

export interface OfflineScan {
  id?: number;
  token: string;
  eventId: string;
  stationId: string;
  scannedAt: string; // ISO string
  synced: boolean;
}

function readScans(): OfflineScan[] {
  if (typeof window === "undefined") {
    throw new Error("Offline scan storage is only available in the browser");
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as OfflineScan[];
  } catch {
    throw new Error("Unable to read the offline scan queue");
  }
}

function writeScans(scans: OfflineScan[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
  } catch {
    throw new Error("Unable to save the offline scan queue");
  }
}

export async function enqueueOfflineScan(
  scan: Omit<OfflineScan, "id" | "synced">,
): Promise<void> {
  const scans = readScans();
  if (
    scans.filter((storedScan) => !storedScan.synced).length >= MAX_PENDING_SCANS
  ) {
    throw new Error("Offline scan queue is full (maximum 5 scans)");
  }

  const nextId =
    scans.reduce(
      (highestId, storedScan) => Math.max(highestId, storedScan.id ?? 0),
      0,
    ) + 1;
  writeScans([...scans, { ...scan, id: nextId, synced: false }]);
}

export async function getPendingScans(): Promise<OfflineScan[]> {
  return readScans().filter((scan) => !scan.synced);
}

export async function markScanSynced(id: number): Promise<void> {
  const scans = readScans();
  const scanIndex = scans.findIndex((scan) => scan.id === id);
  if (scanIndex === -1) return;

  scans[scanIndex] = { ...scans[scanIndex], synced: true };
  writeScans(scans);
}

export interface SyncResult {
  token: string;
  success: boolean;
  message: string;
  conflict: boolean;
}

export async function syncOfflineScans(eventId: string): Promise<SyncResult[]> {
  const pending = await getPendingScans();
  const results: SyncResult[] = [];

  for (const scan of pending) {
    if (scan.eventId !== eventId) continue;
    try {
      const res = await fetch(`/api/events/${eventId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: scan.token,
          stationId: scan.stationId,
          offlineScannedAt: scan.scannedAt,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        await markScanSynced(scan.id!);
        results.push({
          token: scan.token,
          success: true,
          message: data.message ?? "Checked in",
          conflict: false,
        });
      } else if (res.status === 409) {
        // Already checked in — conflict, do not retry, mark synced to remove from queue
        await markScanSynced(scan.id!);
        results.push({
          token: scan.token,
          success: false,
          message: data.error ?? "Conflict",
          conflict: true,
        });
      } else {
        // Server error — keep in queue, try again later
        results.push({
          token: scan.token,
          success: false,
          message: data.error ?? "Error",
          conflict: false,
        });
      }
    } catch {
      // Network still down — leave in queue
      results.push({
        token: scan.token,
        success: false,
        message: "Still offline",
        conflict: false,
      });
    }
  }

  return results;
}
