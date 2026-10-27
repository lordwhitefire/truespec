// Runs once at server startup. Fails loudly before any page can render
// (TASK-001 item 2). Node runtime only — the config holds server secrets.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertConfig } = await import("./lib/config");
    assertConfig();
  }
  // Sentry is wired behind an optional SENTRY_DSN. With no DSN this is a no-op and
  // no error-tracker network call is made.
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0, enabled: true });
  }
}
