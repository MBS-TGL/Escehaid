import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canAccessAdminPanel } from "@/lib/auth";
import { canAny, type PermissionSubject } from "@/lib/rbac";
import { refineContent } from "@/lib/gemini";
import {
  aiPermissionsFor,
  isImportTarget,
  normalizeRefinedFor,
} from "@/lib/ai-refine";
import { sanitize } from "@/lib/sanitize";
import { createRateLimiter } from "@/lib/rate-limit";

/**
 * POST /api/ai/refine — refrase catatan mentah via Gemini untuk panel admin.
 * Header: Authorization: Bearer <supabase-access-token>
 * Body:   { target: "news"|"articles"|"activities"|"announcements", rawText }
 *
 * Tidak menulis ke database — hanya mengembalikan field yang siap diisi ke
 * form (ter-sanitasi & tervalidasi per modul). Izin: bisa create ATAU update
 * konten modul tujuan (pola sama dengan route /api/revalidate).
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_RAW_TEXT = 4000;
/** Batas rate-limit per user: 8 permintaan / menit, entri di-prune otomatis. */
const rateLimit = createRateLimiter(8, 60_000);

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: NextRequest) {
  // ── 1. Auth via bearer token (pola sama dengan /api/revalidate) ──
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return errorResponse("Sesi tidak ditemukan — muat ulang halaman.", 401);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return errorResponse("Sesi berakhir — muat ulang halaman, lalu coba lagi.", 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, is_active, system_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return errorResponse("Gagal memeriksa profil — coba lagi sebentar.", 500);
  }
  if (!profile) {
    return errorResponse("Profil admin tidak ditemukan.", 403);
  }
  if (!canAccessAdminPanel(profile)) {
    return errorResponse(
      profile.is_active
        ? "Anda tidak memiliki akses panel admin."
        : "Akun Anda tidak aktif — hubungi admin utama.",
      403
    );
  }

  // ── 2. Validasi body (target + izin modul masing-masing) ──
  let body: { target?: unknown; rawText?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Kiriman bukan JSON yang valid.", 400);
  }

  if (!isImportTarget(body?.target)) {
    return errorResponse("Target konten tidak dikenal.", 400);
  }
  const target = body.target;

  let permissions: string[] = [];
  if (profile.system_role) {
    const { data: rows } = await supabase
      .from("role_permissions")
      .select("permission")
      .eq("role_key", profile.system_role);
    permissions = (rows ?? []).map((r) => r.permission as string);
  }
  const subject: PermissionSubject = {
    system_role: profile.system_role,
    role: profile.role,
    is_active: profile.is_active,
    permissions,
  };
  if (!canAny(subject, aiPermissionsFor(target))) {
    return errorResponse("Anda tidak punya izin rapikan konten modul ini.", 403);
  }

  const { allowed, retryAfterSec } = rateLimit.check(user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu sering memakai AI — tunggu satu menit lagi." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const rawText = typeof body?.rawText === "string" ? body.rawText.trim() : "";
  if (!rawText) {
    return errorResponse("Tempel dulu catatan mentahnya — belum ada isinya.", 400);
  }
  if (rawText.length > MAX_RAW_TEXT) {
    return errorResponse(`Catatan terlalu panjang (maksimal ${MAX_RAW_TEXT} karakter).`, 400);
  }

  // ── 3. Refrase via Gemini + normalisasi hasil ──
  const refined = await refineContent({ target, rawText });
  if (!refined.ok) {
    const status = /GEMINI_API_KEY/.test(refined.error) ? 500 : 502;
    return errorResponse(refined.error, status);
  }

  // Normalisasi sekali, lalu disinifikasi untuk field HTML yang ada.
  const normalized = { ...normalizeRefinedFor(target, refined.data) };
  if (typeof normalized.content === "string") {
    normalized.content = sanitize(normalized.content);
  }

  return NextResponse.json({ ok: true, ...normalized });
}
