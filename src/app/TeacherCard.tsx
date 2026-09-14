"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { User } from "@/components/Icons";
import type { Teacher } from "@/lib/supabase";

export default function TeacherCard({ teacher }: { teacher: Teacher }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState({
    transform: "perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
  });
  const [isHovered, setIsHovered] = useState(false);

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
      boxShadow: "0 20px 40px rgba(8,43,89,0.15), 0 0 30px rgba(244,210,31,0.25)",
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
      className="group relative h-[260px] w-full cursor-default overflow-hidden rounded-2xl bg-[#f0f4fa] shadow-md transition-[box-shadow] duration-300"
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
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#f0f4fa]">
          <User className="h-20 w-20 text-[#082b59]/15" weight="light" />
        </div>
      )}

      {/* Bottom scrim */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#082b59]/80 via-[#082b59]/30 to-transparent" />

      {/* Name + position */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="truncate text-[13px] font-semibold text-white drop-shadow-sm" title={teacher.name}>
          {teacher.name}
        </h3>
        <p className="mt-0.5 truncate text-[11px] text-white/75">{teacher.position}</p>
      </div>
    </div>
  );
}
