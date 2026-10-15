import type { Metadata } from "next";
import { getFeatureFlags } from "@/lib/flags";
import { FlagsList } from "./FlagsList";
import { Gear } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Fitur",
};

export default async function AdminFlagsPage() {
  const { evaluations, overrides } = await getFeatureFlags();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#082b59]/10">
          <Gear className="h-5 w-5 text-[#082b59]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Feature Flags</h1>
          <p className="text-sm text-slate-500">
            Kelola fitur yang bisa diaktifkan/dinonaktifkan & dijadwalkan tanpa deploy ulang
          </p>
        </div>
      </div>

      <FlagsList initialFlags={evaluations} initialOverrides={overrides} />
    </div>
  );
}