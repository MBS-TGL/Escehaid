import { describe, it, expect } from "vitest";
import { validateContactPayload, CONTACT_MIN_FILL_MS } from "./contact-validate";

const NOW = 1_700_000_000_000;
const GOOD = {
  name: "Ahmad Fauzi",
  email: "ahmad@contoh.com",
  phone: "081230660013",
  subject: "Info SPMB",
  message: "Assalamualaikum, saya ingin bertanya tentang SPMB.",
  website: "",
  filledAt: NOW - 10_000,
};

describe("validateContactPayload", () => {
  it("payload manusia yang wajar lolos", () => {
    expect(validateContactPayload(GOOD, NOW)).toEqual({ ok: true });
  });

  it("honeypot terisi → sukses palsu (bot)", () => {
    expect(validateContactPayload({ ...GOOD, website: "http://spam.tld" }, NOW)).toEqual({
      ok: true,
      bot: true,
    });
  });

  it("submit terlalu cepat → sukses palsu (bot)", () => {
    expect(
      validateContactPayload({ ...GOOD, filledAt: NOW - CONTACT_MIN_FILL_MS + 500 }, NOW)
    ).toEqual({ ok: true, bot: true });
  });

  it("tanpa filledAt tetap lolos (klien lama)", () => {
    const { filledAt: _unused, ...rest } = GOOD;
    void _unused;
    expect(validateContactPayload(rest, NOW)).toEqual({ ok: true });
  });

  it("menolak nama / email / pesan yang tidak valid", () => {
    expect(validateContactPayload({ ...GOOD, name: "A" }, NOW).ok).toBe(false);
    expect(validateContactPayload({ ...GOOD, email: "bukan-email" }, NOW).ok).toBe(false);
    expect(validateContactPayload({ ...GOOD, message: "pendek" }, NOW).ok).toBe(false);
    expect(validateContactPayload({ ...GOOD, phone: "08AB#!12" }, NOW).ok).toBe(false);
  });

  it("menolak panjang berlebih", () => {
    expect(validateContactPayload({ ...GOOD, message: "x".repeat(5001) }, NOW).ok).toBe(false);
    expect(validateContactPayload({ ...GOOD, subject: "x".repeat(201) }, NOW).ok).toBe(false);
  });
});
