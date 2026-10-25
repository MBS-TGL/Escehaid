import * as Sentry from "@sentry/nextjs";

/**
 * Init Sentry browser-side (Next 16 instrumentation-client).
 * Tanpa NEXT_PUBLIC_SENTRY_DSN → SDK tidak di-init (no-op lokal/CI).
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
    tracesSampleRate: 0.1,
    // Session replay hanya saat error (hemat kuota & privasi pengunjung).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    integrations: [Sentry.replayIntegration()],
    ignoreErrors: [
      "Non-Error promise rejection captured",
      "top.GLOBALS",
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
