import { describe, it, expect } from "vitest";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  validateNewPassword,
  validateNewPasswordPair,
} from "@/lib/users-password";

describe("validateNewPassword", () => {
  it("menolak password kosong", () => {
    expect(validateNewPassword("")).toEqual({ ok: false, error: "Password wajib diisi." });
  });

  it("menolak password terlalu pendek", () => {
    const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    expect(validateNewPassword(short).ok).toBe(false);
  });

  it("menerima password tepat di batas minimum", () => {
    expect(validateNewPassword("a".repeat(MIN_PASSWORD_LENGTH)).ok).toBe(true);
  });

  it("menolak password melebihi batas maksimum", () => {
    const long = "a".repeat(MAX_PASSWORD_LENGTH + 1);
    expect(validateNewPassword(long).ok).toBe(false);
  });

  it("menolak spasi di awal/akhir", () => {
    expect(validateNewPassword(" rahasia123").ok).toBe(false);
    expect(validateNewPassword("rahasia123 ").ok).toBe(false);
  });

  it("menerima password kuat biasa", () => {
    expect(validateNewPassword("RahasiaKuat#2026").ok).toBe(true);
  });
});

describe("validateNewPasswordPair", () => {
  it("menolak konfirmasi yang berbeda", () => {
    expect(validateNewPasswordPair("rahasia123", "rahasia124")).toEqual({
      ok: false,
      error: "Konfirmasi password tidak cocok.",
    });
  });

  it("meneruskan error validasi dasar sebelum mengecek konfirmasi", () => {
    expect(validateNewPasswordPair("pendek", "pendek").ok).toBe(false);
  });

  it("menerima pasangan yang sama & valid", () => {
    expect(validateNewPasswordPair("RahasiaKuat#2026", "RahasiaKuat#2026").ok).toBe(true);
  });
});
