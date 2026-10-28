/**
 * Helper CSV murni (dipakai export pengguna & impor/undangan massal).
 *
 * Aturan keamanan:
 *  - sel yang diawali `= + - @` diberi awalan `'` agar Excel/Sheets tidak
 *    mengeksekusinya sebagai formula (CSV injection);
 *  - tanda kutip di-escape dengan menggandakan;
 *  - `forceText` menahan nilai (mis. email/ID) agar tidak diubah perilakunya.
 */
export function csvCell(value: unknown, forceText = false): string {
  let s = String(value ?? "");
  if (forceText || /^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Susun CSV (tanpa BOM). Pemisah default `;` mengikuti Excel Indonesia. */
export function buildCsv(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
  delimiter = ";"
): string {
  const lines = [headers.map((h) => csvCell(h)).join(delimiter)];
  for (const row of rows) {
    lines.push(row.map((v) => csvCell(v)).join(delimiter));
  }
  return lines.join("\r\n");
}
