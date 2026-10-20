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
