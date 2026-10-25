import { beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_SIDEBAR_COLLAPSED_KEY,
  readSidebarCollapsed,
  saveSidebarCollapsed,
} from "./admin-sidebar-state";

describe("admin-sidebar-state", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("default false saat key belum ada", () => {
    expect(readSidebarCollapsed()).toBe(false);
  });

  it("round-trip: simpan true lalu false", () => {
    saveSidebarCollapsed(true);
    expect(readSidebarCollapsed()).toBe(true);

    saveSidebarCollapsed(false);
    expect(readSidebarCollapsed()).toBe(false);
  });

  it("nilai tak dikenal / data rusak → false (menu tetap lengkap)", () => {
    for (const junk of ["{broken", "true", "", "yes", "2"]) {
      window.localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, junk);
      expect(readSidebarCollapsed(), junk).toBe(false);
    }
  });
});
