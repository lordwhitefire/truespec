## Purpose

A second data space on the same site: prospects can sign themselves up and use the office against a
practice copy that resets daily, while the owner and invited clients keep the main inventory. The two
spaces are isolated at the store, the public showroom is always main, and the reset never touches
main.

## ADDED Requirements

### Requirement: Two spaces, one application

The system SHALL provide exactly two data spaces: **main** and **demo**. Both SHALL be served by the
same application deployment, the same public URL, the same identity-provider application and the same
Neon project. The demo space SHALL be a separate database branch with its own connection string. There
SHALL be no second Vercel project, no second public URL and no second Clerk application.

#### Scenario: One site serves both spaces
- **WHEN** a visitor opens the site or the office
- **THEN** they use the same deployment and address as before; only the authenticated account's space decides which store the office uses

#### Scenario: The demo is a branch, not a second deployment
- **WHEN** the demo store is inspected
- **THEN** it is a separate branch in the same Neon project, reached by a connection string that is not the main one

### Requirement: Space is resolved on the server from the verified identity

The application SHALL resolve an office request's space on the server from the authenticated Clerk
user. An account whose `publicMetadata.truespec_space` is exactly `main` SHALL use main. Every other
signed-in account SHALL use demo. The application SHALL NOT trust a cookie, header, query parameter,
form field, local storage value or client-supplied metadata to choose main. An office request with no
verified signed-in account SHALL be refused before any store read; it SHALL NOT be treated as main.
If the demo store is not configured, a non-main account SHALL be refused; the application SHALL NOT
fall back to main.

#### Scenario: A self sign-up lands in demo
- **WHEN** a person creates an account themselves and opens the office
- **THEN** every office read and write uses the demo store

#### Scenario: An invited account lands in main
- **WHEN** an account carries the main grant and opens the office
- **THEN** every office read and write uses the main store

#### Scenario: A forged choice is ignored
- **WHEN** a request carries a cookie, header or parameter that claims main without the main grant
- **THEN** the request is served from demo, or refused if demo is unavailable; it is never served from main

#### Scenario: An anonymous office request
- **WHEN** an office page or action is reached without a verified signed-in account
- **THEN** it is refused before any store read; the resolver does not return main for the anonymous request

#### Scenario: The demo store is missing
- **WHEN** a non-main account opens the office and the demo connection string is absent or invalid
- **THEN** the office returns a configuration error and never reads or writes main

### Requirement: The main grant is an invitation, not a role system

The owner SHALL grant main by setting `publicMetadata.truespec_space = "main"` on the owner's own
provider user and on the provider invitation sent to a client. The application SHALL NOT maintain a
role table, permission table, email allow-list or role-editing screen. The activity log SHALL continue
to name the actor of each action. The client's invitation → provider sign-in → office path SHALL
remain the path the client already uses.

#### Scenario: The owner is main
- **WHEN** the owner signs in with the main grant on his provider user
- **THEN** he sees the main office and no demo banner

#### Scenario: The client is main
- **WHEN** the client accepts an invitation carrying the main grant and signs in
- **THEN** the client sees the main office, exactly through the invitation path already in use

#### Scenario: A self sign-up has no grant
- **WHEN** a person signs up without an invitation carrying the main grant
- **THEN** the account has no main grant and is placed in demo

#### Scenario: No role surface
- **WHEN** the office is searched for a role, permission or allow-list screen
- **THEN** none exists; the only grant is the provider metadata described above

### Requirement: The public showroom is always main

Every public showroom page, public count, public setting read and buyer tap SHALL read or write the
main store. A signed-in demo account's provider session SHALL NOT change the public showroom, and no
demo car, demo price, demo photo, demo setting or demo tap SHALL reach a public page or response.

#### Scenario: A demo user browses the showroom
- **WHEN** a signed-in demo user opens the home page, inventory or a car page
- **THEN** the page is rendered from main, exactly as it is for an anonymous visitor

#### Scenario: A demo car is saved
- **WHEN** a demo user adds or edits a car in the demo office
- **THEN** that car does not appear on any public page, count or link

#### Scenario: A buyer taps from the showroom
- **WHEN** a showroom visitor records a WhatsApp tap
- **THEN** the tap is written to main, never to demo

### Requirement: A fixed encrypted snapshot of main seeds the demo

A one-time snapshot of main's database SHALL be taken after main's demo content is final and SHALL be
stored as an encrypted file in the asset store under a name that is not a daily backup and with a
system mark that only the snapshot tool can set. The system mark SHALL be distinct from the demo
upload mark; a demo upload with the same filename SHALL NOT be selected as the snapshot. The snapshot
SHALL be the only source of demo data for the daily reset. Refreshing it SHALL be a deliberate owner
action; the daily reset SHALL NOT take a new copy of main. This keeps later real main data out of the
demo.

