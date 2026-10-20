import { describe, it, expect } from "vitest";
import { detectPrincipalGreeting, keepTogether } from "./principal-quote";

describe("detectPrincipalGreeting", () => {
  it("kutipan polos: tidak ada salam", () => {
    const r = detectPrincipalGreeting("Selamat datang di SMP Muhammadiyah 4 Tanggul.");
    expect(r.startsWithGreeting).toBe(false);
    expect(r.endsWithGreeting).toBe(false);
  });

  it("salam pembuka standar terdeteksi", () => {
    const r = detectPrincipalGreeting("Assalamu'alaikum Warahmatullahi Wabarakatuh. Selamat datang.");
    expect(r.startsWithGreeting).toBe(true);
    expect(r.endsWithGreeting).toBe(false);
  });

  it("salam pembuka dengan kutip di depan terdeteksi", () => {
    const r = detectPrincipalGreeting("\u201cAssalamu'alaikum Warahmatullahi Wabarakatuh.\u201d Selamat datang.");
    expect(r.startsWithGreeting).toBe(true);
  });

  it("salam pembuka dengan Bismillah terdeteksi", () => {
    const r = detectPrincipalGreeting("Bismillahirrahmanirrahim, Assalamu'alaikum Warahmatullahi Wabarakatuh.");
    expect(r.startsWithGreeting).toBe(true);
  });

  it("kalimat lain sebelum assalamu bukan pembuka salam", () => {
    const r = detectPrincipalGreeting("Kepada seluruh peserta didik, assalamu'alaikum.");
    expect(r.startsWithGreeting).toBe(false);
  });

  it("salam penutup pada 100 karakter terakhir terdeteksi", () => {
    const r = detectPrincipalGreeting("Selamat datang. Wassalamu'alaikum Warahmatullahi Wabarakatuh.");
    expect(r.endsWithGreeting).toBe(true);
  });

  it("salam penutup di luar 100 karakter terakhir tidak dianggap penutup", () => {
    const filler = "Keluarga besar sekolah menyapa dengan penuh kehangatan dan semangat untuk mendidik generasi penuh keberanian. ";
    const quote = `Wassalamu'alaikum Warahmatullahi Wabarakatuh. ${filler.repeat(2)}`;
    const r = detectPrincipalGreeting(quote);
    expect(r.endsWithGreeting).toBe(false);
  });
});

describe("keepTogether", () => {
  it("angka di tengah nama sekolah tidak terpecah", () => {
    expect(keepTogether("SMP Muhammadiyah 4 Tanggul")).toBe("SMP Muhammadiyah\u00a04\u00a0Tanggul");
  });

  it("teks tanpa angka tidak berubah", () => {
    const t = "Kami berkomitmen mencerdaskan kehidupan bangsa melalui pendidikan berkualitas.";
    expect(keepTogether(t)).toBe(t);
  });

  it("angka di awal dan akhir kalimat tetap menyatu", () => {
    expect(keepTogether("4 juz sejak usia dini, tandanya latihan sejak kelas 7")).toBe(
      "4\u00a0juz sejak usia dini, tandanya latihan sejak kelas\u00a07"
    );
  });

  it("angka bertitik/koma ikut disempelkan", () => {
    expect(keepTogether("Lebih dari 1.500 siswa dan 4,5 poin")).toBe(
      "Lebih dari\u00a01.500\u00a0siswa dan\u00a04,5\u00a0poin"
    );
  });
});
