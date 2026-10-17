// TASK-005 plan Task 4 — run one statement against a database, for the witness branch only.
//
// This exists because the Task 4 fault injection cannot be done with `neondb_owner`: Neon's default
// role carries elevated privileges that bypass table ACLs, so `REVOKE … FROM neondb_owner` removes
// the ACL entries (`relacl` showed `rDxtm`, no insert) and the role can still INSERT. The store has
// to refuse the write through a role that genuinely lacks the privilege, so this script sets that
// role up and proves it. It is used against the throwaway branch only, which is deleted when the
// witness is done — it is not part of the application.
import { neon } from "@neondatabase/serverless";

const [url, sql] = process.argv.slice(2);
if (!url || !sql) {
  console.error("usage: branch-sql.mjs <connection-url> <sql>");
  process.exit(2);
}
const run = neon(url);
try {
  const rows = await run.query(sql);
  console.log(typeof rows === "string" ? rows : JSON.stringify(rows).slice(0, 1200));
} catch (err) {
  console.log(`ERROR [${err?.code ?? "?"}] ${String(err?.message ?? err).slice(0, 300)}`);
  process.exitCode = 1;
}
