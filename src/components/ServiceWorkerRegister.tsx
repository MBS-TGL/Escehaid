"use client";

import { useEffect } from "react";

/**
 * Registrasi service worker PWA (/sw.js) — hanya di production, agar cache
 * tidak mengganggu hot reload saat `next dev`. Tidak merender apa pun.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
