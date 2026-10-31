import { describe, it, expect } from "vitest";
import { sendTelegramNotification } from "./telegram";

describe("telegram adapter: format & dispatch", () => {
  it("berjalan dalam mode dry-run jika kredensial kosong tanpa melempar exception", async () => {
    const res = await sendTelegramNotification({
      title: "Uji Coba Alert",
      message: "Pesan percobaan sistem",
      level: "warning",
    }, { botToken: "", chatId: "" });

    expect(res.success).toBe(true);
    expect(res.channel).toBe("telegram");
    expect(String(res.detail)).toContain("Dry-run");
  });
});
