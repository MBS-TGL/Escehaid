import { describe, expect, it } from "vitest";
import { EKSKUL_DAYS, EKSKUL_SLUG_ICONS, formatEkskulSchedule, slugifyEkskul } from "./ekskul-data";
import { PORTAL_ICONS } from "@/lib/portal-theme";

describe("formatEkskulSchedule", () => {
  it("gabungkan hari + jam + catatan", () => {
    expect(formatEkskulSchedule(6, "08:00:00", "khusus santri")).toBe("Sabtu, 08:00 · khusus santri");
  });

  it("tanpa catatan → hari + jam saja", () => {
    expect(formatEkskulSchedule(0, "09:00", "")).toBe("Minggu, 09:00");
  });

  it("jam dari Postgres berdetik → detik dipangkas dan selalu HH:MM", () => {
    expect(formatEkskulSchedule(3, "20:00:00")).toBe("Rabu, 20:00");
    expect(formatEkskulSchedule(3, "8:30:00")).toBe("Rabu, 08:30");
    expect(formatEkskulSchedule(3, " 9:05:00 ")).toBe("Rabu, 09:05");
  });

  it("hanya hari / hanya catatan", () => {
    expect(formatEkskulSchedule(2, null)).toBe("Selasa");
    expect(formatEkskulSchedule(null, null, "setiap pekan ganjil")).toBe("setiap pekan ganjil");
  });

  it("semuanya kosong → string kosong (baris jadwal kartu disembunyikan)", () => {
    expect(formatEkskulSchedule(null, null, null)).toBe("");
    expect(formatEkskulSchedule(null, "")).toBe("");
  });

  it("hari di luar 0-6 diabaikan", () => {
    expect(formatEkskulSchedule(7 as unknown as number, "08:00")).toBe("08:00");
    expect(formatEkskulSchedule(-1 as unknown as number, "08:00")).toBe("08:00");
  });

  it("nama hari konsisten dengan indeks kolom schedule_day", () => {
    expect(EKSKUL_DAYS[0]).toBe("Minggu");
    expect(EKSKUL_DAYS[6]).toBe("Sabtu");
  });
});

describe("slugifyEkskul", () => {
  it("konversi nama ekskul ke slug URL", () => {
    expect(slugifyEkskul("Hizbul Wathan")).toBe("hizbul-wathan");
    expect(slugifyEkskul("Bulu Tangkis")).toBe("bulu-tangkis");
  });

  it("buang karakter non-alfanumerik dan dash beruntun", () => {
    expect(slugifyEkskul("Karate -- & Self Defense!")).toBe("karate-self-defense");
    expect(slugifyEkskul("  *** ")).toBe("");
  });

  it("angka dan huruf kecil dipertahankan", () => {
    expect(slugifyEkskul("Pramuka Tuna Disabilitas 2024")).toBe("pramuka-tuna-disabilitas-2024");
  });
});

describe("registry ikon & slug legacy", () => {
  it("setiap baris seed terpetakan ikon (kolom icon kosong pun tetap berikon)", () => {
    for (const slug of ["hizbul-wathan", "bulu-tangkis", "sepak-bola", "panahan", "futsal", "qiroah"]) {
      expect(EKSKUL_SLUG_ICONS[slug], slug).toBeTruthy();
    }
  });

  it("kunci ikon legacy (nilai kolom icon baris seed) dikenali registry resolver", () => {
    // Nilai-nilai ini dipakai EkskulGlyph: kunci legacy → EKSKUL_ICONS
    // (map privat di komponen), kunci PascalCase → PORTAL_ICONS.
    const legacyKeys = ["soccer", "pingpong", "tent", "target", "microphone", "trophy"];
    expect(new Set(Object.values(EKSKUL_SLUG_ICONS)).isSubsetOf(new Set(legacyKeys))).toBe(true);
    // Ikon picker = registry penuh portal (PascalCase) + tile otomatis "".
    expect(Object.keys(PORTAL_ICONS).length).toBeGreaterThan(100);
    expect(legacyKeys.every((k) => !(k in PORTAL_ICONS))).toBe(true);
  });
});
