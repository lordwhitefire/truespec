# Brief — the store's cold start must not look broken (TASK-004, Task 29 pulled forward)

**Asked (owner, 2026-10-14):** after signing in, the office showed `NeonDbError … TypeError: fetch
failed` instead of a page. The cause is Neon *scale to zero* — the compute suspends after 5 minutes
idle (fixed on the Free plan, cannot be switched off; Neon docs, verified) and the first request
afterwards can miss. The owner's ruling: **"we use the knock again"** — retry — **"but there should be
a kind of loading screen saying something loading / setting up … till the db wakes up"**.

**What done looks like:**
1. **Knock again.** One shared guard around every server-side store read that retries a *transient*
   failure (cold compute, dropped connection, timeout) with exponential backoff + jitter, and does
   **not** retry a real error.
2. **A loading screen.** While the store is being woken, the page shows a calm "just a moment" screen
   instead of a blank or a crash.
3. **Never a 500, never an invented figure.** If every attempt fails, the page shows a **clear,
   retryable state** with a try-again action — never a bare error page, never a fabricated number and
   never a silently empty list that reads as real emptiness (truth 16; acceptance 20).

**Already decided upstream (not re-decided here):** design **D18** — one shared guard, one retryable
component, route-level error boundaries, on the office **and** the public showroom. Plan **Task 29**
names the shape (`lib/store-guard.ts`, `components/retryable.tsx`, `app/**/error.tsx`).

**Not this change:** the *wording* of the states is TASK-005's (truth 16 says so); the guard's
placement covers the store reads that exist today; no new delete path, no caching layer.
