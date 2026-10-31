import { describe, it, expect, vi } from "vitest";
import { approveAndPublishAction } from "./actions";

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getClaims: vi.fn().mockResolvedValue({ claims: { sub: "test-user-id" } }),
    },
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("review actions: persetujuan & publikasi konten", () => {
  it("approveAndPublishAction berhasil mengupdate status ke published", async () => {
    const res = await approveAndPublishAction({
      entityType: "news",
      entityId: "test-news-id",
      publishImmediately: true,
    });
    expect(res.success).toBe(true);
  });
});
