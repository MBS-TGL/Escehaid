import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createRateLimiter, clientIpFrom } from "./rate-limit";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("mengizinkan permintaan di bawah limit", () => {
    const limiter = createRateLimiter(3, 60_000);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("menolak setelah limit terlampaui dan memberi retryAfterSec", () => {
    const limiter = createRateLimiter(2, 60_000);
    limiter.check("a");
    limiter.check("a");
    const decision = limiter.check("a");
    expect(decision.allowed).toBe(false);
    // Sisa window saat check ke-3 adalah 60 detik penuh (momen window dibuat).
    expect(decision.retryAfterSec).toBe(60);
  });

  it("reset kembali setelah window berakhir", () => {
    const limiter = createRateLimiter(1, 60_000);
    limiter.check("a");
    expect(limiter.check("a").allowed).toBe(false);
    vi.advanceTimersByTime(60_001);
    const decision = limiter.check("a");
    expect(decision.allowed).toBe(true);
    expect(decision.retryAfterSec).toBe(60);
  });

  it("kunci berbeda tidak saling memengaruhi", () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("retryAfterSec mengecil saat window hampir berakhir", () => {
    const limiter = createRateLimiter(1, 60_000);
    limiter.check("a");
    vi.advanceTimersByTime(55_000);
    const decision = limiter.check("a");
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSec).toBeLessThanOrEqual(6);
    expect(decision.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it("entri kadaluarsa di-prune — memori tidak tumbuh tanpa batas", () => {
    // maxEntries rendah agar sweep (pembersih entri mati) benar-benar dipicu.
    const limiter = createRateLimiter(1, 1_000, { maxEntries: 100 });
    for (let i = 0; i < 150; i++) limiter.check(`ip-${i}`);
    expect(limiter.size()).toBe(100); // terikat ukuran, bukan 150
    vi.advanceTimersByTime(1_001);
    // Semua entri lama sudah mati → check baru menyapu mereka.
    limiter.check("baru");
    expect(limiter.size()).toBe(1);
  });

  it("ukuran entri terikat maxEntries (korban tertua dibuang, bukan yang aktif)", () => {
    const limiter = createRateLimiter(100, 60_000, { maxEntries: 3 });
    limiter.check("a");
    limiter.check("b");
    limiter.check("c");
    // d memicu pembatasan kapasitas: entri tertua (a) dilempar.
    limiter.check("d");
    expect(limiter.size()).toBe(3);
    // a hilang → quota a mulai baru lagi; b & c masih pada window lama (aktif, belum kena buang).
    const a = limiter.check("a");
    expect(a.allowed).toBe(true);
  });
});

describe("clientIpFrom", () => {
  it("ambil IP pertama dari x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2" },
    });
    expect(clientIpFrom(req)).toBe("10.0.0.1");
  });

  it("fallback ke x-real-ip lalu unknown", () => {
    const req = new Request("https://example.com", { headers: { "x-real-ip": "10.0.0.9" } });
    expect(clientIpFrom(req)).toBe("10.0.0.9");
    const req2 = new Request("https://example.com", { headers: {} });
    expect(clientIpFrom(req2)).toBe("unknown");
  });
});
