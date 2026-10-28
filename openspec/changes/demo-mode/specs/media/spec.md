## Purpose

The asset store now serves two data spaces. Main assets behave exactly as before. An asset uploaded
while using the demo office is marked as a demo upload and is cleared with the demo; the fixed demo
snapshot and every main asset are outside that cleanup.

## MODIFIED Requirements

### Requirement: Drift is detected and reported, never deleted by the system

A daily job SHALL reconcile storage and the database and **report** what it finds; it SHALL NOT
remove, prune or hard-delete anything on its own — with **exactly three exceptions, none of them a
main record** (owner ruling 2026-10-13; demo exception approved 2026-10-25):

- **half-finished uploads** — an asset that **neither a draft nor a record** ever referenced, and
  that therefore never belonged to any record or to a waiting draft, is cleared by the job, so an
  upload abandoned before it was even staged cannot sit in the store forever;
- **the failed-login log** — `auth_attempt` rows past 90 days are cleared by the job, so the one
  address the system holds is not kept forever;
- **demo uploads** — an asset that was uploaded while using the demo office and carries the demo
  mark is cleared after the demo reset. It belongs to the demo practice copy, not to main and not to
  a client record. The cleanup SHALL delete only marked demo uploads it can identify, and SHALL
  report anything it cannot classify rather than guess.

Everything else is reported, never removed: main assets and files belonging to a record the owner
deleted, images attached to a draft he has not saved and cleared himself, rows pointing at an asset
that no longer exists, and customer data that has reached its retention age (specs/enquiries). Each
of those becomes an item **the owner can see and clear in the office**, and nothing is removed until
he acts — no window and no clock (the system warns the client, the client deletes; even at 100 years
the action stays his). Only when the owner clears an item do the underlying bytes or rows go. The
governing rule survives, with the owner as the actor: what remains is what is referenced and still
exists — a draft references its own images as truly as a record does — bytes win over rows, rows win
over orphan bytes, and the store can always say exactly which items are waiting to be cleared. The
fixed demo snapshot and the daily backup files are system files, never litter, and are never offered
for clearing. A demo-marked upload is also not main litter: the main cleanup card must not list it,
because the demo reset owns it; only the demo cleanup may delete it.

#### Scenario: An upload is abandoned before the car saves
- **WHEN** an upload succeeds but the car save is never completed, and neither a record nor a draft ever referenced the asset
- **THEN** the job clears that unreferenced asset — it never belonged to a record or to a waiting draft — while every asset that ever belonged to either waits for the owner

#### Scenario: Asset deleted at Sanity out of band
- **WHEN** an asset is deleted at Sanity but its row remains
- **THEN** the placeholder renders immediately, and the office reports the dangling row to the owner to clear

#### Scenario: A deleted record's files remain
- **WHEN** the owner deletes a car, an enquiry or an imported PDF in main
- **THEN** its files wait to be cleared, are shown to him as waiting, and are removed only when he clears them

#### Scenario: A demo upload after the reset
- **WHEN** the demo reset has completed and a marked demo upload exists from before the reset
- **THEN** the cleanup deletes that demo upload, and no main asset, snapshot file or seeded asset is considered

#### Scenario: An unmarked asset during demo cleanup
- **WHEN** the cleanup cannot read or does not find the demo mark on an asset
- **THEN** it leaves the asset in place and reports it; it does not delete an asset by elimination

### Requirement: Uploaded files stored privately in Sanity

Every file the office uploads — an enquiry's prepared PDF and a car's filled template — SHALL be
stored as a Sanity file asset under a designation of its own with **randomized filenames**; the
original filename and the asset reference SHALL live only in the database, and a reference SHALL
never appear in any public payload — access exists only through the server on an authenticated
office request. A file SHALL be held from the moment it is uploaded, because a draft that is still
waiting has its source in that file; once its drafts are saved the file is linked to the records it
produced. Files whose records are gone are **reported** by the same daily job and cleared by the
owner; the system removes no file on its own initiative (owner ruling 2026-10-13), except a **demo
upload** cleared with the demo under the demo capability. A main file is never cleared by the demo
job.

#### Scenario: Public request for a PDF
- **WHEN** anyone requests an uploaded file without an authenticated office session
- **THEN** the application does not serve it — no file reference exists in any public page or payload, and office routes check the session before any file is fetched or delivered

#### Scenario: A car's template is uploaded
- **WHEN** the owner uploads a filled car template, and its drafts are still waiting
- **THEN** the file is held under a randomized filename, its original name and its reference exist only in the database, and nothing about it appears in any public response — while its image assets' clearance is untouched, because the waiting drafts reference them

#### Scenario: A demo file after the reset
- **WHEN** a demo user uploaded a PDF or template and the demo resets
- **THEN** the marked demo file is cleared with the demo, and a main PDF or template is never selected

## ADDED Requirements

### Requirement: An upload records which space it belongs to

At upload time the asset store SHALL record the data space that uploaded the asset. A demo upload
SHALL carry the exact demo mark that the cleanup can find without reading a database row. A main
upload SHALL carry no demo mark. The mark SHALL describe the space, not the person, and SHALL NOT
contain an email, a name or a phone number. The snapshot's system mark SHALL be a different exact
value, so a prefix match can never treat the snapshot as a demo upload.

#### Scenario: A demo photo is uploaded
- **WHEN** a demo office uploads a car photo
- **THEN** the asset carries the demo mark and no personal data

#### Scenario: A main photo is uploaded
- **WHEN** a main office uploads a car photo
- **THEN** the asset carries no demo mark and is outside the demo cleanup

### Requirement: Demo storage is capped

The demo space SHALL have a total marked-asset size cap in addition to the existing 15 MB per-file
cap. An upload that would take the marked demo assets over the cap SHALL be refused before the bytes
are stored, with a message the demo user can act on. Main assets SHALL NOT count toward the demo cap.

#### Scenario: A demo upload would exceed the cap
- **WHEN** the next demo upload would take marked demo assets over the configured cap
- **THEN** the upload is refused and the existing demo assets remain

#### Scenario: The cap is checked against demo only
- **WHEN** main holds a large asset store
- **THEN** the demo cap is unchanged and main is not considered
