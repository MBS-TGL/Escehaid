import { beforeEach, describe, expect, it } from "vitest";
import { RECENT_MENUS_MAX, readRecentMenus, saveRecentMenu } from "./recent-menus";

describe("recent-menus", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("terbaru dulu, tanpa duplikat — menu lama dipindah ke depan", () => {
    saveRecentMenu("/admin");
    saveRecentMenu("/admin/news");
    saveRecentMenu("/admin");
    expect(readRecentMenus()).toEqual(["/admin", "/admin/news"]);
  });

  it("dipangkas sesuai RECENT_MENUS_MAX (4)", () => {
    for (const href of ["/h1", "/h2", "/h3", "/h4", "/h5"]) saveRecentMenu(href);
    const list = readRecentMenus();
    expect(list).toHaveLength(RECENT_MENUS_MAX);
    expect(list[0]).toBe("/h5");
    expect(list).not.toContain("/h1");
  });

  it("href kosong tak tersimpan; data rusak → []", () => {
    saveRecentMenu("/a");
    expect(saveRecentMenu(" ")).toEqual(["/a"]);
    window.localStorage.setItem("admin-recent-menus", "{broken");
    expect(readRecentMenus()).toEqual([]);
    saveRecentMenu("/b");
    expect(readRecentMenus()).toEqual(["/b"]);
  });
});
