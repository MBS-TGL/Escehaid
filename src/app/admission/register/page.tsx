import PPDBForm from "@/components/PPDBForm";
import { FadeIn } from "@/components/animations";
import { FileText, CheckCircle, Phone } from "@/components/icons";

export default function PPDBFormPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 text-white md:py-16">
        <div className="absolute inset-0 opacity-[0.04]">
          <FileText className="absolute -right-10 -top-10 h-64 w-64 rotate-12" weight="fill" />
          <CheckCircle className="absolute -left-10 bottom-0 h-48 w-48 -rotate-12" weight="fill" />
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <FadeIn>
            <h1 className="text-3xl font-bold md:text-4xl">Formulir Pendaftaran</h1>
            <p className="mt-3 text-base text-white/70">Silakan isi formulir dengan data yang benar</p>
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <PPDBForm />

        <FadeIn>
          <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] p-5">
            <div className="mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#1767b1]" />
              <h3 className="text-sm font-bold text-[#082b59]">Contact Person</h3>
            </div>
            <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
              <a href="tel:085259341209" className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-white hover:text-[#1767b1]">
                <span className="text-slate-400">Bu Azizah</span>
                <span className="font-medium">085259341209</span>
              </a>
              <a href="tel:082302326820" className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-white hover:text-[#1767b1]">
                <span className="text-slate-400">Bu Lusi</span>
                <span className="font-medium">082302326820</span>
              </a>
              <a href="tel:085806738160" className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-white hover:text-[#1767b1]">
                <span className="text-slate-400">Pak Arif</span>
                <span className="font-medium">085806738160</span>
              </a>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
