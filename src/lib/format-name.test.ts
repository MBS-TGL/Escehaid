import { describe, it, expect } from "vitest";
import {
  normalizeName,
  normalizeSchool,
  normalizeParentName,
  normalizePhone,
  PARENT_NAME_SPLIT,
} from "./format-name";

describe("normalizeName", () => {
  it("kasus dasar Title Case", () => {
    expect(normalizeName("ahmad fauzi")).toBe("Ahmad Fauzi");
    expect(normalizeName("MUHAMMAD RIZKI")).toBe("Muhammad Rizki");
    expect(normalizeName("siti   azizah")).toBe("Siti Azizah");
    expect(normalizeName("  budi  ")).toBe("Budi");
    expect(normalizeName("aBdul")).toBe("Abdul");
  });

  it("apostrof bukan pemisah (NAFI'AH tidak menjadi Nafi'Ah)", () => {
    expect(normalizeName("NAFI'AH")).toBe("Nafi'ah");
    // Apostrof tipografis disamakan ke ' biasa.
    expect(normalizeName("NAFI\u2019AH")).toBe("Nafi'ah");
  });

  it("inisial dan titik tetap benar", () => {
    expect(normalizeName("M. AHZA VIRENDRA")).toBe("M. Ahza Virendra");
    expect(normalizeName("H. AHMAD, S.PD.I")).toBe("H. Ahmad, S.Pd.I");
  });

  it("tanda hubung menjadi batas kata", () => {
    expect(normalizeName("AL-FATIH")).toBe("Al-Fatih");
    expect(normalizeName("sitinjak-dalam")).toBe("Sitinjak-Dalam");
  });

  it("tanda kurung dan garis miring jadi batas", () => {
    expect(normalizeName("MUHAMMAD (FIRDAUS)")).toBe("Muhammad (Firdaus)");
    expect(normalizeName("SITI/QOMARIAH")).toBe("Siti/Qomariah");
  });

  it("aman terhadap null / kosong", () => {
    expect(normalizeName(null)).toBe("");
    expect(normalizeName(undefined)).toBe("");
    expect(normalizeName("")).toBe("");
    expect(normalizeName("   ")).toBe("");
  });

  it("spasi ganda dan baris baru dirapikan", () => {
    expect(normalizeName("budi\n\tsantoso")).toBe("Budi Santoso");
    expect(normalizeName("budi \u2018santoso\u2019")).toBe("Budi 'santoso'");
  });

  it("idempoten", () => {
    const samples = ["H. AHMAD, S.PD.I", "NAFI'AH", "M. AHZA VIRENDRA", "AL-FATIH", "Ahmad Fauzi", "SD", ""];
    for (const s of samples) {
      expect(normalizeName(normalizeName(s))).toBe(normalizeName(s));
    }
  });
});

describe("normalizeSchool", () => {
  it("singkatan kanonik tetap kapital", () => {
    expect(normalizeSchool("SD MUHAMMADIYAH 01 TANGGUL")).toBe("SD Muhammadiyah 01 Tanggul");
    expect(normalizeSchool("MTSN 2 JEMBER")).toBe("MTsN 2 Jember");
    expect(normalizeSchool("sdn 18 tanggul")).toBe("SDN 18 Tanggul");
    expect(normalizeSchool("MIM 04 tanggul")).toBe("MIM 04 Tanggul");
    expect(normalizeSchool("MI AL-FATIH")).toBe("MI Al-Fatih");
    expect(normalizeSchool("PAUD melati")).toBe("PAUD Melati");
  });

  it("idempoten", () => {
    const x = "SD MUHAMMADIYAH 01 TANGGUL";
    expect(normalizeSchool(normalizeSchool(x))).toBe(normalizeSchool(x));
    expect(normalizeSchool("")).toBe("");
  });
});

describe("normalizeParentName", () => {
  it("kedua nama ayah/ibu dinormalisasi, format ' / ' dipertahankan", () => {
    expect(normalizeParentName("BUDI SANTOSO / SITI AMINAH")).toBe("Budi Santoso / Siti Aminah");
    expect(normalizeParentName("Budi / SITI")).toBe("Budi / Siti");
  });

  it("hanya ayah: 'Budi / '", () => {
    expect(normalizeParentName("BUDI / ")).toBe("Budi / ");
  });

  it("hanya ibu: ' / Siti' — bagian kosong pertama tetap ada", () => {
    expect(normalizeParentName(" / SITI")).toBe(" / Siti");
    // Pembacaan admin split(" / ")[1] tetap dapat nama ibu.
    expect(normalizeParentName(" / SITI").split(PARENT_NAME_SPLIT)[1]).toBe("Siti");
  });

  it("tanpa pemisah — seluruh string dianggap satu nama", () => {
    expect(normalizeParentName("BUDI SANTOSO")).toBe("Budi Santoso");
  });

  it("kosong / null", () => {
    expect(normalizeParentName("")).toBe("");
    expect(normalizeParentName(null)).toBe("");
    expect(normalizeParentName("   ")).toBe("");
  });

  it("idempoten", () => {
    const samples = ["BUDI / SITI", "Budi / ", " / SITI", "BUDI", ""];
    for (const s of samples) {
      expect(normalizeParentName(normalizeParentName(s))).toBe(normalizeParentName(s));
    }
  });
});

describe("normalizePhone", () => {
  it("buang spasi dan tanda hubung, pertahankan awalan", () => {
    expect(normalizePhone("0853-1234 5678")).toBe("085312345678");
    expect(normalizePhone("+62 853-1234 5678")).toBe("+6285312345678");
    expect(normalizePhone("")).toBe("");
  });
});
