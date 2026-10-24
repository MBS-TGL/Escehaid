import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabase";

const rpcMock = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

describe("pg_trgm helpers (shared)", () => {
  let shared: typeof import("./shared");

  beforeEach(async () => {
    vi.resetModules();
    rpcMock.mockReset();
    // Plan A: impor SEGAR (memuat probe memo per modul) — dinamis penting
    // karena `trgmProbePromise` memo per instance modul.
    shared = await import("./shared");
  });

  it("resolveSearchMode: token kosong → ilike tanpa memanggil probe", async () => {
    expect(await shared.resolveSearchMode("news", [])).toBe("ilike");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("probe: RPC belum ada → false → mode 'ilike' (fallback, nol crash)", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "Not found" } });
    expect(await shared.trgmSearchReady()).toBe(false);
    expect(await shared.resolveSearchMode("ekskuls", ["tapak", "suci"])).toBe("ilike");
  });

  it("probe: fungsi tersedia & jawaban true → mode 'similarity'", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    expect(await shared.trgmSearchReady()).toBe(true);
    expect(await shared.resolveSearchMode("articles", ["ustadzah"])).toBe("similarity");
  });

  it("probe memoized — RPC hanya sekali walau banyak pemanggil", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    await Promise.all([
      shared.trgmSearchReady(),
      shared.trgmSearchReady(),
      shared.resolveSearchMode("news", ["spmb"]),
    ]);
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it("fetchTrgmIds: aman saat error/null/bukan-array → null (wajib fallback)", async () => {
    rpcMock.mockResolvedValueOnce({ data: ["id-1", 42, null], error: null });
    const ok = await shared.fetchTrgmIds("search_news_ids", ["x"]);
    expect(ok).toEqual(["id-1"]);

    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    expect(await shared.fetchTrgmIds("search_news_ids", ["x"])).toBeNull();

    rpcMock.mockResolvedValueOnce({ data: "bukan array", error: null });
    expect(await shared.fetchTrgmIds("search_news_ids", ["x"])).toBeNull();
  });

  it("fetchTrgmIds meneruskan params bernama tokens + max_rows", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await shared.fetchTrgmIds("search_news_ids", ["a", "b"], 25);
    expect(rpcMock).toHaveBeenCalledWith("search_news_ids", { tokens: ["a", "b"], max_rows: 25 });
  });
});
