## Purpose

The lifecycle of images and uploaded files: Sanity as the store for both images and uploaded files (an enquiry's prepared PDF, a car's filled template), the upload-first save-second flow, no derivative pipeline in v1, and office-only access to file references — with jobs that keep bytes and rows from drifting apart.

## ADDED Requirements

### Requirement: Images live in Sanity, the list lives in the database
Car images SHALL be stored as Sanity assets and served through Sanity's CDN; the database SHALL hold only each car's ordered photo list referencing asset ids (cover = position 0). Sanity SHALL be used strictly as asset storage — never as a second admin. No Sanity Studio SHALL be built or deployed: the asset store is reached only by the application's own server code through the API, so no second editing surface exists beside the office. The image dataset SHALL be readable without a key, since the showroom serves assets through Sanity's CDN.

#### Scenario: Rendered from the CDN
- **WHEN** the showroom renders a car gallery
- **THEN** images load from Sanity's CDN URLs built from the stored asset ids, and no image bytes pass through the application

### Requirement: Upload first, car saves second
An image SHALL be uploadable before its car record exists: the asset is created independently at upload time, and the car's save links the rows. A photo referenced before its record exists must not become a problem the owner can see. An image MAY also be attached to a **draft** — the staged row an upload produces before any record exists (design D13) — in which case the draft holds the reference and the real photo rows are written when the draft is saved; the draft's images SHALL survive a reload like the rest of the draft.

#### Scenario: New car, photos first
- **WHEN** the owner starts a new car and uploads photos before saving the car
- **THEN** the assets upload immediately and the save links them; no orphan survives a successful save

#### Scenario: Images attached to an upload's draft
- **WHEN** a draft arrives from an uploaded file and the owner adds its photos by hand, because the file carries values and not pictures
- **THEN** the images attach to the draft, survive a reload, and become photo rows naming the car only when the draft is saved — and a draft that is never saved leaves its images referenced by the draft, so nothing about them is lost to the owner

### Requirement: No image processing in v1
V1 SHALL serve original uploads with an upload size cap of **15 MB** (owner ruling 2026-10-14) and EXIF stripped at the write boundary; no downscaling, derivatives, or format conversion pipeline is built. Sanity's on-demand CDN parameters are the documented upgrade path, not part of v1.

#### Scenario: Owner uploads a full-size photo
- **WHEN** a photo is uploaded
- **THEN** its EXIF is stripped at the write boundary, oversize files are rejected by the cap, and the stored file is the original

### Requirement: Showroom survives image-store failure
If Sanity is unreachable or an asset is missing, the showroom SHALL render a placeholder instead of crashing — the gallery degrades, the page still loads.

#### Scenario: Image store outage
- **WHEN** a car page is opened while Sanity is down
- **THEN** placeholders appear in the gallery and the rest of the page renders normally

### Requirement: Drift is detected and reported, never deleted by the system
A daily job SHALL reconcile storage and the database and **report** what it finds; it SHALL NOT remove, prune or hard-delete anything on its own — with **exactly two exceptions, both the system's own litter and neither a record** (owner ruling 2026-10-13):
- **half-finished uploads** — an asset that **neither a draft nor a record** ever referenced, and that therefore never belonged to any record or to a waiting draft, is cleared by the job, so an upload abandoned before it was even staged cannot sit in the store forever;
- **the failed-login log** — `auth_attempt` rows past 90 days are cleared by the job, so the one address the system holds is not kept forever.

Everything else is reported, never removed: assets and files belonging to a record the owner deleted, images attached to a draft he has not saved and cleared himself, rows pointing at an asset that no longer exists, and customer data that has reached its retention age (specs/enquiries). Each of those becomes an item **the owner can see and clear in the office**, and nothing is removed until he acts — no window and no clock (the system warns the client, the client deletes; even at 100 years the action stays his). Only when the owner clears an item do the underlying bytes or rows go. The governing rule survives, with the owner as the actor: what remains is what is referenced and still exists — a draft references its own images as truly as a record does — bytes win over rows, rows win over orphan bytes, and the store can always say exactly which items are waiting to be cleared.

#### Scenario: An upload is abandoned before the car saves
- **WHEN** an upload succeeds but the car save is never completed, and neither a record nor a draft ever referenced the asset
- **THEN** the job clears that unreferenced asset — it never belonged to a record or to a waiting draft — while every asset that ever belonged to either waits for the owner

#### Scenario: Asset deleted at Sanity out of band
- **WHEN** an asset is deleted at Sanity but its row remains
- **THEN** the placeholder renders immediately, and the office reports the dangling row to the owner to clear

#### Scenario: A deleted record's files remain
- **WHEN** the owner deletes a car, an enquiry or an imported PDF
- **THEN** its files wait to be cleared, are shown to him as waiting, and are removed only when he clears them

### Requirement: Uploaded files stored privately in Sanity
Every file the office uploads — an enquiry's prepared PDF and a car's filled template — SHALL be stored as a Sanity file asset under a designation of its own with **randomized filenames**; the original filename and the asset reference SHALL live only in the database, and a reference SHALL never appear in any public payload — access exists only through the server on an authenticated office request. A file SHALL be held from the moment it is uploaded, because a draft that is still waiting has its source in that file; once its drafts are saved the file is linked to the records it produced. Files whose records are gone are **reported** by the same daily job and cleared by the owner; the system removes no file on its own initiative (owner ruling 2026-10-13).

#### Scenario: Public request for a PDF
- **WHEN** anyone requests an uploaded file without an authenticated office session
- **THEN** the application does not serve it — no file reference exists in any public page or payload, and office routes check the session before any file is fetched or delivered

#### Scenario: A car's template is uploaded
- **WHEN** the owner uploads a filled car template, and its drafts are still waiting
- **THEN** the file is held under a randomized filename, its original name and its reference exist only in the database, and nothing about it appears in any public response — while its image assets' clearance is untouched, because the waiting drafts reference them
