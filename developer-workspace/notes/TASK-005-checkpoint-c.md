# TASK-005 · Owner checkpoint C — approved

**Date:** 2026-10-19 · **Status:** **APPROVED** by the owner after a fresh live drive.
**Product files changed by this gate:** none.

## What was shown live

Attach-only Chrome on `:9222`, public dev server `:3210`, signed in, 1440 × 900. Fresh run of
`developer-workspace/scripts/task-005/task38.mjs` — the Task 38 drive, which is also the checkpoint's
full offline path. The test drafts were removed afterwards.

| part | what was seen |
|---|---|
| **banner** | the exact line **“Offline, your draft is kept on this device.”** passed the drive's 1200 ms conservative check; the offline marker was up |
| **kept** | the car brand **“Task38 kept probe”** came back after a reload; `ts-draft:car:new` was still present; the plain reload showed no recovery line |
| **return** | the exact line **“You're back online. Your draft is still here — press Save.”** appeared **3 ms** after reconnect; the draft marker was set; Save was still the person's click |
| **erase** | Cancel cleared the car draft; the settings Save cleared its draft and took the recovery line down; sign-out in a sessionless incognito context cleared every `ts-draft:` key while keeping `ts-theme` and `not-a-draft` |

- **Store:** the settings demo was `0 → 5000 → 0`; the final reload read **0**. No real car was
  created or changed.
- **Network:** exactly **2** `next-action` posts, both after Save clicks; **0** on discard, reload,
  offline, reconnect or leaving. 10 non-GETs total; the other 8 external with no `next-action`.
  **0** console / **0** page / **0** HTTP errors.
- **Cleanup:** `[]` `ts-draft:` keys on the main context; Chrome **6 → 6**; Chrome left on
  `/office`; the owner's main session was never signed out (sign-out was exercised in a separate
  sessionless context).

## What was approved

The owner approved the **behaviour** shown, not a new code change: the banner, the kept draft, the
return line, and erase-on-act. No product file was touched by this gate.

The disabled-Save-with-its-reason leg was already witnessed in Task 35; this checkpoint drive's
fresh flow covers the four parts named by the plan. Task 39 remains **closed, not done** by the
owner's privacy-page ruling and is not reopened here.

Evidence: `runs/task38/task38.json`, `runs/task38/checkpoint-c.log`; witnesses §Checkpoint C.
