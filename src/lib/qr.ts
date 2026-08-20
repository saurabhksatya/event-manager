import { randomUUID } from "crypto";

/** How long a QR token is valid (ms) */
export const QR_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Generate a fresh token + expiry pair */
export function generateQrToken() {
  return {
    qrToken: randomUUID(),
    qrTokenExpiresAt: new Date(Date.now() + QR_TOKEN_TTL_MS),
  };
}

/** Check if a token has expired */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
