const DB_NAME = "event-checkin-offline";
const STORE_NAME = "scan-queue";
const DB_VERSION = 1;

export interface OfflineScan {
  id?: number; // IDB auto-increment key
  token: string;
  eventId: string;
  stationId: string;
  scannedAt: string; // ISO string
  synced: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, {
        keyPath: "id",
        autoIncrement: true,
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueOfflineScan(
  scan: Omit<OfflineScan, "id" | "synced">,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({ ...scan, synced: false });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingScans(): Promise<OfflineScan[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () =>
      resolve((req.result as OfflineScan[]).filter((s) => !s.synced));
    req.onerror = () => reject(req.error);
  });
}

export async function markScanSynced(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result as OfflineScan;
      store.put({ ...record, synced: true });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface SyncResult {
  token: string;
  success: boolean;
  message: string;
  conflict: boolean;
}

/**
 * Drain the offline queue. Each scan is submitted to the check-in endpoint.
 * Conflicts (already checked in elsewhere) are clearly reported — never silently dropped.
 */
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
