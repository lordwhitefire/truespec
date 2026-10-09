# CryptoPilot (outside work) — constraints & decisions log

**Purpose:** durable record so nothing is forgotten across context compaction.
**Status:** step 2 inventory delivered. **Proposal NOT yet approved.**
**Updated:** 2026-10-07
**Companion:** `plan-cryptopilot-chore.md`

---

## 0. What this work is (and is not)

- This is **OUTSIDE work**, unrelated to TrueSpec. **TrueSpec = the car-inventory product.** Never mix the two.
- Owner is a developer and will **write the code himself**. I plan, inventory, spec, and propose. I do not build.
- Owner's workspace rule: never write outside `product-management/`.

---

## 1. Scope decisions (owner, final)

| Decision | Detail |
|---|---|
| **Replicate, do not buy** | Build our own version of the template. Buying/licensing is **out of scope** (`plan-cryptopilot-chore.md` line 35). Licence prices ($29 regular / $450 extended) recorded for reference only — **not to be spent**. |
| **No AI layer** | **41 screens** (48 total − 7 AI screens). |
| **AI screens excluded** | ai-dashboard, ai-signals, ai-market-analysis, ai-portfolio-insights, ai-price-prediction, ai-risk-analysis, ai-trading-assistant. Any AI screen kept later = UI only unless wired to something real (scope item, not freebie). |
| **Copyright line** | ❌ their images / photos / logos / compiled HTML/CSS/JS / "CryptoPilot" branding. ✅ MIT/OFL stack (Tailwind CSS 4, ApexCharts, Phosphor Icons, Inter), and layout/feature ideas. Write our own markup. Coin/token logos = trademarks → use an openly-licensed pack. |
| **One data source only** | An earlier list of 6 data sources was **scope creep — rejected by owner.** Each source brings its own issues; too many integrations = guaranteed scope creep. |
| **No recurring bills** | **The client has not paid yet.** No VPS, no paid API, no paid host. Anything with a monthly cost is rejected until payment. |
| **Reachability gate = step 0** | A source must be proven reachable **from the environment that will serve the site** (and from the end user's jurisdiction) *before* any screen is built against it. Free ≠ reachable. |

---

## 2. Data-source evidence (tested 2026-10-07, from this dev machine)

| Endpoint | Result |
|---|---|
| `api.binance.com/api/v3/time` | **HTTP 000 — connection failed** |
| `api.bybit.com/v5/market/time` | **HTTP 000 — connection failed** |
| `api.coingecko.com/api/v3/ping` | **HTTP 200**, `access-control-allow-origin: *` |
| `api-capital.com` (guessed path) | domain reachable, path 404 |

### Hard constraints from these results + owner's experience

1. **Nigeria blocks Binance and Bybit.** Owner must use a VPN even on his own laptop/phone, after the Nigerian government's dispute with them.
2. **Render cannot reach Bybit at all** (shared datacentre IP) — owner's own production test.
3. **Jurisdiction applies to the end user too.** If end users are in Nigeria, client-side fetch of Binance/Bybit fails for them regardless of where we host. VPN-per-user is not an architecture.
4. **Binance and Bybit are therefore OUT** as the single market source, unless the VPN/geo problem is deliberately re-engineered (cost/complexity — rejected under no-recurring-bills).
5. **Capital.com** = CFD broker API, needs a registered API key even for demo, broker-spread data rather than exchange spot. Heavier commitment than a public feed → **not chosen**.
6. **CoinGecko** is the only source that answered with open CORS from this machine → **leading candidate**, still subject to the reachability gate (must be re-tested from the actual host).

### CoinGecko free tier — verified from official docs (2026-10-07)

**No WebSocket on the free tier.** Confirmed at `docs.coingecko.com/docs/data-delivery-methods` and `docs.coingecko.com/websocket`:

| | Demo (free) | Basic (paid) |
|---|---|---|
| REST | ✅ 50+ endpoints | ✅ |
| **WebSocket** | **❌ —** | ✅ 5 sockets, 100 subs/channel/socket |
| Webhook | ❌ — | ✅ 1 endpoint |
| Call credits / month | **10,000** | 100k (pricing page also shows 500k tiers) |
| Rate limit | 100 calls/min | 300–500/min |
| Data freshness | **from 60 seconds** | 10 sec / real-time on higher plans |
| API key | 1 (free Demo key) | 5 |
| Cost | **$0** | **$29/mo yearly ($35 monthly)** — recurring |

- WebSocket requires **Basic plan & above** and is **beta, excluded from the platform SLA**. WS charge is 0.1 credit per response; REST is 1 credit per call (`/simple/price` returns up to **515 coins in one call** = 1 credit).
- WebSocket endpoints: `wss://stream.coingecko.com/v1?x_cg_pro_api_key=…`, channels `C1` CGSimplePrice, `G1` OnchainSimpleTokenPrice, `G2` OnchainTrade, `G3` OnchainOHLCV. Large-cap price updates ≈ every 10s, not sub-second.

**Consequences for this project (no-recurring-bills constraint):**

1. **WebSocket is out.** $29–35/month = recurring bill before the client pays.
2. **Free = REST polling only, 60-second-fresh data at best.** "Live Prices" will be *near*-live, not live. State this honestly in the proposal rather than implying a live feed.
3. **Credit math is the real risk:** 10k credits/month. One visitor polling every 60s = ~43,200 requests/month → **exhausts the free tier in ~7 days**.
4. **Mitigation, in order of preference:** batch aggressively (`/simple/price` = up to 515 coins per 1 credit), poll only when the tab is visible, and put a **single shared cache** in front (one serverless/free-tier function polling every 5–10 min serves *all* visitors from cache instead of each visitor burning credits).
5. Do not build screens assuming sub-second data. Nothing on the free plan delivers it.

---

## 3. Architecture options for getting data (recorded, one to be picked)

| Option | How | Verdict |
|---|---|---|
| **A. Browser-side fetch** | User's device calls the market API directly. No server egress, no VPS cost. | **Leading option.** Must verify CORS and jurisdiction for end users. |
| **B. Relay → own DB** | Something that can reach the feed pumps into the hosted DB; site reads DB. | Works anywhere, but a second component to maintain + freshness depends on the pump. Not preferred. |
| **C. Move the host (VPS)** | Test the feed from a clean-IP VPS instead of Render. | **Killed by the no-recurring-bills constraint** (VPS = recurring bill). |
| **D. Different source that the host can reach** | Swap the provider, do not add a second one. | The fallback if A fails. **Never add integrations — swap them.** |

---

## 4. The 41 screens → data classes (drives cost, not screen count)

| Class | Screens | Count |
|---|---|---|
| **A. External market data** | Dashboard, Market Overview, Live Prices, Trending Coins, Watchlist, Coin Details | 6 |
| **B. Own DB + market data** | Portfolio Overview, My Assets, Wallet, Transactions, Profit & Loss, Trading Terminal, Open Orders, Order History, Trade History, Futures, Spot Trading | 11 |
| **C. Computed from own data** | Portfolio Analytics, Trading Analytics, Market Analytics, Revenue Analytics | 4 |
| **D. External content feeds** | Crypto News, Market Sentiment, Economic Calendar | 3 |
| **E. Own backend only** | User Profile, Settings, Security, Notifications, Messages, Login, Register, Forgot Password, Reset Password, Verify Email | 10 |
| **F. Static — write the copy** | Pricing, FAQ, Help Center, Changelog, 404, Terms of Service, Privacy Policy | 7 |
| | | **41** |

- **Economic Calendar** = weakest free options (paid APIs, scrape-prone) → candidate for "ship later" or paid add-on.
- Class B/C/E cost = **build time + hosting**, never API fees.

---

## 5. Template facts (verified by inspection)

- **Item:** "CryptoPilot – AI Crypto Investing & Trading Dashboard HTML Template" by **pixelaxis**, ThemeForest #64998531.
- **Live demo:** `https://crypto-pilot-html.netlify.app/` (embedded in preview iframe `iframe[name="preview-frame"]`).
- **Stack:** HTML + **Tailwind CSS 4** (SCSS source shipped) + vanilla JS + **ApexCharts** + Phosphor Icons + Inter. **No React/Next/Vue.** Webpack workflow, optional.
- **Shape:** static SPA, clean client-side routes (`/coin-details`, `/trading-terminal`, …), 51 unique hrefs, 48 named screens.
- **Author's own disclaimer:** "CryptoPilot is an HTML dashboard template. Cryptocurrency exchange functionality…" — i.e. **no real exchange functionality**.
- **8 pages sampled, all render real mock content, no empty stubs:** home (AI Signals, Market Heatmap, Allocation, Monthly P&L, Top Movers, My Holdings, Recent Activity), `/coin-details`, `/portfolio-overview`, `/trading-terminal` (3 tables, 73 buttons), `/spot-trading`, `/ai-signals`, `/settings`, `/pricing`, `/login`.
- **Cheap (in the box):** every screen's layout/styling, sidebar/topbar/dropdowns, dark↔light toggle, mobile nav, tables, forms, auth shells, pricing/FAQ/legal, icon set, chart shells with mock data.
- **Expensive (must be built):** live market feed, real auth + email verification, portfolio/wallet persistence, order matching & execution, futures, AI layer, news/sentiment/calendar feeds, notifications/messages backend, deployment.

### Effort estimate (solo dev — my estimates, not commitments)

| Phase | Rough |
|---|---|
| 1. Design tokens + shell (sidebar/topbar/dropdowns/mobile/theme) | 1–2 days |
| 2. Component kit (cards, tables, forms, buttons, badges, modals, tabs) | 1–2 days |
| 3. Charts (heatmap, allocation donut, P&L line, sparklines, depth) | 1–2 days |
| 4. Core pages: Dashboard + Market (5) + Portfolio (5) | 2–3 days |
| 5. Trading + auth (6 trading, 5 auth, settings) | 3–5 days |
| 6. Long tail: Analytics (4), News (3), Pricing/FAQ/Help/legal/404 | 4–7 days |
| **All 41 screens** | **≈ 2–4 weeks solo** |
| **Phases 1–5 only (~15 screens)** | **≈ 1 week** |

---

## 6. Browser / tooling gotchas (so they are not re-discovered)

1. **Playwright sync API only exists in `$HOME/piper/venv/bin/python3`.** System python3 has only `async_api` → `ModuleNotFoundError: No module named 'playwright.sync_api'`.
2. **opencode's headless browser squats port 9222.** A launch script that checks "is 9222 alive?" will silently attach to it. **Always verify User-Agent has no `Headless` before navigating.** Headless instance must be killed first.
3. **`pkill -f '<pattern>'` can match its own command line** and kill the shell. Use a bracket trick: `pkill -f 'opencode/cprof[i]le'`.
4. **Never headless.** Owner clicks CAPTCHA. Google Chrome `/usr/bin/google-chrome`, profile `~/.config/google-chrome-automation` — **never create a new profile, never touch his Chromium.**
5. **CDP `127.0.0.1:9222`, `connect_over_cdp`, detach without closing.** Chrome stays open.
6. **Hidden duplicate nav links** (desktop sidebar + mobile menu) → `:visible` selector or DOM `.click()` via `evaluate`.
7. **Cross-origin preview iframe:** `page.frames` reports an empty URL → use `page.frame_locator("iframe[name='preview-frame']")`.
8. **Read-only against the site:** no purchase, no account, no form submission, no download, never click "Buy now" / checkout.

---

## 7. Working rules for this engagement

- **Plan-first:** write the plan, show the owner, **stop, wait for an explicit "go"**. Input/answers/questions are not consent.
- **Two stop points:** (1) after the browser window loaded — passed; (2) after the inventory, before any proposal is drafted — **current status: delivered, awaiting owner's go.**
- **Prices are always the owner's to set.** I never quote a final number as decided.
- **Recommend, don't decide.**
- **Never edit** `ui-plan.md` / `ux-plan.md` (TrueSpec owner files).
- **Off limits:** `/home/lordwhitefire/current-project/test12/inventory.html`.

---

## 9. Hosting decision — Vercel (owner's choice, 2026-10-07)

**Owner: "I want to host it first on Vercel."**

### Can Vercel host it? — YES

- The template is static (HTML + Tailwind + JS). Static hosting on Vercel = free, no server, ideal for the front end.

### Does Vercel support WebSockets? — YES, but not "always on"

Verified from `vercel.com/docs/functions/websockets` and Vercel's KB (docs updated 2026-08-10):

- Vercel Functions serve WebSocket connections **natively, public beta on all plans** (beta opened 2026-06-22; Python 2026-07-23). Requires **Fluid Compute** (default for projects created after 2025-04-23).
- **Connection is pinned** to the function instance that accepted it; a reconnect may land on a different instance → shared state must live in an external store (Redis), never in process memory.
- **Connections close at the function's maximum duration — this is expected, not a bug:**

| Plan | Default | Maximum | Extended (beta) |
|---|---|---|---|
| **Hobby (free)** | 300s | **300s (5 min)** | **not available** |
| Pro | 300s | 800s | 1,800s |
| Enterprise | 300s | 800s | 1,800s |

- Therefore **there is no always-on socket on Vercel Hobby** — every connection drops every ≤5 minutes and the client must reconnect with backoff, resubscribe, and reload state.
- **Cost exposure:** WebSocket traffic bills like any Function invocation — Active CPU while processing, **Provisioned Memory for the lifetime of the instance (an open connection keeps its memory billable)**, plus Fast Data Transfer. An always-open socket is therefore a *recurring* cost → collides with the no-recurring-bills constraint.
- API: `ws` / Socket.IO directly in a Node function, or `experimental_upgradeWebSocket()` from `@vercel/functions` for Next.js route handlers (experimental).

### The two independent blockers on "WebSocket always on"

1. **No source to stream from.** CoinGecko's WebSocket is **Basic plan & above ($29–35/mo)**. Free tier = REST polling only. Under no-recurring-bills there is nothing to stream.
2. **Platform can't hold a socket open anyway.** Hobby caps it at 300s, with forced reconnects and billable memory while open.

**Conclusion: build no WebSocket in phase 1.** Free-tier plan = static site on Vercel + **browser-side REST polling** (batched, visibility-aware) + at most one shared cache function. WebSocket may be reconsidered later for genuinely bidirectional features (live messages/notifications) — only once the client pays and the feature demands it.

### What each screen class actually requires for hosting

| Backend needed? | Classes | Screens |
|---|---|---|
| **NO backend at all** | A (market data via browser), D (external feeds), F (static) | **16 screens** — can ship on Vercel static immediately |
| **YES backend + database** | B (own DB + market), C (computed own data), E (auth/account) | **25 screens** — portfolio, trading, analytics, auth |

So **16 of the 41 screens need zero backend** and can go live on Vercel free as soon as they're built. The other 25 are where the backend scope and cost live.

---

## 10. VPS option — for reaching Bybit (owner, 2026-10-07)

**Owner's position:** REST polling on CoinGecko free tier "is not feasible" (10,000 credits/month = 43,200 needed at 1 call/min), and he asked what a VPS costs to reach Bybit.

### Why a VPS solves BOTH open problems at once

1. **Nigeria geo-block** — a VPS in the EU/elsewhere is not geo-blocked, so it should reach Bybit without a VPN.
2. **CoinGecko credit cap** — a VPS in front of everyone polls **once** and serves cached data to all visitors. Credits/limits stop scaling with visitor count.
3. **Render's shared-IP block** — a different provider's ASN may pass where Render's did not. **Not guaranteed — must be tested.**

### Prices (verified 2026-07/09; re-check live before buying)

| Option | Price | Note |
|---|---|---|
| **Oracle Cloud Always Free** | **$0/month forever** | 2 OCPU / 12 GB ARM + 2× AMD micro + 200 GB storage. **Card + phone required** (no virtual/prepaid cards); card not charged unless you upgrade. Set a **$1 budget alert**. Cut from 4/24 → 2/12 in June 2026. Watch: "out of capacity" errors, **10 TB/month egress limit** (charge beyond), never create resources outside Always Free. |
| Vultr | $3.50 (with IPv4) / $5–6 | 32 locations incl. Johannesburg; **new-account promo credit $100–300** → free test |
| OVHcloud | ~$3.50–4.20 | Cheapest paid, but weakest perf/uptime in 7-day tests — dev/non-critical only |
| **Hetzner** (CX22/CX23) | **~€3.99–4.51 (~$4.15–4.50)** | Best value, 2 vCPU/4 GB/20 TB — **EU regions only at that price**; prices raised 30–37% on 2026-04-01; ~€0.60/mo per IPv4 |
| DigitalOcean | $4 entry / ~$12–24 for 2 vCPU+4 GB | Best docs/managed services; $0.01/GiB overage |
| Linode/Akamai | $5 entry | $0.005/GB overage, 24/7 human support |
| AWS / GCP / Azure | $25–49 comparable | Not worth it at this scale |

### Gate: TEST BEFORE PAYING

A VPS is **not guaranteed** to reach Bybit — Bybit may block hosting ASNs generally, not just Render's. **Test order:**
1. **Oracle Always Free** → provision in a non-blocked EU region, `curl https://api.bybit.com/v5/market/time` → if 200, this is the **$0/month** answer.
2. If Oracle fails/capacity: **Vultr or DigitalOcean promo credit** → free 1–2 month test, cancel if it fails.
3. Paid fallback only if he accepts a small bill: Hetzner ~$4/mo or Vultr ~$5/mo.

### Architecture if the VPS passes

- **Site stays on Vercel** (static, free). The VPS runs **one small thing**: a relay/cache that polls the market feed and serves it to everyone.
- This removes the CoinGecko 10k-credit ceiling **and** gets Bybit data past the Nigeria/Render blocks.
- **Still unresolved:** whether Bybit's public endpoints have rate limits acceptable for this (verify), and **whether Bybit blocks hosting ASNs at all** (the test above).

**Status: NOT YET DECIDED — owner has not chosen to spend or to provision Oracle.**

### Oracle card rules + Nigeria (asked 2026-10-07: "do they accept Nigerian debit card, First Bank?")

**Oracle's official rule** (`oracle.com/cloud/free/faq` + signup docs):
- ✅ Credit cards, **or debit cards bearing a major network logo (Visa/Mastercard/Amex/Discover) that do not require a PIN**, that can be charged in **USD**.
- ❌ **Prepaid, virtual, single-use cards**, PIN-required debit cards, local-only networks (e.g. RuPay).
- Card **must not** be flagged as prepaid/virtual by the issuing bank — several users were rejected even with cards that looked normal on binlist.
- Address/zip entered must match the bank's records (AVS).
- **Never mask your location** (no VPN during signup) — that alone causes "Error processing transaction".

**Nigeria reality:** NGN debit cards are commonly declined at the BIN level for Oracle's USD international verification — reported across GTBank, Access, Zenith, **First Bank**, UBA. Directional (source was a fintech vendor promoting its own dollar card), so **treat as "likely fail, worth exactly one attempt," not as fact.**

**Safe attempt procedure:**
1. Enable international/USD online transactions on the First Bank card first; confirm the billing address/zip the bank holds.
2. Expect a **small temporary authorization hold**, released in ~3–5 days — not a real charge.
3. If "Error processing transaction" appears → it's the card/network, not the form. Do **not** retry repeatedly (multiple failed attempts can trigger fraud blocks).
4. **Do not rely on a fintech virtual dollar card** — Oracle's stated policy rejects virtual/prepaid BINs; user reports are mixed at best.

**Cardless fallback if no card passes:** Cloudflare Workers free tier (typically no card required to start) as the relay/cache instead of a VPS — *must still be tested for Bybit reachability*, and signup terms need confirming.

### Is Cloudflare a shared IP? (asked 2026-10-07)

**Yes — shared by default.** From Cloudflare's own docs:

- Cloudflare keeps "a very large pool of egress IPs **that are used by all Cloudflare customers**", publicly documented ranges (public egress space `172.64.0.0/13` etc., AS13335).
- **Workers' outbound `fetch()` egresses from those shared Cloudflare IPs.**
- **Dedicated egress IPs exist only as a paid/enterprise feature** (Smart Shield "Dedicated CDN Egress IPs", Zero Trust Gateway egress policies) — exclusive IPs assigned to one account. That is a recurring cost → **out of scope under no-recurring-bills.**

**Why it may still differ from Render's failure:** Render = a small cloud-provider IP set that got flagged wholesale. Cloudflare = one of the largest networks on the internet; blanket-blocking it breaks a large share of normal web traffic, so services rarely block all of it — though some *do* block Cloudflare ranges specifically to stop API scraping, and Cloudflare itself is transparent that requests can be identified and limited by the destination.

**Geo:** traffic egresses from a Cloudflare data centre near the destination, so the Nigeria geo-block should not apply.

**Verdict: unknown until tested — same gate as everything else.** Test = sign up free, one Worker doing `fetch('https://api.bybit.com/v5/market/time')`, read the status. $0, ~5 minutes. 200 → relay works. 403/timeout → Cloudflare is blocked too → fall back to the Oracle/VPS test.

### Choosing the IP — and the constraint that decides it (2026-10-07)

**Critical: if the product ever needs authenticated exchange data (balances, orders, positions), the IP choice is forced.** Exchange API keys require an **IP allowlist** — you register the exact source IP(s) that may call with that key. A **shared/rotating pool (Cloudflare) is unusable for that**, because the addresses change and you'd be allowlisting someone else's network. Authenticated access therefore requires a **fixed, dedicated IP = a VPS**.

For **market display only**, the IP only has to reach the feed once in a while — a shared pool is fine.

| Option | IP quality | Cost | Needs card | Odds for Bybit |
|---|---|---|---|---|
| **Cloudflare Worker** | Shared pool (all CF customers) | **$0** | Usually no | Good (huge network, egress near destination, no Nigeria geo-block) but some services block CF ranges |
| **Oracle Always Free VPS** | **Own fixed IP** (EU region) | **$0 forever** | **Yes — First Bank may decline** | Good — own IP, not flagged, EU avoids geo block; watch capacity errors |
| **Vultr / DigitalOcean + promo credit** | **Own fixed IP** | **$0 for 1–2 months**, then ~$5–6/mo | Yes / PayPal | Good |
| **Hetzner / OVH paid** | Own fixed IP | ~$4/mo recurring | Yes | Good — but recurring before client pays → excluded for now |
| Render | Shared cloud IP | $0 | No | **Proven failure** |
| Browser-side fetch | End user's ISP IP | $0 | No | Works for CoinGecko; **fails for Binance/Bybit from Nigeria** |

**Recommended order:** ① Cloudflare Worker test (no card, no money, 5 min) → ② Oracle Always Free (fixed IP, $0, needs card) → ③ Vultr/DO promo credit → ④ paid VPS only after the client pays. **But if account data is in scope, skip straight to a fixed-IP VPS** — a shared pool can never satisfy an API allowlist.

### VERIFIED 2026-10-07 — owner's two challenges (searched: official docs + community)

**Challenge A: "there is nothing like allowed IP." — INCORRECT. It is official Bybit functionality.**

From Bybit's own API docs:
- FAQ: *"An API key created without binding IP address(s) will expire after 90 days."* — plus the API-management UI column literally called **"IP Address Added"**, and a **"No IP restriction"** option that *keeps* the key alive only 90 days at a time.
- `Get API Key Info` response field: **`ips` — "IP bound"** (array), e.g. `["18.181.170.164", …]`.
- `Modify Master/Sub API Key` parameter **`ips`**: *"Set the IP bind. example: `192.168.0.1,192.168.0.2`"*; `ips: "*"` = no bind.
- Separate **Institution Whitelist IP** and **Broker Whitelist IP** endpoints exist too.

So IP binding is real, official, and optional. A key with `ips` set **only accepts calls from those addresses** — which is exactly why an API key works from one machine and fails from another.

**Owner's failed API-key attempt** is consistent with two possible causes and cannot be attributed without a test: (a) the request never reached Bybit (geo/network block), or (b) the key was IP-bound to one address and he called from a different one.

**Challenge B: "Cloudflare will be blocked." — SUPPORTED by evidence (at least for Binance; Bybit untested).**

What people report:
- **Binance dev forum**, "Can't fetch API from Cloudflare worker": 403 `Request blocked` (CloudFront) — *"Binance API … has block whole Cloudflare IP … any site/worker rely on Cloudflare IP can't be use Binance API."*
- **GitHub `LuuOW/binance-proxy`**: *"Cloudflare Workers' egress IPs are geo-blocked by Binance"* → the author tunnels through a paid residential proxy to get **one static IP, then whitelists it on the Binance API key**.
- **GitHub `lijiachang/cloudflare-worker-binance-api-proxy`**: same restricted-location error.
- **Reddit r/binance**: *"All my servers blocked by Binance API … Geofencing is enforced even for read-only market sampling"* (VPS owners) — i.e. **cloud IPs get geo-fenced, and public/read-only endpoints too**, not just trading.
- Official Bybit line: *"IP addresses located in the US or Mainland China are restricted and will return a 403 Forbidden error"* — **Nigeria is not named in that doc**, so the owner's local Nigeria block and Render failure are empirical, not documented.

**Key correction to the owner's own model:** *"phone/laptop = personal IP, Cloudflare = shared."* Partly right, but **a VPN exit IP is shared by thousands of users too — and it works.** So "shared" is not what gets you blocked; **which** shared range is. Residential/mobile ranges pass; Cloudflare's ranges are widely flagged; Render's ASN was flagged.

**Revised position:** Cloudflare is now a *cheap test with bad odds*, not the front-runner. **A fixed-IP VPS in a non-blocked region is the answer for both market display and account data**, and it's the only architecture that can satisfy Bybit's IP binding anyway. Cloudflare still costs nothing to test, so test it — just don't build on it.

#### Round 2 — Bybit-specific evidence (official docs + community, 2026-10-07)

**Official Bybit error codes (bybit-exchange.github.io/docs/v5/error):**
- **`10010` — "Unmatched IP, please check your API key's bound IP addresses."** ← IP enforcement is real and named by Bybit itself.
- `10009` — "Service Restricted: Access is currently unavailable for your region."
- `403` — possible causes: *"1. IP rate limit breached; 2. empty json body; **3. You are using U.S IP**."*
- `10018` — "Exceeded the IP Rate Limit." Rate limit is per-IP: **600 requests / 5s per IP** on `api.bybit.com`.

**Official IP-binding mechanics:**
- Create/Modify API Key parameter **`ips`**: *"Set the IP bind. example: `192.168.0.1,192.168.0.2` … No ip bound api key will be invalid after 90 days."*
- FAQ: *"An API key created without binding IP address(s) will expire after 90 days"* → API-management UI column **"IP Address Added"** → **"No IP restriction"** option (then re-extend every 90 days).
- Brokers FAQ: *"Brokers can choose whether to **whitelist their IP addresses** by providing Bybit Broker support a list of IP addresses."*
- Third-party key creation *"ensures that the key is locked to [vendor]'s server IP range"* — and a real third-party-bound key returned **`10010`** from a residential IP because its mandatory whitelist didn't include that address (GitHub `sieblyio/bybit-api#555`).
- Separate **Institution Whitelist IP** / **Broker Whitelist IP** endpoints.

**What people report — how the block actually behaves:**
- **`api.bybit.com` resolves to Amazon CloudFront** (`d3d4ij29qlbhtu.cloudfront.net`). The 403 body reads: ***"The Amazon CloudFront distribution is configured to block access from your country."***
- **PythonAnywhere forum (2025-05):** free (US) tier → that country-block 403; **same code on their EU system worked**; user then said *"I registered a new account on the EU-based site and everything is working now."* → **the block keys on the server's country, not on "being a cloud server".**
- **QuotaGuard (2026-07-13):** *"Bybit's CDN blocks entire IP ranges from major cloud providers"* — i.e. some cloud ranges are blocked wholesale too. Both mechanisms exist.
- **Google Apps Script / GCE / Stack Overflow:** same CloudFront country-block 403; GCE issue resolved once it was a non-US IP.
- **Binance (for contrast):** *"Cloudflare Workers' egress IPs are geo-blocked by Binance"* (GitHub `LuuOW/binance-proxy`) → author tunnels through a residential proxy to a single static IP and **whitelists it on the API key**. Binance dev forum: *"block whole Cloudflare IP."*

**Net model (revised, evidence-based):** Bybit blocks on **at least two axes** — (1) **country of the calling IP** (CloudFront geo), and (2) **specific IP ranges / API-key binding**. Therefore: **a cloud server in a permitted country (EU) is proven to work by community reports**, while a US/NG server or a wholesale-blocked cloud range fails.

**Implication for the product:**
- **Public market display needs no API key at all** — only a network path whose country isn't blocked. EU VPS path: good odds (community-proven). Cloudflare: unknown-to-bad.
- **Private account data needs API key + a fixed IP that can be bound** → `ips` binding → shared/rotating pool can never be it. Hard requirement: **one stable IP**.
- **Owner's failed API-key attempt is undiagnosed.** The exact error text would settle it instantly: `10010` = key bound to a different IP than he called from; country-block 403 = path blocked before auth ever ran; `10009` = region restricted. **Ask him for the exact error.**

---

## 8. Blocking questions (needed before drafting the proposal)

1. ~~Where is it actually hosted?~~ ✅ **ANSWERED 2026-10-07: Vercel first.** Reachability of the data source must therefore be re-tested **from Vercel** before any screen is built against it.
2. **Live market data, or demo/seeded data?** → biggest single cost driver. (Free CoinGecko = REST, 60-second freshness, no WebSocket.)
3. **Does it need authenticated exchange account data** (balances, orders, positions), **or is it market display only?** Display is far smaller. **Note: Binance and Bybit are blocked in Nigeria and unusable from Vercel — if account data is required, the exchange choice must be reopened.**
4. **Go / no-go** on drafting the tiered proposal → `product-management/cryptopilot-proposal.md`, scope tiers within the 41 screens, **all prices set by the owner**.
