/**
 * Saran koreksi kata kunci saat pencarian kosong hasil.
 *
 * Murni (tanpa I/O, tanpa dependensi) → mudah diuji. Memakai koefisien Dice
 * atas trigram: 2·|A∩B| / (|A|+|B|). Lebih toleran daripada Jaccard untuk
 * kata pendek, dan tidak butuh RPC/DB karena kamusnya berasal dari halaman
 * statis + judul grup yang memang sudah diketahui di klien.
 */

/** Trigram sebuah kata (di-pad spasi agar awal/akhir kata ikut berbobot). */
function trigrams(word: string): Set<string> {
  const padded = `  ${word.toLowerCase()} `;
  const set = new Set<string>();
  for (let i = 0; i < padded.length - 2; i += 1) {
    set.add(padded.slice(i, i + 3));
  }
  return set;
}

/** Dice coefficient 0—1 antara dua kata. */
export function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a.toLowerCase() === b.toLowerCase()) return 1;
  const ga = trigrams(a);
  const gb = trigrams(b);
  if (!ga.size || !gb.size) return 0;
  let shared = 0;
  for (const gram of ga) {
    if (gb.has(gram)) shared += 1;
  }
  return (2 * shared) / (ga.size + gb.size);
}

/** Ambang minimum kemiripan agar sebuah kata dianggap "mungkin maksud Anda". */
export const SUGGEST_MIN_SCORE = 0.4;
/** Maksimum saran yang dikembalikan. */
export const SUGGEST_MAX = 3;

/**
 * Kata kunci pengganti untuk tiap token query.
 *
 * Aturan: untuk SETIAP token query dicari kata kamus terdekat (skor ≥ ambang);
 * bila ada yang tak ketemu sama sekali, token itu dibiarkan apa adanya
 * (pengguna mungkin memang mengetik istilah yang tidak ada di kamus).
 * Hasil akhir: seluruh frasa dengan token yang berhasil dikoreksi, hanya bila
 * sedikitnya satu token benar-benar berubah.
 */
export function suggestCorrections(query: string, known: string[]): string[] {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  if (!tokens.length || !known.length) return [];

  const dictionary = Array.from(new Set(known.map((k) => k.toLowerCase()).filter(Boolean)));

  const suggestions: { text: string; score: number }[] = [];
  for (const word of dictionary) {
    // Lewati kata yang persis sama dengan salah satu token (bukan koreksi).
    if (tokens.includes(word)) continue;
    const score = Math.max(...tokens.map((token) => diceCoefficient(token, word)));
    if (score >= SUGGEST_MIN_SCORE) suggestions.push({ text: word, score });
  }

  return suggestions
    .sort((a, b) => b.score - a.score || a.text.localeCompare(b.text))
    .slice(0, SUGGEST_MAX)
    .map((s) => s.text);
}
