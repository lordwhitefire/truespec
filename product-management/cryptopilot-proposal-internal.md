# Proposal #1 — INTERNAL (for the owner, not the client)

**Status: DRAFT — prices and phases below need your approval before Proposal #2 (the client-facing one) is written.**
Written 2026-10-07. Companion evidence: `cryptopilot-what-is-possible.md` (live tests + sourced prices).

---

## 1. What you pay

### Phase 1 — BUILD & TEST (before any client payment)
| Item | Cost | When |
|---|---|---|
| **Supabase — Free plan** (login + database) | **₦0** | now |
| — fallback: NaijaBase Starter (Lagos) | ₦0 | if Supabase unreachable from Nigeria |
| Domain `.ng` | **₦9,200** (promo, year 1) | once |
| — cheaper option `.com.ng` | **₦3,000** (year 1) | once |
| SSL | ₦0 | — |
| Market data (Binance Vision / MEXC / CoinGecko) | ₦0 | — |
| **Phase 1 total** | **₦9,200 once — ₦0/month** | |

*If the client never pays: you stay here. App keeps running for ₦0/month + domain renewal.*

**FINAL ARCHITECTURE — owner ruling, 2026-10-07: NO browser polling.**

1. **Price cron:** Supabase `pg_cron` → edge function **every minute** → pulls Binance Vision tickers + candles + CoinGecko → **writes our database** → browser only ever reads *our* data (Supabase Realtime push, free).
2. **News cron:** same mechanism, every 15 min → **Cointelegraph RSS + CryptoPotato RSS** (both HTTP 200 tested from Nigeria) → database. Binance's own announcement feed is blocked from Nigeria (HTTP 000) — may be pulled from Supabase's US edge functions later.
3. **Backups:** GitHub Actions (free & unlimited on public repos) / Cloudflare Workers Free (5 triggers). Browser→Binance direct = **last-resort emergency only**, never the main path.

### Phase 2 — CLIENT PAYS → MOVE TO VPS
| Item | Cost | When |
|---|---|---|
| **VPS, 4 GB (app + Postgres + price worker + nginx/SSL)** | **₦21,000/mo** (Hostking) — alt: ₦22,500 HostingNigeria, ₦25,500 WhoGoHost | monthly, bank transfer / naira card |
| Domain renewal | ₦15,600/yr (`.ng`) or ₦7,200/yr (`.com.ng`) | yearly |
| Migration work (NaijaBase → VPS) | your labour | once |
| **Phase 2 total** | **≈ ₦22,300/month** | |

### Only if you later decide to charge users
| Item | Cost |
|---|---|
| Paystack | **1.5% per transaction**, ₦0/month |
| Termii SMS/OTP | per message, ₦0/month |

### Never needed
- ❌ Dollar card / virtual USD card
- ❌ Render, Vercel, AWS, Hetzner (all USD)
- ❌ Foreign VPS / relay / proxy
- ❌ Binance/Bybit API key (no real orders ever)
- ❌ Cloudflare Worker

**Decision rule (locked):** *Client doesn't pay → stay on NaijaBase ₦0. Client pays → move to VPS ₦21,000/mo.*

---

## 2. What is being built

- **41 screens** (Cryptopilot inventory, AI layer cut — 7 screens removed)
- **Paper trading only** — users' balances, orders and positions live in **our own database**. No real exchange orders, ever, in this phase
- **Market prices from public feeds**, proven reachable from Nigeria with no key, no VPN, no relay:
  - **Binance Vision** — REST tickers, candles, **and a live WebSocket stream** (tested working today)
  - **MEXC** — REST (tested working)
  - **CoinGecko free** — breadth/rankings (tested working; 10,000 credits/mo)
  - Rule: **≥2 swappable sources** — *"blocks appear on a schedule you don't control"*

## 3. Why this shape (one line each)

