/**
 * Proves the three settings save **for real**, and that the WhatsApp number cannot be saved wrong
 * (truth 12; `specs/office-settings` — "WhatsApp number validated before it saves").
 *
 * The screen, until now, was a presentational port: each card held its value in the browser and
 * announced "(demo)" when it was "saved", so a reload restored the old value and the showroom never
 * moved. The claim under test is that the save is now real — the value goes to the `setting` row the
 * showroom reads, and a value that must not be stored is refused **and the previous one stays active**.
 *
 * Everything here is the **real** thing: the save is `saveSetting`, the very function the Server
 * Action calls, and the phone rule is `lib/phone.ts`, the very module the screen validates with. The
 * witness drives the save directly because the action's only other contribution is the session check
 * (`requireOfficeSession`), which needs a live office request — a gap this witness cannot close and
 * does not pretend to.
 *
 * **This witness writes to the live settings and puts them back exactly.** It reads the three rows
 * first (value *and* `updated_at`), and a `finally` restores both — an audit line that moved because
 * a witness ran would be a lie on the owner's screen. It then re-reads and compares, so a run that
 * changed anything for good fails.
 *
 * The last group is the point of the whole rule rather than its paperwork: the stored number builds
 * the **`wa.me` link the tap button builds**, and that link is fetched to confirm it resolves, one
 * fixed shape, carrying the number through to WhatsApp.
 *
 *     node --conditions=react-server --dns-result-order=ipv4first --import tsx \
 *       developer-workspace/scripts/task-004/settings-save-check.ts
 */
import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { readSettings, saveSetting } from "../../../lib/settings";
import { waMeDigits } from "../../../lib/phone";
import { waLink } from "../../../components/whatsapp";

loadEnv({ path: ".env.local", quiet: true });

const KEYS = ["whatsapp_number", "tagline", "full_tank_default"] as const;

