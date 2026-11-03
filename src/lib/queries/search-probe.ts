/**
 * Probe kanonik kesehatan pencarian (#41/#409) — ekspektasi v3.
 *
 * Pelajaran outage 24 Okt: `search_trgm_enabled()` = true SAJA tidak cukup —
 * ambang longgar (v2) atau argumen terbalik (v1) tetap membuat RPC "siap" tapi
 * hasil salah. Probe ini menegaskan 5 asersi KANONIK (AGENTS.md § sql/pg-trgm):
 *
 *   1. search_trgm_enabled → true
 *   2. search_news_ids(['spmb']) → non-kosong
 *   3. search_news_ids(['tapak']) → KOSONG (noise sub-kata ditolak v3)
 *   4. searchAllContent('tapak suci') → tepat 1 (hanya Ekstrakurikuler)
 *   5. searchAllContent('ustadzhtub') [typo] → ≥ 1
 *
 * Jalur ANON (fidelitas user, RLS security-invoker tetap berlaku) — bukan
 * service-role. Tiap asersi aman-tergagal (catch → fail, tidak throw) agar
 * `collectDiagnostics` tetap hijau walau DB sedang bermasalah.
 */
import { supabase } from "@/lib/supabase";
import { searchAllContent } from "./search";

/** Ambang word_similarity(token, kolom) v3 — SATU tempat bila ambang berubah. */
export const SEARCH_TRGM_THRESHOLD = 0.5;

export interface CanonicalCase {
  /** Kunci asersi, mis. "trgm-enabled". */
  key: string;
  /** Ekspektasi manusiawi, mis. "search_trgm_enabled = true". */
  expected: string;
  /** Hasil aktual ringkas, mis. "true" / "3 id" / "error: 42501". */
  actual: string;
  pass: boolean;
}

export interface CanonicalProbe {
  cases: CanonicalCase[];
  /** pass = semua asersi lolos. */
  pass: boolean;
  /** true bila outage user-visible (RPC spmb kosong) — pemanggil boleh merah. */
  outage: boolean;
  checkedAt: string;
}

async function rpcNewsIds(tokens: string[]): Promise<{ ids: string[] | null; err: string | null }> {
  try {
    const { data, error } = await supabase.rpc("search_news_ids", { tokens });
    if (error) return { ids: null, err: error.message };
    if (!Array.isArray(data)) return { ids: null, err: "respons bukan array" };
    return { ids: data.filter((e): e is string => typeof e === "string"), err: null };
  } catch (e) {
    return { ids: null, err: e instanceof Error ? e.message : "gagal RPC" };
  }
}

/** Jalankan 5 asersi kanonik — tidak pernah throw. */
export async function runCanonicalSearchProbe(): Promise<CanonicalProbe> {
  const cases: CanonicalCase[] = [];

  // 1. RPC tersedia & aktif.
  let enabled = false;
  try {
    const { data, error } = await supabase.rpc("search_trgm_enabled");
    enabled = !error && data === true;
    cases.push({
      key: "trgm-enabled",
      expected: "search_trgm_enabled = true",
      actual: error ? `error: ${error.message}` : String(data),
      pass: enabled,
    });
  } catch (e) {
    cases.push({
      key: "trgm-enabled",
      expected: "search_trgm_enabled = true",
      actual: e instanceof Error ? `error: ${e.message}` : "gagal RPC",
      pass: false,
    });
  }

  // 2. Token nyata "spmb" wajib punya kandidat.
  const spmb = await rpcNewsIds(["spmb"]);
  cases.push({
    key: "news-spmb",
    expected: "news['spmb'] non-kosong",
    actual: spmb.err ? `error: ${spmb.err}` : `${spmb.ids!.length} id`,
    pass: spmb.ids !== null && spmb.ids.length > 0,
  });

  // 3. Noise sub-kata "tapak" wajib DITOLAK v3 (ambang 0,50).
  const tapak = await rpcNewsIds(["tapak"]);
  cases.push({
    key: "news-tapak-noise",
    expected: "news['tapak'] kosong",
    actual: tapak.err ? `error: ${tapak.err}` : `${tapak.ids!.length} id`,
    pass: tapak.ids !== null && tapak.ids.length === 0,
  });

  // 4. Frasa "tapak suci" → tepat 1 hasil (hanya Ekstrakurikuler).
  try {
    const hits = await searchAllContent("tapak suci");
    cases.push({
      key: "api-tapak-suci",
      expected: "1 hasil (Ekstrakurikuler)",
      actual: `${hits.length} hasil`,
      pass: hits.length === 1,
    });
  } catch (e) {
    cases.push({
      key: "api-tapak-suci",
      expected: "1 hasil (Ekstrakurikuler)",
      actual: e instanceof Error ? `error: ${e.message}` : "gagal cari",
      pass: false,
    });
  }

  // 5. Typo "ustadzhtub" → ≥ 1 (toleransi typo bukti trgm hidup).
  try {
    const hits = await searchAllContent("ustadzhtub");
    cases.push({
      key: "api-typo",
      expected: "typo 'ustadzhtub' ≥ 1 hasil",
      actual: `${hits.length} hasil`,
      pass: hits.length >= 1,
    });
  } catch (e) {
    cases.push({
      key: "api-typo",
      expected: "typo 'ustadzhtub' ≥ 1 hasil",
      actual: e instanceof Error ? `error: ${e.message}` : "gagal cari",
      pass: false,
    });
  }

  const pass = cases.every((c) => c.pass);
  // Outage = pencarian nyata mati untuk kata umum (kasus 2).
  const outage = !cases[1].pass;
  return { cases, pass, outage, checkedAt: new Date().toISOString() };
}