#### Scenario: The demo is first seeded
- **WHEN** the demo space is first made ready
- **THEN** it is populated from the fixed snapshot, not by copying main live

#### Scenario: Main changes after the snapshot
- **WHEN** main gains, edits or loses data after the snapshot was taken
- **THEN** the next demo reset still restores the original snapshot; the changed main data does not appear in demo

#### Scenario: The snapshot is missing or cannot be authenticated
- **WHEN** the reset cannot find, download, decrypt or parse the snapshot
- **THEN** it refuses and leaves the demo as it was

#### Scenario: A demo upload reuses the snapshot filename
- **WHEN** a demo user uploads a file named like the snapshot
- **THEN** it carries only the demo upload mark, is not selected as the snapshot, and the reset still uses the one system-marked seed

### Requirement: The demo resets daily without touching main

The demo database SHALL be restored from the fixed snapshot once a day, scheduled for 03:00 UTC. The
restore SHALL replace the demo's data rows in one transaction. Demo accounts at the identity
provider SHALL survive; demo cars, enquiries, drafts, costs, photos, sales, taps, activity rows,
settings and session rows SHALL be replaced by the snapshot's contents. The demo branch's own
`schema_migrations` rows SHALL be preserved, because they describe the demo branch's actual schema
and the snapshot's older history must not cause migrations to be replayed. The main database SHALL
NOT be written, truncated, restored or otherwise changed by the reset. Vercel may start a Hobby cron
within the hour; the banner SHALL say that the reset is daily rather than promise an exact minute.

#### Scenario: The daily reset runs
- **WHEN** the reset succeeds and no main user is writing during the run
- **THEN** the demo's data rows match the fixed snapshot, its own migration history is still present, and a checksum or count of main taken before and after is unchanged

#### Scenario: A demo account signs in after a reset
- **WHEN** a prospect who signed up before the reset signs in the next day
- **THEN** the provider account still exists and the office opens in demo with the snapshot's data

#### Scenario: A demo user is working during the reset
- **WHEN** the reset runs while a demo user has unsaved work
- **THEN** the stored demo rows are replaced; the banner has warned that demo data resets daily

#### Scenario: The data restore fails
- **WHEN** the snapshot, store or database refuses the reset before or during the restore
- **THEN** the demo remains as it was, the failure is reported, and main is untouched

#### Scenario: The cleanup fails after a successful restore
- **WHEN** the data rows are restored but the demo upload cleanup fails
- **THEN** the data reset stands, the cleanup failure is reported, and no unmarked asset is deleted to compensate

#### Scenario: Two resets overlap
- **WHEN** a second reset starts before the first has finished
- **THEN** the second refuses rather than restoring concurrently

### Requirement: The reset proves which database it is replacing

