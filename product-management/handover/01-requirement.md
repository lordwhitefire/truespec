# 01 — The requirement, and the situation

Comprehend (C). Baseline document: `demo_product.pdf` — *"TrueSpec Automotive — Secure Inventory
Website (Build Spec)"*, 5 pages, created 25 September 2026. Read in full on 2026-10-23.

---

## What the brief actually asks for

A two-sided web application for a vehicle import business.

- **Public site** — polished, anonymous, browsable inventory. No login, no write access.
- **Admin backend** — private, authenticated, single owner. Full CRUD, cost breakdown, profit,
  settings, audit log.
- **The critical requirement** — sensitive financial data must never be retrievable by the public,
  "not through the UI, not through the API, not through browser dev tools", enforced on the server.
- **Deliverable** — a live, deployed website with a public URL; a separate `/admin` login route;
  and brief documentation on how to log in, add a listing, and update settings.

**The word "demo" does not appear in the document.** It was the builder's own framing, not the brief's.

## Goal

Move the build from *delivered* to *the client's*: he can operate it alone, and he trusts it with real
stock. Not "explain every feature" — that is a means, not the goal.

**Metric that follows from it:** within 48 hours he signs in, replaces the placeholder WhatsApp number,
and saves one car without asking how. A second signal: no "what does this page do?" email in week one.

## Constraints

- Reader is non-technical; the brief's own language (API, serializer, RLS) is unavailable.
- No screenshots in the guide — owner's decision. Every instruction must therefore locate itself by
  label and position.
- Text must survive printing and email: one section per page, A4, modest file size.
- The note must not blame the client for the overrun — owner's explicit instruction, treated as a hard
  constraint on drafting.
- Sandbox credentials appear in the document, so the document must tell him to dispose of it.
- Read-only on the product throughout; no configuration, no data changes, no deployment.

## Context

- **Who:** the owner of TrueSpec Automotive — single admin, non-developer, phone-first.
- **Why:** he has been quoted a two-week demo and is receiving a working product at five weeks,
  without having been told the estimate moved.
- **Where:** public at `https://truespec-k4y6.vercel.app`; office at `/office`; local build walked at
  `127.0.0.1:3210` against a throwaway Neon branch.
- **How it works today:** Next.js on Vercel, Clerk for authentication (invite-only), Postgres with
  database-level enforcement of the public/admin split, an allow-list serializer, and a leak-check
  script. 50 test files.

## Assumptions carried forward (stated, not hidden)

1. The deployed build and the local build share page structure. Spot-checked on the live site: `/`,
   `/inventory`, `/car/[ref]`, `/privacy` and `/office/sign-in` all resolve and match.
2. The client has no prior hands-on use of the office. The guide therefore starts at the sign-in
   screen, not at the dashboard.
3. The visible cars are sample stock, not his inventory. The guide says so.
4. Prices are in naira and the business is Nigeria-based; the brief and the build both assume it.
5. The owner will resolve the new-device verification step before sending (see `05-send-checklist.md`).
   Until he does, the sign-in page in the guide describes a step the client cannot complete alone.
