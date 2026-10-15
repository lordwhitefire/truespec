/**
 * The one origin rule for every write that is not a Server Action (task.md line 253: "No GET changes
 * data, and no write skips the origin check").
 *
 * Next checks the origin of a Server Action itself, but a Route Handler is checked by nothing. The
 * tap must be reachable by a visitor who holds no session — a buyer on the showroom — so it is a plain
 * POST to `app/api/tap/route.ts` and carries its own check. The export download (Task 22) will be the
 * second caller.
 *
 * What this is and is not: it is a **CSRF guard**, not authentication. A browser will not let a page
 * on another site send a request with our `Origin`, so this stops a third-party page inflating taps.
 * Any other client can send any header it likes, so this decides nothing about who is calling — that
 * is what the session and the door are for.
 *
 * `Host` is the only host it trusts. `x-forwarded-host` is deliberately **not** consulted: a client
 * can set it too, and honouring it would let a caller pass the check by naming both the origin and
 * the forwarded host as its own. In front of the app (Vercel, or a proxy) `Host` is the public
 * hostname, which is exactly what `Origin` carries.
 *
 * A write that arrives with no usable `Origin`, or one that is not a web address, is refused rather
 * than assumed innocent — "refused by default" is the rule; same-origin is the exception.
 */
export function isSameOrigin(
  origin: string | null | undefined,
  host: string | null | undefined,
): boolean {
  if (typeof origin !== "string" || typeof host !== "string") return false;
  if (origin.length === 0 || host.length === 0) return false;

  let originHost: string;
  try {
    const url = new URL(origin);
    // A scheme we do not serve is not our origin. This also refuses `Origin: null` (a sandboxed
    // frame or a local file), which `new URL` rejects outright.
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    originHost = url.host;
  } catch {
    return false;
  }

  return originHost.toLowerCase() === host.trim().toLowerCase();
}
