import { describe, it, expect } from "vitest";
import { fillSpmbTemplate, spmbWhatsappHref } from "./spmb-message";

describe("fillSpmbTemplate", () => {
  it("mengganti semua placeholder dengan nilai yang diberikan", () => {
    const body = "Halo {nama}, gelombang {gelombang}. NISN: {nisn}.";
    expect(fillSpmbTemplate(body, { nama: "Ahmad", gelombang: "Gelombang 1", nisn: "0012345678" })).toBe(
      "Halo Ahmad, gelombang Gelombang 1. NISN: 0012345678."
    );
  });

  it("placeholder tanpa nilai menjadi '-' (tidak menyisakan kurung kurawal)", () => {
    expect(fillSpmbTemplate("Halo {nama} ({nisn})", {})).toBe("Halo - (-)");
    expect(fillSpmbTemplate("Halo {nama}", { nama: "   " })).toBe("Halo -");
  });

  it("teks tanpa placeholder tidak berubah", () => {
    expect(fillSpmbTemplate("Tanpa placeholder", { nama: "X" })).toBe("Tanpa placeholder");
  });
});

describe("spmbWhatsappHref", () => {
  it("nomor 08… dinormalisasi ke 62… dan pesan di-encode", () => {
    const href = spmbWhatsappHref("0858-0673-8160", "Halo Ahmad, apa kabar?");
    expect(href).toBe(`https://wa.me/6285806738160?text=${encodeURIComponent("Halo Ahmad, apa kabar?")}`);
  });

  it("nomor kosong/null → null", () => {
    expect(spmbWhatsappHref("", "pesan")).toBeNull();
    expect(spmbWhatsappHref(null, "pesan")).toBeNull();
    expect(spmbWhatsappHref(undefined, "pesan")).toBeNull();
  });
});
