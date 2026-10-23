"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Gallery } from "@/lib/supabase";
import { X, CaretLeft, CaretRight } from "@/components/Icons";
import { getYoutubeId, youtubeEmbedUrl, youtubeThumb } from "@/lib/youtube";
import { usePrefersReducedMotion } from "@/components/CSSAnimations";

/* Durasi & kurva mengikuti pola `ui/Modal`: masuk lembut (ease-out kuat),
   keluar cepat agar tidak bersaing dengan konten yang kembali tampil. */
const EASE_OPEN = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_CLOSE = "cubic-bezier(0.3, 0, 1, 1)";
const DUR_OPEN = 420;
const DUR_CLOSE = 240;
const GHOST_MS = 260;
const SIZES_LIGHTBOX = "(max-width: 1152px) 92vw, 1056px";

type Stage = "hidden" | "entering" | "shown" | "exiting";

/* useLayoutEffect tidak jalan saat SSR — pakai padanan isomorphic supaya
   render server komponen ini (grid) tidak memicu warning React. */
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* Rasio & clamp frame murni di scope modul — tidak menyentuh state/ref
   komponen, sehingga aman dipanggil dari handler onLoad next/image. */

function imgRatio(img: HTMLImageElement): number | null {
  return img.naturalWidth > 0 ? img.naturalWidth / img.naturalHeight : null;
}

function clampFrame(ratio: number): { w: number; h: number } {
  const maxW = Math.min(window.innerWidth * 0.92, 1152);
  const maxH = window.innerHeight * (window.innerWidth < 640 ? 0.6 : 0.74);
  const w = Math.min(maxW, maxH * ratio);
  return { w: Math.round(w), h: Math.round(w / ratio) };
}

