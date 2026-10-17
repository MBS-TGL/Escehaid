"use client";

import { Printer } from "@/components/Icons";

/**
 * Tombol cetak bukti hasil seleksi — memanggil window.print() saat diklik.
 * Elemen perlu disembunyikan saat cetak ditandai dengan kelas `print:hidden`
 * (navbar, footer, form) di halaman /admission/status.
 */
export default function PrintButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={className}
    >
      <Printer className="h-4 w-4" />
      Cetak Bukti
    </button>
  );
}
