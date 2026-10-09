"use client";

import { useState } from "react";
import { Copy, Checks } from "@/components/Icons";

/**
 * Tombol "Salin tautan" (client) — dipakai share bar & sidebar Info Kegiatan
 * pada detail publik. `compact` = tombol ikon persegi; selain itu ikon + label.
 */
export function CopyLinkButton({
  url,
  compact = false,
  className,
}: {
  /** URL absolut yang disalin ke clipboard. */
  url: string;
  /** Mode ikon saja (aria-label & title tetap terisi). */
  compact?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback bila Clipboard API diblokir (mis. konteks tidak aman)
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* noop */
      }
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Tautan tersalin" : "Salin tautan"}
        title={copied ? "Tersalin!" : "Salin tautan"}
        className={className}
      >
        {copied ? <Checks className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <button type="button" onClick={handleCopy} className={className} aria-live="polite">
      {copied ? <Checks className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Tersalin!" : "Salin tautan"}
    </button>
  );
}
