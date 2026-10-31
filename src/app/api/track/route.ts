import { NextResponse } from "next/server";
import { clientIpFrom, createRateLimiter } from "@/lib/rate-limit";
import { analyticsServiceClient, buildTrackedEvent } from "@/lib/analytics/track-server";

/**
 * Beacon analitik internal (fase 1) — POST dari `navigator.sendBeacon`.
 *
 * Tanpa cookie, tanpa IP, tanpa UA mentah — server hanya menyimpan path publik
 * + host perujuk + kelas perangkat (lihat `track-server.ts`). Klien kirim via
 * sendBeacon (selalu `Content-Type: text/plain` → body di-parse manual).
 *
 * Batas: 30/menit per IP (cukup longgar untuk 1 beacon per navigasi), body
 * versi mikro. Flag `admin_analytics` mengatur apakah beacon dipasang; server
 * tetap ringan (tolak tanpa menyentuh DB bila tidak aktif).
 */

const rateLimit = createRateLimiter(30, 60_000);

interface BeaconBody {
  path?: string;
  referrer?: string;
}

export async function POST(req: Request) {
  const { allowed, retryAfterSec } = rateLimit.check(clientIpFrom(req));
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  // sendBeacon kirim text/plain; sendBeacon dengan JSON biasanya juga
  // application/json. Dua-duanya di-parse lewat kecil yang sama.
  let body: BeaconBody = {};
  try {
    const text = await req.text();
    if (text) {
      const parsed = JSON.parse(text) as BeaconBody;
      if (typeof parsed === "object" && parsed !== null) body = parsed;
    }
  } catch {
    // Payload salah → dianggap tidak menarik; biarkan 204 (beacon tak butuh baca).
  }

  const event = buildTrackedEvent({
    path: body.path,
    referrer: body.referrer,
    userAgent: req.headers.get("user-agent"),
  });

  // Invalid = skip diam-diam; 204 mencegah coroutine debugger/monitoring noise.
  if (!event) {
    return new NextResponse(null, { status: 204 });
  }

  const db = analyticsServiceClient();
  if (!db) {
    // Dry-run: tanpa service role, event tidak disimpan tapi beacon tetap di-
    // respons sehat — CI/local tidak berwarna merah.
    return new NextResponse(null, { status: 204 });
  }

  try {
    // Cast terikat agar tidak memakai `any` (aturan ESLint) dan tidak
    // bertabrakan dengan skema typegen tabel yang belum diterapkan di DB lokal.
    type Inserter = { insert: (data: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
    const inserter = db.from("analytics_events") as unknown as Inserter;
    const { error } = await inserter.insert({
      path: event.path,
      referrer_host: event.referrer_host,
      device_class: event.device_class,
    });
    if (error) {
      console.error("/api/track gagal insert:", error.message);
      return new NextResponse(null, { status: 204 });
    }
  } catch (err) {
    console.error("/api/track error penting:", err);
  }

  return new NextResponse(null, { status: 204 });
}
