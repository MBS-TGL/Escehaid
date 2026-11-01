/**
 * Unduh string CSV sebagai berkas — pola yang sama dipakai ekspor SPMB /
 * kontak / log (BOM agar Excel membaca UTF-8, pemisah ";" mengikuti Excel
 * Indonesia). Client-only (membutuhkan `document`).
 */
export function downloadCsv(filename: string, csvWithoutBom: string): void {
  const blob = new Blob(["\uFEFF" + csvWithoutBom], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
