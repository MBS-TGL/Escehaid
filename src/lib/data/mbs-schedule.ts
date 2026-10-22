/**
 * Transkripsi agenda kegiatan harian MBS — data statis bertipe,
 * disiapkan agar mudah dipindahkan ke database (tiap slot punya id stabil).
 *
 * Sumber: dokumen "AGENDA KEGIATAN HARIAN MBS" (transkripsi manual).
 * Catatan ejaan dipusatkan di FILE ini agar mudah diubah sekaligus:
 *  - "Shalat" (bukan "Sholat")
 *  - "Tahfidz" (bukan "TAHFDIZ")
 *  - "Wafa – BTA" memakai en-dash sesuai dokumen
 *  - Item "Ekstra" ditulis apa adanya (singkatan dari ekstrakurikuler)
 *  - "Ahad" (bukan "Minggu")
 * Slot 21:00-03:00 melewati tengah malam — logika pembacaan waktu ada di
 * helper isSlotActiveNow (slot aktif bila hh < end ATAU hh >= start).
 */

export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Ahad"] as const;

export type Day = (typeof DAYS)[number];

/** Nama blok untuk 4 kartu ringkas; key dipisah dari urutan agar sering dipakai sebagai id. */
export type BlockKey = "dini-hari" | "pagi-siang" | "sore-maghrib" | "malam";

export interface SlotItem {
  label: string;
  /** Hari penyebut; bila kosong/undefined → setiap hari. */
  days?: Day[] | null;
}

export interface Slot {
  id: string;
  /** "HH:MM" WIB */
  start: string;
  /** "HH:MM" WIB; bila lebih kecil dari start → slot melewati tengah malam. */
  end: string;
  block: BlockKey;
  items: SlotItem[];
}

