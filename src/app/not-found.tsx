import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="text-center">
        <p className="text-7xl font-bold text-[#082b59]/10">404</p>
        <h2 className="mt-4 text-xl font-bold text-slate-800">Halaman Tidak Ditemukan</h2>
        <p className="mt-2 text-sm text-slate-500">
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-[#082b59] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1767b1]"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
