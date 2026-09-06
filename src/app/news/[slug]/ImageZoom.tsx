"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { X } from "@/components/Icons";

export default function NewsImageZoom({
  src,
  alt,
  objectPosition = "center center",
}: {
  src: string;
  alt: string;
  objectPosition?: string;
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  function handleMouseDown(e: React.MouseEvent) {
    if (zoom <= 1) return;
    setDragging(true);
    lastPos.current = { x: e.clientX - drag.x, y: e.clientY - drag.y };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    setDrag({ x: e.clientX - lastPos.current.x, y: e.clientY - lastPos.current.y });
  }

  function handleMouseUp() {
    setDragging(false);
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => Math.min(3, Math.max(1, z + (e.deltaY > 0 ? -0.25 : 0.25))));
    if (zoom <= 1) setDrag({ x: 0, y: 0 });
  }

  function close() {
    setOpen(false);
    setZoom(1);
    setDrag({ x: 0, y: 0 });
  }

  return (
    <>
      {/* Thumbnail */}
      <div className="relative mx-auto max-w-7xl px-4 pt-5 md:pt-6">
        <div className="group relative block h-[200px] w-full overflow-hidden rounded-xl md:h-[320px] md:rounded-2xl">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            style={{ objectPosition }}
            priority
          />
          {/* Clickable overlay */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute inset-0 z-10 cursor-zoom-in bg-black/0 transition-colors hover:bg-black/10"
          />
          {/* Perbesar badge */}
          <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-lg bg-[#082b59]/80 px-3 py-2 text-xs font-semibold text-white shadow-lg border border-white/20 pointer-events-none">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            Perbesar
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          {/* Close */}
          <button onClick={close}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
            <button onClick={() => { setZoom((z) => Math.max(1, z - 0.5)); if (zoom <= 1.5) setDrag({ x: 0, y: 0 }); }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 text-lg font-bold">
              −
            </button>
            <span className="min-w-[3rem] text-center text-xs font-semibold text-white">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 text-lg font-bold">
              +
            </button>
            <div className="mx-1 h-4 w-px bg-white/20" />
            <button onClick={() => { setZoom(1); setDrag({ x: 0, y: 0 }); }}
              className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-white/20">
              Reset
            </button>
          </div>

          {/* Image */}
          <div className="flex max-h-[85vh] max-w-[90vw] overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in" }}
          >
            <img
              src={src}
              alt={alt}
              className="max-h-[85vh] max-w-[90vw] select-none rounded-lg object-contain transition-transform duration-150"
              style={{
                transform: `scale(${zoom}) translate(${drag.x / zoom}px, ${drag.y / zoom}px)`,
                objectPosition,
              }}
              draggable={false}
            />
          </div>
        </div>
      )}
    </>
  );
}
