import { describe, it, expect } from "vitest";
import { ALL_PERMISSIONS, MODULE_REGISTRY, isPermission } from "@/lib/rbac/permissions";
import { DEFAULT_ROLES, defaultPermissionsForRole, ROLE_KEYS } from "@/lib/rbac/roles";

/**
 * Konsistensi registry izin.
 *
 * Kelas bug yang dijaga di sini pernah terjadi nyata: `roles.ts` memelihara
 * daftar izin manual yang menyimpang dari `MODULE_REGISTRY`. Akibatnya
 * `can("sampah:read")` SELALU false untuk peran yang di-resolve lewat default
 * (termasuk admin legacy dengan system_role NULL) sehingga /admin/trash tidak
 * bisa dibuka; dan `resetRoleToDefault` menolak izin yang tidak dikenal
 * (`program:*`) sehingga tombol "kembalikan ke default" gagal untuk 3 dari 4
 * peran. Test ini membuat penyimpangan itu mustahil lolos CI.
 */

describe("registry izin: konsistensi", () => {
  it("setiap izin default tiap peran valid menurut registry", () => {
    for (const role of DEFAULT_ROLES) {
      const invalid = role.permissions.filter((p) => !isPermission(p));
      expect(invalid, `peran ${role.key} memuat izin tak dikenal`).toEqual([]);
    }
  });

  it("defaultPermissionsForRole() mengembalikan izin valid untuk semua peran", () => {
    for (const key of ROLE_KEYS) {
      const perms = defaultPermissionsForRole(key);
      expect(perms.length, `peran ${key} tidak punya izin default`).toBeGreaterThan(0);
      const invalid = perms.filter((p) => !isPermission(p));
      expect(invalid, `peran ${key} memuat izin tak dikenal`).toEqual([]);
    }
  });

  it("SUPER_ADMIN memuat SELURUH izin registry (tidak ada yang tertinggal)", () => {
    const superPerms = new Set(defaultPermissionsForRole("SUPER_ADMIN"));
    const missing = ALL_PERMISSIONS.filter((p) => !superPerms.has(p));
    expect(missing, "izin di registry yang tidak dimiliki SUPER_ADMIN").toEqual([]);
  });

  it("tidak ada izin ganda di dalam satu peran", () => {
    for (const role of DEFAULT_ROLES) {
      const dupes = role.permissions.filter((p, i) => role.permissions.indexOf(p) !== i);
      expect(new Set(dupes), `peran ${role.key} memuat izin ganda`).toEqual(new Set());
    }
  });

  it("tidak ada izin ganda di registry", () => {
    const dupes = ALL_PERMISSIONS.filter((p, i) => ALL_PERMISSIONS.indexOf(p) !== i);
    expect(dupes).toEqual([]);
  });

  it("setiap modul punya aksi `read` (kecuali modul manage-only)", () => {
    const manageOnly = new Set(["users", "settings", "flags"]);
    for (const mod of MODULE_REGISTRY) {
      if (manageOnly.has(mod.key)) continue;
      const actions = mod.actions.map((a) => a.key);
      expect(actions, `modul ${mod.key} tidak punya aksi read`).toContain("read");
    }
  });

  it("setiap peran non-super hanya memakai izin yang ada di registry", () => {
    // Penjaga khusus: peran non-super TIDAK boleh mendapat izin modul sistem
    // yang bersifat "manage" — itu jalur eskalasi.
    const systemManage = ["users:manage", "settings:manage", "flags:manage"];
    for (const role of DEFAULT_ROLES) {
      if (role.key === "SUPER_ADMIN") continue;
      const granted = systemManage.filter((p) => role.permissions.includes(p));
      expect(granted, `peran ${role.key} memegang izin sistem`).toEqual([]);
    }
  });

  it("hanya SUPER_ADMIN & ADMIN_SEKOLAH yang boleh purge permanen (sampah:delete)", () => {
    const allowed = DEFAULT_ROLES.filter((r) => r.permissions.includes("sampah:delete")).map(
      (r) => r.key
    );
    expect(allowed.sort()).toEqual(["ADMIN_SEKOLAH", "SUPER_ADMIN"]);
  });
});
