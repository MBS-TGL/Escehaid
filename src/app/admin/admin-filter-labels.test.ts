import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Penjaga konsistensi label filter di seluruh panel admin.
 *
 * Aturan yang dipakai bersama:
 *  1. Opsi "semua" harus menyebut dimensinya ("Semua Status", "Semua Kategori"),
 *     bukan sekadar "Semua" — supaya tiga dropdown berdampingan tidak ambigu.
 *  2. Setiap kata pada label "Semua ..." memakai huruf kapital (Title Case).
 *
 * Label tampilan juga di-Capitalize lewat CSS di `FilterBar`/`MobileFilterBar`,
 * tetapi teks sumbernya tetap harus konsisten untuk aria/copy/snapshot.
 */
const ADMIN_DIR = join(process.cwd(), "src", "app", "admin");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function relative(file: string): string {
  return file.slice(process.cwd().length + 1).replace(/\\/g, "/");
}

describe("label filter admin", () => {
  const files = walk(ADMIN_DIR);

  it("tidak memakai label 'Semua' tanpa dimensi", () => {
    const offenders = files
      .filter((file) => /label:\s*"Semua"/.test(readFileSync(file, "utf8")))
      .map(relative);

    expect(offenders).toEqual([]);
  });

  it("label 'Semua ...' memakai Title Case di setiap kata", () => {
    const offenders: string[] = [];
    const pattern = /label:\s*"(Semua [^"]*)"/g;

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(pattern)) {
        const label = match[1];
        const titleCased = label
          .split(/\s+/)
          .every((word) => word === word.charAt(0).toUpperCase() + word.slice(1));
        if (!titleCased) offenders.push(`${relative(file)}: "${label}"`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
