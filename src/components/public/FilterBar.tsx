import type { ComponentType } from "react";
import { MagnifyingGlass } from "@/components/Icons";
import { CSSFadeIn } from "@/components/CSSAnimations";
import CategoryChips, { type CategoryChip } from "./CategoryChips";

export type FilterChip = CategoryChip;

/**
 * Bilah filter GET tanpa JS: satu input pencarian + chip kategori (satu gaya
 * kanonik untuk /news, /articles, /activities).
 */
export default function FilterBar({
  action,
  searchName = "search",
  searchValue,
  searchPlaceholder = "Cari...",
  searchIcon: SearchIcon = MagnifyingGlass,
  searchId,
  chips,
  hiddenFields = {},
  className = "",
}: {
  action: string;
  searchName?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  searchIcon?: ComponentType<{ className?: string }>;
  /** id unik untuk label input (mutlak perlu bila halaman punya 2 form). */
  searchId?: string;
  chips?: FilterChip[];
  hiddenFields?: Record<string, string>;
  className?: string;
}) {
  return (
    <CSSFadeIn className={`mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <form action={action} method="GET" className="relative w-full sm:max-w-xs">
        <label htmlFor={searchId || searchName} className="sr-only">{searchPlaceholder}</label>
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={searchId || searchName}
          type="search"
          name={searchName}
          defaultValue={searchValue}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
        />
        {Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      </form>
      {chips && chips.length > 0 && <CategoryChips chips={chips} />}
    </CSSFadeIn>
  );
}
