import "server-only";
import { neon } from "@neondatabase/serverless";
import { getConfig } from "./config";

// The database is reachable only server-side; the connection string never
// reaches the browser (design D2). RLS is not the boundary — this module is.
let client: ReturnType<typeof neon> | null = null;

export function db() {
  if (!client) {
    client = neon(getConfig().databaseUrl);
  }
  return client;
}
