import { beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_DARK_INIT_SCRIPT,
  ADMIN_DARK_MODE_KEY,
  applyAdminDarkMode,
  parseAdminDarkModeValue,
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

  it("parse hanya menerima '1'", () => {
    expect(parseAdminDarkModeValue("1")).toBe(true);
    expect(parseAdminDarkModeValue("0")).toBe(false);
    expect(parseAdminDarkModeValue("rusak")).toBe(false);
    expect(parseAdminDarkModeValue(null)).toBe(false);
  });

  it("skrip anti-FOUC memakai kunci yang sama & memasang atribut di /admin", () => {
    expect(ADMIN_DARK_INIT_SCRIPT).toContain(JSON.stringify(ADMIN_DARK_MODE_KEY));
    // Jalankan skrip apa adanya (seperti browser saat parse <head>).
    window.history.pushState({}, "", "/admin");
    try {
      window.localStorage.setItem(ADMIN_DARK_MODE_KEY, "1");
      new Function(ADMIN_DARK_INIT_SCRIPT)();
      expect(document.documentElement.dataset.adminDark).toBe("true");
      delete document.documentElement.dataset.adminDark;
      window.localStorage.setItem(ADMIN_DARK_MODE_KEY, "0");
      new Function(ADMIN_DARK_INIT_SCRIPT)();
      expect(document.documentElement.dataset.adminDark).toBeUndefined();
    } finally {
      window.history.pushState({}, "", "/");
    }
  });

  it("skrip anti-FOUC no-op di luar /admin", () => {
    window.localStorage.setItem(ADMIN_DARK_MODE_KEY, "1");
    new Function(ADMIN_DARK_INIT_SCRIPT)();
    expect(document.documentElement.dataset.adminDark).toBeUndefined();
  });
});
