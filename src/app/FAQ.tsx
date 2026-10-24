import Link from "next/link";
import { CSSFadeIn } from "@/components/CSSAnimations";
import FaqList from "@/components/public/FaqList";
import { faqs } from "./faq-data";

export default function FAQ({ items = faqs }: { items?: { q: string; a: string }[] }) {
  return (
    <section
      className="bg-[#f4f7fb]"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 640px" } as React.CSSProperties}
    >
      <div className="mx-auto max-w-[1296px] px-6 py-12 sm:py-14 md:px-10 md:py-20">
        <CSSFadeIn>
          <div className="mb-8 text-center sm:mb-12 md:mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">FAQ</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--brand-primary)] sm:text-3xl md:text-4xl">
              Pertanyaan yang sering diajukan
            </h2>
            <p className="mt-4 text-sm text-slate-500">
              Belum menemukan jawaban?{" "}
              <Link href="/contact" className="font-semibold text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-primary)]">
                Hubungi kami
              </Link>
            </p>
          </div>
        </CSSFadeIn>

        <CSSFadeIn delay={0.15}>
          <FaqList items={items} className="mx-auto max-w-4xl" />
        </CSSFadeIn>
      </div>
    </section>
  );
}
