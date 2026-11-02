import { describe, expect, it } from "vitest";
import { buildSpmbTimeline } from "./spmb-timeline";

describe("buildSpmbTimeline", () => {
  it("menggabungkan audit, verifikasi, dan pesan secara terurut", () => {
    const events = buildSpmbTimeline({
      audits: [
        { action: "create", actor_name: "Sistem", created_at: "2026-10-01T00:00:00Z" },
        {
          action: "update",
          actor_name: "Admin",
          created_at: "2026-10-03T00:00:00Z",
          detail: { before: { status: "pending" }, after: { status: "accepted" } },
        },
      ],
      verifs: [{ document_key: "kk", status: "verified", verified_at: "2026-10-02T00:00:00Z" }],
      messages: [{ template_key: "accepted", status: "sent", sent_queued_at: "2026-10-04T00:00:00Z" }],
    });
    expect(events.map((e) => e.title)).toEqual([
      'Pesan WA "accepted": sent',
      "Status diubah (Diterima)",
      "Berkas Kartu Keluarga: valid",
      "Pendaftaran dibuat",
    ]);
    expect(events[1].detail).toBe("Status: Menunggu → Diterima");
  });

  it("melewatkan event tanpa timestamp", () => {
    const events = buildSpmbTimeline({
      audits: [],
      verifs: [{ document_key: "akta", status: "pending", verified_at: null }],
      messages: [],
    });
    expect(events).toEqual([]);
  });
});
