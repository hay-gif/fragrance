/**
 * Next.js Instrumentation Hook
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * This file runs once when the Next.js server starts.
 * It is the correct place to initialise Sentry, OpenTelemetry, or any
 * server-side monitoring SDK.
 *
 * --- To enable Sentry ---
 * 1. npm install @sentry/nextjs
 * 2. npx @sentry/wizard@latest -i nextjs
 * 3. Uncomment the block below and set SENTRY_DSN in .env.local
 */
export async function register() {
  // if (process.env.NEXT_RUNTIME === "nodejs") {
  //   const { init } = await import("@sentry/nextjs");
  //   init({
  //     dsn: process.env.SENTRY_DSN,
  //     environment: process.env.NODE_ENV,
  //     tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  //   });
  // }
}
