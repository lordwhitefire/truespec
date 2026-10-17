# TASK-005 · Task 6 — a save reports what actually changed (settings)

**What was asked** (`plans/TASK-005-plan.md:158-161`): a settings card saved with no edit says nothing
changed rather than succeeding silently or pretending; the dirty flags that already exist
(`waDirty`/`tagDirty`/`tankDirty`) are the basis; the words are the card's own. Verify: live — press
Save on an untouched card → nothing-changed wording; edit → saved wording; `npm run typecheck`.

**The ruling it serves** (`design-workspace/decisions/TASK-005-ux-rulings.md:298-307`, DR23): *"A save
that changed something says 'Saved'. A save that changed nothing says 'Nothing changed.'"* — never for
a failure (DR25). No new vocabulary was drafted: the three cards keep their own saved sentences, and
the no-op sentence is the ruling's own words.

## What changed, and where

| file | what |
|---|---|
| `app/office/(shell)/settings/settings-client.tsx` | the three save handlers: the toast now follows the store's answer — `result.changed ? <the card's own saved words> : "Nothing changed."` |
| `lib/settings.ts` | the statement now compares the stored value with the one about to be written and **writes nothing when they are the same**; `SaveSettingResult` carries `changed: boolean` |

**`app/office/actions/setting.ts` needed no change**, though the plan's file list named it: it already
passes `SaveSettingResult` straight through, so the fact reaches the card without the action knowing
about it. The plan's list did not name `lib/settings.ts`; that is where the statement lives, and the
statement is what had to learn the rule.

### How the no-op is decided — and why it is the store's call

The flags stay exactly as they are: they gate each Save button and show the *"Unsaved change"* note.
But they compare **text**, and the text can differ while the setting cannot. The stored WhatsApp number
is `+2348146927170`; a person who types `0814 692 7170` has an unsaved change by the flags and none at
all in the store. If the words followed the flags, that save would say *"WhatsApp number saved."* while
nothing whatever changed — which is exactly the pretending the task is about.

So the fact is the store's own, decided in the same round-trip as the write: the statement compares the
stored value with the one about to be written, writes nothing when they are equal, and answers which of
the two happened. The browser still decides nothing (truth 14). The honest side effect: **the audit
line under a card cannot move behind a no-op**, because the row is untouched.

### The statement's three arms

```
WITH cur AS (SELECT value FROM setting WHERE key = $1),
     changed AS (SELECT (SELECT value FROM cur) IS DISTINCT FROM $2::text AS yes),
     upsert AS (
       INSERT INTO setting (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
         WHERE (SELECT yes FROM changed)
         RETURNING value
     )
     SELECT value, true AS changed FROM upsert
     UNION ALL
     SELECT value, false AS changed FROM setting
      WHERE key = $1 AND NOT EXISTS (SELECT 1 FROM upsert)
```

- **no row yet** → `cur` is NULL, `NULL IS DISTINCT FROM $2` is true → the insert lands → `changed` true
- **a different value** → the update lands, timestamp and all → `changed` true
- **the same value** → the update is skipped, `upsert` is empty, the fallback answers the stored row →
  `changed` false
- the fallback is guarded by `NOT EXISTS (SELECT 1 FROM upsert)` for the same reason as Task 5's car
  statement: it reads the statement's own snapshot, where a written row is visible too, and without the
  guard a real save would answer twice.

## Witnessed

### 1. The three arms, at the store (throwaway copy `br-sweet-wind-b2u6d5yg`)

`settings-statement-probe.mjs` — the statement's text run verbatim against the copy:

| arm | answer | the row after |
|---|---|---|
| a key with no row (`temp_probe_key`) | `[{value: "probe", changed: **true**}]` | written, `updated_at` set |
| `tagline` set to a different value | `[{value: "CHANGED-by-probe", changed: **true**}]` | written, `updated_at` 10:18:23 → **18:41:37** |
| the same value again | `[{value: "CHANGED-by-probe", changed: **false**}]` | **untouched**, `updated_at` still 18:41:37.113 |

Exactly one row answered each time; the copy was restored and then deleted.

### 2. Live — the no-op arm (signed in, `:3210`, the **real** store)

`settings-save-reports.mjs noop`; readings in `runs/settings-save-reports/noop.json`. The WhatsApp card,
stored `+2348146927170`, typed as **`0814 692 7170`** — a real text difference, no change to the setting:

- the *"Unsaved change"* note appeared, so the button was genuinely pressable;
- the toast, recorded as it appeared: **"Nothing changed."** — it never claimed a save;
- its own POST **200** (action + refresh), no page reload;
- the card's audit line **identical** before and after: *"Updated 16 Oct 2026, 11:55"*;
- the input was rewritten to what the store holds (`+2348146927170`), and the card went clean;
- **the store, read directly before and after: all three rows byte-identical** —
  `whatsapp_number` still `updated_at 2026-10-16T11:55:53.863Z`. The no-op wrote nothing at all.

### 3. The changed arm — on the copy (`all.json`)

| the save | what the screen said | its own POST | the audit line | the store's row |
|---|---|---|---|---|
| the WhatsApp no-op (same run) | **Nothing changed.** | 200 | unmoved | `whatsapp_number` unmoved (11:55:53.863Z) |
| the tagline really changed | **Tagline saved. The home page updates immediately.** | 200 | 18:52 → 18:53 | `updated_at` 18:52:24 → 18:53:55 |
| the tagline put back | **Tagline saved. The home page updates immediately.** | 200 | 18:53 (same minute) | `updated_at` → 18:53:55, value back to the original |

The copy's tagline ended exactly as it started (*"Cars you can trust, prices you can see"*), the copy was
deleted, and the live store never saw a write. The second save's audit line shows the same *minute* as
the first simply because the two saves happened within it; the store's `updated_at` did move for both.

**No Chrome was launched by any run** (6 → 6), and the sidebar, nav and *"Signed in as rema6…"* were
intact after every save.

## Harness lessons (recorded because they cost three runs)

- **A toast hides itself after four seconds**, and a save on a cold server can take longer than that —
  the words have to be **recorded as they appear**, not read afterwards (the first attempt read `""`).
- **A recorder armed on the toast node itself watches a node React may replace.** The working recorder
  observes `document.body` and reads `#toast`/`#tmsg` when a mutation arrives; the node-level observer
  recorded nothing while the toast was plainly there (`settings-save-probe.mjs` caught it: two entries,
  `shown: true`, `msg: "Nothing changed."`, no reload).
- **A toast still on screen when the next step arms is credited to that step.** The first copy run's
  tagline step opened with the WhatsApp step's *"Nothing changed."*. Each save now waits for the toast
  to drop `show` (its own four-second timer — a signal, not a sleep) before the recorder arms, and the
  state at arm time is recorded either way.
- **Hydration, again**: await `<nextjs-portal>` before clicking (Task 5's lesson, unchanged).

## What was not done, and why

- **`actions/setting.ts` is untouched** — the plan named it, but the result already flows through it.
- **The tank card was not driven.** All three cards share the one statement and the same three-line
  change; the WhatsApp card carries the no-op arm and the tagline card the changed arm.
- **A store that cannot be reached** still refuses in the card's own words and writes nothing
  (D32/DR25) — unchanged by this task, and witnessed when the refusal work landed.
