"use client";

import { useRef, useState } from "react";
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
      className="group relative flex h-[220px] w-full cursor-default flex-col items-center rounded-2xl border border-[#dce3ed] bg-white p-5 text-center transition-[border-color] duration-300"
      style={{
        ...style,
        transition: "transform 0.2s ease-out, box-shadow 0.3s ease-out, border-color 0.3s ease-out",
        borderColor: isHovered ? "#f4d21f" : undefined,
      }}
    >
      {/* Glow overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          background: "radial-gradient(circle at 50% 0%, rgba(244,210,31,0.1) 0%, transparent 70%)",
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* Avatar */}
      <div className="relative mb-3 flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-3 border-[#f4f7fb] bg-[#f4f7fb] transition-all duration-300 group-hover:border-[#f4d21f] group-hover:bg-[#f4d21f]/10">
        <User className="h-9 w-9 text-[#082b59]/40 transition-colors group-hover:text-[#082b59]" weight="light" />
      </div>

      {/* Name */}
      <h3 className="relative w-full truncate text-sm font-semibold text-[#082b59]" title={teacher.name}>
        {teacher.name}
      </h3>
      <p className="relative mt-0.5 text-xs text-slate-500">{teacher.position || teacher.subject}</p>

      {/* Category badges */}
      {(teacher.categories ?? []).length > 0 && (
        <div className="relative mt-auto pt-2.5 flex flex-wrap justify-center gap-1">
          {teacher.categories.map((c) => (
            <span
              key={c}
              className="rounded-full bg-[#1767b1]/10 px-2 py-0.5 text-[10px] font-medium text-[#1767b1]"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
