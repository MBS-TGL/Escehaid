import * as Sentry from "@sentry/nextjs";

/**
 * Init Sentry server-side (Next 16 instrumentation hook) + auto-capture
 * error render/route/action/proxy via onRequestError.
 *
 * Tanpa env SENTRY_DSN (lokal/CI) → SDK tidak di-init: situs jalan normal.
 * Setup env di Vercel: SENTRY_DSN, SENTRY_AUTH_TOKEN (+ org/project di
 * next.config.ts withSentryConfig).
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || "development",
    // Sampel tracing ringan — cukup utk melihat transaksi error, hemat kuota.
    tracesSampleRate: 0.1,
    // Filter noise umum (bot, ekstensi browser, SW).
    ignoreErrors: [
      "Non-Error promise rejection captured",
      "top.GLOBALS",
      "originalCreateNotification",
      "webpackChunk",
    ],
    denyUrls: [
      /\/sw\.js/,
      /chrome-extension:\/\//i,
      /extensions\//i,
      /^safari-extension:\/\//i,
    ],
  });
}

/** Hook observability Next 16 — dipanggil utk error render/route/action/proxy. */
export const onRequestError = Sentry.captureRequestError;
