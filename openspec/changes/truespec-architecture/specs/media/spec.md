## Purpose

The lifecycle of images and uploaded files: Sanity as the store for both images and enquiry PDFs, the upload-first save-second flow, no derivative pipeline in v1, and office-only access to PDF references — with jobs that keep bytes and rows from drifting apart.

## ADDED Requirements

### Requirement: Images live in Sanity, the list lives in the database
Car images SHALL be stored as Sanity assets and served through Sanity's CDN; the database SHALL hold only each car's ordered photo list referencing asset ids (cover = position 0). Sanity SHALL be used strictly as asset storage — never as a second admin. No Sanity Studio SHALL be built or deployed: the asset store is reached only by the application's own server code through the API, so no second editing surface exists beside the office. The image dataset SHALL be readable without a key, since the showroom serves assets through Sanity's CDN.

#### Scenario: Rendered from the CDN
- **WHEN** the showroom renders a car gallery
- **THEN** images load from Sanity's CDN URLs built from the stored asset ids, and no image bytes pass through the application

### Requirement: Upload first, car saves second
An image SHALL be uploadable before its car record exists: the asset is created independently at upload time, and the car's save links the rows. A photo referenced before its record exists must not become a problem the owner can see.

#### Scenario: New car, photos first
- **WHEN** the owner starts a new car and uploads photos before saving the car
- **THEN** the assets upload immediately and the save links them; no orphan survives a successful save

### Requirement: No image processing in v1
V1 SHALL serve original uploads with an upload size cap and EXIF stripped at the write boundary; no downscaling, derivatives, or format conversion pipeline is built. Sanity's on-demand CDN parameters are the documented upgrade path, not part of v1.

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
- **half-finished uploads** — an asset that no row ever referenced and that therefore never belonged to any record is cleared by the job, so an abandoned upload cannot sit in the store forever;
- **the failed-login log** — `auth_attempt` rows past 90 days are cleared by the job, so the one address the system holds is not kept forever.

Everything else is reported, never removed: assets and files belonging to a record the owner deleted, rows pointing at an asset that no longer exists, and customer data that has reached its retention age (specs/enquiries). Each of those becomes an item **the owner can see and clear in the office**, and nothing is removed until he acts — no window and no clock (the system warns the client, the client deletes; even at 100 years the action stays his). Only when the owner clears an item do the underlying bytes or rows go. The governing rule survives, with the owner as the actor: what remains is what is referenced and still exists — bytes win over rows, rows win over orphan bytes — and the store can always say exactly which items are waiting to be cleared.

#### Scenario: An upload is abandoned before the car saves
- **WHEN** an upload succeeds but the car save is never completed, and no record ever referenced the asset
- **THEN** the job clears that unreferenced asset — it never belonged to a record — while every asset that ever belonged to a record waits for the owner

#### Scenario: Asset deleted at Sanity out of band
- **WHEN** an asset is deleted at Sanity but its row remains
- **THEN** the placeholder renders immediately, and the office reports the dangling row to the owner to clear

#### Scenario: A deleted record's files remain
- **WHEN** the owner deletes a car, an enquiry or an imported PDF
- **THEN** its files wait to be cleared, are shown to him as waiting, and are removed only when he clears them

### Requirement: Enquiry PDFs stored privately in Sanity
Enquiry PDFs SHALL be stored as Sanity file assets under an `enquiry-pdfs` designation with randomized filenames; the original filename and the asset reference SHALL live only in the database, and a reference SHALL never appear in any public payload — access exists only through the server on an authenticated office request. Files whose import was deleted are **reported** by the same daily job and cleared by the owner; the system removes no file on its own initiative (owner ruling 2026-10-13).

#### Scenario: Public request for a PDF
- **WHEN** anyone requests an enquiry PDF without an authenticated office session
- **THEN** the application does not serve it — no PDF reference exists in any public page or payload, and office routes check the session before any file is fetched or delivered
