"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Play } from "@/components/Icons";

export default function HeroVideoModal({
  ytId,
  videoUrl,
}: {
  ytId?: string;
  videoUrl?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!ytId && !videoUrl) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-2.5 rounded-xl border border-white/25 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        aria-label="Tonton video profil sekolah dengan suara"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[var(--brand-primary)] shadow-xs transition-transform group-hover:scale-110">
          <Play weight="fill" className="h-3.5 w-3.5" />
        </span>
        <span>Tonton Video Profil</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="2xl"
        title="Video Profil Sekolah"
        description="SMP Muhammadiyah 4 Tanggul"
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
          {open && (
            videoUrl ? (
              <video
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : ytId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&controls=1&rel=0&modestbranding=1&vq=hd1080`}
                title="Video Profil SMP Muhammadiyah 4 Tanggul"
                className="absolute inset-0 h-full w-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : null
          )}
        </div>
      </Modal>
    </>
  );
}
