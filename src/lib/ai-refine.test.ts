import { describe, it, expect } from "vitest";
import {
  aiPermissionsFor,
  isImportTarget,
  normalizeRefinedFor,
  permissionModuleForTarget,
} from "@/lib/ai-refine";
import { retryAfterMs } from "@/lib/gemini";
import { ACTIVITY_TYPE_KEYS } from "@/lib/gemini";

describe("ai-refine: pemetaan target & izin", () => {
  it("isImportTarget menolak selain 4 target valid", () => {
    expect(isImportTarget("news")).toBe(true);
    expect(isImportTarget("articles")).toBe(true);
    expect(isImportTarget("activities")).toBe(true);
    expect(isImportTarget("announcements")).toBe(true);
    expect(isImportTarget("telegram")).toBe(false);
    expect(isImportTarget(123)).toBe(false);
    expect(isImportTarget(undefined)).toBe(false);
  });

  it("tiap target dipetakan ke key modul RBAC yang ada di registry", () => {
    expect(permissionModuleForTarget("news")).toBe("berita");
    expect(permissionModuleForTarget("articles")).toBe("artikel");
    expect(permissionModuleForTarget("activities")).toBe("kegiatan");
    expect(permissionModuleForTarget("announcements")).toBe("pengumuman");
  });

  it("aiPermissionsFor mengembalikan create + update modul tujuan", () => {
    expect(aiPermissionsFor("news")).toEqual(["berita:create", "berita:update"]);
    expect(aiPermissionsFor("activities")).toEqual(["kegiatan:create", "kegiatan:update"]);
  });
});

describe("ai-refine: normalisasi hasil AI per target", () => {
  it("news: kategori valid dipertahankan, tidak valid → 'berita'", () => {
    const d = normalizeRefinedFor("news", {
      title: " Judul ",
      summary: " Ringkasan ",
      content: "<p>isi</p>",
      category: "agenda",
    });
    expect(d.category).toBe("agenda");
    expect(d.title).toBe("Judul");
    expect(d.summary).toBe("Ringkasan");

    const fall = normalizeRefinedFor("news", { title: "t", summary: "s", content: "c", category: "seminar" });
    expect(fall.category).toBe("berita");
  });

  it("articles: kategori bebas (di-trim, tanpa validasi enum)", () => {
    const d = normalizeRefinedFor("articles", {
      title: "t",
      summary: "s",
      content: "c",
      category: " Tips & Edukasi, olahraga ",
    });
    expect(d.category).toBe("Tips & Edukasi");
  });

  it("activities: tipe valid dipertahankan; tak valid → 'umum'; tanggal wajib YYYY-MM-DD", () => {
    const ok = normalizeRefinedFor("activities", {
      title: "t",
      summary: "s",
      content: "c",
      activity_type: "lomba",
      location: " Aula ",
      activity_date: "2026-10-17",
    });
    expect(ok.activity_type).toBe("lomba");
    expect(ok.location).toBe("Aula");
    expect(ok.activity_date).toBe("2026-10-17");

    const bad = normalizeRefinedFor("activities", {
      title: "t",
      summary: "s",
      content: "c",
      activity_type: "seminar",
      activity_date: "17 Oktober",
    });
    expect(bad.activity_type).toBe("umum");
    expect(bad.activity_date).toBe("");
  });

  it("activities: pilihan tipe selalu key ACTIVITY_TYPES yang sah", () => {
    for (const t of ["kajian", "peringatan", "lomba", "upacara", "ekskul", "penampilan"]) {
      expect(ACTIVITY_TYPE_KEYS).toContain(t);
    }
  });

  it("announcements: hanya field announcement yang dikembalikan", () => {
    const d = normalizeRefinedFor("announcements", {
      title: "t",
      summary: "s",
      content: "c",
      announcement: " SPMB dibuka! ",
    });
    expect(d.announcement).toBe("SPMB dibuka!");
    expect(d.title).toBeUndefined();
    expect(d.content).toBeUndefined();
  });
});

describe("gemini: parse header Retry-After", () => {
  it("detik bulat & pecahan → milidetik", () => {
    expect(retryAfterMs("2")).toBe(2000);
    expect(retryAfterMs("0.6")).toBe(600);
    expect(retryAfterMs(" 1 ")).toBe(1000);
  });

  it("nilai tidak wajar / format date-string → 0", () => {
    expect(retryAfterMs(null)).toBe(0);
    expect(retryAfterMs("")).toBe(0);
    expect(retryAfterMs("Wed, 17 Oct 2026 09:00:00 GMT")).toBe(0);
    expect(retryAfterMs("-3")).toBe(0);
    expect(retryAfterMs("999")).toBe(0);
  });
});
