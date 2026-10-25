import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { clientIpFrom, createRateLimiter } from "@/lib/rate-limit";

/**
 * GET  /api/auth/sessions — daftar sesi/perangkat aktif milik user yang
 *      sedang login (tabel `sessions`, di-upsert oleh /api/auth/session).
 *      `current: true` pada sesi pemanggil (dicocokkan dari claim session_id).
 * POST /api/auth/sessions — { action: "sign_out_others" }: keluarkan SEMUA
 *      sesi lain secara sungguhan (signOut scope "others" native Supabase)
 *      + tandai barisnya revoked. Sesi saat ini tetap hidup.
 */

export const runtime = "nodejs";

const rateLimit = createRateLimiter(10, 60 * 1000);

interface SessionRow {
  session_id: string;
  user_agent: string;
  ip: string;
  last_seen_at: string;
  created_at: string;
}

async function currentSessionId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: claims } = await supabase.auth.getClaims();
  return (claims?.claims as { session_id?: string } | null)?.session_id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const current = await currentSessionId(supabase);
  const { data, error } = await supabase
    .from("sessions")
    .select("session_id, user_agent, ip, last_seen_at, created_at")
    .is("revoked_at", null)
    .gte("last_seen_at", new Date(Date.now() - 30 * 86400_000).toISOString())
    .order("last_seen_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as SessionRow[];
  return NextResponse.json({
    sessions: rows.map((r) => ({
      sessionId: r.session_id,
      device: r.user_agent || "Perangkat tidak dikenal",
      ip: r.ip,
      lastSeenAt: r.last_seen_at,
      createdAt: r.created_at,
      current: r.session_id === current,
    })),
  });
}

export async function POST(req: Request) {
  const { allowed, retryAfterSec } = rateLimit.check(clientIpFrom(req));
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu sering. Coba lagi beberapa saat." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const body = (await req.json().catch(() => null)) as { action?: string } | null;
  if (body?.action !== "sign_out_others") {
    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const current = await currentSessionId(supabase);

  // Invalidasi sungguhan: token semua sesi lain dicabut di level Supabase Auth.
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Tandai baris lain revoked agar langsung hilang dari daftar.
  if (current) {
    await supabase
      .from("sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", sessionData.session.user.id)
      .neq("session_id", current)
      .is("revoked_at", null);
  }

  return NextResponse.json({ success: true });
}
