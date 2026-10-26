import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_ROLES } from "@/lib/rbac/roles";
import { isPermission } from "@/lib/rbac/permissions";

/**
 * Sinkronisasi seed SQL ↔ default peran di kode.
 *
 * Kelas bug yang dijaga: `supabase/backup-perm.sql` memberi ADMIN_SEKOLAH
 * `backup:read`, tapi `DEFAULT_ROLES` di `roles.ts` tidak memuatnya. Selama
 * rute belum di-gate proxy, selisih itu tidak terasa. Begitu proxy menjadi
 * default-deny, selisih yang sama membuat:
 *   • peran kehilangan halaman yang seharusnya boleh,
 *   • tombol "Kembalikan ke default" MENCABUT grant yang sudah di-seed.
 *
 * Test ini membaca berkas SQL seed yang ada di repo dan memastikan setiap
 * grant di sana juga tercermin di default kode.
 */

const ROOT = process.cwd();

/** Berkas seed yang memetakan role → izin secara eksplisit. */
const SEED_FILES = [
  "supabase/backup-perm.sql",
  "supabase/diagnostics-perm.sql",
  "supabase/trash-perm.sql",
  "supabase/faq.sql",
  "supabase/ekskul.sql",
  "supabase/program.sql",
];

interface SeedGrant {
  file: string;
  role: string;
  permission: string;
}

/** Ambil pasangan ('ROLE', 'izin:aksi') dari blok INSERT role_permissions. */
function parseSeeds(): SeedGrant[] {
  const grants: SeedGrant[] = [];
  for (const rel of SEED_FILES) {
    const full = join(ROOT, rel);
    if (!existsSync(full)) continue;
    const sql = readFileSync(full, "utf8");

    // Hanya bagian INSERT INTO ... role_permissions yang relevan.
    const insertIdx = sql.search(/insert\s+into\s+(public\.)?role_permissions/i);
    if (insertIdx < 0) continue;
    const body = sql.slice(insertIdx);

    for (const m of body.matchAll(/\(\s*'([A-Z_]+)'\s*,\s*'([a-z_]+:[a-z_]+)'\s*\)/g)) {
      grants.push({ file: rel, role: m[1], permission: m[2] });
    }
  }
  return grants;
}

const SEEDS = parseSeeds();

describe("seed SQL ↔ default peran", () => {
  it("berhasil membaca grant dari berkas seed (sanity check parser)", () => {
    // Kalau ini gagal, parser-nya yang rusak — bukan datanya.
    expect(SEEDS.length).toBeGreaterThan(20);
    expect(SEEDS.some((g) => g.permission === "backup:read")).toBe(true);
  });

  it("setiap grant di seed memakai izin yang valid menurut registry", () => {
    const invalid = SEEDS.filter((g) => !isPermission(g.permission));
    expect(
      invalid.map((g) => `${g.file}: ${g.role} → ${g.permission}`),
      "Seed memuat izin yang tidak dikenal registry"
    ).toEqual([]);
  });

  it("setiap grant non-SUPER di seed juga ada di default peran kode", () => {
    const missing: string[] = [];

    for (const g of SEEDS) {
      // SUPER_ADMIN = wildcard di `can()`, dan daftar default-nya diturunkan
      // dari seluruh registry, jadi tidak perlu dicocokkan per baris.
      if (g.role === "SUPER_ADMIN") continue;

      const role = DEFAULT_ROLES.find((r) => r.key === g.role);
      if (!role) {
        missing.push(`${g.file}: peran ${g.role} tidak ada di DEFAULT_ROLES`);
        continue;
      }
      if (!role.permissions.includes(g.permission)) {
        missing.push(`${g.file}: ${g.role} → ${g.permission}`);
      }
    }

    expect(
      missing,
      "Grant ini ada di SQL seed tapi TIDAK di DEFAULT_ROLES — " +
        "'Kembalikan ke default' akan mencabutnya. Tambahkan ke roles.ts:\n  " +
        missing.join("\n  ")
    ).toEqual([]);
  });

  it("setiap izin default peran non-SUPER punya alasan yang jelas di registry", () => {
    // Jaring pengaman arah sebaliknya: default peran tidak boleh memuat izin
    // modul yang tidak pernah dipakai halaman mana pun.
    for (const role of DEFAULT_ROLES) {
      if (role.key === "SUPER_ADMIN") continue;
      for (const perm of role.permissions) {
        expect(isPermission(perm), `${role.key} memuat ${perm} yang tak dikenal`).toBe(true);
      }
    }
  });
});
