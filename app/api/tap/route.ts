import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/origin-rules";
import { readTap } from "@/lib/tap-rules";
import { recordTap } from "@/lib/tap";

/**
 * The buyer's tap (truth 8). The only write on this site that a visitor performs, and the only one
 * that can be reached without a session — so it is a Route Handler with its own checks rather than a
 * Server Action behind the door.
 *
 * Only `POST` is exported. Next answers every other method with 405, so no GET can reach this, and
 * task.md line 253 ("No GET changes data") holds by construction rather than by care.
 *
 * The order is deliberate: **origin first**, then the body, then the write. A request that did not
 * come from a page we serve is refused before its body is even read.
 *
 * What it answers:
 *  - 403 — not from this origin (an explicit check; see `lib/origin-rules.ts` for what it does and
 *    does not prove);
 *  - 422 — the body is not a tap (not a path, or a reference that is not one of ours);
 *  - 503 — the store refused the write. The buyer is never waiting on this, so a lost tap is
 *    reported and let go, never made the buyer's problem and never retried into a double count;
 *  - 204 — recorded.
 *
 * No response ever echoes the body back, and the refusal reasons are for a developer reading a log —
 * a stranger learns only that it was refused.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return NextResponse.json(
      { ok: false, reason: "refused: the request did not come from this site" },
      { status: 403 },
    );
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null; // not JSON at all — `readTap` refuses it with the same answer as a malformed one
  }

  const parsed = readTap(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, reason: parsed.reason }, { status: 422 });
  }

  try {
    await recordTap(parsed.value);
  } catch {
    return NextResponse.json({ ok: false, reason: "the tap was not recorded" }, { status: 503 });
  }

  return new NextResponse(null, { status: 204 });
}
