import { describe, it, expect, vi } from "vitest";
import { scheduleInterviewAction } from "./actions";

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

describe("SPMB Actions: jadwal wawancara", () => {
  it("scheduleInterviewAction berhasil menyimpan tanggal & catatan wawancara", async () => {
    const res = await scheduleInterviewAction({
      registrationId: "test-reg-id",
      interviewAt: "2026-11-15T09:00:00Z",
      note: "Wawancara orang tua & santri di ruang TU",
    });
    expect(res.success).toBe(true);
  });
});
