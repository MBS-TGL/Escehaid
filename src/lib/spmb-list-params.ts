/**
 * Sinkronisasi state filter/sort/page daftar admin ↔ query string URL
 * (supaya filter bisa dibagikan/bookmark). Fungsi murni.
 */

export interface SpmbListUiParams {
  q: string;
  status: string;
  path: string;
  program: string;
  gender: string;
  action: string;
  interview: string;
  sort: string;
  page: number;
  size: number;
  tab: string;
}

export const SPMB_LIST_DEFAULTS: SpmbListUiParams = {
  q: "",
  status: "all",
  path: "all",
  program: "all",
  gender: "all",
  action: "all",
  interview: "all",
  sort: "created_at:desc",
  page: 1,
  size: 10,
  tab: "registrations",
};

const KNOWN_TABS = new Set(["registrations", "pipeline", "interviews", "waves", "form", "settings", "stats", "duplicates"]);

/** Baca SearchParams → state (nilai tak dikenal jatuh ke default). */
export function parseSpmbListParams(search: URLSearchParams): SpmbListUiParams {
  const pick = (key: keyof SpmbListUiParams, fallback: string) => {
    const v = search.get(key === "q" ? "q" : key);
    return v === null || v === "" ? fallback : v;
  };
  const page = Number(search.get("page"));
  const size = Number(search.get("size"));
  const tab = search.get("tab") ?? "";
  return {
    q: pick("q", ""),
    status: pick("status", "all"),
    path: pick("path", "all"),
    program: pick("program", "all"),
    gender: pick("gender", "all"),
    action: pick("action", "all"),
    interview: pick("interview", "all"),
    sort: pick("sort", "created_at:desc"),
    page: Number.isInteger(page) && page > 0 ? page : 1,
    size: [10, 25, 50, 100].includes(size) ? size : 10,
    tab: KNOWN_TABS.has(tab) ? tab : "registrations",
  };
}

/** State → query string (default dihilangkan agar URL tetap pendek). */
export function serializeSpmbListParams(p: SpmbListUiParams): string {
  const d = SPMB_LIST_DEFAULTS;
  const out = new URLSearchParams();
  if (p.q) out.set("q", p.q);
  if (p.status !== d.status) out.set("status", p.status);
  if (p.path !== d.path) out.set("path", p.path);
  if (p.program !== d.program) out.set("program", p.program);
  if (p.gender !== d.gender) out.set("gender", p.gender);
  if (p.action !== d.action) out.set("action", p.action);
  if (p.interview !== d.interview) out.set("interview", p.interview);
  if (p.sort !== d.sort) out.set("sort", p.sort);
  if (p.page !== d.page) out.set("page", String(p.page));
  if (p.size !== d.size) out.set("size", String(p.size));
  if (p.tab !== d.tab) out.set("tab", p.tab);
  return out.toString();
}
