import { describe, it, expect } from "vitest";
import { can, type PermissionSubject } from "@/lib/rbac";
import { ALL_PERMISSIONS } from "@/lib/rbac/permissions";

const SUPER_ADMIN_SUBJECT: PermissionSubject = {
  system_role: "SUPER_ADMIN",
  role: "developer",
  is_active: true,
  permissions: ALL_PERMISSIONS,
};

const ADMIN_SUBJECT: PermissionSubject = {
  system_role: "ADMIN_SEKOLAH",
  role: "admin",
  is_active: true,
  permissions: ["settings:manage", "logs:read"],
};

const OPERATOR_SUBJECT: PermissionSubject = {
  system_role: "OPERATOR_KONTEN",
  role: "publisher",
  is_active: true,
  permissions: ["berita:create", "berita:update", "artikel:create", "artikel:update"],
};

const INACTIVE_SUBJECT: PermissionSubject = {
  system_role: "ADMIN_SEKOLAH",
  role: "admin",
  is_active: false,
  permissions: ["settings:manage"],
};

describe("RBAC: can() pure function", () => {
  it("SUPER_ADMIN lolos semua izin (termasuk yang tidak ada di registry)", () => {
    expect(can(SUPER_ADMIN_SUBJECT, "users:manage")).toBe(true);
    expect(can(SUPER_ADMIN_SUBJECT, "settings:manage")).toBe(true);
    expect(can(SUPER_ADMIN_SUBJECT, "flags:manage")).toBe(true);
    expect(can(SUPER_ADMIN_SUBJECT, "logs:read")).toBe(true);
    expect(can(SUPER_ADMIN_SUBJECT, "nonexistent:perm")).toBe(true);
  });

  it("ADMIN_SEKOLAH hanya lolos izin yang dimiliki", () => {
    expect(can(ADMIN_SUBJECT, "settings:manage")).toBe(true);
    expect(can(ADMIN_SUBJECT, "logs:read")).toBe(true);
    expect(can(ADMIN_SUBJECT, "users:manage")).toBe(false);
    expect(can(ADMIN_SUBJECT, "flags:manage")).toBe(false);
  });

  it("OPERATOR_KONTEN hanya lolos izin konten", () => {
    expect(can(OPERATOR_SUBJECT, "berita:create")).toBe(true);
    expect(can(OPERATOR_SUBJECT, "artikel:create")).toBe(true);
    expect(can(OPERATOR_SUBJECT, "berita:update")).toBe(true);
    expect(can(OPERATOR_SUBJECT, "settings:manage")).toBe(false);
    expect(can(OPERATOR_SUBJECT, "users:manage")).toBe(false);
  });

  it("user nonaktif tidak lolos izin apa pun", () => {
    expect(can(INACTIVE_SUBJECT, "settings:manage")).toBe(false);
    expect(can(INACTIVE_SUBJECT, "logs:read")).toBe(false);
  });

  it("subject null/undefined tidak lolos", () => {
    expect(can(null, "settings:manage")).toBe(false);
    expect(can(undefined, "settings:manage")).toBe(false);
  });

  it("subject tanpa permissions tidak lolos (kecuali SUPER_ADMIN) — system_role null pakai fallback legacy", () => {
    // system_role null + role legacy non-admin (teacher) → tidak lolos
    const noPermsLegacy: PermissionSubject = {
      system_role: null,
      role: "teacher",
      is_active: true,
      permissions: [],
    };
    expect(can(noPermsLegacy, "berita:create")).toBe(false);
  });

  it("system_role non-super dengan permissions kosong → pakai default peran tersebut", () => {
    // OPERATOR_KONTEN punya default CONTENT_PERMISSIONS (termasuk berita:create)
    const opKontenNoPerms: PermissionSubject = {
      system_role: "OPERATOR_KONTEN",
      role: "publisher",
      is_active: true,
      permissions: [],
    };
    expect(can(opKontenNoPerms, "berita:create")).toBe(true); // default peran
  });

  it("role legacy developer/admin/publisher tanpa system_role → fallback SUPER_ADMIN", () => {
    const legacyDeveloper: PermissionSubject = {
      system_role: null,
      role: "developer",
      is_active: true,
      permissions: [],
    };
    const legacyAdmin: PermissionSubject = {
      system_role: null,
      role: "admin",
      is_active: true,
      permissions: [],
    };
    const legacyPublisher: PermissionSubject = {
      system_role: null,
      role: "publisher",
      is_active: true,
      permissions: [],
    };

    // Fallback legacy ke SUPER_ADMIN (sesuai Phase A design)
    expect(can(legacyDeveloper, "users:manage")).toBe(true);
    expect(can(legacyAdmin, "users:manage")).toBe(true);
    expect(can(legacyPublisher, "users:manage")).toBe(true);
  });
});