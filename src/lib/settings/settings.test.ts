import { describe, it, expect } from "vitest";
import {
  SETTING_FIELDS,
  SETTING_FIELD_MAP,
  fieldsForGroup,
  validateSettingValue,
  defaultFor,
  type SettingField,
  type SettingGroup,
} from "@/lib/settings/registry";

describe("Settings Registry: skema & validasi", () => {
  it("semua field punya key unik (snake_case)", () => {
    const keys = SETTING_FIELDS.map((f) => f.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
    keys.forEach((k) => expect(k).toMatch(/^[a-z0-9_]+$/));
  });

  it("enam grup lengkap & field terdistribusi", () => {
    const groups: SettingGroup[] = [
      "identitas",
      "kontak",
      "media_sosial",
      "seo",
      "footer",
      "tema",
    ];
    groups.forEach((g) => {
      const fields = fieldsForGroup(g);
      expect(fields.length).toBeGreaterThan(0);
      fields.forEach((f) => expect(f.group).toBe(g));
    });
  });

  it("SETTING_FIELD_MAP lookup cepat valid", () => {
    expect(SETTING_FIELD_MAP.site_name).toBeDefined();
    expect(SETTING_FIELD_MAP.theme_primary).toBeDefined();
    expect(SETTING_FIELD_MAP.tidak_ada).toBeUndefined();
  });

  it("defaultFor mengembalikan default dari registry", () => {
    expect(defaultFor("site_name")).toBe("SMP Muhammadiyah 4 Tanggul");
    expect(defaultFor("theme_primary")).toBe("#082b59");
    expect(defaultFor("tidak_ada")).toBe("");
  });

  describe("validateSettingValue", () => {
    // Gunakan field definisi asli dari registry untuk test validasi
    const emailField = SETTING_FIELD_MAP.contact_email as SettingField;
    const urlField = SETTING_FIELD_MAP.site_url as SettingField;
    const colorField = SETTING_FIELD_MAP.theme_primary as SettingField;

    it("kosong string → valid (null error)", () => {
      expect(validateSettingValue(emailField, "")).toBeNull();
      expect(validateSettingValue(urlField, "")).toBeNull();
    });

    it("format email invalid → error", () => {
      expect(validateSettingValue(emailField, "bukan-email")).toBe("Format surel tidak valid.");
      expect(validateSettingValue(emailField, "a@b")).toBe("Format surel tidak valid.");
      expect(validateSettingValue(emailField, "valid@domain.com")).toBeNull();
    });

    it("format URL invalid → error", () => {
      expect(validateSettingValue(urlField, "bukan url")).toBe("Harus berupa URL (https://…) atau path mulai “/”.");
      expect(validateSettingValue(urlField, "https://example.com")).toBeNull();
      expect(validateSettingValue(urlField, "/path/lokal")).toBeNull();
      expect(validateSettingValue(urlField, "mailto:test@example.com")).toBeNull();
    });

    it("format warna hex invalid → error", () => {
      expect(validateSettingValue(colorField, "merah")).toBe("Warna harus berupa heksadesimal, mis. #082b59.");
      expect(validateSettingValue(colorField, "#GGG")).toBe("Warna harus berupa heksadesimal, mis. #082b59.");
      expect(validateSettingValue(colorField, "#082b59")).toBeNull();
      expect(validateSettingValue(colorField, "#fff")).toBeNull();
    });

    it("field tanpa validasi custom → selalu null", () => {
      const textField = SETTING_FIELD_MAP.site_name as SettingField;
      expect(validateSettingValue(textField, "apapun")).toBeNull();
    });
  });
});