/** Urutan item slot = urutan dalam dokumen sumber. */
export const SLOTS: Slot[] = [
  {
    id: "dini-1",
    start: "03:00",
    end: "05:30",
    block: "dini-hari",
    items: [
      { label: "Sahur", days: ["Senin", "Kamis"] },
      { label: "Qiyamul Lail" },
      { label: "Shalat Subuh" },
      { label: "Ngaji" },
      { label: "Kultum" },
    ],
  },
  {
    id: "dini-2",
    start: "05:30",
    end: "06:30",
    block: "dini-hari",
    items: [{ label: "Olahraga" }, { label: "Piket Pagi" }],
  },
  { id: "psm-1", start: "06:30", end: "07:00", block: "pagi-siang", items: [{ label: "Giat Mandiri" }] },
  { id: "psm-2", start: "07:00", end: "07:30", block: "pagi-siang", items: [{ label: "Shalat Dhuha" }] },
  {
    id: "psm-3",
    start: "07:30",
    end: "08:10",
    block: "pagi-siang",
    items: [
      { label: "Wafa – BTA", days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"] },
      { label: "Ekstra", days: ["Sabtu", "Ahad"] },
    ],
  },
  {
    id: "psm-4",
    start: "08:10",
    end: "11:45",
    block: "pagi-siang",
    items: [
      { label: "KBM", days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"] },
      { label: "Ekstra", days: ["Sabtu", "Ahad"] },
    ],
  },
  {
    id: "psm-5",
    start: "11:45",
    end: "12:45",
    block: "pagi-siang",
    items: [{ label: "Shalat Dzuhur" }, { label: "Ngaji" }],
  },
  {
    id: "psm-6",
    start: "12:45",
    end: "14:05",
    block: "pagi-siang",
    items: [
      { label: "KBM", days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"] },
      { label: "Ekstra", days: ["Sabtu", "Ahad"] },
    ],
  },
  {
    id: "psm-7",
    start: "14:05",
    end: "14:45",
    block: "pagi-siang",
    items: [
      { label: "Tahfidz", days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"] },
      { label: "Ekstra", days: ["Sabtu", "Ahad"] },
    ],
  },
  {
    id: "sm-1",
    start: "14:45",
    end: "15:30",
    block: "sore-maghrib",
    items: [{ label: "Shalat Ashar" }, { label: "Ngaji" }],
  },
  { id: "sm-2", start: "15:30", end: "16:45", block: "sore-maghrib", items: [{ label: "Giat Mandiri" }] },
  {
    id: "sm-3",
    start: "16:45",
    end: "19:00",
    block: "sore-maghrib",
    items: [
      { label: "Kajian Ifthor", days: ["Senin", "Kamis"] },
      { label: "Hadis Arba'in", days: ["Selasa", "Rabu", "Sabtu"] },
      { label: "Al-Kahfi", days: ["Jumat"] },
      { label: "Ngaji Juz 30", days: ["Ahad"] },
      { label: "Shalat Maghrib" },
      { label: "Makan Malam" },
    ],
  },
  {
    id: "mlm-1",
    start: "19:00",
    end: "21:00",
    block: "malam",
    items: [
      { label: "Shalat Isya'" },
      { label: "Tahfidz", days: ["Senin", "Selasa", "Rabu", "Kamis", "Ahad"] },
      { label: "Muhadharah", days: ["Jumat"] },
      { label: "Muhadatsah", days: ["Sabtu"] },
      {
        label: "Mufrodat",
        days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Ahad"],
      },
      { label: "Belajar Malam", days: ["Senin", "Rabu", "Kamis", "Ahad"] },
      { label: "Qori'", days: ["Selasa"] },
    ],
  },
  {
    id: "mlm-2",
    start: "21:00",
    end: "03:00",
    block: "malam",
    items: [{ label: "Tahajjud" }, { label: "Istirahat" }],
  },
];

/** Ringkasan 4 blok untuk kartu harian (teks memakai data slot di atas, tanpa tuntutan hasil). */
export interface BlockSummary {
  key: BlockKey;
  buttonText: string;
  start: string;
  end: string;
  timeLabel: string;
  title: string;
  summary: string;
}

export const BLOCKS: BlockSummary[] = [
  {
    key: "dini-hari",
    buttonText: "Dini Hari & Subuh",
    start: "03:00",
    end: "06:30",
    timeLabel: "03.00-06.30 WIB",
    title: "Dini Hari & Subuh",
    summary:
      "Qiyamul lail, shalat Subuh, ngaji, dan kultum; dilanjutkan olahraga dan piket pagi. Senin dan Kamis diawali sahur.",
  },
  {
    key: "pagi-siang",
    buttonText: "Pagi & Siang",
    start: "06:30",
    end: "14:45",
    timeLabel: "06.30-14.45 WIB",
    title: "Pagi & Siang",
    summary:
      "Giat mandiri, shalat Dhuha, Wafa – BTA, KBM, shalat Dzuhur dan ngaji, lalu tahfidz. Sabtu dan Ahad diisi kegiatan ekstra.",
  },
  {
    key: "sore-maghrib",
    buttonText: "Sore & Maghrib",
    start: "14:45",
    end: "19:00",
    timeLabel: "14.45-19.00 WIB",
    title: "Sore & Maghrib",
    summary: "Shalat Ashar dan ngaji, giat mandiri, kajian sore, shalat Maghrib, dan makan malam.",
  },
  {
    key: "malam",
    buttonText: "Malam & Istirahat",
    start: "19:00",
    end: "03:00",
    timeLabel: "19.00-03.00 WIB",
    title: "Malam & Istirahat",
    summary:
      "Shalat Isya', tahfidz, mufrodat, belajar malam, lalu tahajjud dan istirahat.",
  },
];

// ============ HELPER MURNI (unit-tested) ============

/** "HH:MM" -> menit sejak tengah malam. */
export function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Slot yang melintasi tengah malam (end < start, mis. 21:00-03:00). */
export function isSlotCrossingMidnight(slot: Slot): boolean {
  return parseMinutes(slot.end) <= parseMinutes(slot.start);
}

/**
 * Apakah slot aktif pada jam "HH:MM" WIB.
 * Batas: inklusif di start, eksklusif di end — beginilah pada 05:30
 * tepat jatuh ke slot berikutnya (03:00-05:30 lalu 05:30-06:30).
 * Slot lintas tengah malam aktif bila cur >= start ATAU cur < end.
 */
export function isSlotActiveNow(slot: Slot, time: string): boolean {
  const s = parseMinutes(slot.start);
  const e = parseMinutes(slot.end);
  const cur = parseMinutes(time);
  if (s === e) return false; // durasi nol (tidak dipakai dalam data, guard)
  if (s < e) return cur >= s && cur < e;
  return cur >= s || cur < e; // slot melintasi tengah malam
}

/** Format jam slot: 19:00-03:00 -> "19.00-03.00" (titik pemisah, sesuai format dokumen). */
export function formatSlotTime(slot: Slot): string {
  const fmt = (t: string) => t.replace(":", ".");
  return `${fmt(slot.start)}-${fmt(slot.end)}`;
}

/**
 * Hari ini versi WIB (Asia/Jakarta) = index dari DAYS (Senin=0 .. Ahad=6).
 * Memakai Intl weekday (en-US) Supaya aman lintas runtime/Node.
 */
export function dayIndexNowJakarta(now: Date = new Date()): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    hour12: false,
  }).format(now);
  switch (weekday) {
    case "Mon": return 0;
    case "Tue": return 1;
    case "Wed": return 2;
    case "Thu": return 3;
    case "Fri": return 4;
    case "Sat": return 5;
    case "Sun": return 6;
    default: return 0;
  }
}

/** "HH:MM" sekarang di WIB (Asia/Jakarta), 24 jam. Locale en-GB: pemisah ":" stabil (id-ID memakai "."). */
export function timeNowJakarta(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

/** Item-item slot yang berlaku pada hari tertentu (memperhatikan days/null = tiap hari). */
export function itemsForDay(slot: Slot, day: Day): SlotItem[] {
  return slot.items.filter((item) => !item.days || item.days.includes(day));
}

/** Semua slot berurutan yang punya minimal 1 item aktif pada hari itu. */
export function slotsForDay(slots: Slot[], day: Day): Slot[] {
  return slots.filter((slot) => itemsForDay(slot, day).length > 0);
}

/**
 * Slot yang SEDANG berjalan sekarang (WIB).
 * Slot lintas tengah malam (21:00-03:00) memakai aturan yang sama dengan helper
 * isSlotActiveNow: aktif bila jam >= start ATAU jam < end — pemilik slot adalah
 * "hari kemarin" dilihat dari tanggal, tapi slot-nya unik dalam data sehingga
 * cukup dikembalikan begitu saja (tidak pernah bentuk/overlap antar slot).
 */
export function activeSlotNowJakarta(
  slots: Slot[],
  now: Date = new Date()
): { slot: Slot | null; time: string; dayIndex: number } {
  const time = timeNowJakarta(now);
  const dayIndex = dayIndexNowJakarta(now);
  const found = slots.find((slot) => isSlotActiveNow(slot, time)) ?? null;
  return { slot: found, time, dayIndex };
}

/**
 * Kolom hari pemilik slot yang sedang berjalan (dipakai tanda badge tabel sepekan):
 * - slot normal atau jam >= start -> hari ini;
 * - slot lintas tengah malam dengan jam subuh (cur < end) -> dipegang hari kemarin
 *   (slot "kemarin 21:00" yang belum selesai), jadi badge menandai kolom kemarin.
 */
export function slotOwnerDayIndex(slot: Slot, time: string, todayIndex: number): number {
  const cur = parseMinutes(time);
  if (isSlotCrossingMidnight(slot) && cur < parseMinutes(slot.end)) {
    return (todayIndex + DAYS.length - 1) % DAYS.length;
  }
  return todayIndex;
}

// ============ EDITOR /admin/program: format teks (DSL) per slot =============

/**
 * Teks editor untuk daftar item slot — satu item per baris; hari opsional
 * setelah pemisah "|": `Label` (setiap hari) atau `Label | Senin,Kamis`.
 * Menerima entitas jsonb apa pun yang berlabel/hari (tipe longgar).
 */
export function slotItemsToText(
  items: readonly { label: string; days?: readonly string[] | null }[]
): string {
  return items
    .map((item) =>
      item.days && item.days.length ? `${item.label} | ${item.days.join(",")}` : item.label
    )
    .join("\n");
}

export interface SlotItemsParseResult {
  list: SlotItem[];
  /** Masalah per baris (1-based) — label kosong / hari tak dikenal. */
  errors: { line: number; message: string }[];
}

/** Parser untuk `slotItemsToText` — baris kosong dilewati, urutan dipertahankan. */
export function parseSlotItemsText(text: string): SlotItemsParseResult {
  const list: SlotItem[] = [];
  const errors: SlotItemsParseResult["errors"] = [];
  const daySet: ReadonlySet<string> = new Set(DAYS);
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const sep = trimmed.indexOf("|");
    const label = (sep === -1 ? trimmed : trimmed.slice(0, sep)).trim();
    if (!label) {
      errors.push({ line, message: `Baris ${line}: label kosong` });
      return;
    }
    if (sep === -1) {
      list.push({ label });
      return;
    }
    const tokens = trimmed
      .slice(sep + 1)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (!tokens.length) {
      errors.push({ line, message: `Baris ${line}: daftar hari kosong sesudah "|"` });
      return;
    }
    const bad = tokens.filter((t) => !daySet.has(t));
    if (bad.length) {
      errors.push({
        line,
        message: `Baris ${line}: hari "${bad.join(", ")}" tidak dikenal (Senin..Ahad)`,
      });
      return;
    }
    list.push({ label, days: tokens as Day[] });
  });
  return { list, errors };
}

/** Catatan review (TIDAK dirender di UI). */
export const REVIEW_NOTES: string[] = [
  "Jumat: apakah ada Shalat Jumat (dokumen menulis Shalat Dzuhur + KBM normal)?",
  "Slot 21:00-03:00 menyebut Tahajjud + Istirahat sementara 03:00 sudah Qiyamul Lail; konfirmasi urutan/waktu.",
  "\"Ngaji\": mengaji Al-Qur'an, kitab, atau keduanya?",
  "Sahur Senin/Kamis & Kajian Ifthor: kemungkinan puasa sunnah Senin-Kamis; konfirmasi sebelum ditulis eksplisit.",
  "Konfirmasi ejaan: Ifthor, Muhadharah, Muhadatsah, Qori', Al-Kahfi.",
  "Singkatan \"Ekstra\".",
];
