/**
 * Rate limiter in-memory dengan entri yang selalu ter-prune (tidak bocor memori)
 * dan kapasitas terbatas (ampuh di satu proses Node; kalau nanti multi-instance,
 * ganti implementasi ke Redis/Upstash tanpa mengubah pemakaian).
 *
 * Pemakaian:
 *   const limit = createRateLimiter(10, 10 * 60 * 1000);
 *   const { allowed, retryAfterSec } = limit.check(key);
 */

export interface RateLimitDecision {
  allowed: boolean;
  /** Detik sampai window aktif berakhir — pasangan header Retry-After. */
  retryAfterSec: number;
}

export interface RateLimiter {
  check(key: string): RateLimitDecision;
  /** Jumlah window aktif yang sedang tersimpan (dipakai di test). */
  size(): number;
}

export interface CreateRateLimiterOptions {
  /**
   * Batas jumlah entri yang disimpan (default 5000). Saat menyala di atas batas,
   * entri kadaluarsa dibuang dulu; sisanya dihapus dari yang tertua (FIFO Map)
   * supaya penyerang dengan key acak tidak bisa menumbuhkan memori tanpa batas.
   */
  maxEntries?: number;
}

const DEFAULT_MAX_ENTRIES = 5000;

export function createRateLimiter(limit: number, windowMs: number, options?: CreateRateLimiterOptions): RateLimiter {
  const maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const entries = new Map<string, { count: number; resetAt: number }>();

  /** Buang semua window yang sudah kadaluarsa. */
  function sweep(now: number): void {
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(key);
    }
  }

  return {
    check(key: string): RateLimitDecision {
      const now = Date.now();
      if (entries.size >= maxEntries) sweep(now);
      // Masih penuh setelah sweep → buang jendela tertua agar terikat ukurannya.
      while (entries.size >= maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }

      const existing = entries.get(key);
      if (!existing || existing.resetAt <= now) {
        // Mulai window baru (timpa window mati bila ada).
        entries.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSec: Math.ceil(windowMs / 1000) };
      }

      existing.count += 1;
      if (existing.count > limit) {
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
      }
      return { allowed: true, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
    },
    size(): number {
      return entries.size;
    },
  };
}

/**
 * IP klien dari header — dipakai semua route. `x-forwarded-for` bisa dipalsukan
 * bila proxy depan tidak tepercaya (lihat roadmap 17a); untuk situs ini semua
 * trafik melewati satu proxy yang menaruh IP asli pengunjung.
 */
export function clientIpFrom(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
