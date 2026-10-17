"use client";

import { useEffect, useState } from "react";

/**
 * Registrasi service worker PWA (/sw.js) — hanya di production, agar cache
 * tidak mengganggu hot reload saat `next dev`.
 *
 * Saat versi baru terdeteksi, tampilkan banner "versi baru tersedia" (tanpa
 * dependency) → tombol memicu SKIP_WAITING lalu reload sekali. Banner
 * ditampilkan di atas MobileBottomNav.
 */
export default function ServiceWorkerRegister() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let refreshing = false;
    const onControllerChange = () => {
      // Reload hanya sekali, dan hanya setelah pengguna menekan tombol.
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) setShowUpdate(true);
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setShowUpdate(true);
            }
          });
        });
      }).catch(() => {});
    };

    window.addEventListener("load", onLoad);
    return () => {
      window.removeEventListener("load", onLoad);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!showUpdate) return null;

  const reload = () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.waiting?.postMessage("SKIP_WAITING");
    });
    // Jaring pengaman bila event controllerchange tidak terpicu.
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-20 z-[60] mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-[#dce3ed] bg-white px-4 py-3 shadow-lg md:bottom-6"
    >
      <p className="text-sm text-slate-700">Versi baru tersedia.</p>
      <button
        type="button"
        onClick={reload}
        className="shrink-0 rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-accent)]"
      >
        Muat ulang
      </button>
    </div>
  );
}
