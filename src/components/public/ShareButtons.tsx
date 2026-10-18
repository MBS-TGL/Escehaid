import { WhatsappLogo, FacebookLogo, TwitterLogo } from "@/components/Icons";

/**
 * Tombol bagikan (WA/FB/X) — satu sumber untuk topbar icon-only, panel footer
 * berwarna, dan varian outline (kartu putih ber-border).
 */
export default function ShareButtons({
  url,
  title,
  variant = "icons",
  className = "",
}: {
  url: string;
  title: string;
  /** "icons" → abu transparan (topbar); "solid" → warna sosial (panel); "outline" → putih ber-border. */
  variant?: "icons" | "solid" | "outline";
  className?: string;
}) {
  const text = encodeURIComponent(title);
  const post = encodeURIComponent(url);
  const links = [
    { href: `https://wa.me/?text=${text}%20${post}`, label: "Bagikan ke WhatsApp", icon: WhatsappLogo },
    { href: `https://www.facebook.com/sharer/sharer.php?u=${post}`, label: "Bagikan ke Facebook", icon: FacebookLogo },
    { href: `https://twitter.com/intent/tweet?text=${text}&url=${post}`, label: "Bagikan ke X (Twitter)", icon: TwitterLogo },
  ];

  const cls =
    variant === "solid"
      ? [
          "flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white transition-colors hover:bg-emerald-600",
          "flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700",
          "flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white transition-colors hover:bg-sky-600",
        ]
      : variant === "outline"
        ? [
            "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-emerald-200 hover:text-emerald-600",
            "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-200 hover:text-blue-600",
            "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-sky-200 hover:text-sky-600",
          ]
        : [
            "flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600",
            "flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600",
            "flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-sky-50 hover:text-sky-600",
          ];

  return (
    <div className={`flex items-center gap-1.5 ${className}`} role="group" aria-label="Bagikan">
      {links.map((l, i) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={l.label}
          className={cls[i]}
        >
          <l.icon className="h-3.5 w-3.5" />
        </a>
      ))}
    </div>
  );
}
