# LAUNCH-001 — Task 4 report: home fonts and hero images

**Date:** 2026-10-27
**Task:** `openspec/tasks/LAUNCH-001/task.md` guarantee 7.2 (home), 7.3.
**Status:** Runtime checks pass. Owner look check pending.

## What changed

- `app/layout.tsx` self-hosts Oswald (500/600/700) and Inter (400/500/600) with `next/font/google`.
  No Google Fonts request is made at runtime.
- Font Awesome 6.5.1 is installed locally (`@fortawesome/fontawesome-free`) and imported from the
  root layout. No cdnjs request is made at runtime.
- The root `<html>` carries `--font-head` / `--font-body` aliases. The site stylesheet and the
  standalone door/office-shell stylesheets both resolve the same self-hosted families. This also
  fixed the door, which imports only `door.css` and previously fell back to Times New Roman after the
  font variables were introduced.
- `components/site/HeroSlider.tsx` requests Sanity transforms: an 800×800 square for narrow
  viewports and a 1200×450 wide crop for desktop. The first slide is `loading="eager"` with
  `fetchpriority="high"`; the rest are lazy. `width`/`height` are reserved.
- The earlier non-blocking Font Awesome stylesheet experiment was reverted: it produced CLS 0.368 and
  a performance score of 10. The approved look and layout stability win over removing the first-party
  app CSS from the critical path.

## Runtime evidence (attach-only, existing build tab)

Every check used the visible Chrome on CDP `:9222`, the build tab on `:3210`, and detached. No tab was
opened or closed; no Chrome was launched; no screenshot was taken.

| Check | Result |
|---|---|
| Home 1440×900 | body Inter, head Oswald, icons render, hero `currentSrc` 1200×450, overflow 0, console 0, page errors 0, tabs 6→6, Chromium 1→1 |
| Home 560×900 | body Inter, head Oswald, icons render, hero `currentSrc` 800×800, overflow 0, console 0, page errors 0, tabs 6→6, Chromium 1→1 |
| Home 1440/820/560, dark and light | one h1, no heading skips, overflow 0, console 0, page errors 0, tabs 6→6, Chromium 1→1 |
| Car `/car/TS-1001` 1440×900 | body Inter, head Oswald, icons render, overflow 0, console 0, page errors 0, tabs 6→6, Chromium 1→1 |
| Office door `/office/sign-in` 1440×900 | body Inter, head Oswald, overflow 0, console 0, page errors 0, tabs 6→6, Chromium 1→1 |
| Font files blocked (`.woff2` aborted, cache disabled) | text length 3,644; “TrueSpec” and the heading visible; Inter/Oswald not loaded (`document.fonts.check` false); readable fallback; tabs 6→6, Chromium 1→1 |
| Network | no `fonts.googleapis.com` or `fonts.gstatic.com`; local app font files and the used Font Awesome files (solid, brands, regular) only |

The office door has two `<h1>` elements: the page's “TrueSpec Office” and Clerk's “Continue to
Truespec”. That is a pre-existing door/Clerk markup issue, not a Task 4 font change; it belongs to the
accessibility pass (Task 15).

## Lighthouse home lab

Lighthouse 13.5.0, mobile, 412×823, CPU 4×, throttled network. Lab only; the visible browser was not
used.

| Metric | Baseline (Task 1) | Task 4 |
|---|---:|---:|
| Performance | 33 | 28 |
| Accessibility | 100 | 100 |
| Best practices | 77 | 77 |
| SEO | 100 | 89 |
| FCP | 4.5 s | 4.7 s |
| LCP | 11.4 s | 7.5 s |
| TBT | 1,130 ms | 2,670 ms |
| CLS | 0.057 | 0.024 |
| Speed Index | 11.8 s | 17.5 s |
| TTI | 15.7 s | 12.3 s |

- **LCP is still outside the 2.5 s target, but the font work is not the cause.** The LCP element is
  the hero image; Lighthouse confirms `fetchpriority=high`, eager loading and discoverability in the
  initial document. The LCP breakdown is TTFB 6.73 s + resource load delay 0.88 s + load 0.73 s +
  render delay 0.14 s. The TTFB is the Clerk dev-browser handshake chain
  (`/` → `clerk.accounts.dev/v1/client/handshake` → `/?__clerk_handshake=…` → `/`), not the fonts or
  hero. The baseline had the same chain; the local Lighthouse TTFB varies from 1.7 s to 7.2 s between
  runs.
- **The SEO 89 is a Lighthouse false negative.** The served HTML and the hydrated page both contain
  `<meta name="description" content="A Nigerian vehicle-import showroom: browse, judge a car
  completely, chat on WhatsApp.">`; the runtime check B1 passes. Lighthouse reports “Document does not
  have a meta description” only in its fresh-browser run through the Clerk handshake. The canonical,
  title and crawlable-link audits pass.
- **TBT and the performance score are noisy on the local build.** Two consecutive Task 4 runs produced
  TBT 3,100 ms and 4,840 ms; this run produced 2,670 ms. The dominant cost is the Clerk handshake and
  the existing client JavaScript, not the font files. Task 27 re-measures and fixes the performance
  path.

## Acceptance

- [x] No render-blocking third-party font request; text readable with the font files blocked.
- [x] Only used weights are requested; icons render.
- [x] Hero requests display-sized Sanity transforms with width/height reserved; CLS 0.024, no hero
      layout jump.
- [x] G4/G5 and B1/C1 runtime checks pass.
- [ ] Owner look check pending.

## What was not checked

- The owner's visual approval of the self-hosted fonts and hero crops.
- The authenticated office shell; only the anonymous door was checked.
- Field performance data.
