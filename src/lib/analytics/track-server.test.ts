import { describe, it, expect } from "vitest";
import {
  sanitizePublicPath,
  hostFromReferrer,
  deviceClassFrom,
  buildTrackedEvent,
} from "./track-server";

describe("track-server: validasi path & privasi", () => {
  it("hanya meloloskan path publik yang valid", () => {
    expect(sanitizePublicPath("/news/kegiatan-sekolah")).toBe("/news/kegiatan-sekolah");
    expect(sanitizePublicPath("/profile")).toBe("/profile");
    expect(sanitizePublicPath("/")).toBe("/");
  });

  it("menolak rute admin, api, internal dan berkas statis", () => {
    expect(sanitizePublicPath("/admin")).toBeNull();
    expect(sanitizePublicPath("/admin/news")).toBeNull();
    expect(sanitizePublicPath("/api/search")).toBeNull();
    expect(sanitizePublicPath("/_next/static/chunk.js")).toBeNull();
    expect(sanitizePublicPath("/sw.js")).toBeNull();
    expect(sanitizePublicPath("/robots.txt")).toBeNull();
    expect(sanitizePublicPath("/sitemap.xml")).toBeNull();
    expect(sanitizePublicPath("/images/logo.png")).toBeNull();
    expect(sanitizePublicPath("/favicon.ico")).toBeNull();
  });

  it("membersihkan query string dan fragment", () => {
    expect(sanitizePublicPath("/news?page=2#top")).toBe("/news");
    expect(sanitizePublicPath("/search?q=tapak+suci")).toBe("/search");
  });

  it("membersihkan slash berlebih", () => {
    expect(sanitizePublicPath("///news//detail")).toBe("/news/detail");
  });

  it("mengekstrak host dari referrer yang sah", () => {
    expect(hostFromReferrer("https://google.com/search?q=esceha")).toBe("google.com");
    expect(hostFromReferrer("http://instagram.com/p/123")).toBe("instagram.com");
    expect(hostFromReferrer("javascript:alert(1)")).toBeNull();
    expect(hostFromReferrer(null)).toBeNull();
    expect(hostFromReferrer("invalid-url")).toBeNull();
  });

  it("mendeteksi kelas perangkat secara wajar", () => {
    expect(
      deviceClassFrom(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"
      )
    ).toBe("mobile");
    expect(
      deviceClassFrom(
        "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
      )
    ).toBe("tablet");
    expect(
      deviceClassFrom(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      )
    ).toBe("desktop");
    expect(deviceClassFrom(null)).toBe("desktop");
  });

  it("buildTrackedEvent menghasilkan payload lengkap yang aman", () => {
    const event = buildTrackedEvent({
      path: "/admission/alur?step=1",
      referrer: "https://t.co/xyz",
      userAgent: "Mozilla/5.0 (Android; Mobile)",
    });
    expect(event).toEqual({
      path: "/admission/alur",
      referrer_host: "t.co",
      device_class: "mobile",
    });
  });

  it("buildTrackedEvent mengembalikan null untuk rute terlarang", () => {
    expect(
      buildTrackedEvent({
        path: "/admin/admission",
        referrer: null,
        userAgent: null,
      })
    ).toBeNull();
  });
});
