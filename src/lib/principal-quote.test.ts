import { describe, it, expect } from "vitest";
import { detectPrincipalGreeting } from "./principal-quote";

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
