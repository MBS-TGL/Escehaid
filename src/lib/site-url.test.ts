import { describe, it, expect } from "vitest";
import {
  DEFAULT_SITE_URL,
  adminLoginUrl,
  authOrigin,
  normalizeOrigin,
  siteOrigin,
} from "@/lib/site-url";

describe("normalizeOrigin", () => {
  it("mengambil scheme + host dan membuang path/query/hash", () => {
    expect(normalizeOrigin("https://www.smpmuh4tanggul.sch.id/admin/login?x=1#y")).toBe(
      "https://www.smpmuh4tanggul.sch.id"
    );
    expect(normalizeOrigin("http://localhost:3000/")).toBe("http://localhost:3000");
  });

  it("menolak nilai kosong / path relatif / skema aneh", () => {
    expect(normalizeOrigin("")).toBeNull();
    expect(normalizeOrigin("   ")).toBeNull();
    expect(normalizeOrigin("/admin/login")).toBeNull();
    expect(normalizeOrigin("javascript:alert(1)")).toBeNull();
    expect(normalizeOrigin(undefined)).toBeNull();
  });
});

describe("siteOrigin", () => {
  it("memakai SITE_URL bila valid", () => {
    expect(siteOrigin(null, { SITE_URL: "https://sekolah.example" })).toBe(
      "https://sekolah.example"
    );
  });

  it("mengabaikan SITE_URL kosong (bug lama: menghasilkan path relatif)", () => {
    expect(siteOrigin(null, { SITE_URL: "" })).toBe(DEFAULT_SITE_URL);
    expect(siteOrigin(undefined, { SITE_URL: "   " })).toBe(DEFAULT_SITE_URL);
  });

  it("preferensi (origin request) menang atas SITE_URL", () => {
    expect(
      siteOrigin("https://preview.vercel.app/path", { SITE_URL: "https://sekolah.example" })
    ).toBe("https://preview.vercel.app");
  });

  it("preferensi tidak valid → jatuh ke SITE_URL", () => {
    expect(siteOrigin("/relative", { SITE_URL: "https://sekolah.example" })).toBe(
      "https://sekolah.example"
    );
  });
});

describe("adminLoginUrl", () => {
  it("selalu URL absolut", () => {
    expect(adminLoginUrl(null, { SITE_URL: "" })).toBe(`${DEFAULT_SITE_URL}/admin/login`);
    expect(adminLoginUrl(null, { SITE_URL: "https://sekolah.example/x" })).toBe(
      "https://sekolah.example/admin/login"
    );
  });

  it("tidak pernah menghasilkan protokol ganda", () => {
    const url = adminLoginUrl("https://sekolah.example", { SITE_URL: "" });
    expect(url).toBe("https://sekolah.example/admin/login");
    expect(new URL(url).pathname).toBe("/admin/login");
  });
});

describe("authOrigin", () => {
  it("SITE_URL kanonik menang atas origin request (allowlist Supabase)", () => {
    expect(
      authOrigin("https://preview.vercel.app", { SITE_URL: "https://www.sekolah.example" })
    ).toBe("https://www.sekolah.example");
  });

  it("SITE_URL kosong → memakai origin request", () => {
    expect(authOrigin("https://preview.vercel.app/x", { SITE_URL: "" })).toBe(
      "https://preview.vercel.app"
    );
  });

  it("keduanya tidak valid → default kanonik", () => {
    expect(authOrigin(null, { SITE_URL: "" })).toBe(DEFAULT_SITE_URL);
    expect(authOrigin("/relative", { SITE_URL: " " })).toBe(DEFAULT_SITE_URL);
  });
});
