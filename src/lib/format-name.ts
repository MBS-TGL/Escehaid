/**
 * Normalisasi nama & asal sekolah — satu sumber kebenaran untuk tiga lapis:
 * simpan (server), tampilan admin, tampilan publik.
 *
 * Aturan Title Case: huruf besar pada AWAL string dan setelah pemisah
 * " ", "-", ".", "(", "/". Apostrof SENGAJA bukan pemisah agar "NAFI'AH"
 * menjadi "Nafi'ah" (bukan "Nafi'Ah"). Hasil selalu idempoten:
 * normalizeName(normalizeName(x)) === normalizeName(x).
 */

/** Karakter pemisah dalam sebuah token nama — setelahnya huruf mobil ditulis kapital. */
function isSeparator(ch: string): boolean {
  return ch === " " || ch === "-" || ch === "." || ch === "(" || ch === "/";
}

function cleanText(input: string | null | undefined): string {
  // Samakan apostrof tipografis, rapikan spasi ganda/baris baru, buang spasi tepi.
  return (input ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** "budi santoso" → "Budi Santoso", "NAFI'AH HH" → "Nafi'ah Hh". */
export function normalizeName(input: string | null | undefined): string {
  const cleaned = cleanText(input);
  if (!cleaned) return "";
  let out = "";
  let capNext = true;
  for (const ch of cleaned) {
    if (isSeparator(ch)) {
      out += ch;
      capNext = true;
      continue;
    }
    out += capNext ? ch.toUpperCase() : ch.toLowerCase();
    capNext = false;
  }
  return out;
}

/** Peta kanonik singkatan nama sekolah — casing dipertahankan persis. */
const SCHOOL_CANON: Record<string, string> = {
  sd: "SD",
  sdn: "SDN",
  sdit: "SDIT",
  smp: "SMP",
  smpn: "SMPN",
  sma: "SMA",
  smk: "SMK",
  mi: "MI",
  mim: "MIM",
  min: "MIN",
  mts: "MTs",
  mtsn: "MTsN",
  ma: "MA",
  man: "MAN",
  tk: "TK",
  ra: "RA",
  paud: "PAUD",
};

/** "SD MUHAMMADIYAH 01 TANGGUL" → "SD Muhammadiyah 01 Tanggul". */
export function normalizeSchool(input: string | null | undefined): string {
  const base = normalizeName(input);
  if (!base) return "";
  return base
    .split(" ")
    .map((w) => SCHOOL_CANON[w.toLowerCase()] ?? w)
    .join(" ");
}

/** Pemisah kolom parent_name — dibaca admin via split(" / "); JANGAN diubah. */
export const PARENT_NAME_SPLIT = " / ";

/**
 * "BUDI / SITI" → "Budi / Siti". Format dipertahankan: hanya bagian
 * " / " yang jadi batas, per bagian dinormalisasi. Bagian kosong pun
 * dipertahankan ("Budi / " tetap "Budi / ", " / Siti" tetap " / Siti").
 */
export function normalizeParentName(input: string | null | undefined): string {
  const base = (input ?? "").replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ");
  if (!base.trim()) return "";
  return base
    .split(PARENT_NAME_SPLIT)
    .map((part) => normalizeName(part))
    .join(PARENT_NAME_SPLIT);
}

/**
 * Rapikan nomor telepon: buang spasi dan tanda hubung (mengawali 0 atau
 * +62 tetap dipertahankan sebagaimana diisi user).
 */
export function normalizePhone(input: string | null | undefined): string {
  return (input ?? "").replace(/[\s\u2010-\u2015-]+/g, "").trim();
}
