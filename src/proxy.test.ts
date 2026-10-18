import { describe, it, expect } from "vitest";
import { unstable_doesMiddlewareMatch as unstable_doesProxyMatch } from "next/experimental/testing/server";
import { config } from "./proxy";

describe("proxy matcher", () => {
  it("mencakup halaman publik (beranda, berita, admission)", () => {
    for (const url of ["/", "/news", "/admission", "/articles?x=1"]) {
      expect(unstable_doesProxyMatch({ config, url }), url).toBe(true);
    }
  });

  it("mencakup rute admin", () => {
    for (const url of ["/admin", "/admin/flags", "/admin/login"]) {
      expect(unstable_doesProxyMatch({ config, url }), url).toBe(true);
    }
  });

  it("mengecualikan aset statis & file metadata", () => {
    for (const url of [
      "/_next/static/chunks/main.js",
      "/_next/image?url=a",
      "/favicon.ico",
      "/images/Logo-Sekolah.png",
      "/manifest.json",
      "/sw.js",
      "/offline.html",
      "/maintenance.html",
      "/sitemap.xml",
      "/rss.xml",
      "/robots.txt",
      "/og-image.jpg",
    ]) {
      expect(unstable_doesProxyMatch({ config, url }), url).toBe(false);
    }
  });
});
