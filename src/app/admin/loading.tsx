// Tampil seketika saat berpindah halaman admin (dan memungkinkan Next
// memprefetch kerangka halaman), sehingga klik menu tidak terasa "diam".
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat…</span>
      <div className="mb-6 h-24 animate-pulse rounded-2xl bg-slate-200/70" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200/60" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
