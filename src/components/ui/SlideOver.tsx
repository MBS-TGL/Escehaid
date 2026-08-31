"use client";

import { useEffect, useRef, useState, memo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "@/components/Icons";

const _portalContainers: Record<string, HTMLElement> = {};
function getPortalContainer(id: string) {
  if (!_portalContainers[id]) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      document.body.appendChild(el);
    }
    _portalContainers[id] = el;
  }
  return _portalContainers[id];
}

type SlideOverProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export const SlideOver = memo(function SlideOver({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className = "",
}: SlideOverProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(closeTimer.current);
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        const second = requestAnimationFrame(() => {
          setVisible(true);
        });
        return () => cancelAnimationFrame(second);
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setVisible(false);
      closeTimer.current = setTimeout(() => setMounted(false), 200);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted) return null;

  const duration = visible ? "300ms" : "200ms";
  const ease = visible
    ? "cubic-bezier(0.2, 0.8, 0.2, 1)"
    : "cubic-bezier(0.3, 0, 1, 1)";

  const node = (
    <div
      className={`fixed inset-0 z-[9999] flex items-end md:items-center justify-center md:p-6 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{
        visibility: visible ? "visible" : "hidden",
        transition: `opacity ${duration} ease`,
      }}
      onClick={() => onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-slate-950/40" />

      {/* Desktop: centered panel, Mobile: bottom sheet */}
      <div
        className="w-full z-10 md:max-w-2xl"
        style={{
          transform: visible
            ? "translateY(0) scale(1)"
            : "translateY(100%) scale(1)",
          opacity: visible ? 1 : 0,
          transition: `transform ${duration} ${ease}, opacity ${duration} ease`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`bg-white shadow-2xl w-full relative overflow-hidden flex flex-col border border-slate-200/60 md:rounded-2xl md:max-h-[calc(100vh-6rem)] ${className}`}
          style={{ maxHeight: "min(85vh, calc(100vh - env(safe-area-inset-bottom, 0px)))" }}
        >
          {/* Drag handle (mobile only) */}
          <div className="shrink-0 flex justify-center pt-3 md:hidden">
            <div className="h-1.5 w-10 rounded-full bg-slate-300 opacity-40" />
          </div>

          {(title || description) && (
            <div className="shrink-0 flex items-center justify-between px-5 md:px-6 py-4 border-b border-slate-200/50 bg-white sticky top-0 z-10">
              <div className="min-w-0">
                {title && <h3 className="font-bold text-base md:text-lg text-slate-800 tracking-tight">{title}</h3>}
                {description && <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>}
              </div>
              <button onClick={onClose} className="w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto px-5 md:px-6 py-5" style={{ overscrollBehavior: "contain" }}>
            {children}
          </div>

          {footer && (
            <div className="shrink-0 flex items-center justify-between px-5 md:px-6 py-4 border-t border-slate-200/50 bg-slate-50/50">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(node, getPortalContainer("portal-slideover"));
});
