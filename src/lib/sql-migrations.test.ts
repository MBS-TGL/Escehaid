import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_MIGRATIONS } from "@/lib/sql-migrations";

/**
 * Sinkronisasi registry halaman /admin/sql ↔ isi folder migrasi.
 *
 * Kelas bug yang dijaga: `LEDGER_MIGRATIONS` sempat berhenti di `0007`
 * sehingga `0008` & `0009` tidak pernah tampil di halaman — statusnya
 * seolah tidak ada, padahal runner sudah menerapkannya. Test ini membaca
 * folder asli, jadi berkas baru yang lupa didaftarkan gagal di CI.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function migrationFilesOnDisk(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
}

describe("registry migrasi SQL", () => {
  it("setiap berkas di supabase/migrations terdaftar (tidak ada yang tertinggal)", () => {
    const listed = LEDGER_MIGRATIONS.map((m) =>
      m.file.replace(/^supabase\/migrations\//, "")
    ).sort();
    expect(listed).toEqual(migrationFilesOnDisk());
  });

  it("tidak ada entri ganda / berkas yang tidak ada di folder", () => {
    const files = LEDGER_MIGRATIONS.map((m) => m.file);
    expect(new Set(files).size).toBe(files.length);
    const onDisk = new Set(migrationFilesOnDisk());
    for (const m of LEDGER_MIGRATIONS) {
      expect(onDisk.has(m.file.replace(/^supabase\/migrations\//, ""))).toBe(true);
    }
  });

  it("setiap entri punya deskripsi yang bisa dibaca manusia", () => {
    for (const m of LEDGER_MIGRATIONS) {
      expect(m.description.trim().length).toBeGreaterThan(10);
    }
  });
});
