/* Service worker ringan — SMP Muhammadiyah 4 Tanggul.
 * Strategi:
 *   - Aset statis ber-hash (/_next/static) + gambar/font → stale-while-revalidate
 *   - Navigasi halaman publik → network-first, fallback /offline.html
 *   - Area admin/api/auth/portal → tidak pernah di-cache
 * Tidak ada dependency; cache di-versioning agar update bersih.
 */
const VERSION = "v1";
const STATIC_CACHE = `mbs-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [
  OFFLINE_URL,
  "/manifest.json",
  "/images/Logo-Favicon.png",
  "/images/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("mbs-") && key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

const ASSET_RE = /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpe?g|webp|avif|svg|gif|ico)$/i;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Jangan pernah tangani area privat / dinamis.
  if (/^\/(?:admin|api|auth|portal)(?:\/|$)/.test(url.pathname)) return;

  if (url.pathname.startsWith("/_next/static/") || ASSET_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
  }
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    const offline = await cache.match(OFFLINE_URL);
    return offline || Response.error();
  }
}
