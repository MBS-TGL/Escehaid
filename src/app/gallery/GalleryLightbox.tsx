"use client";

import { useState } from "react";
import type { Gallery } from "@/lib/supabase";
import { X } from "@/components/Icons";

export default function GalleryLightbox({ items }: { items: Gallery[] }) {
  const [selected, setSelected] = useState<Gallery | null>(null);

  function close() {
    setSelected(null);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.id}>
            <button
              onClick={() => setSelected(item)}
              className="group relative block aspect-square w-full overflow-hidden rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] text-left"
            >
              {item.media_type === "foto" ? (
                <img
                  src={item.thumbnail_url || item.url}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#082b59]">
                  <span className="text-4xl text-white/80">&#9654;</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#082b59]/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                {item.category && (
                  <p className="mt-1 text-xs text-white/70">{item.category}</p>
                )}
              </div>
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={close}
        >
          <button
            onClick={close}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 z-10"
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.media_type === "video" ? (
              <video
                src={selected.url}
                controls
                autoPlay
                className="w-full rounded-xl"
              />
            ) : (
              <img
                src={selected.url}
                alt={selected.title}
                className="w-full rounded-xl object-contain max-h-[80vh]"
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
