import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function BeritaLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero skeleton */}
      <section className="relative bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 md:py-16">
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6">
          <SkeletonBlock className="mx-auto h-9 w-40 !bg-white/20" />
          <SkeletonBlock className="mx-auto mt-3 h-4 w-64 !bg-white/10" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Featured skeleton */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <SkeletonBlock className="h-[280px] md:h-[400px] !rounded-none" />
          <div className="p-6 md:p-8">
            <SkeletonBlock className="h-5 w-24" />
            <SkeletonBlock className="mt-3 h-7 w-3/4" />
            <SkeletonBlock className="mt-2 h-4 w-full" />
            <SkeletonBlock className="mt-3 h-3 w-32" />
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <SkeletonBlock className="h-44 !rounded-none" />
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <SkeletonBlock className="h-4 w-16" />
                  <SkeletonBlock className="h-3 w-20" />
                </div>
                <SkeletonBlock className="mt-2 h-4 w-full" />
                <SkeletonBlock className="mt-1.5 h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