let failures = 0;
function ok(label: string, pass: boolean, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch a link and follow it, retrying while the network drops. `wa.me` answers with a page, so a
 * 200 alone proves little; what matters is where it lands — `api.whatsapp.com/send/?phone=…` with the
 * same digits. That is the number arriving at WhatsApp in one piece.
 */
async function resolveLink(url: string): Promise<{ status: number; finalUrl: string }> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20_000) });
      return { status: response.status, finalUrl: response.url };
    } catch (err) {
      lastErr = err;
      await pause(1500 * attempt);
    }
  }
  throw lastErr;
}

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();
  const q = (text: string, params?: unknown[]) => client.query(text, params);

  // The rows as they stand — value and the instant they last changed, both to be restored.
  const before = (await q(`SELECT key, value, updated_at FROM setting WHERE key = ANY($1::text[])`, [KEYS])).rows as {
    key: string;
    value: string;
    updated_at: Date;
  }[];
  const beforeIso = Object.fromEntries(before.map((row) => [row.key, new Date(row.updated_at).toISOString()]));

  const witnessTagline = `Witness tagline ${randomUUID().slice(0, 8)}`;

  try {
    // ------------------------------------------------------------- the three are really in the store ---
    const opened = await readSettings();
    ok(
      "the store holds the three settings the screen shows",
      before.length === 3 && opened.whatsapp.updatedAt !== null && opened.tagline.updatedAt !== null && opened.tank.updatedAt !== null,
      `${before.length} rows`,
    );

    const originalNumber = opened.whatsapp.value;

    // ------------------------------------------------------------- a wrong number is refused, and the
    // previous one stays active ---------------------------------------------------------------
    const refusals: { written: string; why: string }[] = [
      { written: "", why: "empty" },
      { written: "+234 803 CALL", why: "letters" },
      { written: "+44 7911 123456", why: "foreign" },
      { written: "0803", why: "partial" },
      { written: "01234567890", why: "not a mobile" },
    ];
    const refusalResults: { why: string; result: Awaited<ReturnType<typeof saveSetting>> }[] = [];
    for (const r of refusals) {
      refusalResults.push({ why: r.why, result: await saveSetting("whatsapp", r.written) });
    }
    ok(
      "a malformed number is refused with a reason a person can act on",
      refusalResults.every((r) => !r.result.ok && r.result.error.length > 0),
      refusalResults.map((r) => `${r.why}: ${!r.result.ok ? r.result.error : "ACCEPTED!"}`).join(" · "),
    );
    const afterRefusals = await readSettings();
    ok(
      "the previous number stays active — the refusals wrote nothing",
      afterRefusals.whatsapp.value === originalNumber,
      `${afterRefusals.whatsapp.value}`,
    );

    // ------------------------------------------------------------- the three writings are one number ---
    const writings = ["0803 123 4567", "2348031234567", "+234 803 123 4567"];
    const stored: string[] = [];
    for (const written of writings) {
      const result = await saveSetting("whatsapp", written);
      const held = (await readSettings()).whatsapp.value;
      stored.push(held);
      ok(
        `"${written}" saves, and the store holds one fixed shape`,
        result.ok && result.value === "+2348031234567" && held === "+2348031234567",
        `stored ${held}`,
      );
    }
    ok(
      "the three writings are the same number",
      new Set(stored).size === 1 && stored[0] === "+2348031234567",
      stored.join(" = "),
    );

    const movedAt = (await readSettings()).whatsapp.updatedAt;
    ok(
      "the save moved the row's own `updated_at` — the audit line says what the store says",
      movedAt !== null && movedAt !== beforeIso["whatsapp_number"],
      `${beforeIso["whatsapp_number"]} → ${movedAt}`,
    );

    // ------------------------------------------------------------- the link the tap button builds ---
    const live = (await readSettings()).whatsapp.value;
    const link = waLink(live, "Hello TrueSpec, I have a question.");
    // The helper now returns null when no recipient exists (FIX-001). This check runs only after a
    // real number has been saved, so a null here is the check's own failure, not a valid state.
    if (link === null) throw new Error("the store's saved number built no link");
    ok(
      "the stored number builds the link the tap button builds — one fixed shape, digits only",
      link === "https://wa.me/2348031234567?text=Hello%20TrueSpec%2C%20I%20have%20a%20question.",
      link,
    );
    ok(
      "the digits the link carries are the digits WhatsApp needs",
      waMeDigits(live) === "2348031234567" && /^234\d{10}$/.test(waMeDigits(live)),
      waMeDigits(live),
    );

    // ------------------------------------------------------------- and it resolves, for real ---
    const landed = await resolveLink(link);
    ok(
      "the link resolves — it lands on WhatsApp carrying the number",
      landed.status === 200 && landed.finalUrl.includes("phone=2348031234567"),
      `${landed.status} → ${landed.finalUrl}`,
    );

    // ------------------------------------------------------------- the tagline saves for real ---
    const taglineSaved = await saveSetting("tagline", witnessTagline);
    const taglineHeld = (await readSettings()).tagline.value;
    ok(
      "the tagline saves for real",
      taglineSaved.ok && taglineHeld === witnessTagline,
      taglineHeld,
    );

    const tooLong = await saveSetting("tagline", "x".repeat(81));
    const taglineAfterRefusal = (await readSettings()).tagline.value;
    ok(
      "a tagline longer than its field allows is refused, and the old one stays",
      !tooLong.ok && taglineAfterRefusal === witnessTagline,
      !tooLong.ok ? tooLong.error : "ACCEPTED!",
    );

    // ------------------------------------------------------------- the full-tank default saves for real ---
    const tankSaved = await saveSetting("tank", "120000");
    const tankHeld = (await readSettings()).tank.value;
    ok("the full-tank default saves for real", tankSaved.ok && tankHeld === "120000", tankHeld);

    const notMoney = await saveSetting("tank", "twelve");
    const negative = await saveSetting("tank", "-5");
    const tankAfterRefusals = (await readSettings()).tank.value;
    ok(
      "an amount the car form would refuse is refused here, and the old one stays",
      !notMoney.ok && !negative.ok && tankAfterRefusals === "120000",
      `${!notMoney.ok ? notMoney.error : "ACCEPTED!"} · ${!negative.ok ? negative.error : "ACCEPTED!"}`,
    );
  } finally {
    // Put every row back as it was found — value *and* the instant it last changed.
    for (const key of KEYS) {
      const row = before.find((r) => r.key === key);
      if (row) {
        await q(
          `INSERT INTO setting (key, value, updated_at) VALUES ($1, $2, $3)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
          [key, row.value, row.updated_at],
        );
      } else {
        await q(`DELETE FROM setting WHERE key = $1`, [key]);
      }
    }

    const after = (await q(`SELECT key, value, updated_at FROM setting WHERE key = ANY($1::text[])`, [KEYS])).rows as {
      key: string;
      value: string;
      updated_at: Date;
    }[];
    const afterIso = Object.fromEntries(after.map((row) => [row.key, new Date(row.updated_at).toISOString()]));
    const same =
      after.length === before.length &&
      before.every((row) => afterIso[row.key] === beforeIso[row.key] && after.find((r) => r.key === row.key)?.value === row.value);
    ok(
      "the store is left exactly as it was found — values and audit lines included",
      same,
      KEYS.map((k) => `${k} ${beforeIso[k]} → ${afterIso[k]}`).join(" · "),
    );

    await client.end();
  }

  console.log(failures === 0 ? "SETTINGS-SAVE CHECK PASSED" : `SETTINGS-SAVE CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
