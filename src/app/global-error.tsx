"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Error boundary ROOT LAYOUT — menerima error yang terjadi di layout.tsx
 * itu sendiri (error.tsx biasa tidak menjangkaunya). UI minimal tanpa
 * aset layout (html/body wajib dirender ulang di sini).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            backgroundColor: "#f8fafc",
            color: "#172033",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
              Terjadi Kesalahan
            </h2>
            <p style={{ marginTop: 8, fontSize: 14, color: "#64748b" }}>
              Gagal memuat halaman. Silakan muat ulang.
              {error.digest && (
                <span style={{ display: "block", marginTop: 4, fontSize: 12, color: "#94a3b8" }}>
                  Kode kesalahan: {error.digest}
                </span>
              )}
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 16,
                padding: "10px 20px",
                borderRadius: 12,
                border: "none",
                background: "#0f2a4d",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
