export interface PrincipalGreeting {
  startsWithGreeting: boolean;
  endsWithGreeting: boolean;
}

/**
 * Deteksi salam pembuka/penutup di isi sambutan kepala sekolah, dipakai agar
 * salam yang dirender komponen tidak duplikat dengan salam yang sudah ada di
 * data kutipan. Tanda kutip tipografis dituliskan sebagai escape Unicode agar
 * sumber tetap murni ASCII.
 */
export function detectPrincipalGreeting(quote: string): PrincipalGreeting {
  const q = quote.trim();
  return {
    startsWithGreeting: /^[\s"'\u2018\u2019\u201c\u201d]*(bismillah\S*\s*)?assalamu/i.test(q),
    endsWithGreeting: /wassalamu/i.test(q.slice(-100)),
  };
}

/**
 * Tempelkan angka yang berdiri sendiri ke tetangga katanya dengan spasi
 * non-breaking ("Muhammadiyah 4 Tanggul" tidak terpecah di akhir baris).
 * Mengembalikan string baru; teks sumber milik pemanggil tidak diubah.
 */
export function keepTogether(text: string): string {
  return (
    text
      // spasi sebelum angka -> nbsp (angka menempel ke kata sebelumnya)
      .replace(/(\s)(\d+(?:[.,]\d+)?)(?=\s|$)/g, "\u00a0$2")
      // spasi sesudah angka -> nbsp (angka menempel ke kata sesudahnya)
      .replace(/(?<=^|\s)(\d+(?:[.,]\d+)?)(\s)(?=\S|$)/g, "$1\u00a0")
  );
}
