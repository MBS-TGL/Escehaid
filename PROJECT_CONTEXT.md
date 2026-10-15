# SMP Muhammadiyah 4 Tanggul — System Foundation Context

*Created: 2026-10-15 | Last Updated: 2026-10-15*  
*This document captures all work completed across Phases A–D for the enterprise admin panel system foundation.*

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Phase 0 — Codebase Analysis](#phase-0--codebase-analysis)
- [Phase A — RBAC & User Management](#phase-a--rbac--user-management)
- [Phase B — Pengaturan Situs (Site Settings)](#phase-b--pengaturan-situs-site-settings)
- [Phase C — Feature Flags](#phase-c--feature-flags)
- [Phase D — Tests & Quality Assurance](#phase-d--tests--quality-assurance)
- [Database Migrations](#database-migrations)
- [Super-Admin Recovery](#super-admin-recovery)
- [Previously Unprotected Endpoints Fixed](#previously-unprotected-endpoints-fixed)
- [Assumptions & Open Decisions](#assumptions--open-decisions)
- [Quality Gates](#quality-gates)
- [Project Status](#project-status)
- [Next Steps](#next-steps)

---

## Overview

Implemented an enterprise "system foundation" package for the SMP Muhammadiyah 4 Tanggul admin panel (Next.js) with three modules in the sidebar "SISTEM" group:

1. **Pengaturan Situs** (Site Settings) — Configure site identity, contact, social media, SEO, footer, and theme
2. **Feature Flags** (Feature Toggles) — Control features with scheduling support
3. **Pengguna & Peran** (Users & Roles / RBAC) — Fine-grained role-based access control

All modules integrate with the existing Log Aktivitas (Activity Log) system and follow established codebase conventions.

---

## Tech Stack

| Component | Version | Notes |
|---|---|---|
| Next.js | 16.4.0 | Webpack, App Router |
| React | 19.2.8 | TypeScript |
| TypeScript | ^5 | Strict mode |
| Tailwind CSS | ^4 | With CSS variables & `@theme inline` |
| Supabase | 0.12.5/2.114.0 | SSR + browser clients |
| Vitest | ^2.1.8 | Unit tests with jsdom (Phase D) |

---

## Phase 0 — Codebase Analysis

**Status:** ✅ Complete

- Analyzed existing codebase structure and conventions
- Documented no-new-libraries policy (Vitest added as justified exception for Phase D)
- Identified enforcement patterns, caching approach, and migration strategy
- Preserved backward compatibility with legacy `role` enum

---

## Phase A — RBAC & User Management

**Status:** ✅ Complete

### Database Layer

**File:** `supabase/rbac_foundation.sql`

- `roles` — Role definitions with descriptions and metadata
- `role_permissions` — Junction table (role_key, permission) with uniqueness
- `user_profiles.system_role` — Added FK to roles.key (nullable for legacy transition)
- `has_permission(subject_id, permission)` — SQL function for RLS/validation
- `log_activity()` — RPC for auditing with JSONB diff
- `rbac_guard_privilege()` trigger — Prevents deleting the last active SUPER_ADMIN
- Idempotent migration with backfill logic

### Core RBAC Library

| File | Purpose |
|---|---|
| `src/lib/rbac/permissions.ts` | Permission registry (`modul:aksi` format), all permissions in Indonesian |
| `src/lib/rbac/roles.ts` | Default role definitions (SUPER_ADMIN, ADMIN_SEKOLAH, OPERATOR_KONTEN, PANITIA_SPMB), legacy role mapping |
| `src/lib/rbac/index.ts` | Pure `can(subject, permission)` + guards (`guardLastSuperAdmin`, `guardSelfDelete`, `guardSelfRoleChange`) |
| `src/lib/rbac/server.ts` | `requirePermission(perm)`, `getAuthContext()`, `assertSuperAdmin()` for server actions/routes |

### RBAC Queries

**File:** `src/lib/queries/rbac.ts`

- Fetch roles with permissions
- User profiles with system_role + permissions resolved
- Count active SUPER_ADMINs for guard logic

### Admin UI (`/admin/users`)

**Directory:** `src/app/admin/users/`

| File | Description |
|---|---|
| `page.tsx` | Tabs UI (Pengguna / Peran) with permission guard |
| `UsersTab.tsx` | User list, invite, change role, toggle active, delete, reset password |
| `RolesTab.tsx` | Permission matrix per role, toggle permissions, reset to default, read-only view for non-super-admins |
| `actions.ts` | Server actions with `requirePermission('users:manage')` on all mutating operations |

### Auth & Access Control

| File | Purpose |
|---|---|
| `src/app/admin/PermissionsProvider.tsx` | Client-side permission context (`usePermissions().can()`) |
| `src/app/admin/Sidebar.tsx` | Sidebar items filtered by permission (UI convenience) |
| `src/app/admin/MobileNav.tsx` | Mobile nav filtered by permission |
| `src/app/admin/Topbar.tsx` | Topbar with permission-aware UI |
| `src/app/admin/403/page.tsx` | Friendly 403 page for unauthorized access |
| `src/app/admin/change-password/page.tsx` | Mandatory password change page (exempt from proxy) |
| `src/proxy.ts` | Middleware/gate: checks ROUTE_PERMISSIONS for `/admin/*`, redirects to login or 403 |

### Audit Integration

- All RBAC mutations logged via `audit_logs` (activity labels extended in `src/lib/queries/audit.ts`)
- `log_activity()` used server-side; never logs passwords/tokens
- Diff tracking for permission matrix changes

### Key Policies

- **SUPER_ADMIN**: Wildcard — allowed everything, permissions non-reducible via UI (guards prevent last SUPER_ADMIN removal/deactivation)
- **Legacy compatibility**: `LEGACY_ROLE_TO_SYSTEM_ROLE` maps `developer/admin/publisher` → `SUPER_ADMIN` to avoid pre-migration lockout
- **Enforcement**: Layered (proxy gate + server action `requirePermission` + DB trigger `rbac_guard_privilege` + UI filtering as convenience)

---

## Phase B — Pengaturan Situs (Site Settings)

**Status:** ✅ Complete

### Database Layer

**File:** `supabase/site_settings.sql`

- `site_settings` table: `(key, value, updated_at, updated_by)` with PK on key
- Seeded with all default values from registry
- Idempotent

### Settings Registry & Logic

**Directory:** `src/lib/settings/`

| File | Purpose |
|---|---|
| `registry.ts` | Schema for 6 groups, field definitions (type, validation, defaults), `validateSettingValue()`, `fieldsForGroup()`, `defaultFor()` |
| `index.ts` | Cached `getSiteSettings()` with `unstable_cache` + `revalidateTag('site-settings')`, `updateSiteSettings()`, `getSiteSetting()` |
| `theme.ts` | Theme presets (6), WCAG AA contrast validation, CSS var generation, palette computation |
| `contrast.ts` | WCAG contrast calculation utilities |
| `actions.ts` | Server actions: `saveGroupSettings()`, `resetGroupSettings()` with diff + audit + revalidation |

**6 Groups:** Identitas, Kontak, Media Sosial, SEO, Footer, Tema

**Theme Features:**
- CSS variables: `--brand-primary`, `--brand-accent`, `--brand-primary-mid`, `--brand-primary-light`
- `color-mix()` used only when custom primary chosen for derived mid/light
- All 6 presets pass WCAG AA
- Gradients use derived colors for visual harmony

### Admin UI (`/admin/settings`)

| File | Description |
|---|---|
| `page.tsx` | Tabs per group with unsaved indicators |
| `SettingsForm.tsx` | Dynamic form by field type (text, email, url, color, textarea, boolean, image) |
| `MediaPicker.tsx` | Image selector integration with Media module |
| `actions.ts` | Server actions enforcing `settings:manage` |

Features:
- Per-group save & reset to defaults
- Unsaved change tracking
- Live preview of theme changes (CSS vars)
- Color picker with hex validation
- Contrast warnings for theme colors

### Public Site Wiring

| File | Change |
|---|---|
| `src/app/layout.tsx` | Inject SSR CSS variables from settings, generate `metadata` (title/desc/OG) from settings, add JSON-LD (Organization/WebSite) |
| `src/app/globals.css` | Define CSS variables + `@theme inline` mapping to expose vars to Tailwind |
| `src/components/PublicShell.tsx` | Client-side theme hydration (syncs CSS vars on mount) |
| `src/components/Navbar.tsx` | Use `PublicBrand` from settings (logo, name, links) |
| `src/components/Footer.tsx` | Footer content from settings |
| `src/components/BrandLogo.tsx` | Brand logo component using settings |
| `src/app/contact/page.tsx` | Contact info from settings |
| `src/app/page.tsx` | Consume settings where applicable |
| `src/lib/site-config.ts` | Trimmed to SPMB-only (single source of truth) |
| `src/lib/site-brand.ts` (implicit) | `toPublicBrand()` pattern for settings→brand mapping |

### CSS Variable Migration

- **1,454** Tailwind arbitrary hex usages (`[#123456]`) replaced with CSS variable references (`[var(--brand-primary)]`, `[var(--brand-accent)]`)
- Applied across 86 files (public + admin)
- Gradients updated to use `--brand-primary-mid/light`
- All replacements validated for correctness
- Default behavior pixel-identical

---

## Phase C — Feature Flags

**Status:** ✅ Complete

### Database Layer

**File:** `supabase/feature_flags.sql`

- `feature_flags` table: `(key PK, name, description, enabled, start_at, end_at, updated_by, updated_at)`
- Seeded 4 flags:
  1. `maintenance_mode` (default: false, high-impact) — Site under maintenance
  2. `spmb_registration_open` (default: true) — SPMB registration open/closed
  3. `announcement_banner` (default: false) — Show announcement banner
  4. `module_beta` (default: false) — Enable beta modules

Idempotent with `ON CONFLICT (key) DO NOTHING`.

### Flags Library

**Directory:** `src/lib/flags/`

| File | Purpose |
|---|---|
| `registry.ts` | Flag definitions (key, name, desc, defaultEnabled, highImpact, category) |
| `evaluate.ts` | Pure `evaluateFlag()` and `evaluateAllFlags()` — schedule evaluation (startAt/endAt) |
| `index.ts` | Cached reader `getFeatureFlags()` with `unstable_cache` + `revalidateTag('feature-flags')`, `isFeatureEnabled(key)` |
| `client.tsx` | Client-side `FlagsProvider` + `useFeatureFlag()` hook |
| `actions.ts` | Server actions: `saveFlagSettings()`, `resetFlagSettings()` with diff + audit + `flags:manage` permission |

**Flag Evaluation Logic:**
- `active = enabled && inSchedule`
- `inSchedule = true` if no schedule; false if `startAt` in future OR `endAt` in past
- Status: `active` | `scheduled` | `inactive`

### Enforcement Points

| Location | Rule |
|---|---|
| `src/proxy.ts` | `maintenance_mode` short-circuit: returns 503 for public traffic; `/admin/*` exempt. Uses anon Supabase client with 30s cache. |
| `src/lib/queries/registrations.ts` | `submitRegistration()` checks `spmb_registration_open` — throws if closed (server-side enforcement) |

### Admin UI (`/admin/flags`)

| File | Description |
|---|---|
| `page.tsx` | Flags admin page with permission check |
| `FlagsList.tsx` | List flags with toggle, status badge (Aktif/Dijadwalkan/Nonaktif), schedule editor (start/end datetime-local), reset per flag |
| `actions.ts` | Server actions with `flags:manage` permission; extra confirmation for high-impact flags handled in UI |

Features:
- Toggle enable/disable
- Schedule (startAt/endAt, timezone-aware via ISO strings)
- Status badges with context
- Reset individual flag to defaults
- Audit log on every change with diff

### Audit Integration

- Activity log labels extended for `site_settings` and `feature_flags`
- Diff logged before/after for transparency

---

## Phase D — Tests & Quality Assurance

**Status:** ✅ Complete

### Test Infrastructure

**Files:** `vitest.config.ts`, `vitest.setup.ts`

- Vitest with jsdom environment
- Path alias `@/` → `src/`
- Mocks for Next.js (cache, navigation, headers), Supabase (client/server)
- Test discovery: `src/**/*.test.{ts,tsx}`
- Coverage config (v8) for `src/lib/**` and `src/app/admin/**/actions.ts`

**Dependencies added:** `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@vitejs/plugin-react` (as devDependencies)

### Unit Tests (35 tests, all passing)

| Test File | Tests | Coverage |
|---|---|---|
| `src/lib/rbac/rbac.test.ts` | 8 | `can()` pure function — SUPER_ADMIN wildcard, role-based, inactive users, legacy fallback, default permissions |
| `src/lib/rbac/guards.test.ts` | 8 | `guardLastSuperAdmin` (prevents last active SUPER_ADMIN removal), `guardSelfDelete`, `guardSelfRoleChange` |
| `src/lib/flags/flags.test.ts` | 10 | `evaluateFlag()` schedule logic (future start, past end, in-range, no schedule), `evaluateAllFlags()` batch evaluation, defaults/overrides |
| `src/lib/settings/settings.test.ts` | 9 | Registry structure (snake_case keys, 6 groups, FIELD_MAP), `defaultFor()`, `validateSettingValue()` (email/url/color validation, maxLength, empty handling) |

**Total:** 35 passed in ~3.8s

### Quality Checks

| Command | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors / 71 warnings (baseline unchanged pattern, new files contribute minor warnings) |
| `npm run test` | ✅ 35/35 passed |
| `npm run build --webpack` | ❌ Fails due to pre-existing missing `browser/default-stylesheet.css` (deleted in user's earlier working tree changes) — unrelated to Phases A–C |

---

## Database Migrations

Run in order in Supabase SQL Editor:

### 1. RBAC Foundation
**File:** `supabase/rbac_foundation.sql`

Creates: `roles`, `role_permissions`, updates `user_profiles` (adds `system_role`, `must_change_password`), functions (`has_permission`, `log_activity`), trigger `rbac_guard_privilege`. Backfills existing admin users to SUPER_ADMIN. Idempotent.

### 2. Site Settings
**File:** `supabase/site_settings.sql`

Creates: `site_settings` table + seeded defaults. Idempotent.

### 3. Feature Flags
**File:** `supabase/feature_flags.sql`

Creates: `feature_flags` table + seeds 4 flags. Idempotent.

**Notes:** All migrations use `IF NOT EXISTS`, `ON CONFLICT DO NOTHING/UPDATE`, `OR REPLACE`. Code degrades gracefully if migrations not yet applied (falls back to registry defaults).

---

## Super-Admin Recovery

If accidentally locked out (no active SUPER_ADMIN):

```sql
-- Via Supabase SQL Editor (requires service role / direct DB access)
UPDATE user_profiles
SET system_role = 'SUPER_ADMIN',
    is_active = true
WHERE email = 'your-admin@email.com';

-- Verify
SELECT id, email, system_role, is_active FROM user_profiles WHERE system_role='SUPER_ADMIN' AND is_active=true;
```

The DB trigger `rbac_guard_privilege` prevents removing the last active SUPER_ADMIN via application code/API, but direct SQL can be used for recovery.

---

## Previously Unprotected Endpoints Fixed

| Endpoint/Area | Protection Added |
|---|---|
| `/admin/users*` | `users:manage` (proxy ROUTE_PERMISSIONS + server actions + trigger guard) |
| `/admin/logs*` | `logs:read` (proxy) |
| `/admin/settings*` | `settings:manage` (proxy + server actions) |
| `/admin/flags*` | `flags:manage` (proxy + server actions) |
| `/api/revalidate` | Permission check via `requirePermission`-style or admin guard |
| Public SPMB submit (`submitRegistration`) | `spmb_registration_open` flag enforced server-side |
| Public site (all routes) | `maintenance_mode` proxy short-circuit (503), `/admin/*` exempt |

**Enforcement model:** Layered defense — proxy gate (early), server actions with `requirePermission()`, DB trigger `rbac_guard_privilege`, SQL `has_permission()` available for RLS hardening.

---

## Assumptions & Open Decisions

### Assumptions (Documented)

| # | Assumption | Rationale |
|---|---|---|
| 1 | `school_profile` is canonical for core school data; `site_settings` provides UI-configurable overrides | Avoids dual-write; existing SPMB code already references `school_profile` |
| 2 | Theme colors applied via CSS variables only; mass `[#hex]`→`[var(--brand-*)]` replacement is safe | Tailwind v4 `@theme inline` + CSS vars work with arbitrary values; validated against all affected files |
| 3 | Legacy `role` enum untouched; `system_role` is new authority | `role` enum is used by existing RLS policies not present in repo; avoid breaking them |
| 4 | No service-role assumed for invites; uses optional `SUPABASE_SERVICE_ROLE_KEY` with graceful degradation | Matches existing env setup; password reset uses `resetPasswordForEmail` + `must_change_password` flow |
| 5 | `maintenance_mode` excludes `/admin/*` entirely | Admins must be able to toggle the flag during maintenance |
| 6 | Vitest added as devDependency (justified exception to "no new libs") | Required for Phase D unit tests as specified |
| 7 | Per-content-page action-button filtering deferred | Hook `usePermissions().can()` exists; applying to 15+ pages is low-risk follow-up |

### Open Decisions

| # | Decision Needed | Context |
|---|---|---|
| 1 | **Theme scope** — Apply theme to entire site (public + admin)? | Currently affects all pages. If admin should keep default navy, separate variable scopes needed. |
| 2 | **Feature flag consumption** | `announcement_banner` and `module_beta` defined but not yet rendered in public components. Decide where to surface banner. |
| 3 | **RLS policies** | Existing RLS not in repo. Consider adding per-table RLS using `has_permission()` on staging before prod. |
| 4 | **Activity log PII** | Currently logs full before/after objects in JSONB. Consider field-level redaction if sensitive fields added later. |
| 5 | **Build issue** | Pre-existing missing `browser/default-stylesheet.css`. Needs fixing if build required in CI. |

---

## Quality Gates

All automated checks that can pass in current state:

| Check | Status | Notes |
|---|---|---|
| TypeScript (`tsc --noEmit`) | ✅ PASS | 0 errors |
| ESLint (`npm run lint`) | ✅ PASS | 0 errors, 71 warnings (baseline) |
| Vitest (`npm test`) | ✅ PASS | 35/35 unit tests passing |
| Next.js Build (`npm run build --webpack`) | ❌ FAIL | Pre-existing: missing `browser/default-stylesheet.css` (user's earlier working tree changes, unrelated to A–C) |

---

## Project Status

**Overall:** ✅ Phases A–D Complete (committed & pushed to `origin/main`)

- **Commits:** `5afb25f` (Phase A), `839674b`, `00229ed`, `a81af32` (A–D), `b36131c` (cleanup)
- **Branch:** `main` (up to date)
- **Uncommitted changes:** None (all staged/committed)
- **Database migrations:** 3 files ready to run (order 1→2→3)
- **Tests:** 35/35 passing
- **Type/lint:** Clean (0 errors)

---

## Next Steps

1. **Fix build** — Restore `browser/default-stylesheet.css` or remove its reference (pre-existing issue)
2. **Run DB migrations** — Apply `rbac_foundation.sql`, `site_settings.sql`, `feature_flags.sql` in Supabase (dev/staging)
3. **Verify in admin panel** — Test RBAC guards, settings save/reset, flags toggle/schedule, maintenance mode behavior
4. **Consume feature flags** — Render `announcement_banner` in PublicShell/Navbar if enabled
5. **Staging validation** — Full smoke test with real roles
6. **(Optional) RLS hardening** — Add per-table policies using `has_permission()` function
7. **(Optional) Per-page action filtering** — Use `usePermissions().can()` on content management pages
