import { describe, it, expect } from "vitest";
import { buildRecoveryLink, parseRecoveryHash } from "@/lib/auth-recovery";

describe("parseRecoveryHash", () => {
  it("mengambil token_hash dengan tipe default recovery", () => {
    expect(parseRecoveryHash("#token_hash=abc123&type=recovery")).toEqual({
      token_hash: "abc123",
      type: "recovery",
    });
  });

  it("mengambil token_hash undangan (type=invite / magiclink)", () => {
    expect(parseRecoveryHash("#token_hash=abc123&type=invite")).toEqual({
      token_hash: "abc123",
      type: "invite",
    });
    expect(parseRecoveryHash("#token_hash=abc123&type=magiclink")).toEqual({
      token_hash: "abc123",
      type: "magiclink",
    });
  });

  it("tipe tak dikenal jatuh ke recovery (tidak menambah permukaan serangan)", () => {
    expect(parseRecoveryHash("#token_hash=abc123&type=email_change")).toEqual({
      token_hash: "abc123",
      type: "recovery",
    });
  });

  it("mengambil access & refresh token dari implicit flow Supabase", () => {
    expect(
      parseRecoveryHash(
        "#access_token=abc.def.ghi&expires_in=3600&refresh_token=r3fr3sh&token_type=bearer&type=recovery"
      )
    ).toEqual({ access_token: "abc.def.ghi", refresh_token: "r3fr3sh" });
  });

  it("menerima string tanpa awalan #", () => {
    expect(parseRecoveryHash("token_hash=xyz")).toEqual({ token_hash: "xyz", type: "recovery" });
    expect(parseRecoveryHash("access_token=a&refresh_token=b")).toEqual({
      access_token: "a",
      refresh_token: "b",
    });
  });

  it("menolak fragment kosong / token tidak lengkap", () => {
    expect(parseRecoveryHash("")).toBeNull();
    expect(parseRecoveryHash("#")).toBeNull();
    expect(parseRecoveryHash("#access_token=a")).toBeNull();
    expect(parseRecoveryHash("#refresh_token=b")).toBeNull();
    expect(parseRecoveryHash("#type=recovery")).toBeNull();
  });

  it("tidak salah membaca query string biasa", () => {
    expect(parseRecoveryHash("?code=abc")).toBeNull();
  });
});

describe("buildRecoveryLink", () => {
  it("menaruh token di fragment dan tidak menghasilkan double slash", () => {
    expect(buildRecoveryLink("https://sekolah.example/", "abc123")).toBe(
      "https://sekolah.example/auth/recovery#token_hash=abc123&type=recovery"
    );
  });

  it("mendukung tautan undangan", () => {
    expect(buildRecoveryLink("https://sekolah.example", "tok", "invite")).toBe(
      "https://sekolah.example/auth/recovery#token_hash=tok&type=invite"
    );
  });

  it("hasilnya bisa dibaca kembali oleh parseRecoveryHash", () => {
    const link = buildRecoveryLink("https://sekolah.example", "tok");
    const hash = link.slice(link.indexOf("#"));
    expect(parseRecoveryHash(hash)).toEqual({ token_hash: "tok", type: "recovery" });
  });

  it("tautan undangan juga bulat balik", () => {
    const link = buildRecoveryLink("https://sekolah.example", "tok", "invite");
    const hash = link.slice(link.indexOf("#"));
    expect(parseRecoveryHash(hash)).toEqual({ token_hash: "tok", type: "invite" });
  });
});
