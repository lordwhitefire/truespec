// Runs once at server startup. Fails loudly before any page can render
// (TASK-001 item 2). Node runtime only — the config holds server secrets.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertConfig } = await import("./lib/config");
    assertConfig();
  }
}
