import { NextResponse } from "next/server";
import { forbiddenResponseIfLacks } from "@/lib/rbac/server";
import { createClient } from "@/lib/supabase-server";
import { clientIpFrom, createRateLimiter } from "@/lib/rate-limit";

/**
 * POST /api/admin/backup/trigger — jalankan workflow GitHub Actions "Backup"
 * sekarang (repository_dispatch event "run-backup").
 *
 * Butuh env (Vercel → Project Settings → Environment Variables):
 *   BACKUP_GH_TOKEN — fine-grained PAT dengan izin "Actions: write" utk repo ini
 *   BACKUP_GH_REPO  — mis. "MBS-TGL/Escehaid"
 * Bila belum diset → 501 dengan pesan; tombol UI menampilkan penjelasan.
 */

export const runtime = "nodejs";

// Trigger manual jarang: 3x/menit per IP cukup (anti dobel-klik / abuse).
const limiter = createRateLimiter(3, 60_000);

export async function POST(req: Request) {
  const forbidden = await forbiddenResponseIfLacks("backup:update");
  if (forbidden) return NextResponse.json(forbidden.body, { status: forbidden.status });

  const { allowed, retryAfterSec } = limiter.check(clientIpFrom(req));
  if (!allowed) {
    return NextResponse.json({ error: "Terlalu sering. Tunggu sebentar lalu coba lagi." }, {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  const token = process.env.BACKUP_GH_TOKEN;
  const repo = process.env.BACKUP_GH_REPO;
  if (!token || !repo) {
    return NextResponse.json(
      { error: "Pemicu backup belum dikonfigurasi: set env BACKUP_GH_TOKEN (PAT izin Actions:write) dan BACKUP_GH_REPO (mis. MBS-TGL/Escehaid). Backup terjadwal tetap jalan tiap hari 02:30 WIB." },
      { status: 501 }
    );
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ event_type: "run-backup" }),
    });
    if (!res.ok) {
      const text = (await res.text()).slice(0, 300);
      return NextResponse.json({ error: `GitHub menolak: ${res.status} ${text}` }, { status: 502 });
    }

    // Jejak audit trigger manual (sebelumnya tidak tercatat sama sekali).
    const supabase = await createClient();
    await supabase
      .rpc("log_activity", {
        p_action: "update",
        p_entity_type: "backup",
        p_entity_id: null,
        p_detail: { module: "backup", action: "manual_trigger", repo },
      })
      .then(() => undefined, () => undefined);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal menghubungi GitHub." }, { status: 502 });
  }
}
