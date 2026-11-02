/**
 * Deteksi grup duplikat pendaftar SPMB — fungsi murni (mudah diuji).
 *
 * Kriteria duplikat (dinormalisasi):
 *  - NISN sama (10 digit, dari documents.nisn)
 *  - NIK sama (16 digit, dari documents.nik)
 *  - Telepon sama (digit saja, awalan 0/62 diseragamkan ke 62)
 */

export interface DuplicateGroup {
  /** Kunci grup: "nisn:<nilai>" | "nik:<nilai>" | "phone:<nilai>". */
  key: string;
  kind: "nisn" | "nik" | "phone";
  value: string;
  ids: string[];
}

export interface DupeCandidate {
  id: string;
  full_name: string;
  phone?: string | null;
  documents?: { nisn?: string; nik?: string } | null;
}

/** Seragamkan nomor: buang non-digit, awalan 0 → 62. */
export function normalizeDupePhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

/** Kelompokkan pendaftar yang berbagi NISN / NIK / telepon. */
export function findDuplicateGroups(rows: DupeCandidate[]): DuplicateGroup[] {
  const buckets = new Map<string, { kind: DuplicateGroup["kind"]; value: string; ids: string[] }>();

  function add(kind: DuplicateGroup["kind"], value: string, id: string) {
    const v = value.trim();
    if (!v) return;
    if (kind === "phone" && v.length < 9) return;
    const key = `${kind}:${v}`;
    const bucket = buckets.get(key);
    if (bucket) {
      if (!bucket.ids.includes(id)) bucket.ids.push(id);
    } else {
      buckets.set(key, { kind, value: v, ids: [id] });
    }
  }

  for (const r of rows) {
    add("nisn", r.documents?.nisn ?? "", r.id);
    add("nik", r.documents?.nik ?? "", r.id);
    add("phone", normalizeDupePhone(r.phone), r.id);
  }

  return Array.from(buckets.entries())
    .filter(([, b]) => b.ids.length > 1)
    .map(([key, b]) => ({ key, kind: b.kind, value: b.value, ids: b.ids }))
    .sort((a, b) => b.ids.length - a.ids.length || a.key.localeCompare(b.key));
}

/** Himpunan id yang masuk grup duplikat mana pun — dipakai badge/filter cepat. */
export function duplicateIdSet(groups: DuplicateGroup[]): Set<string> {
  const s = new Set<string>();
  for (const g of groups) for (const id of g.ids) s.add(id);
  return s;
}
