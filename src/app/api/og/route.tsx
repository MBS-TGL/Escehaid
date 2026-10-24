import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

/**
 * Kartu OpenGraph dinamis — digambar di server dengan `next/og` (Satori).
 *
 * Kenapa: mayoritas konten di situs ini TIDAK punya foto sampul (terverifikasi:
 * 5 dari 6 hasil pencarian "spmb" tanpa `image_url`). Tanpa route ini, tautan
 * yang dibagikan ke WhatsApp/Facebook tampil tanpa gambar sama sekali.
 *
 * Dipanggil dari `pageOpenGraph()` (src/lib/seo.ts) sebagai default; halaman
 * yang punya foto sampul atau gambar kustom admin tetap memakai gambarnya
 * sendiri.
 *
 * Catatan teknis:
 * - Tanpa file font kustom (repo tidak menyimpannya) → memakai font bawaan
 *   Satori. Cukup untuk teks Latin; menghindari dependensi & payload besar.
 * - Warna brand di-hardcode karena `getSiteSettings()` (DB) tidak boleh
 *   dipanggil di sini: route ini harus cepat dan tidak menambah query DB per
 *   pratinjau tautan. Nilai = default `DEFAULT_THEME` situs.
 * - Panjang judul dibatasi agar tidak meluber keluar kartu.
 */
export const runtime = "nodejs";

const BRAND_PRIMARY = "#082b59";
const BRAND_ACCENT = "#1767b1";
const BRAND_HIGHLIGHT = "#f4d21f";

const MAX_TITLE = 120;
const MAX_KIND = 24;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawTitle = (searchParams.get("title") ?? "").trim();
  const rawKind = (searchParams.get("kind") ?? "").trim();

  const title = (rawTitle || "SMP Muhammadiyah 4 Tanggul").slice(0, MAX_TITLE);
  const kind = rawKind.slice(0, MAX_KIND);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `linear-gradient(135deg, ${BRAND_PRIMARY} 0%, ${BRAND_ACCENT} 100%)`,
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Kepala: nama sekolah + label jenis */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 8,
              height: 40,
              background: BRAND_HIGHLIGHT,
              borderRadius: 4,
              display: "flex",
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
              letterSpacing: "0.02em",
            }}
          >
            SMP Muhammadiyah 4 Tanggul
          </div>
          {kind ? (
            <div
              style={{
                display: "flex",
                marginLeft: 8,
                padding: "6px 16px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.16)",
                fontSize: 20,
                fontWeight: 600,
                color: "#ffffff",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {kind}
            </div>
          ) : null}
        </div>

        {/* Judul */}
        <div
          style={{
            display: "flex",
            fontSize: title.length > 70 ? 52 : 64,
            fontWeight: 800,
            lineHeight: 1.18,
            color: "#ffffff",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>

        {/* Kaki: domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 600,
              color: "rgba(255,255,255,0.72)",
            }}
          >
            smpmuh4tanggul.sch.id
          </div>
          <div
            style={{
              display: "flex",
              height: 10,
              width: 120,
              borderRadius: 999,
              background: BRAND_HIGHLIGHT,
            }}
          />
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
