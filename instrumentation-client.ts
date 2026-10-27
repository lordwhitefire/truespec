// Client-side error tracking. Initializes Sentry only when a public DSN is present;
// with no DSN this is a no-op and no error-tracker network call is made.
import * as Sentry from "@sentry/nextjs";

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0, enabled: true });
}