- **Nigeria cannot reach Bybit or Binance's main API** (live test: HTTP 000) → those are off the table as sources
- **Binance's market-data host does work from Nigeria** (live test: real tickers + candles + stream) → no foreign VPS needed for data
- **Naira cards fail on Stripe/USD billing** → everything is billed in naira instead
- **Hosting platform first, VPS on payment** → you spend ₦0 until money exists
- **NaijaBase is new (100 devs / 61 projects)** → acceptable for testing, **not** the production home; the VPS is the production home

## 3b. Free-tier face-off (docs, 2026-10-07)

| | **Supabase Free** ✅ | NaijaBase Starter |
|---|---|---|
| Database | 500 MB | 500 MB |
| API requests | **Unlimited** | 50,000/mo |
| Auth users | **50,000 monthly actives** | (part of 50k API calls) |
| Storage | 1 GB | 1 GB |
| **Cron / scheduled jobs** | **YES — free `pg_cron`** | **NO — 0** (starts ₦60,000/mo) |
| **Server code** | **YES — 500,000 edge-function calls/mo** | **NO — 0** |
| Realtime websockets | **YES — 200 connections, 2M messages/mo** | (unconfirmed) |
| Projects | 2 | 1 |
| Idle-suspend rule | **Paused after 1 week** (unpause = 1 click) | 90 days |
| Track record | Millions of devs, battle-tested | 100 devs, a few months old |
| Where data lives | Abroad (US) | **Lagos 🇳🇬** (NDPA) |
| Pay later | $25/mo USD | ₦25,000/mo naira |

**Verdict:** for login + database + free cron, **Supabase wins on capability**. NaijaBase's only edge — Lagos data residency + naira billing — matters at **production** time, and Phase 2 is the VPS anyway. Keep NaijaBase as the fallback if Supabase turns out unreachable from Nigeria.

## 4. Risks / open items

1. **NaijaBase cron — CONFIRMED from docs (2026-10-07): free tier = 0 cron, 0 edge functions.** Growth ₦25,000/mo = 5 functions but **still 0 cron**. Cron only starts at **Scale ₦60,000/mo** (3× the VPS) and even then functions die after **max 300s** — **nothing runs 24/7 on NaijaBase at any price.** Consequence: the price worker (persistent WebSocket) is VPS-only; Phase 1 uses browser-side fetch instead
2. **Migration** NaijaBase → VPS is planned from day one (Postgres dump/restore), not improvised
3. Nigerian VPS providers may add **7.5% VAT** at checkout
4. NaijaBase pricing/product could change — it's a young company
5. Unverified: MEXC WebSocket, BitMart, Binance Vision rate limits
6. **Supabase free pauses after 1 week with no activity** — mitigate with a daily GitHub Actions ping (₦0), or unpause with one click
7. **Owner has ruled on Supabase** (used in many of his projects) — settled. Only open verify: Supabase edge functions must reach Binance Vision + RSS from their US location (expected yes; confirmed on first account test)

## 5. What happens next

1. ~~Owner approves the prices and phases~~ → **APPROVED 2026-10-07:** selling prices **₦600,000 (34 screens)** and **₦1,000,000 (41 screens)**, full backend in both. **Client counter ₦350,000 → owner approved a third entry tier: Package A = ₦350,000, 23 screens** (cuts: Trading Terminal, Order History, Market Overview, Trending, Portfolio Analytics, Settings, Security, Notifications, Help Center, Changelog, 404). Final ladder: **₦350k / ₦600k / ₦1m = 23 / 34 / 41 screens.**
2. **Proposal #2 — client-facing — DRAFTED** → `cryptopilot-proposal-client.md` (awaiting owner's final read + 2 term confirmations: 50/50 payment split, who pays hosting)
3. No code, no accounts, no purchases until the owner says go

---
*Prepared by the Product Management agent. All naira prices fetched from provider sites on 2026-10-07; all reachability claims from live network tests the same day.*
