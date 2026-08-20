"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

interface QRScannerProps {
  onScan: (text: string) => void;
  active?: boolean;
}

export default function QRScanner({ onScan, active = true }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(true);

  function handleScanError(scanError: { kind: string; message: string }) {
    setHasCamera(scanError.kind !== "no-camera");
    if (scanError.kind === "permission-denied") {
      setError("Camera permission denied. Please allow camera access.");
    } else if (scanError.kind === "no-camera") {
      setError("No camera found on this device");
    } else {
      setError(scanError.message || "Camera error");
    }
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black border-2 border-indigo-500/30 shadow-2xl">
        <Scanner
          onScan={(detectedCodes) => {
            const detectedCode = detectedCodes[0];
            if (detectedCode?.rawValue) onScan(detectedCode.rawValue);
          }}
          onError={handleScanError}
          paused={!active || Boolean(error)}
          constraints={{ facingMode: "environment" }}
          allowMultiple={false}
          styles={{
            container: { width: "100%", height: "100%" },
            video: { width: "100%", height: "100%", objectFit: "cover" },
          }}
        >
          {active && !error && (
            <div className="absolute left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent z-10 animate-scan" />
          )}
        </Scanner>
      </div>

      {error && (
        <div className="mt-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {!hasCamera && (
        <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
          <span>
            No camera detected. Use a device with a camera for scanning.
          </span>
        </div>
      )}
    </div>
  );
}
