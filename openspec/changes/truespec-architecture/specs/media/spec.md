## Purpose

The lifecycle of images and uploaded files: Sanity as the store for both images and enquiry PDFs, the upload-first save-second flow, no derivative pipeline in v1, and office-only access to PDF references — with jobs that keep bytes and rows from drifting apart.

## ADDED Requirements

### Requirement: Images live in Sanity, the list lives in the database
Car images SHALL be stored as Sanity assets and served through Sanity's CDN; the database SHALL hold only each car's ordered photo list referencing asset ids (cover = position 0). Sanity SHALL be used strictly as asset storage — never as a second admin.

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

### Requirement: Bytes and rows converge through pruning
A daily job SHALL reconcile storage and database: assets with no referencing row older than 24 hours are removed from Sanity; rows pointing at a 404 asset are removed once outside the undo window; assets and files belonging to hard-deleted records are removed. The governing rule: only referenced, existing assets remain — bytes win over rows, rows win over orphan bytes.

#### Scenario: Failed upload leaves an orphan asset
- **WHEN** an upload succeeds but the car save is abandoned
- **THEN** the unreferenced asset is pruned after 24 hours

#### Scenario: Asset deleted at Sanity out of band
- **WHEN** an asset is deleted at Sanity but its row remains
- **THEN** the placeholder renders immediately, and the job removes the dangling row after the undo window closes

### Requirement: Enquiry PDFs stored privately in Sanity
Enquiry PDFs SHALL be stored as Sanity file assets under an `enquiry-pdfs` designation with randomized filenames; the original filename and the asset reference SHALL live only in the database, and a reference SHALL never appear in any public payload — access exists only through the server on an authenticated office request. Files whose import was deleted SHALL be removed by the same daily job.

#### Scenario: Public request for a PDF
- **WHEN** anyone requests an enquiry PDF without an authenticated office session
- **THEN** the application does not serve it — no PDF reference exists in any public page or payload, and office routes check the session before any file is fetched or delivered
