"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Kanvas admin: menyembunyikan bottom nav selama ada bar bawah pengganti
 * (mode pilih massal). Bar pengganti mendaftar saat mounted; pelepasan lewat
 * `release()` di cleanup effect — jadi route change yang membuang bar juga
 * otomatis memulihkan nav.
 */
type AdminChromeValue = {
  registerBottomBar: () => () => void;
  bottomBarActive: boolean;
};

const AdminChromeContext = createContext<AdminChromeValue>({
  registerBottomBar: () => () => {},
  bottomBarActive: false,
});

export function useAdminChrome() {
  return useContext(AdminChromeContext);
}

/**
 * Halaman memanggil `useAdminBottomBar(pickMode)`. Selama true, bottom nav
 * dilepas dari DOM sehingga bar pengganti (yang menempati dasar layar)
 * satu-satunya bar di sana. `pb-24` pada `<main>` sudah menyediakan ruang,
 * jadi tidak perlu spacer per halaman.
 */
export function useAdminBottomBar(active: boolean) {
  const { registerBottomBar } = useAdminChrome();

  useEffect(() => {
    if (!active) return;
    // Cleanup menutup `release` miliknya sendiri — aman di StrictMode
    // (mount → cleanup → mount) karena setiap effect punya token baru.
    return registerBottomBar();
  }, [active, registerBottomBar]);
}

export function AdminChromeProvider({ children }: { children: React.ReactNode }) {
  const [holders, setHolders] = useState<ReadonlySet<symbol>>(new Set());

  const registerBottomBar = useCallback(() => {
    const token = Symbol("bottom-bar");
    setHolders((prev) => new Set(prev).add(token));
    return () => {
      setHolders((prev) => {
        if (!prev.has(token)) return prev;
        const next = new Set(prev);
        next.delete(token);
        return next;
      });
    };
  }, []);

  const value = useMemo(
    () => ({ registerBottomBar, bottomBarActive: holders.size > 0 }),
    [registerBottomBar, holders]
  );

  return <AdminChromeContext.Provider value={value}>{children}</AdminChromeContext.Provider>;
}
