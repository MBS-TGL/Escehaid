import { NextResponse } from "next/server";
import { sanitizeSearchTerm } from "@/lib/queries/shared";
import { groupSearchResults, searchAllContent } from "@/lib/queries/search";
import { clientIpFrom, createRateLimiter } from "@/lib/rate-limit";

/** Panjang maksimum istilah pencarian dari query string. */
const MAX_QUERY_LEN = 60;

// 30 permintaan/menit per IP — overlay debounce 300 ms jauh di bawah ini;
// cukup untuk mencegah scraper memukul DB beruntun.
const rateLimit = createRateLimiter(30, 60_000);

/**
 * Endpoint pencarian menyeluruh untuk komponen client (SearchOverlay,
 * SearchView). Sebelumnya kedua komponen memanggil `searchAllContent` langsung
 * dari browser — itu menarik supabase-js ke bundle publik dan membebani DB
 * tanpa batas. Kini query jalan di server (module supabase anon yang sama) dan
 * client cukup `fetch()` hasil yang sudah dikelompokkan.
 */
export async function GET(req: Request) {
  const { allowed, retryAfterSec } = rateLimit.check(clientIpFrom(req));
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").slice(0, MAX_QUERY_LEN);

  // Istilah habis setelah sanitasi → jawab cepat tanpa menyentuh DB.
  if (!sanitizeSearchTerm(q)) {
    return NextResponse.json({ groups: [], count: 0 });
  }

  try {
    const items = await searchAllContent(q);
    const groups = groupSearchResults(items);
    const count = groups.reduce((sum, g) => sum + g.items.length, 0);
    return NextResponse.json({ groups, count });
  } catch (err) {
    console.error("/api/search gagal:", err);
    return NextResponse.json({ error: "Pencarian gagal." }, { status: 500 });
  }
}
