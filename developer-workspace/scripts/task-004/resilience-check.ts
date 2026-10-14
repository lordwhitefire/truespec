/**
 * Witness — what a person sees while the store cannot answer (design D18; truth 16).
 *
 * Run a dev server whose DATABASE_URL points at a host that never resolves, so every store read fails
 * `TypeError: fetch failed` — the same transient shape a cold Neon compute produces:
 *
 *   DATABASE_URL='postgresql://u:p@doesnotexist.invalid/db' npm run dev -- -p 3213
 *   node --import tsx developer-workspace/scripts/task-004/resilience-check.ts 3213
 *
 * It proves, by reading the response as it streams rather than waiting for it to finish:
 *   1. the guard RETRIED — the response takes at least the retry budget, which a single fast failure
 *      never would (this is the check the first version of this script lacked, and without it the
 *      script passed while the guard was not retrying at all);
 *   2. the "setting things up" markup was flushed EARLY — while the store was still being retried —
 *      so the wait is a screen rather than a blank page;
 *   3. no invented figure rode along (no naira amount), and the wait is not Next's bare crash page.
 *
 * It cannot see the retryable state itself: that is a client component, rendered after hydration. The
 * browser check witnesses that half — see reports/TASK-004-resilience.md.
 *
 * Top-level await is avoided (it breaks under tsx here); everything is wrapped in `main`.
 */
import process from "node:process";
import { STORE_BASE_DELAY_MS, STORE_ATTEMPTS } from "../../../lib/store-retry-rules";

const PORT = process.argv[2] ?? "3213";
const ROUTES = ["/", "/inventory", "/car/TS-1001"];

/** A phrase only the wait renders. */
const WAIT_MARK = "Setting things up";
/** Next's own crash page, which must not be what a person is shown. */
const CRASH_MARK = "Application error: a server-side exception";
/** Anything that would be a fabricated figure if the store was never read. */
const FIGURE = /₦|NGN\s?[0-9]/;

/**
 * The retries must have happened: with `STORE_ATTEMPTS` attempts there are that many minus one waits,
 * and jitter only ever lengthens them. A response faster than the plain backoff sum means the guard
 * threw early — i.e. did not retry — which is exactly the bug this guards against.
 */
const MIN_RETRY_BUDGET_MS = STORE_BASE_DELAY_MS * (Math.pow(2, STORE_ATTEMPTS - 1) - 1);

type Probe = {
  route: string;
  status: number;
  firstChunkAtMs: number;
  waitSeenAtMs: number | null;
  finishedAtMs: number;
  bytes: number;
  crash: boolean;
  figure: boolean;
};

async function probe(route: string): Promise<Probe> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(`http://localhost:${PORT}${route}`, {
      signal: controller.signal,
      headers: { "user-agent": "truespec-resilience-witness" },
    });

    let firstChunkAtMs: number | null = null;
    let waitSeenAtMs: number | null = null;
    let text = "";
    const reader = res.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (firstChunkAtMs === null) firstChunkAtMs = Date.now() - started;
        text += decoder.decode(value, { stream: true });
        if (waitSeenAtMs === null && text.includes(WAIT_MARK)) {
          waitSeenAtMs = Date.now() - started;
        }
      }
    }

    return {
      route,
      status: res.status,
      firstChunkAtMs: firstChunkAtMs ?? -1,
      waitSeenAtMs,
      finishedAtMs: Date.now() - started,
      bytes: text.length,
      crash: text.includes(CRASH_MARK),
      figure: FIGURE.test(text),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main(): Promise<void> {
  console.log(`store-wait witness against http://localhost:${PORT} — ${ROUTES.length} route(s)`);
  console.log(`retry budget that must elapse per read: >= ${MIN_RETRY_BUDGET_MS}ms\n`);

  const results: Probe[] = [];
  for (const route of ROUTES) {
    const r = await probe(route);
    results.push(r);
    console.log(
      `  ${route.padEnd(16)} status=${r.status}  first-chunk=${r.firstChunkAtMs}ms  ` +
        `wait-flushed=${r.waitSeenAtMs ?? "never"}  done=${r.finishedAtMs}ms  ${r.bytes}B  ` +
        `crash=${r.crash}  figure=${r.figure}`,
    );
  }

  const failures: string[] = [];
  for (const r of results) {
    if (r.finishedAtMs < MIN_RETRY_BUDGET_MS) {
      failures.push(
        `${r.route}: answered in ${r.finishedAtMs}ms — under the ${MIN_RETRY_BUDGET_MS}ms retry ` +
          `budget, so the guard did not retry`,
      );
    }
    if (r.waitSeenAtMs === null) {
      failures.push(`${r.route}: the wait never streamed`);
    } else if (r.waitSeenAtMs >= r.finishedAtMs) {
      failures.push(`${r.route}: the wait only arrived with the finished response, not during the wait`);
    }
    if (r.crash) failures.push(`${r.route}: showed Next's bare crash page`);
    if (r.figure) failures.push(`${r.route}: carried a figure off a store that was never read`);
  }

  console.log();
  if (failures.length > 0) {
    for (const f of failures) console.log(`FAIL  ${f}`);
    console.log(`\nSTORE-WAIT WITNESS FAILED — ${failures.length} problem(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `STORE-WAIT WITNESS PASSED — ${results.length}/${results.length} route(s) retried for the full ` +
      `budget, streamed the wait before answering, invented no figure, and showed no bare crash page.`,
  );
}

void main();
