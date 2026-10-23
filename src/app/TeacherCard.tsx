"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { nameInitials } from "@/lib/site-config";
import type { Teacher } from "@/lib/supabase";

export default function TeacherCard({ teacher }: { teacher: Teacher }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState({
    transform: "perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
  });
  const [, setIsHovered] = useState(false);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    setStyle({
      transform: `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-12px) scale(1.05)`,
      boxShadow: "0 20px 40px color-mix(in srgb, var(--brand-primary) 15%, transparent), 0 0 30px color-mix(in srgb, var(--brand-accent) 25%, transparent)",
    });
  }

  function handleMouseLeave() {
    setIsHovered(false);
    setStyle({
      transform: "perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
    });
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="group relative h-[210px] w-full cursor-default overflow-hidden rounded-2xl bg-[#f0f4fa] shadow-md transition-[box-shadow] duration-300 active:opacity-95 sm:h-[260px]"
      style={{
        ...style,
        transition: "transform 0.2s ease-out, box-shadow 0.3s ease-out",
      }}
    >
      {/* Photo — full-bleed */}
      {teacher.photo_url ? (
        <Image
          src={teacher.photo_url}
          alt={teacher.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#f0f4fa]">
          <span
            aria-hidden="true"
            className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--brand-primary)] text-2xl font-bold text-white"
          >
            {nameInitials(teacher.name)}
          </span>
        </div>
      )}

      {/* Bottom scrim */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--brand-primary)]/80 via-[var(--brand-primary)]/30 to-transparent" />

      {/* Name + position */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white drop-shadow-sm" title={teacher.name}>
          {teacher.name}
        </h3>
        <p className="mt-0.5 truncate text-[11px] text-white/75">{teacher.position}</p>
      </div>
    </div>
  );
}
