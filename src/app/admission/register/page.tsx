import SPMBForm from "./SPMBForm";
import { FadeIn } from "@/components/animations";
import { FileText, CheckCircle, Phone } from "@/components/icons";

export default function SPMBRegisterPage() {
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
        <SPMBForm />

        <FadeIn>
          <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] p-5">
            <div className="mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#1767b1]" />
              <h3 className="text-sm font-bold text-[#082b59]">Contact Person</h3>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              {[
                ["Bu Azizah", "6285259341209"],
                ["Bu Lusi", "6282302326820"],
                ["Pak Arif", "6285806738160"],
              ].map(([name, wa]) => (
                <a
                  key={wa}
                  href={`https://wa.me/${wa}?text=Assalamualaikum%2C%20saya%20ingin%20bertanya%20tentang%20SPMB`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-[#dce3ed] bg-white px-3 py-2 transition-all hover:border-green-400 hover:bg-green-50"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-green-600">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-[#082b59]">{name}</div>
                    <div className="truncate font-mono text-[11px] text-slate-400">{wa.replace("62", "0")}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
