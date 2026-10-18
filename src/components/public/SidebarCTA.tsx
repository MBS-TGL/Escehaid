import Link from "next/link";

export default function SidebarCTA({
  title = "SMP Muhammadiyah 4 Tanggul",
  body = "Mari bergabung bersama kami untuk masa depan yang lebih cerah.",
  href = "/admission",
  ctaLabel = "Daftar Sekarang",
}: {
  title?: string;
  body?: string;
  href?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--brand-primary)]/10 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-light)] p-5 text-white">
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-white/60">{body}</p>
      <Link
        href={href}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-accent)] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:brightness-95"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
