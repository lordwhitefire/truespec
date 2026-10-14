# TASK-004 — browser check: the door

**Run:** 2026-10-14 · procedure: `developer-workspace/procedures/browser-check.md` (the standing
procedure, followed as written — not re-derived). Method: `~/.agents/skills/runtime-divergence/`.

**Screen checked:** the office door. Build `/office/sign-in` vs reference `/login.html`.
**Plus:** every office route walked in the browser with no session (the refusal surface).

This is a **surfaces** check. It does not judge pixels; the owner checks the look by hand.

---

## 1. What ran, and that every cell loaded

- **Harness:** `developer-workspace/scripts/task-004/_lib.mjs` (attach-only; smoke-checked first:
  attach → ours → two tabs → **no launch** (6→6) → detach).
- **Probe:** `developer-workspace/scripts/task-004/door-probe.mjs`; checklist in
  `scripts/task-004/checklist.office.json`.
- **Cells:** the office matrix — `1440 / 820 / 560 / 390` × `dark / light` = **8 cells, all 8 loaded**
  (each cell's body text rendered, each width applied: `window.innerWidth` equals the requested width
  in every cell on both sides). State set per cell; `domcontentloaded` + a state-wait for the page's
  mount point (never a sleep).

**A discovery about the reference, by reading its own source for discovery only (§4):** the reference's
office door at `/office/login.html` is a **0-byte file**. The populated owner sign-in screen is
`/login.html` (title *"Owner sign in | TrueSpec Automotive"*). The probe compares against that.

### The side-by-side (identical in all 8 cells)

| named fact | reference `/login.html` | build `/office/sign-in` |
|---|---|---|
| `urlAfterLoad` | `/login.html` | `/office/sign-in` |
| `title` | `Owner sign in \| TrueSpec Automotive` | `TrueSpec — cars you can trust` |
| `theme` / `width` | the cell's | the cell's (**same** — ref == build per cell) |
| `providerMounted` | `false` | `true` |
| `providerComponents` | `[]` | `["SignIn"]` |
| **`appOwnPasswordInputs`** | **3** | **0** |
| `providerPasswordInputs` | `0` | `1` |
| `appOwnInputTypes` | `text, email, password, password, email, password, checkbox, email` | *(none)* |
| `providerInputTypes` | *(none)* | `text, password` |
| `accountLinks` | `[]` | `[]` |
| `mentionsSignUp` | `false` | `false` |
| `hasOfficeChrome` | `false` | `false` |
| `bodyTextHead` | *"TRUESPEC OFFICE The owner's side of the showroom. Nothing here is public. SIGN IN One account. No sign-up — ever. EMAIL PASSWORD Keep me signed in Forgot password? Sign in …"* | *"TRUESPEC OFFICE Sign in to continue. Sign in to Truespec Welcome back! Please sign in to continue Continue with Google or Email address Password Continue Secured by Development mode"* |

**Refusal walk (no session), in the browser — all 7 PASS:**

```
PASS  /office            -> /office/sign-in
PASS  /office/inventory  -> /office/sign-in
PASS  /office/activity   -> /office/sign-in
PASS  /office/enquiries  -> /office/sign-in
PASS  /office/settings   -> /office/sign-in
PASS  /office/car        -> /office/sign-in
PASS  /office/car/new    -> /office/sign-in
```

No office chrome (`hasOfficeChrome: false`) on any landed page: the refusal shows no office shell,
no session email.

---

## 2. Intended divergences — each tied to the requirement that wins

1. **The application builds no sign-in form; the provider's own is mounted.**
   `appOwnPasswordInputs` **3 → 0**, `providerMounted` **false → true** (`["SignIn"]`),
   `providerPasswordInputs` **0 → 1**. The password field that exists on the build is *inside*
   `[data-clerk-component="SignIn"]` — it is the provider's, not ours.
   **Requirement that wins:** office-access, *"The identity provider carries the sign-in"* — *"The
   sign-in SHALL be the identity provider's own, mounted in the office. The application SHALL build no
   sign-in form…"* (owner ruling 2026-10-14; design **D4**).

2. **The door sits in the office, on a new route.** `urlAfterLoad` `/login.html → /office/sign-in`,
   `title` differs.
   **Requirement that wins:** same requirement — *"mounted **in the office**"*.

3. **No account-creation surface anywhere.** `accountLinks: []` and `mentionsSignUp: false` on **both**
   sides — the reference's copy even reads *"One account. No sign-up — ever."* The build agrees.
   **Requirement that wins:** office-access, *"in its invite-only mode, so no public sign-up exists
   anywhere. The application SHALL build no registration screen and no account-creation route."*

---

## 3. Unintended divergences — named, not silently fixed

The procedure says an unintended divergence is **either a defect fixed or named for its owning task**.
None was fixed. Three are named for the owner:

1. **The door's document title is the showroom's.** Build `/office/sign-in` carries
   `TrueSpec — cars you can trust` (the root layout title), where the reference's owner sign-in page
   carried a page-specific `Owner sign in | TrueSpec Automotive`. A one-line `metadata` on the door
   page would fix it. *Owning task: TASK-004 (the door). Not fixed — the owner decides.*
2. **The door's office framing copy is absent.** The build renders only *"TrueSpec Office / Sign in to
   continue."*; the reference's door carried the strapline *"The owner's side of the showroom. Nothing
   here is public."* Dropping the reference's **form** was intended (item 1 above); dropping its
   **copy** was not decided anywhere. *Owning task: TASK-004 (the door).*
3. **The provider's card offers a social button the reference has not got** —
   `"Continue with Google"`. It is the provider's default surface. Whether the one-owner door should
   offer social sign-in at all is a configuration choice, not a build defect. *Owning task: TASK-004
   (door configuration).*

Also noted, not a defect: the build's card shows the provider's **"Development mode"** badge — that is
the Clerk **development** instance, expected in dev and absent from a production instance.

---

## 4. Guard — no Chrome launched

- Chromium instances (real browser processes, `google-chrome|chromium`, excluding `--type=`):
  **6 before → 6 after**. Under the ≤10 guard.
- Attached to CDP `:9222`; the User-Agent contained **no `Headless`** (confirmed before navigating).
- **Detached on exit** (`finally`); the window and its two tabs stay open — tab A on the reference
  door, tab B on the build door — for the next run and for the human.
- **No screenshots** were taken.

---

## 5. What was NOT checked

- **Look / CSS / pixels** — no screenshots, by the procedure. The owner checks the look by hand.
- **Signing in** — no sign-in was driven. It needs the owner's account, and it is Checkpoint A's one
  remaining item. Everything above happens **before** any store write (`session` and `office_user` are
  still empty).
- **The screens behind the door** — dashboard, inventory, activity, enquiries, settings, car-edit are
  `needs-session` in `checklist.office.json`; they cannot be lit up until a session exists.
- **Interactive behaviour** generally — role-first locators and no `waitForTimeout` were honoured; the
  probe *reads* surface facts and does not drive flows (no click, no submit).
- **Real touch/mobile behaviour** beyond the emulated widths.

---

## 6. How to re-run

```bash
# both servers up:  build on :3210, reference on :3211, automation Chrome on CDP :9222
node developer-workspace/scripts/task-004/_lib.mjs        # smoke check: attach → ours → no launch
node developer-workspace/scripts/task-004/door-probe.mjs  # the door, 8 cells + refusal walk
```

Artefacts (procedure §6): `developer-workspace/scripts/task-004/runs/door/` —
`surface-probe.txt`, `surface-probe.json`, `compare-report.txt`.
