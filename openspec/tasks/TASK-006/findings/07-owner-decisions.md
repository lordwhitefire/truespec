# 07 — Owner answers (closed)

**Closed:** this session. Q1–Q11.

## The keys — checked

- **Sanity access key: exists.** `lib/config.ts:27-29` requires `SANITY_TOKEN`; `lib/sanity.ts:27-33`
  builds the client with it; `lib/sanity.ts:75` uploads images and `:116` uploads files;
  `lib/sanity.ts:138` deletes an asset. The owner's own car removal already uses that delete
  (`app/office/actions/car.ts:265`). **No new Sanity key is needed.**
- **Backup encryption key: new.** The dump is scrambled with a separate key (AES-256-GCM) held in
  Vercel's environment. This is the only new secret the owner must keep for recovery. The Sanity
  token is not reused as the encryption key. The job also needs a `CRON_SECRET` env value to
  authenticate the schedule; it is generated at build time, set in Vercel, and replaceable — it is
  not a recovery secret and does not go in the password manager.
- **Why scramble it?** The Sanity **project/Studio** is private — only the owner signs in. But the
  **dataset** is public-read so the website can fetch cars and photos without a token. "Public
  dataset" means the read API is open to anyone who knows the project/dataset id; it does not mean
  the Studio is open. The backup contains customer names and numbers, so it is encrypted before it
  goes in. **No private dataset and no permissions work.**

### The backup key — how it reaches the owner

The key is generated **during the build**, not now. The builder does the encryption work first,
then writes one handover file at:

`/home/lordwhitefire/truespec-secrets/`

The file contains the backup key, the environment variable names/values
(`BACKUP_ENCRYPTION_KEY`, `CRON_SECRET`), and the exact Google Password Manager entry (site,
username, password, note). The owner then:

1. saves the entry in Google Password Manager;
2. sets both values in Vercel (Production) — the owner does this, not the builder;
3. deletes the handover file, or keeps it somewhere safe outside the repo.

The key is never committed, never written into the repo, and never stored in Sanity with the
backups. The cron secret is Vercel-only and may be replaced. The Architect creates no file now;
this is a requirement in `task.md`.

## The decisions

1. **Q1 — tap limit: accepted.** Vercel WAF edge rule, **30 requests per minute per IP**; a
   dashboard setting, no application code.
2. **Q2 — session expiry: accepted.** No in-page warning; expiry redirects cleanly, and the car and
   settings drafts survive.
3. **Q3 — PDF link: fixed in this layer.** The enquiry will remember its PDF so the delete can
   remove both.
4. **Q4 — backup: encrypted, no private dataset.** Use the existing Sanity token to upload the
   ciphertext to the current dataset; the new encryption key is the only new recovery secret. The
   cron route adds a replaceable `CRON_SECRET` env value (Vercel only). No permissions work.
5. **Q5 — backup scope: database only.** The photos already live in Sanity.
6. **Q6 — retention: the last 7 dumps.** Older copies are the system's own litter.
7. **Q7 — cleanup: a report-only list in Settings.** "Waiting to be cleared"; it never deletes.
8. **Q8 — delete: on an enquiry, with confirmation.** It removes the enquiry and its PDF file; the
   taps stay; the deletion is written to the activity log.
9. **Q9 — actor: shown.** The email appears visibly in the activity row, not only on hover.
10. **Q10 — storage: two lines.** Database warns at **800 MB**; photos and files warn at **4 GiB**.
11. **Q11 — privacy notice: no email.** It speaks to **showroom visitors**; the client (owner) owns
    the office data and deletes directly. The "email a short request" sentence points to WhatsApp.
