# TASK-004 — current truth for the external surfaces (Task 2)

**Date:** 2026-10-14 · Loaded from the products' own current material, not from memory.
Nothing here is written from recollection; each item cites where it came from.

---

## 1. Skill check — what exists, what is installed

**Installed skills root:** `/home/lordwhitefire/.agents/skills/` (40 skills).

| Surface this layer touches | A skill for it? | Installed? | Action |
|---|---|---|---|
| **Sanity** (photo uploads, held files) | yes — `sanity-best-practices` (+ `portable-text-*`, `sanity-migration`) | **yes** | use it; it is the authority when wiring `lib/sanity.ts` (Tasks 18, 22–23) |
| **Neon Postgres** (the store, migrations) | yes — `neon-postgres` (+ `neon`) | **yes** | use it for the `0020`/`0021` migrations and connection handling |
| **Clerk** (the door) | **yes** — the Clerk CLI installs a **Clerk agent skill globally in agent mode** | **not yet** | ⚠️ **ask the owner before installing** (skill rule) — see §4 |
| **PDF author/read** (`pdf-lib`) | no | — | proceed on official docs at point of use |
| **ZIP export** (`archiver`) | no | — | proceed on official docs at point of use |
| **EXIF strip** (`sharp`) | no | — | proceed on official docs at point of use |
| craft (TDD, incremental, security, etc.) | yes — Osmani's engineering skills | yes | used throughout per the standing rule |

No skill exists for PDF / ZIP / EXIF, so there is nothing to ask about there.

## 2. Clerk — the current material (official docs)

**Source:** `https://clerk.com/docs/quickstarts/nextjs` (Next.js quickstart, fetched 2026-10-14);
CLI reachable as `npx -y clerk@latest` (version **3.4.1**, checked).

**The commands (verbatim shape from the docs):**
- `npx -y clerk@latest auth login` — sign in (the owner's step; builder pauses).
- `npx -y clerk@latest apps list --json` — show names + IDs; **never choose for the owner**.
- `npx -y clerk@latest init --app <application_id>` — use an existing application.
- `npx -y clerk@latest init` — default; provisions a **claimable** app, writes dev keys to
  `.env.local`, configures SDK + provider + middleware + auth routes.
- `npx -y clerk@latest config patch`, `npx -y clerk@latest enable orgs`, `npx -y clerk@latest doctor`.

**Critical rules (verbatim, and how each lands in this project):**
1. *"Setup is `npx -y clerk@latest init` … Do not install `@clerk/nextjs` or hand-write setup unless it
   has run and failed."* → the plan's Task 3 runs `init` first; manual wiring is only a fallback.
2. *"`npx -y clerk@latest init` writes `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to
   `.env.local`. Do not ask the user to copy keys."* → **`NEXT_PUBLIC_`-prefixed name.** ⚠️ Conflict
   with `lib/config.ts` (below).
3. *"Name the middleware file by the `next` version: `proxy.ts` on Next.js 16+, `middleware.ts` on 15
   and below."* → this project is **next ^15.5.27** (`package.json`), so the file is **`middleware.ts`**.
   The plan already says `middleware.ts` — confirmed correct, not `proxy.ts`.
4. *"`auth()` … is async. Always `await auth()`."*
5. *"`ClerkProvider` goes inside `<body>`, not wrapping `<html>`."*
6. *"Never expose `CLERK_SECRET_KEY` in client code."* / *"Use `@clerk/nextjs`, not `@clerk/clerk-react`."*
7. *"Do not read or print existing environment variable files."* → I have only ever listed **key names**
   (never values), and will keep it that way.
8. **Existing-auth guard:** *"Before `init`, inspect for existing auth — never env files. If found, stop
   and get approval…"* → the tree's `/office/login` is a **fake client screen**, not real auth (no
   cookie, no server call; `login-client.tsx:114-117`), and it is **this task's own placeholder** to
   replace. So there are no real users/passwords to migrate. Recorded, not treated as a blocker.
9. **Testing note:** *"Bot protection can block sign-ups in browsers you automate."* If a test account is
   needed: `npx -y clerk@latest users create --email <unique>+clerk_test@example.com --password
   <16-char-alnum> --yes`, verification code **`424242`**; or `@clerk/testing`. **For an existing app,
   ask the owner before creating users.**
10. **Approval gate:** the docs require showing this checklist and **waiting for approval** before `init`:

```
1. Set up Clerk in this project
2. Start your app with Clerk installed.
3. Stay signed out and optionally sign in later to claim the app, or sign in first to use an
   existing Clerk application.
```

**⚠️ The env-name conflict (a real change-point):**
`lib/config.ts:23-24,55-59,77-78` requires and returns `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`;
the current `.env.local` carries those names as placeholders. But Clerk's CLI writes
**`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`** (Next requires the `NEXT_PUBLIC_` prefix to expose it to the
browser) and `CLERK_SECRET_KEY`. The smallest correct change: teach `lib/config.ts` to read the
standard `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (keeping `CLERK_SECRET_KEY`), so the CLI's output is used
as-is and no key is copied by hand.

## 3. Toolchain for PDF / ZIP / EXIF — current versions (npm registry, checked 2026-10-14)

| Need | Library | Latest | Note |
|---|---|---|---|
| Author the blank car/enquiry template **and** read a filled one | `pdf-lib` | 1.17.1 | create + modify PDFs; supports AcroForm form fields → one library for author and reader |
| Produce the ZIP export | `archiver` | 8.0.0 | streaming zip; matches a Route Handler download |
| Strip EXIF at the write boundary | `sharp` | 0.35.5 | re-encode drops metadata by default (alt: `piexifjs` 1.0.6 removes JPEG EXIF segments without re-encoding) |

Design leaning (to be fixed with docs loaded at the task): the **car template is a fillable AcroForm
PDF** authored with `pdf-lib`, so reading a filled copy is `getForm().getFields()` — no OCR, no layout
guesswork. Edge case carried: a scanned/printed-and-signed copy would be image-only (the
`video-pdf-ocr` skill's ground); the design should refuse it as "not the expected template" rather
than guess. These libraries are **not installed yet**; they land with their tasks (18, 20, 22–23, 28).

## 4. What needs the owner before Task 3 (Clerk)

1. **Sign in the CLI** so `init --app app_3KfevzKd9JdCG86xfx301JYsTuU` can reach that application
   (`npx -y clerk@latest auth login` — the owner completes the browser flow), **or** agree to stay
   signed out and let `init` provision a fresh claimable app instead of that one.
2. **The Clerk agent skill** the CLI installs globally in agent mode — approval to let it install
   (skill rule).
3. **Heads-up (not a question):** `lib/config.ts` will be changed to read
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` so the CLI's own output is used unchanged.
