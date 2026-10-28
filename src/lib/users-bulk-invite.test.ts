import { describe, it, expect } from "vitest";
import { isValidEmail, parseBulkInviteCsv } from "@/lib/users-bulk-invite";

describe("isValidEmail", () => {
  it("menerima email wajar", () => {
    expect(isValidEmail("guru@sekolah.sch.id")).toBe(true);
  });
  it("menolak input rusak", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("tanpa-at")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a b@c.id")).toBe(false);
  });
});

describe("parseBulkInviteCsv", () => {
  it("membaca header Indonesia & pemisah ;", () => {
    const res = parseBulkInviteCsv("Nama;Email;Peran\nSiti;siti@sekolah.id;OPERATOR_KONTEN");
    expect(res.issues).toEqual([]);
    expect(res.rows).toEqual([
      { line: 2, fullName: "Siti", email: "siti@sekolah.id", roleKey: "OPERATOR_KONTEN" },
    ]);
  });

  it("menerima header Inggris, koma, dan label peran", () => {
    const res = parseBulkInviteCsv('name,email,role\n"Siti, S.Pd",siti@sekolah.id,Admin Sekolah');
    expect(res.issues).toEqual([]);
    expect(res.rows[0]).toMatchObject({ fullName: "Siti, S.Pd", roleKey: "ADMIN_SEKOLAH" });
  });

  it("mengabaikan BOM dan baris kosong", () => {
    const res = parseBulkInviteCsv("\uFEFFNama,Email,Peran\n\nA,a@x.id,OPERATOR_KONTEN\n");
    expect(res.issues).toEqual([]);
    expect(res.rows).toHaveLength(1);
  });

  it("melaporkan header tidak lengkap", () => {
    const res = parseBulkInviteCsv("Nama,Email\nA,a@x.id");
    expect(res.rows).toEqual([]);
    expect(res.issues[0].message).toContain("Header");
  });

  it("mengumpulkan error per baris tanpa menghentikan baris valid", () => {
    const res = parseBulkInviteCsv(
      "Nama,Email,Peran\nA,a@x.id,OPERATOR_KONTEN\n,b@x.id,SUPER_ADMIN\nC,bukan-email,ADMIN_SEKOLAH\nD,d@x.id,ROLE_ASING"
    );
    expect(res.rows).toHaveLength(1);
    expect(res.issues.map((i) => i.line)).toEqual([3, 4, 5]);
  });

  it("menandai email duplikat di dalam file", () => {
    const res = parseBulkInviteCsv(
      "Nama,Email,Peran\nA,a@x.id,OPERATOR_KONTEN\nB,a@x.id,ADMIN_SEKOLAH"
    );
    expect(res.rows).toHaveLength(1);
    expect(res.duplicates).toBe(1);
    expect(res.issues[0].message).toContain("duplikat");
  });

  it("mendukung newline di dalam sel ber-kutip", () => {
    const res = parseBulkInviteCsv('Nama,Email,Peran\n"Siti\nAminah",s@x.id,OPERATOR_KONTEN');
    expect(res.rows[0].fullName).toBe("Siti\nAminah");
  });
});
