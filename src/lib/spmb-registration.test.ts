import { describe, expect, it } from "vitest";
import {
  mergeSpmbDocuments,
  spmbIsoToDatePicker,
  spmbRegistrationToFormData,
  type SpmbRegistrationRowLike,
} from "./spmb-registration";

function makeRow(overrides: Partial<SpmbRegistrationRowLike> = {}): SpmbRegistrationRowLike {
  return {
    full_name: "Budi Santoso",
    birth_place: "Jember",
    birth_date: "2012-03-04",
    gender: "L",
    address: "Jl. Kenanga No. 1",
    phone: "081234567890",
    email: "budi@example.com",
    parent_name: "Ahmad Santoso / Siti Aminah",
    previous_school: "SDN Tanggul 1",
    documents: null,
    ...overrides,
  };
}

describe("spmbIsoToDatePicker", () => {
  it("mengonversi ISO yyyy-mm-dd ke dd/mm/yyyy", () => {
    expect(spmbIsoToDatePicker("2012-03-04")).toBe("04/03/2012");
  });
  it("memotong bagian waktu ISO (datetime) juga", () => {
    expect(spmbIsoToDatePicker("2012-03-04T10:00:00Z")).toBe("04/03/2012");
  });
  it("mengembalikan string kosong untuk null/tidak valid", () => {
    expect(spmbIsoToDatePicker(null)).toBe("");
    expect(spmbIsoToDatePicker(undefined)).toBe("");
    expect(spmbIsoToDatePicker("")).toBe("");
    expect(spmbIsoToDatePicker("bukan-tanggal")).toBe("");
  });
});

describe("spmbRegistrationToFormData", () => {
  it("menghidrasi field utama dari kolom tabel", () => {
    const h = spmbRegistrationToFormData(makeRow());
    expect(h.data.full_name).toBe("Budi Santoso");
    expect(h.data.birth_place).toBe("Jember");
    expect(h.data.birth_date).toBe("04/03/2012");
    expect(h.data.gender).toBe("L");
    expect(h.data.address).toBe("Jl. Kenanga No. 1");
    expect(h.data.phone).toBe("081234567890");
    expect(h.data.email).toBe("budi@example.com");
    expect(h.data.previous_school).toBe("SDN Tanggul 1");
  });

  it("birth_date null → kosong; gender selain P → L", () => {
    const h = spmbRegistrationToFormData(makeRow({ birth_date: null, gender: "X" }));
    expect(h.data.birth_date).toBe("");
    expect(h.data.gender).toBe("L");
    expect(spmbRegistrationToFormData(makeRow({ gender: "P" })).data.gender).toBe("P");
  });

  it("membelah parent_name 'A / B' ke ayah + ibu (split pada pemisah pertama)", () => {
    const h = spmbRegistrationToFormData(makeRow());
    expect(h.data.father_name).toBe("Ahmad Santoso");
    expect(h.data.mother_name).toBe("Siti Aminah");

    // Ibu mengandung " / " sendiri → tetap utuh setelah pemisah pertama.
    const withSlash = spmbRegistrationToFormData(
      makeRow({ parent_name: "Ayah / Ibu / Penuh" })
    );
    expect(withSlash.data.father_name).toBe("Ayah");
    expect(withSlash.data.mother_name).toBe("Ibu / Penuh");
  });

  it("parent_name tanpa pemisah → ayah = seluruh teks, ibu kosong (fallback jsonb bila ada)", () => {
    const h = spmbRegistrationToFormData(makeRow({ parent_name: "Hanya Satu Nama" }));
    expect(h.data.father_name).toBe("Hanya Satu Nama");
    expect(h.data.mother_name).toBe("");

    const fromJson = spmbRegistrationToFormData(
      makeRow({
        parent_name: "Hanya Satu Nama",
        documents: { mother_name: "Ibu Dari Jsonb" },
      })
    );
    expect(fromJson.data.mother_name).toBe("Ibu Dari Jsonb");
  });

  it("membaca field tambahan (nisn, nik, program, data orang tua) dari jsonb documents", () => {
    const h = spmbRegistrationToFormData(
      makeRow({
        documents: {
          nisn: "0012345678",
          nik: "3517010404120001",
          program: "Prestasi",
          father_job: "Wiraswasta",
          father_income: "3500000",
          mother_education: "S1",
          blood_type: "O",
        },
      })
    );
    expect(h.data.nisn).toBe("0012345678");
    expect(h.data.nik).toBe("3517010404120001");
    expect(h.data.program).toBe("Prestasi");
    expect(h.data.father_job).toBe("Wiraswasta");
    expect(h.data.father_income).toBe("3500000");
    expect(h.data.mother_education).toBe("S1");
    expect(h.data.blood_type).toBe("O");
  });

  it("orphan_status tidak dikenal / kosong → fallback 'tidak'", () => {
    expect(
      spmbRegistrationToFormData(makeRow({ documents: { orphan_status: "ya" } }))
        .data.orphan_status
    ).toBe("tidak");
    expect(spmbRegistrationToFormData(makeRow()).data.orphan_status).toBe("tidak");
    expect(
      spmbRegistrationToFormData(makeRow({ documents: { orphan_status: "piatu" } }))
        .data.orphan_status
    ).toBe("piatu");
  });

  it("tanggal orang tua dinormalisasi dari ISO maupun dd/mm/yyyy jsonb", () => {
    const iso = spmbRegistrationToFormData(
      makeRow({ documents: { father_birth_date: "1980-07-15" } })
    );
    expect(iso.data.father_birth_date).toBe("15/07/1980");

    const dp = spmbRegistrationToFormData(
      makeRow({ documents: { mother_birth_date: "15/07/1980" } })
    );
    expect(dp.data.mother_birth_date).toBe("15/07/1980");
  });

  it("mengisi docPaths dari jsonb documents (keep-or-replace)", () => {
    const h = spmbRegistrationToFormData(
      makeRow({
        documents: {
          kk: "spmb-2026/x/kk.pdf",
          akta: null,
          bukti_transfer: "spmb-2026/x/transfer.png",
        },
      })
    );
    expect(h.docPaths.kk).toBe("spmb-2026/x/kk.pdf");
    expect(h.docPaths.akta).toBeNull();
    expect(h.docPaths.surat_sekolah).toBeNull();
    expect(h.docPaths.bukti_transfer).toBe("spmb-2026/x/transfer.png");
    expect(h.docPaths.ktp_ortu).toBeNull();
  });

  it("menghidrasi SEMUA kunci cf_* (termasuk pertanyaan non-aktif), nilai non-string diabaikan", () => {
    const h = spmbRegistrationToFormData(
      makeRow({
        documents: {
          cf_a1: "Jawaban A",
          cf_x1: "  ",
          cf_ignored: 42 as unknown as string,
        },
      })
    );
    expect(h.custom).toEqual({ cf_a1: "Jawaban A" });
  });

  it("documents null → form kosong dengan default aman", () => {
    const h = spmbRegistrationToFormData(makeRow({ documents: null }));
    expect(h.custom).toEqual({});
    expect(h.docPaths).toEqual({
      kk: null, akta: null, surat_sekolah: null, ktp_ortu: null, bukti_transfer: null,
    });
    expect(h.data.full_name).toBe("Budi Santoso");
  });
});

