/**
 * Helper utilitas untuk mem-parsing deskripsi prestasi multi-cabang lomba.
 * Mendukung format daftar bernomor (1., 2.), bullet (- , •), atau teks per baris
 * seperti pada event HW / Pramuka / FLS2N (misal: "1. JUARA 1 UMUM PUTRA").
 */

export type MedalType = "gold" | "silver" | "bronze" | "award" | "general";

export interface ParsedAchievementItem {
  number?: number;
  text: string;
  medalType: MedalType;
}

export interface ParsedAchievementResult {
  hasItems: boolean;
  introText: string;
  items: ParsedAchievementItem[];
  rawText: string;
}

/** Tentukan jenis medali / warna dari teks cabang prestasi */
export function detectMedalType(text: string): MedalType {
  const lower = text.toLowerCase();
  if (
    lower.includes("juara 1") ||
    lower.includes("juara umum") ||
    lower.includes("emas") ||
    lower.includes("gold") ||
    lower.includes("1st")
  ) {
    return "gold";
  }
  if (
    lower.includes("juara 2") ||
    lower.includes("perak") ||
    lower.includes("silver") ||
    lower.includes("2nd")
  ) {
    return "silver";
  }
  if (
    lower.includes("juara 3") ||
    lower.includes("perunggu") ||
    lower.includes("bronze") ||
    lower.includes("3rd")
  ) {
    return "bronze";
  }
  if (
    lower.includes("harapan") ||
    lower.includes("special") ||
    lower.includes("award") ||
    lower.includes("favorit") ||
    lower.includes("apresiasi") ||
    lower.includes("best")
  ) {
    return "award";
  }
  return "general";
}

/**
 * Urai string deskripsi:
 * Memisahkan baris narasi pengantar dengan baris-baris daftar kejuaraan.
 */
export function parseAchievementDescription(description?: string | null): ParsedAchievementResult {
  if (!description || !description.trim()) {
    return { hasItems: false, introText: "", items: [], rawText: "" };
  }

  const lines = description.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const introLines: string[] = [];
  const items: ParsedAchievementItem[] = [];

  for (const line of lines) {
    // Pola baris daftar: diawali "1.", "1)", "[1]", "-", "*", "•", atau diawali kata Juara/Harapan/Special
    const listMatch = line.match(/^(\d+)[\.\)\-]\s*(.*)$/);
    const bulletMatch = line.match(/^[\-\*\•]\s*(.*)$/);

    if (listMatch) {
      const num = parseInt(listMatch[1], 10);
      const text = listMatch[2].trim();
      items.push({
        number: num,
        text: text || line,
        medalType: detectMedalType(text || line),
      });
    } else if (bulletMatch) {
      const text = bulletMatch[1].trim();
      items.push({
        text,
        medalType: detectMedalType(text),
      });
    } else {
      // Periksa apakah baris dimulai langsung dengan kata kunci kejuaraan
      const lower = line.toLowerCase();
      if (
        lower.startsWith("juara") ||
        lower.startsWith("harapan") ||
        lower.startsWith("special award") ||
        lower.startsWith("medali")
      ) {
        items.push({
          text: line,
          medalType: detectMedalType(line),
        });
      } else if (items.length === 0) {
        // Teks sebelum daftar kejuaraan dianggap sebagai kalimat pengantar
        introLines.push(line);
      } else {
        // Baris tambahan di bawah daftar
        items.push({
          text: line,
          medalType: detectMedalType(line),
        });
      }
    }
  }

  // Dianggap sebagai multi-prestasi jika memiliki minimal 2 item kejuaraan
  const hasItems = items.length >= 2;

  return {
    hasItems,
    introText: introLines.join("\n"),
    items: hasItems ? items : [],
    rawText: description,
  };
}
