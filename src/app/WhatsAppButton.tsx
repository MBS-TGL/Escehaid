"use client";

import { useState, useEffect } from "react";
import { ChatCircle, X } from "@phosphor-icons/react";

export default function WhatsAppButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowBubble(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const phone = "6285852004008";
  const message = "Assalamualaikum, saya ingin bertanya tentang SMP Muhammadiyah 4 Tanggul.";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Panel */}
      <div
        className="w-[300px] rounded-2xl bg-white p-5 shadow-2xl border border-[#dce3ed]"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "none" : "translateY(20px) scale(0.9)",
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.2s ease, transform 0.2s ease",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-[#25D366] flex items-center justify-center">
              <ChatCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#082b59]">SMP Muhammadiyah 4 Tanggul</p>
              <p className="text-xs text-green-600">Online</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="rounded-xl bg-[#f0f7ed] p-3 mb-3">
          <p className="text-sm text-[#172033]">
            Assalamualaikum! Ada yang bisa kami bantu? Silakan tanyakan informasi seputar SPMB, program sekolah, atau hal lainnya.
          </p>
        </div>
        <a
          href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-xl bg-[#25D366] py-2.5 text-center text-sm font-semibold text-white hover:bg-[#20BD5A] transition-colors"
        >
          Buka WhatsApp
        </a>
      </div>

      <div className="relative">
        {/* Bubble */}
        <div
          className="absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#082b59] shadow-lg border border-[#dce3ed]"
          style={{
            opacity: showBubble && !isOpen ? 1 : 0,
            transform: showBubble && !isOpen ? "translateY(-50%) translateX(0)" : "translateY(-50%) translateX(10px)",
            pointerEvents: showBubble && !isOpen ? "auto" : "none",
            transition: "opacity 0.3s ease, transform 0.3s ease",
          }}
        >
          Ada yang bisa dibantu? 😊
          <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 bg-white border-r border-b border-[#dce3ed]" />
        </div>

        {/* Button */}
        <button
          onClick={() => { setIsOpen(!isOpen); setShowBubble(false); }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 hover:shadow-xl hover:shadow-[#25D366]/40 transition-all hover:scale-110 active:scale-95"
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: isOpen ? "rotate(0deg)" : "rotate(90deg)",
              opacity: isOpen ? 0 : 1,
              transition: "transform 0.2s ease, opacity 0.2s ease",
            }}
          >
            <ChatCircle className="h-6 w-6" />
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
              opacity: isOpen ? 1 : 0,
              transition: "transform 0.2s ease, opacity 0.2s ease",
            }}
          >
            <X className="h-6 w-6" />
          </div>

          <span className="absolute -right-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-[#25D366]" />
          </span>
        </button>
      </div>
    </div>
  );
}
