import { describe, it, expect, vi } from "vitest";
import { executeGlobalSearch } from "./command-providers";

describe("command-providers: global command search", () => {
  const dummySupabase = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [
              { id: "1", title: "Lomba Silat Tapak Suci", summary: "Prestasi santri" },
            ],
          }),
        }),
        ilike: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [{ id: "s1", full_name: "Ahmad Dahlan", status: "pending" }],
          }),
        }),
      }),
    }),
  } as unknown as import("@supabase/supabase-js").SupabaseClient;

  it("mencocokkan aksi cepat statis tanpa izin khusus", async () => {
    const res = await executeGlobalSearch(dummySupabase, "website", []);
    expect(res.groups.some((g) => g.key === "actions")).toBe(true);
    const action = res.groups.find((g) => g.key === "actions")?.items[0];
    expect(action?.label).toContain("Website");
  });

  it("hanya mencari berita jika user memegang berita:read", async () => {
    // Tanpa izin:
    const noPermRes = await executeGlobalSearch(dummySupabase, "silat", []);
    expect(noPermRes.groups.some((g) => g.key === "news")).toBe(false);

    // Dengan izin:
    const withPermRes = await executeGlobalSearch(dummySupabase, "silat", ["berita:read"]);
    expect(withPermRes.groups.some((g) => g.key === "news")).toBe(true);
  });

  it("hanya mencari pendaftar SPMB jika user memegang spmb:read", async () => {
    const noPermRes = await executeGlobalSearch(dummySupabase, "ahmad", ["berita:read"]);
    expect(noPermRes.groups.some((g) => g.key === "admission")).toBe(false);

    const withPermRes = await executeGlobalSearch(dummySupabase, "ahmad", ["spmb:read"]);
    expect(withPermRes.groups.some((g) => g.key === "admission")).toBe(true);
  });

  it("mengindeks menu sidebar baru (review, sampah) dengan gate izin", async () => {
    // Tanpa izin khusus: menu berperm tidak muncul.
    const noPerm = await executeGlobalSearch(dummySupabase, "sampah", []);
    expect(
      noPerm.groups
        .flatMap((g) => g.items)
        .some((i) => i.href === "/admin/trash")
    ).toBe(false);

    // Dengan izin: muncul dan mengarah ke rute yang benar.
    const withPerm = await executeGlobalSearch(dummySupabase, "sampah", ["sampah:read"]);
    const trash = withPerm.groups.flatMap((g) => g.items).find((i) => i.href === "/admin/trash");
    expect(trash?.label).toContain("Sampah");

    const review = await executeGlobalSearch(dummySupabase, "inbox review", ["berita:review"]);
    expect(
      review.groups.flatMap((g) => g.items).some((i) => i.href === "/admin/review")
    ).toBe(true);
  });
});