function thumbFor(item: Gallery): string {
  if (item.media_type === "video") {
    const ytId = getYoutubeId(item.url);
    return item.thumbnail_url || (ytId ? youtubeThumb(ytId) : "");
  }
  return item.thumbnail_url || item.url;
}

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
  const [renderIndex, setRenderIndex] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>("hidden");
  const [frame, setFrame] = useState<{ w: number; h: number } | null>(null);
  const [ghostIndex, setGhostIndex] = useState<number | null>(null);
  const [fullReady, setFullReady] = useState<Record<string, boolean>>({});

  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const hasMore = items.length === perPage;

  const selected = renderIndex === null ? null : items[renderIndex] ?? null;

  const stageRef = useRef<Stage>("hidden");
  const renderRef = useRef<number | null>(null);
  useIsoLayoutEffect(() => {
    stageRef.current = stage;
    renderRef.current = renderIndex;
  });

  const boxRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLElement | null>(null);
  const startRectRef = useRef<DOMRect | null>(null);
  const ratiosRef = useRef<Map<number, number>>(new Map());
  const pointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const thumbRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const timersRef = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    const pending = timersRef.current;
    timersRef.current = [];
    pending.forEach((t) => window.clearTimeout(t));
  }, []);

  /* Kunci scroll body + kompensasi lebar scrollbar (pola `ui/Modal`). */
  function lockBody() {
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
  }
  function unlockBody() {
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  }

  /* Ukuran box pratinjau: rasio asli gambar (fallback 4:3, video 16:9)
     diklamp ke viewport — zero CLS dan menyamakan rect kartu saat FLIP. */
  const computeFrame = useCallback(
    (i: number): { w: number; h: number } => {
      const item = items[i];
      const ratio =
        item?.media_type === "video" ? 16 / 9 : ratiosRef.current.get(i) ?? 4 / 3;
      return clampFrame(ratio);
    },
    [items]
  );

  const applyFrame = useCallback(
    (i: number) => {
      const f = computeFrame(i);
      setFrame((cur) => (cur && cur.w === f.w && cur.h === f.h ? cur : f));
    },
    [computeFrame]
  );

  const finishClose = useCallback(() => {
    clearTimers();
    unlockBody();
    originRef.current?.focus({ preventScroll: true });
    originRef.current = null;
    startRectRef.current = null;
    setRenderIndex(null);
    setStage("hidden");
    setGhostIndex(null);
  }, [clearTimers]);

  const openAt = useCallback(
    (i: number, el: HTMLElement) => {
      if (stageRef.current !== "hidden" || renderRef.current !== null) return;
      originRef.current = el;
      const img = el.querySelector("img");
      if (img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0) {
        ratiosRef.current.set(i, img.naturalWidth / img.naturalHeight);
      }
      /* Lock dulu, baru ukur: menghapus scrollbar menggeser layout, jadi rect
         kartu sumber harus diukur saat halaman sudah terkunci. */
      lockBody();
      startRectRef.current = el.getBoundingClientRect();
      applyFrame(i);
      setRenderIndex(i);
      setStage("entering");
    },
    [applyFrame]
  );

  const requestClose = useCallback(() => {
    const s = stageRef.current;
    if (s === "shown" || s === "entering") setStage("exiting");
  }, []);

  const markFullReady = useCallback((id: string) => {
    setFullReady((m) => (m[id] ? m : { ...m, [id]: true }));
  }, []);

  /* Pindah item: lepas transform penuh — konten baru muncul di bawah lapisan
     "ghost" (gambar lama meluruh, lalu dipangkas), ukuran box ikut bertransisi. */
  const step = useCallback(
    (dir: 1 | -1) => {
      if (stageRef.current !== "shown") return;
      const cur = renderRef.current;
      if (cur === null || items.length < 2) return;
      const next = (cur + dir + items.length) % items.length;
      const el = boxRef.current;
      if (el && !reduced) {
        el.style.transition = "width 280ms ease, height 280ms ease";
        later(() => {
          if (stageRef.current !== "shown") return;
          const b = boxRef.current;
          if (b) b.style.transition = "";
        }, 340);
      }
      setGhostIndex(cur);
      applyFrame(next);
      setRenderIndex(next);
      later(() => {
        if (stageRef.current !== "shown") return;
        setGhostIndex(null);
      }, GHOST_MS + 40);
    },
    [items.length, later, applyFrame, reduced]
  );

  /* ── FLIP: entering = pakai transformed terbalik lalu angsur ke posisi;
        exiting = transisi mundur ke rect kartu asal, baru portal dilepas. ── */
  useIsoLayoutEffect(() => {
    if (stage === "hidden") return;
    const el = boxRef.current;
    if (!el) return;
    const localRafs: number[] = [];

    /* Sinkronisasi rasio natural foto di box — menggantikan onLoad next/image
       (bermasalah untuk react-hooks/refs). Gambar yang sudah complete diproses
       lewat rAF; yang belum dipasang listenernya di sini (konteks effect). */
    const imgs = el.querySelectorAll<HTMLImageElement>("img[data-idx]");
    const detachRatios: Array<() => void> = [];
    imgs.forEach((img) => {
      const handler = () => {
        const raw = img.dataset.idx;
        const r = imgRatio(img);
        if (raw === undefined || r === null) return;
        const i = Number(raw);
        const map = ratiosRef.current;
        const prev = map.get(i);
        map.set(i, r);
        if (prev && Math.abs(prev - r) < 0.005) return;
        localRafs.push(
          requestAnimationFrame(() => {
            setFrame((cur) => {
              const f = clampFrame(r);
              return cur && cur.w === f.w && cur.h === f.h ? cur : f;
            });
          })
        );
      };
      if (img.complete) localRafs.push(requestAnimationFrame(handler));
      else {
        img.addEventListener("load", handler);
        detachRatios.push(() => img.removeEventListener("load", handler));
      }
    });

    if (stage === "entering") {
      const from = startRectRef.current;
      if (from && !reduced) {
        const to = el.getBoundingClientRect();
        const sx = to.width ? from.width / to.width : 1;
        const sy = to.height ? from.height / to.height : 1;
        const dx = from.left + from.width / 2 - (to.left + to.width / 2);
        const dy = from.top + from.height / 2 - (to.top + to.height / 2);
        el.style.transformOrigin = "50% 50%";
        el.style.transition = "none";
        el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
        const r1 = requestAnimationFrame(() => {
          // Dua frame: pastikan rect awal sudah dipainkan browser sebelum
          // target dilepaskan, agar transisi transform benar-benar jalan.
          const r2 = requestAnimationFrame(() => {
            el.style.transition = `transform ${DUR_OPEN}ms ${EASE_OPEN}`;
            el.style.willChange = "transform";
            el.style.transform = "";
          });
          localRafs.push(r2);
        });
        localRafs.push(r1);
        later(() => {
          if (stageRef.current !== "entering") return;
          el.style.willChange = "auto";
          setStage("shown");
          closeRef.current?.focus({ preventScroll: true });
        }, DUR_OPEN + 30);
      } else {
        el.style.transition = "none";
        el.style.transform = "";
        later(() => {
          if (stageRef.current !== "entering") return;
          setStage("shown");
          closeRef.current?.focus({ preventScroll: true });
        }, 16);
      }
    } else if (stage === "exiting") {
      const target = originRef.current?.getBoundingClientRect();
      if (target && !reduced) {
        const cur = el.getBoundingClientRect();
        const sx = cur.width ? target.width / cur.width : 1;
        const sy = cur.height ? target.height / cur.height : 1;
        const dx = target.left + target.width / 2 - (cur.left + cur.width / 2);
        const dy = target.top + target.height / 2 - (cur.top + cur.height / 2);
        el.style.transition = `transform ${DUR_CLOSE}ms ${EASE_CLOSE}`;
        el.style.willChange = "transform";
        el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
        later(finishClose, DUR_CLOSE + 40);
      } else {
        later(finishClose, 16);
      }
    }

    return () => {
      localRafs.forEach((r) => cancelAnimationFrame(r));
      detachRatios.forEach((d) => d());
    };
  }, [stage, frame, reduced, later, finishClose]);

  /* Keyboard: Esc tutup, panah pindah, Tab terkurung di dalam dialog. */
  useEffect(() => {
    if (renderIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        requestClose();
        return;
      }
      if (items.length > 1) {
        if (e.key === "ArrowLeft") {
          step(-1);
          return;
        }
        if (e.key === "ArrowRight") {
          step(1);
          return;
        }
      }
      if (e.key === "Tab") {
        const list = [closeRef.current, prevRef.current, nextRef.current].filter(
          (x): x is HTMLButtonElement => Boolean(x)
        );
        if (list.length === 0) return;
        e.preventDefault();
        const cur = list.indexOf(document.activeElement as HTMLButtonElement);
        const next = cur === -1 ? 0 : (cur + (e.shiftKey ? list.length - 1 : 1)) % list.length;
        list[next].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [renderIndex, requestClose, step, items.length]);

  /* Swipe kiri/kanan di layar sentuh (mouse memakai tombol/keyboard). */
  const onBoxPointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.pointerType === "mouse") return;
    pointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }, []);
  const clearPointer = useCallback(() => {
    pointerRef.current = null;
  }, []);
  const onBoxPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      const p = pointerRef.current;
      pointerRef.current = null;
      if (!p || p.id !== e.pointerId) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (Math.abs(dx) > 48 && Math.abs(dy) < 72) step(dx < 0 ? 1 : -1);
    },
    [step]
  );

  /* Viewport berubah → hitung ulang ukuran box (tanpa transisi). */
  useEffect(() => {
    const onResize = () => {
      if (stageRef.current !== "shown") return;
      const i = renderRef.current;
      if (i === null) return;
      const el = boxRef.current;
      if (el) el.style.transition = "none";
      applyFrame(i);
      later(() => {
        if (stageRef.current !== "shown") return;
        const b = boxRef.current;
        if (b) b.style.transition = "";
      }, 64);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [applyFrame, later]);

  /* Pengaman kalau komponen tiba-tiba di-unmount (mis. navigasi halaman). */
  useEffect(() => {
    return () => {
      unlockBody();
      clearTimers();
    };
  }, [clearTimers]);

  function hrefFor(p: number): string {
    const params = new URLSearchParams();
    if (cat) params.set("cat", cat);
    if (p > 0) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/gallery?${qs}` : "/gallery";
  }

  /* Chrome lightbox (backdrop, tombol, info) — gaya per tahap agar fade
     in/out konsisten tanpa kelas tambahan. */
  function modalChrome(item: Gallery, idx: number) {
    const open = stage === "shown";
    const leaving = stage === "exiting";
    const noMotion = reduced ? "none" : undefined;

    const bgStyle: CSSProperties =
      open || leaving
        ? { opacity: open ? 1 : 0, transition: noMotion ?? `opacity ${leaving ? 200 : 300}ms ease` }
        : { opacity: 0 };

    const chipStyle: CSSProperties =
      open
        ? { opacity: 1, transition: noMotion ?? "opacity 280ms ease 200ms" }
        : { opacity: 0, transition: noMotion ?? "opacity 160ms ease" };

    const infoStyle: CSSProperties =
      open
        ? {
            opacity: 1,
            transform: "none",
            transition: noMotion ?? `opacity 280ms ease 140ms, transform 300ms ${EASE_OPEN} 140ms`,
          }
        : {
            opacity: 0,
            transform: "translateY(10px)",
            transition: noMotion ?? (leaving ? "opacity 160ms ease, transform 160ms ease" : "none"),
          };

    const chipClass =
      "grid place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";
    const ghost = ghostIndex !== null && ghostIndex !== idx ? items[ghostIndex] : null;

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Pratinjau: ${item.title}`}
        onClick={requestClose}
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto p-4 md:p-6 ${
          open ? "" : "pointer-events-none"
        }`}
      >
        <div aria-hidden="true" style={bgStyle} className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

        <button
          ref={closeRef}
          onClick={requestClose}
          style={chipStyle}
          aria-label="Tutup pratinjau"
          className={`${chipClass} absolute right-4 top-4 z-20 h-10 w-10`}
        >
          <X className="h-5 w-5" />
        </button>

        {items.length > 1 && (
          <>
            <button
              ref={prevRef}
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              style={chipStyle}
              aria-label="Sebelumnya"
              className={`${chipClass} absolute left-2 top-1/2 z-20 h-11 w-11 -translate-y-1/2 md:left-4`}
            >
              <CaretLeft className="h-5 w-5" />
            </button>
            <button
              ref={nextRef}
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              style={chipStyle}
              aria-label="Berikutnya"
              className={`${chipClass} absolute right-2 top-1/2 z-20 h-11 w-11 -translate-y-1/2 md:right-4`}
            >
              <CaretRight className="h-5 w-5" />
            </button>
            <span
              style={chipStyle}
              className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/15"
            >
              {idx + 1} / {items.length}
            </span>
          </>
        )}

        <div onClick={(e) => e.stopPropagation()} className="relative z-10 flex max-w-full flex-col items-center">
          <div
            ref={boxRef}
            style={{ width: frame?.w ?? 320, height: frame?.h ?? 240, touchAction: "pan-y" }}
            onPointerDown={onBoxPointerDown}
            onPointerUp={onBoxPointerUp}
            onPointerCancel={clearPointer}
            className="relative overflow-hidden rounded-2xl bg-black shadow-2xl"
          >
            {item.media_type === "video" ? (
              getYoutubeId(item.url) ? (
                <iframe
                  key={item.id}
                  src={youtubeEmbedUrl(getYoutubeId(item.url)!, true)}
                  title={item.title}
                  className="absolute inset-0 h-full w-full"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  loading="lazy"
                />
              ) : (
                <video
                  key={item.id}
                  src={item.url}
                  controls
                  playsInline
                  preload="none"
                  poster={item.thumbnail_url || undefined}
                  className="absolute inset-0 h-full w-full bg-black object-contain"
                />
              )
            ) : (
              <>
                <Image
                  key={`${item.id}-t`}
                  src={thumbFor(item)}
                  alt=""
                  width={400}
                  height={400}
                  sizes={SIZES_LIGHTBOX}
                  draggable={false}
                  data-idx={idx}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                    fullReady[item.id] ? "opacity-0" : "opacity-100"
                  }`}
                />
                <Image
                  key={`${item.id}-f`}
                  src={item.url}
                  alt={item.title}
                  width={1600}
                  height={1600}
                  sizes={SIZES_LIGHTBOX}
                  loading="eager"
                  draggable={false}
                  data-idx={idx}
                  onLoad={() => {
                    // Hanya penanda siap-set untuk crossfade full-res;
                    // sinkronisasi rasio ditangani listener native di effect
                    // (onLoad next/image tidak konteks event bagi react-hooks/refs).
                    markFullReady(item.id);
                  }}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                    fullReady[item.id] ? "opacity-100" : "opacity-0"
                  }`}
                />
              </>
            )}

            {ghost && (
              <Image
                src={thumbFor(ghost)}
                alt=""
                width={400}
                height={400}
                sizes={SIZES_LIGHTBOX}
                draggable={false}
                className="lb-ghost pointer-events-none absolute inset-0 z-10 h-full w-full object-cover"
              />
            )}
          </div>

          <div style={infoStyle} className="mt-4 max-w-[min(92vw,680px)] text-center">
            <h3 className="text-base font-semibold text-white md:text-lg">{item.title}</h3>
            {item.description && (
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-white/70">{item.description}</p>
            )}
            <p className="mt-1.5 text-xs text-white/50">
              {item.category} &middot;{" "}
              {new Date(item.created_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {items.map((item, i) => {
          const thumb = thumbFor(item);
          return (
            <button
              key={item.id}
              ref={(el) => {
                if (el) thumbRefs.current.set(i, el);
                else thumbRefs.current.delete(i);
              }}
              onClick={(e) => openAt(i, e.currentTarget)}
              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
            >
              {thumb ? (
                <Image
                  src={thumb}
                  alt={item.title}
                  width={400}
                  height={400}
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="h-full w-full object-cover transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                  /* Item pertama = kandidat LCP (above fold); lazy di sini
                     hanya menunda tampilan terbesar (warning next/image). */
                  loading={i === 0 ? "eager" : "lazy"}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[var(--brand-primary)]">
                  <span className="text-4xl text-white/80">&#9654;</span>
                </div>
              )}
              {item.media_type === "video" && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 transition-colors duration-300 group-hover:bg-black/40">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/85 text-lg text-[var(--brand-primary)] shadow-lg">
                    &#9654;
                  </span>
                </span>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--brand-primary)]/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              {/* Keterangan: selalu tampil di layar sentuh, muncul saat hover di desktop. */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100">
                <p className="text-sm font-semibold text-white drop-shadow-sm">{item.title}</p>
                {item.category && <p className="mt-1 text-xs text-white/80">{item.category}</p>}
              </div>
            </button>
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

      {selected && renderIndex !== null && stage !== "hidden" && modalChrome(selected, renderIndex)}
    </>
  );
}
