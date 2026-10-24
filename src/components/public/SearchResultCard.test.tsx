import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SearchResultCard from "./SearchResultCard";
import type { SearchItem } from "@/lib/queries/search";

const base: SearchItem = {
  id: "1",
  kind: "berita",
  title: "Ustadzah Tahfidz Berprestasi",
  href: "/news/contoh",
  date: "2026-10-01T00:00:00Z",
  excerpt: "Cuplikan berita tentang ustadzah.",
};

describe("SearchResultCard", () => {
  it("judul & cuplikan di-highlight sesuai query", () => {
    const { container } = render(<SearchResultCard item={base} query="ustadzah" />);
    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBeGreaterThanOrEqual(2); // judul + cuplikan
    expect(screen.getByText(/Tahfidz Berprestasi/)).toBeTruthy();
  });

  it("URL gambar valid → dirender sebagai gambar", () => {
    const item = { ...base, imageUrl: "https://cdn.smpmuh4tanggul.sch.id/foto.webp" };
    const { container } = render(<SearchResultCard item={item} query="ustadzah" />);
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("alt")).toBe(base.title);
  });

  it("URL gambar kosong/rusak → fallback huruf awal, tanpa <img>", () => {
    for (const bad of [null, "", "   ", "bukan-url", "javascript:alert(1)"]) {
      const item = { ...base, imageUrl: bad as string | null };
      const { container, unmount } = render(<SearchResultCard item={item} query="x" />);
      expect(container.querySelector("img")).toBeNull();
      expect(container.textContent).toContain("U"); // huruf awal judul
      unmount();
    }
  });

  it("varian featured menampilkan lencana 'Paling relevan'", () => {
    render(<SearchResultCard item={base} query="ustadzah" variant="featured" />);
    expect(screen.getByText("Paling relevan")).toBeTruthy();
  });

  it("meta prestasi tampil bila ada", () => {
    const item = { ...base, kind: "prestasi" as const, meta: "Juara 1 · 2025" };
    render(<SearchResultCard item={item} query="x" />);
    expect(screen.getByText("Juara 1 · 2025")).toBeTruthy();
  });

  it("tanggal relatif tampil dengan tooltip absolut", () => {
    const { container } = render(<SearchResultCard item={base} query="x" />);
    const withTitle = container.querySelector("[title]");
    expect(withTitle?.getAttribute("title")).toMatch(/\d{4}/);
  });
});
