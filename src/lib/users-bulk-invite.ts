import { ROLE_KEYS } from "./rbac/roles";

/**
 * Parser & validator untuk "Undang massal dari CSV".
 *
 * Murni (tanpa I/O) supaya bisa diuji dan dipakai server sebagai sumber
 * kebenaran terakhir. Format yang diterima:
 *
 *   Nama,Email,Peran
 *   Siti Aminah,siti@sekolah.sch.id,OPERATOR_KONTEN
 *
 * Kolom boleh dalam urutan apa pun asalkan header dikenali (Indonesia/Inggris,
 * tidak peka huruf besar). Pemisah `,` atau `;` dideteksi otomatis.
 */
export interface BulkInviteRow {
  /** Nomor baris di file (1-based, termasuk header) — untuk pesan error. */
  line: number;
  fullName: string;
  email: string;
  roleKey: string;
}

export interface BulkInviteIssue {
  line: number;
  message: string;
}

export interface BulkInviteParseResult {
  rows: BulkInviteRow[];
  issues: BulkInviteIssue[];
  /** Email/baris yang terlihat valid tetapi duplikat di dalam file. */
  duplicates: number;
}

const HEADER_ALIASES: Record<keyof Omit<BulkInviteRow, "line">, string[]> = {
  fullName: ["nama", "nama lengkap", "name", "full name", "fullname"],
  email: ["email", "e-mail", "surel"],
  roleKey: ["peran", "role", "jabatan akses"],
};

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const semi = (firstLine.match(/;/g) ?? []).length;
  const comma = (firstLine.match(/,/g) ?? []).length;
  return semi > comma ? ";" : ",";
}

/** Parser CSV minimal: dukung kutip ganda + newline di dalam kutip. */
function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Email sengaja sederhana: cukup untuk menolak input jelas rusak. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Normalisasi peran: kunci resmi (case-insensitive) atau label yang dikenal. */
function normalizeRole(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const upper = value.toUpperCase().replace(/\s+/g, "_");
  if ((ROLE_KEYS as readonly string[]).includes(upper)) return upper;

  const labelMap: Record<string, string> = {
    "super admin": "SUPER_ADMIN",
    "admin sekolah": "ADMIN_SEKOLAH",
    "operator konten": "OPERATOR_KONTEN",
    "panitia spmb": "PANITIA_SPMB",
  };
  return labelMap[value.toLowerCase()] ?? null;
}

/**
 * Validasi isi file. Baris yang gagal dikumpulkan di `issues` (bukan
 * dilempar) supaya UI bisa menampilkan ringkasan per baris sebelum eksekusi.
 */
export function parseBulkInviteCsv(text: string): BulkInviteParseResult {
  const issues: BulkInviteIssue[] = [];
  const rows: BulkInviteRow[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  const table = parseCsv(text.replace(/^\uFEFF/, ""), detectDelimiter(text));
  if (table.length === 0) {
    return { rows, issues: [{ line: 1, message: "File kosong." }], duplicates };
  }

  const header = table[0].map(normalizeHeader);
  const indexOf = (aliases: string[]) => header.findIndex((h) => aliases.includes(h));
  const nameIdx = indexOf(HEADER_ALIASES.fullName);
  const emailIdx = indexOf(HEADER_ALIASES.email);
  const roleIdx = indexOf(HEADER_ALIASES.roleKey);

  if (nameIdx < 0 || emailIdx < 0 || roleIdx < 0) {
    return {
      rows,
      issues: [
        {
          line: 1,
          message: 'Header harus memuat kolom "Nama", "Email", dan "Peran".',
        },
      ],
      duplicates,
    };
  }

  for (let i = 1; i < table.length; i++) {
    const line = i + 1;
    const raw = table[i];
    // Baris kosong di akhir file bukan error.
    if (raw.every((c) => c.trim() === "")) continue;

    const fullName = (raw[nameIdx] ?? "").trim();
    const email = (raw[emailIdx] ?? "").trim().toLowerCase();
    const roleRaw = (raw[roleIdx] ?? "").trim();

    if (!fullName) {
      issues.push({ line, message: "Nama kosong." });
      continue;
    }
    if (!isValidEmail(email)) {
      issues.push({ line, message: `Email tidak valid: "${raw[emailIdx] ?? ""}".` });
      continue;
    }
    const roleKey = normalizeRole(roleRaw);
    if (!roleKey) {
      issues.push({
        line,
        message: `Peran tidak dikenal: "${roleRaw}". Gunakan salah satu: ${ROLE_KEYS.join(", ")}.`,
      });
      continue;
    }
    if (seen.has(email)) {
      duplicates += 1;
      issues.push({ line, message: `Email duplikat di file: ${email}.` });
      continue;
    }

    seen.add(email);
    rows.push({ line, fullName, email, roleKey });
  }

  if (rows.length === 0 && issues.length === 0) {
    issues.push({ line: 1, message: "Tidak ada baris data untuk diundang." });
  }

  return { rows, issues, duplicates };
}