describe("mergeSpmbDocuments", () => {
  const old: Record<string, string | null> = {
    kk: "old/kk.pdf",
    akta: "old/akta.pdf",
    cf_x: "jawaban lama",
    input_source: "public",
  };

  it("kunci yang tidak disertakan dipertahankan (keep-or-replace)", () => {
    const out = mergeSpmbDocuments(old, { nickname: "Budi" });
    expect(out.kk).toBe("old/kk.pdf");
    expect(out.akta).toBe("old/akta.pdf");
    expect(out.cf_x).toBe("jawaban lama");
    expect(out.input_source).toBe("public");
    expect(out.nickname).toBe("Budi");
  });

  it("nilai baru MENIMPA kunci lama", () => {
    const out = mergeSpmbDocuments(old, { kk: "new/kk.pdf" });
    expect(out.kk).toBe("new/kk.pdf");
    expect(out.akta).toBe("old/akta.pdf");
  });

  it("kunci asing (cf_* non-aktif, input_source) selamat saat kunci lain ditimpa", () => {
    const out = mergeSpmbDocuments(old, { program: "Prestasi", cf_x: "jawaban baru" });
    expect(out.cf_x).toBe("jawaban baru");
    expect(out.input_source).toBe("public");
    expect(out.program).toBe("Prestasi");
  });

  it("documents lama null/undefined → hasil = payload baru", () => {
    expect(mergeSpmbDocuments(null, { kk: "new/kk.pdf" })).toEqual({ kk: "new/kk.pdf" });
    expect(mergeSpmbDocuments(undefined, {})).toEqual({});
  });

  it("payload baru kosong → salinan setara documents lama (bukan referensi sama)", () => {
    const out = mergeSpmbDocuments(old, {});
    expect(out).toEqual(old);
    expect(out).not.toBe(old);
  });

  it("CONTRAKT: null eksplisit di payload MENIMPA (pemanggil wajib menghilangkan kunci, bukan null)", () => {
    const out = mergeSpmbDocuments(old, { kk: null });
    expect(out.kk).toBeNull();
  });
});
