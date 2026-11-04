import type { Metadata } from "next";
import { getTeacherList } from "@/lib/queries";
import { GraduationCap } from "@/components/Icons";
import PageHero from "@/components/public/PageHero";
import EmptyState from "@/components/public/EmptyState";
import TeacherGrid from "@/app/profile/TeacherGrid";
import { ogImageOverride, pageOpenGraph } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const teachers = await getTeacherList();
  const description =
    "Guru dan staf SMP Muhammadiyah 4 Tanggul — pendidik yang membina santri dengan ilmu dan keteladanan nilai-nilai Islam.";
  return {
    title: "Guru & Staff",
    description,
    alternates: { canonical: "/teachers" },
    robots: teachers.length === 0 ? { index: false, follow: true } : undefined,
    openGraph: pageOpenGraph({
      title: "Guru & Staff",
      description,
      url: "/teachers",
      image: await ogImageOverride(),
    }),
  };
}

// Revalidasi on-demand dari panel admin (/admin/teachers) — TTL disamakan
// dengan halaman Kegiatan (300 detik).
export const revalidate = 300;

export default async function GuruPage() {
  const teachers = await getTeacherList();

  return (
    <div className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
              { "@type": "ListItem", position: 2, name: "Guru & Staff", item: "https://www.smpmuh4tanggul.sch.id/teachers" },
            ],
          }),
        }}
      />

      <PageHero
        variant="compact"
        eyebrow="Tenaga Pendidik"
        title="Guru & Staff"
        description="Para pendidik dan tenaga kependidikan yang membina santri dengan ilmu, adab, dan keteladanan."
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Guru & Staff" }]}
      />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
        {teachers.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Belum ada data guru & staff."
            description="Daftar guru dan staff akan tampil di halaman ini."
          />
        ) : (
          /* Grid kanonik dengan pencarian internal — komponen yang sama dengan
             section guru & staff halaman Profil, kini menampilkan seluruh baris. */
          <TeacherGrid teachers={teachers} />
        )}
      </section>
    </div>
  );
}
