"use client";

import { useEffect, useRef, useState } from "react";
import QRCodeLib from "qrcode";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export default function QRCodeDisplay({
  value,
  size = 220,
  className = "",
}: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    setError(false);
    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: {
        dark: "#172033",
        light: "#ffffff",
      },
    }).catch(() => setError(true));
  }, [value, size]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 rounded-xl text-slate-400 text-xs font-medium ${className}`}
        style={{ width: size, height: size }}
      >
        QR Error
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`rounded-xl block ${className}`}
    />
  );
}
