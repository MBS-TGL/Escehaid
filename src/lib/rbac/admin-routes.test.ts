import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  ADMIN_EXEMPT_EXACT,
  ADMIN_PLANNED_ROUTES,
  ADMIN_ROUTE_PERMISSIONS,
  requiredPermissionFor,
} from "@/lib/rbac/admin-routes";
import { isPermission } from "@/lib/rbac/permissions";

/**
 * Kelengkapan peta rute admin.
 *
 * Proxy sekarang DEFAULT-DENY: rute `/admin/*` yang tidak dipetakan ditolak.
 * Konsekuensinya, menambah halaman admin tanpa entri di `admin-routes.ts`
 * akan mengunci halaman itu untuk semua orang (termasuk Super Admin).
 * Test ini membaca struktur folder asli, jadi kesalahan itu gagal di CI —
 * bukan ketahuan setelah deploy.
 */

const ADMIN_DIR = join(process.cwd(), "src", "app", "admin");

/** Semua direktori yang punya `page.tsx`, dalam bentuk path URL. */
function discoverAdminRoutes(dir: string = ADMIN_DIR, isRoot = true): string[] {
  const found: string[] = [];

  // `/admin` sendiri punya page.tsx langsung di root folder admin.
  if (isRoot && readdirSync(dir).includes("page.tsx")) found.push("/admin");

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;

    if (readdirSync(full).includes("page.tsx")) {
      const rel = relative(ADMIN_DIR, full).split(sep).join("/");
      found.push(`/admin/${rel}`);
    }
    found.push(...discoverAdminRoutes(full, false));
  }
  return found.sort();
}

const ROUTES = discoverAdminRoutes();

describe("peta rute admin: kelengkapan", () => {
  it("menemukan seluruh halaman admin (sanity check pembacaan folder)", () => {
    // Kalau angka ini berubah, memang ada halaman baru/terhapus — perbarui
    // peta rute dan sesuaikan ekspektasi ini dengan sadar.
    expect(ROUTES.length).toBeGreaterThanOrEqual(29);
    expect(ROUTES).toContain("/admin");
    expect(ROUTES).toContain("/admin/admission");
  });

  it("setiap halaman admin punya entri izin atau dikecualikan secara eksplisit", () => {
    const unmapped = ROUTES.filter((r) => requiredPermissionFor(r).kind === "unmapped");
    expect(
      unmapped,
      `Rute ini akan ditolak default-deny. Tambahkan entri di ADMIN_ROUTE_PERMISSIONS ` +
        `atau ADMIN_EXEMPT_EXACT (src/lib/rbac/admin-routes.ts):\n  ${unmapped.join("\n  ")}`
    ).toEqual([]);
  });

  it("setiap izin di peta valid menurut registry", () => {
    const invalid = ADMIN_ROUTE_PERMISSIONS.filter(([, perm]) => !isPermission(perm));
    expect(invalid.map(([route, perm]) => `${route} → ${perm}`)).toEqual([]);
  });

  it("tidak ada prefix ganda di peta", () => {
    const prefixes = ADMIN_ROUTE_PERMISSIONS.map(([p]) => p);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it("setiap entri peta benar-benar dipakai sebuah halaman (kecuali di DAFTAR PLANNED)", () => {
    const stale = ADMIN_ROUTE_PERMISSIONS.filter(
      ([prefix]) => !ROUTES.includes(prefix)
    ).map(([prefix]) => prefix);
    expect(stale.filter((p) => !ADMIN_PLANNED_ROUTES.includes(p)),
      "Entri peta tanpa halaman — hapus agar tidak menyesatkan").toEqual([]);
    // Semua entri yang tidak berhalaman harus terdaftar eksplisit di daftar
    // planned; kalaupun halaman sudah ada, cukup dilepas dari daftar.
    for (const p of stale) expect(ADMIN_PLANNED_ROUTES.includes(p), p).toBe(true);
  });

  it("setiap pengecualian adalah halaman yang ada", () => {
    const stale = ADMIN_EXEMPT_EXACT.filter((p) => !ROUTES.includes(p));
    expect(stale).toEqual([]);
  });
});

describe("peta rute admin: resolusi izin", () => {
  it("/admin hanya cocok exact, tidak membuka seluruh /admin/*", () => {
    expect(requiredPermissionFor("/admin")).toEqual({ kind: "exempt" });
    expect(requiredPermissionFor("/admin/news")).toEqual({
      kind: "required",
      perm: "berita:read",
    });
  });

  it("rute bersarang mewarisi izin modul induknya", () => {
    expect(requiredPermissionFor("/admin/admission/123")).toEqual({
      kind: "required",
      perm: "spmb:read",
    });
    expect(requiredPermissionFor("/admin/users/peran")).toEqual({
      kind: "required",
      perm: "users:manage",
    });
  });

  it("trailing slash dinormalisasi", () => {
    expect(requiredPermissionFor("/admin/news/")).toEqual({
      kind: "required",
      perm: "berita:read",
    });
    expect(requiredPermissionFor("/admin/security/")).toEqual({ kind: "exempt" });
  });

  it("rute yang tidak dikenal ditolak (default-deny), bukan diloloskan", () => {
    expect(requiredPermissionFor("/admin/halaman-baru")).toEqual({ kind: "unmapped" });
    expect(requiredPermissionFor("/admin/news-arsip")).toEqual({ kind: "unmapped" });
  });

  it("lubang lama tertutup: admission & backup kini butuh izin", () => {
    expect(requiredPermissionFor("/admin/admission")).toEqual({
      kind: "required",
      perm: "spmb:read",
    });
    expect(requiredPermissionFor("/admin/backup")).toEqual({
      kind: "required",
      perm: "backup:read",
    });
  });

  it("SQL editor butuh izin khusus, bukan menumpang users:manage", () => {
    expect(requiredPermissionFor("/admin/sql")).toEqual({
      kind: "required",
      perm: "sql:manage",
    });
  });

  it("halaman pribadi (security) tetap dapat diakses tanpa izin modul", () => {
    expect(requiredPermissionFor("/admin/security")).toEqual({ kind: "exempt" });
  });
});
