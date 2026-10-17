# TASK-005 · Task 7 — the record names what happened

**What was asked** (`plans/TASK-005-plan.md:163-166`): one word does not cover two actions — a
restored item is named as a restoration, not as a deletion; every count in the activity view agrees
with the names it summarises. Verify: `npm test` (`lib/activity-feed.test.ts` extended); live:
delete → undo → the activity log names the restoration; the counts match the rows.

**The ruling it serves** (`openspec/tasks/TASK-005/findings/04-designer.md:276-279`, D31/DR24): *"the
activity chip names the action. A restored item reads RESTORED, not DELETED. Where one word currently
covers two actions, the facets split so each action has its own label."*

## The defect, read live before the change

`runs/activity-read/before.json` — the log as it stood: a row reading **"Restored a car TS-1036 ·
Deleted"** (chip class `tag del`), three such restorations among the rows, and the facet **"Deleted
12"**. The store itself held **6 `car.deleted` and 6 `car.restored`** — so one word, and one count,
covered both actions. That is the log contradicting itself: the event that *undid* a delete was
recorded, chipped and counted as a delete.

## What changed

| file | what |
|---|---|
| `lib/activity-feed.ts` | `car.restored` moved off the `del` chip onto its own `res` chip, with the reason in a comment; `CATEGORIES` gains `{ k: "res", label: "Restored" }` — so the row's chip reads **RESTORED** and the facets carry **"Restored N"** separately; and the count rule itself pulled out as **`countOf(entries, k)`** — one rule used by every chip, so a chip's count and the chip's name cannot come apart |
| `app/office/(shell)/activity/activity-client.tsx` | the local `countType` removed; the chips call `countOf` — the same behaviour, now the one rule the test pins |
| `app/office/(shell)/office.css`, `activity/activity.css` | `.tag.res` styled — the ok green, as *Added* — in both files (the dashboard's recent-activity panel carries its own chip rules, so both need it) |
| `lib/activity-feed.test.ts` | a new test: **a restoration reads, chips and counts as a restoration — never as a deletion**: its word, its label, a category that differs from `car.deleted`'s, and a mixed feed counted by the shipped rule (`del` 2, `res` 1, `all` 4) |

The existing test ("a named kind reads as its own word and belongs to its own chip") already required
every chip in `ACTIONS` to be one the filter offers — so a missed `CATEGORIES` edit would have failed
the suite.

## What was audited, and deliberately left alone

The AC names three words. Two of them pass the rule untouched:

- **`car.deleted`** → *"Deleted a car" · Deleted* — names its own action; its count now counts deletions only.
- **`car.unsold`** → *"Took a car out of Sold" · State* — the State facet counts exactly this kind
  (3 events; the store holds 3 `car.unsold`), so the count agrees with the name it summarises.
- **`car.removed`** → *"Removed a car for good" · Deleted* — left where it is: a soft delete and a
  permanent removal both say "deleted" in their own words, so the "Deleted" facet does not contradict
  the rows it counts. **Flagged below for the owner** (a split is a one-line change, if wanted).

## Witnessed — live, signed in, the real store (`runs/activity-delete-undo/TS-1011.json`)

One **demo** car, TS-1011 (Mercedes-Benz C 300 AMG Line 2018), deleted and the delete undone at once
— the tombstone is the only column set and the undo clears it, so the car is exactly as it was
(net-zero, demo-only; store read before and after: `deleted_at` **null** both times):

- the confirm dialog's own words: *"…will be removed. You can undo for a few seconds."*;
- the delete: toast **"…deleted."**, its own POST **200**, the table **25 → 24 rows**;
- the undo, immediately: toast **"…restored."**, its own POST **200**, the table **back to 25**;
- the two events, at the store: `car.deleted` at **22:18:16.850Z**, `car.restored` at
  **22:18:18.222Z** — 1.37 s apart, inside the window;
- **the log before → after the pair**:

  | chip | before | after |
  |---|---|---|
  | All | 38 | **40** |
  | Deleted | 6 | **7** |
  | Restored | 6 | **7** |
  | Added · Edited · State · Sold · Imports · Settings | 8 · 12 · 3 · 3 · 0 · 0 | **unmoved** |

- and the newest rows say it in words: **"Restored a car TS-1011 · Restored"** above **"Deleted a car
  TS-1011 · Deleted"** (`tag res` / `tag del`, clock 22:18);
- **every count matches its rows**: Deleted 7 = the seven rows chipped *Deleted*; Restored 7 = its
  rows; All 40 = the rows rendered (`countOf` is the shipped rule, so this reading proves the client
  uses it);
- until this change the same delete/undo pairs read *"Restored a car … · Deleted"* and counted under
  *"Deleted 12"* — `runs/activity-read/before.json` keeps that reading;
- no Chrome was launched (6 → 6); the sidebar and nav intact.

`npm test`: **295/295** (the new test included), typecheck clean.

## Not done, and why

- **`car.removed` stays chipped "Deleted"** — recorded above; the word "Deleted" covers deletes and
  permanent removals, whose own words say deletion too. If the owner wants each action its own chip,
  it is one line in `ACTIONS`, one in `CATEGORIES`, one CSS rule.
- **The 8-second lapse was not exercised** — letting the window run out (and dealing with the car from
  the tombstone list) is the subject of the undo-window tasks (8/9) and `testing.md`'s noted item;
  this task's pair was undone inside the window, as the testing group prescribes.
