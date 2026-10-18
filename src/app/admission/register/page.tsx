import SPMBForm from "./SPMBForm";
import { CSSFadeIn } from "@/components/CSSAnimations";
import PageHero from "@/components/public/PageHero";
import { FileText, Phone, WhatsappLogo } from "@/components/Icons";
import { getSchoolProfile, normalizeSpmbFormSchema, GOOGLE_FORM_URL } from "@/lib/queries";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daftar SPMB",
  description: "Formulir pendaftaran SPMB SMP Muhammadiyah 4 Tanggul - Daftar online mudah dan cepat.",
  alternates: { canonical: "/admission/register" },
};

export const revalidate = 3600;

export default async function SPMBRegisterPage() {
  // Mode Google Form (toggle admin) → alihkan ke link Google Form yang diatur admin;
  // link kosong → pakai link bawaan. Kolom belum ada (sebelum migrasi) → halaman tetap tampil.
  const profile = await getSchoolProfile();
  if (profile?.registration_mode === "google_form") {
    redirect(profile.google_form_url?.trim() || GOOGLE_FORM_URL);
  }
  // Pertanyaan tambahan buatan admin (builder di /admin/admission).
  // Kolom belum ada / skema kosong → [] → form tampil tanpa langkah tambahan.
  const formFields = normalizeSpmbFormSchema(profile?.spmb_form_schema).filter((f) => f.active);

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
            { "@type": "ListItem", position: 2, name: "SPMB Online", item: "https://www.smpmuh4tanggul.sch.id/admission" },
            { "@type": "ListItem", position: 3, name: "Daftar SPMB", item: "https://www.smpmuh4tanggul.sch.id/admission/register" },
          ],
        })
      }} />
      <PageHero
        variant="compact"
        title="Formulir Pendaftaran"
        description="Silakan isi formulir dengan data yang benar."
        icon={FileText}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "SPMB", href: "/admission" },
          { label: "Daftar" },
        ]}
      />

      <section className="mx-auto max-w-7xl px-6 py-12" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        <SPMBForm fields={formFields} />

        <CSSFadeIn>
          <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] p-5">
            <div className="mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4 text-[var(--brand-accent)]" />
              <h3 className="text-sm font-bold text-[var(--brand-primary)]">Contact Person</h3>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              {[
                ["Ustadzah Azizah", "6285259341209"],
                ["Ustadzah Lusi", "6282302326820"],
                ["Ustadz Arif", "6285806738160"],
              ].map(([name, wa]) => (
                <a
                  key={wa}
                  href={`https://wa.me/${wa}?text=Assalamualaikum%2C%20saya%20ingin%20bertanya%20tentang%20SPMB`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-[#dce3ed] bg-white px-3 py-2 transition-all hover:border-green-400 hover:bg-green-50"
                >
                  <WhatsappLogo className="h-4 w-4 shrink-0 text-green-600" weight="fill" />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-[var(--brand-primary)]">{name}</div>
                    <div className="truncate font-mono text-[11px] text-slate-400">{wa.replace("62", "0")}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </CSSFadeIn>
      </section>
    </div>
  );
}
