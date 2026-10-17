import { describe, it, expect } from "vitest";
import {
  guardLastSuperAdmin,
  guardSelfDelete,
  guardSelfRoleChange,
} from "@/lib/rbac/index";

const SUPER_ADMIN_TARGET = {
  id: "user-1",
  system_role: "SUPER_ADMIN",
  is_active: true,
};

const OTHER_SUPER_ADMIN = {
  id: "user-2",
  system_role: "SUPER_ADMIN",
  is_active: true,
};

const ADMIN_TARGET = {
  id: "user-3",
  system_role: "ADMIN_SEKOLAH",
  is_active: true,
};

describe("RBAC Guards: pure functions", () => {
  describe("guardLastSuperAdmin", () => {
    it("SUPER_ADMIN terakhir tidak boleh dihapus/dinonaktifkan", () => {
      // Hanya 1 SUPER_ADMIN aktif yang mau dihapus → tolak
      const result = guardLastSuperAdmin(SUPER_ADMIN_TARGET, []);
      expect(result).toBe("last_super_admin");
    });

    it("SUPER_ADMIN boleh dihapus jika ada yang lain", () => {
      const result = guardLastSuperAdmin(SUPER_ADMIN_TARGET, [OTHER_SUPER_ADMIN]);
      expect(result).toBeNull();
    });

    it("non-SUPER_ADMIN tidak terkena guard ini", () => {
      const result = guardLastSuperAdmin(ADMIN_TARGET, []);
      expect(result).toBeNull();
    });

    it("target sudah nonaktif tidak dihitung", () => {
      const inactiveSuper = { ...SUPER_ADMIN_TARGET, is_active: false };
      const result = guardLastSuperAdmin(inactiveSuper, []);
      expect(result).toBeNull();
    });
  });

  describe("guardSelfDelete", () => {
    it("user tidak boleh menghapus akun sendiri", () => {
      const result = guardSelfDelete("user-123", "user-123");
      expect(result).toBe("self_delete");
    });

    it("user boleh menghapus user lain", () => {
      const result = guardSelfDelete("user-123", "user-456");
      expect(result).toBeNull();
    });
  });

  describe("guardSelfRoleChange", () => {
    it("user tidak boleh mengubah peran sendiri", () => {
      const result = guardSelfRoleChange("user-123", "user-123");
      expect(result).toBe("self_role_change");
    });

    it("user boleh mengubah peran user lain", () => {
      const result = guardSelfRoleChange("user-123", "user-456");
      expect(result).toBeNull();
    });
  });
});