Before restoring, the reset SHALL verify all of the following: the demo connection string is present;
it is not the main connection string (Neon's pooled and direct hosts for one branch compare equal);
the Neon project and branch identified by configuration are the project's demo branch, by branch id
and name; the connection string's host belongs to a **read-write** endpoint of that same branch; and
the branch is not main. If any check cannot be made or disagrees, the reset SHALL refuse.

#### Scenario: The demo URL accidentally names main
- **WHEN** the demo connection string resolves to main, or its branch id/name is main
- **THEN** the reset refuses before opening a write connection

#### Scenario: The demo URL names another project's branch
- **WHEN** the demo connection string's host is not a read-write endpoint of the configured demo branch
- **THEN** the reset refuses before opening a write connection

#### Scenario: The Neon API is unreachable
- **WHEN** the branch identity or endpoint list cannot be checked
- **THEN** the reset refuses; it does not assume the URL is safe

### Requirement: Demo uploads are cleared with the demo

Every image or file uploaded while using the demo office SHALL be marked in the asset store as a demo
upload at upload time, with the exact demo mark. After a successful reset, demo uploads created
before that reset started SHALL be deleted. Main uploads, the fixed snapshot, daily backup files and
seeded assets SHALL never carry the demo mark and SHALL never be deleted by this cleanup. The
snapshot's system mark SHALL be distinct from the demo mark, and the cleanup SHALL match the demo
mark exactly rather than by prefix. If cleanup fails, the reset SHALL report the failure; it SHALL
NOT delete an unmarked asset to compensate.

#### Scenario: A demo user uploads a photo then the day resets
- **WHEN** the reset finishes after a demo user uploaded a photo
- **THEN** the photo's asset is deleted; no main photo or snapshot file is deleted

#### Scenario: A main photo exists
- **WHEN** the demo cleanup runs
- **THEN** it does not consider the main photo, even if the demo store references a copy of its id

#### Scenario: Cleanup cannot tell
- **WHEN** an asset's mark is missing, unreadable or not the demo mark
- **THEN** the asset is left in place and the run reports it rather than guessing

### Requirement: Demo storage is bounded

Demo uploads SHALL be bounded by a total asset-size cap in addition to the existing per-file cap. A
demo upload that would exceed the cap SHALL be refused with a clear message. The cap SHALL be an
operational limit, not a permission or role. Main uploads SHALL NOT count against it.

#### Scenario: A demo user reaches the cap
- **WHEN** the next demo upload would push demo-marked assets over the configured cap
- **THEN** the upload is refused and the person is told the demo storage is full until the next reset

#### Scenario: Main is near its own limit
- **WHEN** main's asset usage is high
- **THEN** it does not reduce the demo cap or change the demo's behaviour

### Requirement: Demo is visibly a demo

Every page inside the demo office SHALL show a persistent banner saying that the data is a demo and
resets daily. The main office SHALL NOT show it. The sign-in surface SHALL offer a demo sign-up link
when demo sign-up is enabled. The demo sign-up page SHALL state that the account is a demo, that its
data resets daily, that uploads are deleted with the demo, and that the public showroom shows main,
not the demo's inventory. The demo office SHALL NOT show the main cleanup-readiness card, which
reads the global asset store, nor main's storage and backup notices; those are main-only reports.

#### Scenario: A demo user opens any office page
- **WHEN** the page renders
- **THEN** the demo banner is present

#### Scenario: The owner opens the main office
- **WHEN** the owner's session is main
- **THEN** no demo banner is present

#### Scenario: The buyer-page preview
- **WHEN** a demo user opens a car in the office
- **THEN** the "preview the buyer page" control is absent, because it would show main, not the demo car

#### Scenario: The main system card
- **WHEN** a demo user opens Settings
- **THEN** main's storage and backup notices are not shown as the demo's; the demo omits that System card while keeping the settings it can practise

#### Scenario: The main cleanup card
- **WHEN** a demo user opens Settings
- **THEN** the cleanup-readiness card is absent, because it reads the global asset store and would name main assets the demo does not reference

### Requirement: Demo sign-up and reset have operator switches

The application SHALL provide `DEMO_SIGNUP_ENABLED` and `DEMO_RESET_ENABLED` as operator switches. When
sign-up is off, the link SHALL be hidden and the sign-up route SHALL refuse. When reset is off, the
reset route SHALL refuse. The switches SHALL NOT grant main access. Turning sign-up off in the
application does not, by itself, change the provider's own sign-up mode; the provider setting remains
the outer switch and the handover SHALL say so.

#### Scenario: Demo sign-up is turned off
- **WHEN** the flag is off and a person opens the demo sign-up URL
- **THEN** no sign-up form is served; the person is returned to sign-in

#### Scenario: Demo reset is turned off
- **WHEN** the flag is off and the reset route is called
- **THEN** it refuses without changing demo or main

### Requirement: The privacy notice tells the truth about demo accounts

The privacy notice SHALL distinguish a showroom visitor from a person who chooses to create a demo
account. It SHALL say that the demo account's email is used for sign-in only, that demo data and demo
uploads reset daily, and that the site sends no marketing email. It SHALL say that the application
has no email channel of its own and that the identity provider may send authentication messages as
part of the sign-up the person chose. It SHALL NOT claim that the site has no accounts at all while
demo sign-up is offered.

#### Scenario: A person reads the notice before signing up
- **WHEN** the notice is opened
- **THEN** it explains the optional demo account and the daily deletion in the same place it explains the showroom's tap record

### Requirement: The legacy demo-wipe tool cannot delete main

The legacy manual demo-wipe tool that removes `is_demo` rows SHALL be retired: its command SHALL be
removed, and no replacement CLI that deletes by `is_demo` SHALL exist. A manual demo reset is the
reset route with its operator guard, not a row-marker wipe. The daily reset SHALL NOT rely on
`is_demo` rows. No script, job or request path SHALL delete main cars, enquiries, drafts, photos,
PDFs, taps or activity as part of demo maintenance. The owner's ordinary office delete remains the
way he deletes main data he chooses to delete.

#### Scenario: The retired wipe is invoked
- **WHEN** a person tries the old demo-wipe command
- **THEN** no command exists, or it fails closed without opening a database or deleting an asset

#### Scenario: A demo car has no is_demo mark
- **WHEN** the daily reset runs
- **THEN** the whole demo store is replaced from the snapshot; the reset does not depend on `is_demo`

#### Scenario: The owner deletes main data
- **WHEN** the owner deletes a main car or enquiry through the office
- **THEN** that ordinary delete path is unchanged; no demo tool is involved
