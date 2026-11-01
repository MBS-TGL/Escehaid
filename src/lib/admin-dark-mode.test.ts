import { beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_DARK_MODE_KEY,
  applyAdminDarkMode,
  readAdminDarkMode,
  saveAdminDarkMode,
} from "./admin-dark-mode";

describe("admin-dark-mode", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.adminDark;
  });

  it("default mati; simpan/baca bertahan", () => {
    expect(readAdminDarkMode()).toBe(false);
    saveAdminDarkMode(true);
    expect(window.localStorage.getItem(ADMIN_DARK_MODE_KEY)).toBe("1");
    expect(readAdminDarkMode()).toBe(true);
    saveAdminDarkMode(false);
    expect(readAdminDarkMode()).toBe(false);
  });

  it("data rusak → mati", () => {
    window.localStorage.setItem(ADMIN_DARK_MODE_KEY, "rusak");
    expect(readAdminDarkMode()).toBe(false);
  });

  it("apply memasang & melepas atribut html", () => {
    applyAdminDarkMode(true);
    expect(document.documentElement.dataset.adminDark).toBe("true");
    applyAdminDarkMode(false);
    expect(document.documentElement.dataset.adminDark).toBeUndefined();
  });
});
