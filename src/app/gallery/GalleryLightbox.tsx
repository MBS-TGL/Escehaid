"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Gallery } from "@/lib/supabase";
import Image from "next/image";
import { X, CaretLeft, CaretRight } from "@/components/Icons";
import { getYoutubeId, youtubeThumb, youtubeEmbedUrl } from "@/lib/youtube";

/** Ritme tinggi kartu bergantian supaya grid terasa "masonry", bukan kotak seragam. */
const ASPECTS = ["aspect-[4/5]", "aspect-square", "aspect-[4/3]", "aspect-[3/4]"];

export default function GalleryLightbox({
  items,
  page,
  perPage,
  cat,
}: {
  items: Gallery[];
  page: number;
  perPage: number;
  cat?: string;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const router = useRouter();
  const hasMore = items.length === perPage;
  const selected = index === null ? null : items[index] ?? null;
  const selectedYtId = selected ? getYoutubeId(selected.url) : null;

  const close = useCallback(() => setIndex(null), []);
  const step = useCallback(
    (dir: 1 | -1) => {
      setIndex((cur) => {
        if (cur === null) return cur;
        return (cur + dir + items.length) % items.length;
      });
    },
    [items.length]
  );

  // Esc menutup, panah kiri/kanan berpindah, kunci scroll body saat terbuka.
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, close, step]);

  // Bangun URL galeri dengan mempertahankan filter kategori + halaman.
  function hrefFor(p: number): string {
    const params = new URLSearchParams();
    if (cat) params.set("cat", cat);
    if (p > 0) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/gallery?${qs}` : "/gallery";
  }

  return (
    <>
      <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
        {items.map((item, i) => {
          const ytId = item.media_type === "video" ? getYoutubeId(item.url) : null;
          // Thumbnail kecil: foto pakai thumbnail_url, video pakai thumbnail
          // YouTube — gambar penuh/video hanya dimuat saat diklik.
          const thumb =
            item.media_type === "foto"
              ? item.thumbnail_url || item.url
              : item.thumbnail_url || (ytId ? youtubeThumb(ytId) : "");

          return (
            <div key={item.id} className="mb-4" style={{ breakInside: "avoid" }}>
              <button
                onClick={() => setIndex(i)}
                className={`group relative block w-full overflow-hidden rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] text-left ${ASPECTS[i % ASPECTS.length]}`}
              >
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={item.title}
                    width={400}
                    height={400}
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--brand-primary)]">
                    <span className="text-4xl text-white/80">&#9654;</span>
                  </div>
                )}
                {item.media_type === "video" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/40">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/85 text-lg text-[var(--brand-primary)] shadow-lg">
                      &#9654;
                    </span>
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-primary)]/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                {/* Keterangan: selalu tampil di layar sentuh, muncul saat hover di desktop. */}
                <div className="absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100">
                  <p className="text-sm font-semibold text-white drop-shadow-sm">{item.title}</p>
                  {item.category && (
                    <p className="mt-1 text-xs text-white/80">{item.category}</p>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {(hasMore || page > 0) && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {page > 0 && (
            <button
              onClick={() => router.push(hrefFor(page - 1), { scroll: false })}
              className="rounded-xl border border-[#dce3ed] bg-white px-8 py-3 text-sm font-semibold text-[var(--brand-primary)] transition-colors hover:bg-[#f4f7fb]"
            >
              Kembali
            </button>
          )}
          {hasMore && (
            <button
              onClick={() => router.push(hrefFor(page + 1), { scroll: false })}
              className="rounded-xl bg-[var(--brand-primary)] px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-accent)] hover:text-white"
            >
              Muat Lebih Banyak
            </button>
          )}
        </div>
      )}

      {selected && index !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau: ${selected.title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <button
            onClick={close}
            aria-label="Tutup pratinjau"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          {items.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="Sebelumnya"
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
              >
                <CaretLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="Berikutnya"
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
              >
                <CaretRight className="h-6 w-6" />
              </button>
              <span className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                {index + 1} / {items.length}
              </span>
            </>
          )}

          <div
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.media_type === "video" ? (
              selectedYtId ? (
                // Video YouTube → embed (eggress Supabase nol)
                <iframe
                  src={youtubeEmbedUrl(selectedYtId, true)}
                  title={selected.title}
                  className="aspect-video w-full rounded-xl"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  loading="lazy"
                />
              ) : (
                <video
                  src={selected.url}
                  controls
                  playsInline
                  preload="none"
                  poster={selected.thumbnail_url || undefined}
                  className="w-full rounded-xl bg-black"
                />
              )
            ) : (
              <Image
                src={selected.url}
                alt={selected.title}
                width={1200}
                height={1200}
                sizes="(max-width: 896px) 100vw, 896px"
                className="max-h-[80vh] w-full rounded-xl object-contain"
                loading="lazy"
                decoding="async"
              />
            )}

            <div className="mt-4 text-center">
              <h3 className="text-lg font-semibold text-white">{selected.title}</h3>
              {selected.description && (
                <p className="mt-1 text-sm text-white/70">{selected.description}</p>
              )}
              <p className="mt-1 text-xs text-white/50">
                {selected.category} &middot;{" "}
                {new Date(selected.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
