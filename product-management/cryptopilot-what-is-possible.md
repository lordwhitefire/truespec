# What is actually possible — Nigeria, 2026-10-07

**Purpose:** establish what works *before* writing the proposal. All "works/failed" lines below are **live tests run from this machine in Nigeria on 2026-10-07**, not opinions.

---

## 1. Live test results — market-data APIs from Nigeria

| Endpoint | Result | Real data? |
|---|---|---|
| `api.bybit.com/v5/market/time` | **000 (blocked)** | ❌ |
| `wss://stream.bybit.com/v5/public/...` | **DNS failure** | ❌ |
| `api.binance.com/api/v3/time` | **000 (blocked)** | ❌ |
| `api.okx.com` / `api.kraken.com` / `api.kucoin.com` / `api.bitget.com` / `api.coinbase.com` / `api.htx.com` / `api.coincap.io` | **000 (blocked)** | ❌ |
| `api.binance.us` | **451** | ❌ |
| **`data-api.binance.vision`** (Binance official market-data host) | **200** | ✅ tickers, **candles (klines)**, all prices |
| **`wss://data-stream.binance.vision/ws/btcusdt@ticker`** | **✅ LIVE — pushed a real 24hr ticker** | ✅ streaming works |
| **`api.mexc.com`** (REST) | **200** | ✅ tickers (WebSocket timed out — untested) |
| **`api.coingecko.com`** | **200** | ✅ prices, 24h change, market-cap rankings |
| `api.bitmart.com` | 200 (host reachable, my path wrong) | ⚠️ unconfirmed |
| `api.gateio.ws` | 404 on correct paths (WAF) | ❌ |
| `min-api.cryptocompare.com` / `api.polygon.io` | 401 — reachable, **key required** | ⚠️ paid/keyed |
| `api.phemex.com` / `api.deriv.com` | 500 / 301 — reachable, needs correct path | ⚠️ |

### Conclusions from the tests
1. **"All data from Bybit" is not possible from Nigeria.** Bybit is DNS-blocked here and its stream fails outright.
2. **No foreign VPS is needed for data.** Binance's official market-data host works from Nigeria — REST **and** live WebSocket — with no key, no VPN, no proxy.
3. Working, free, no-key sources right now: **Binance Vision** (tickers + candles + stream), **MEXC** (REST), **CoinGecko free** (breadth/rankings, 10,000 credits/mo).
4. The community agrees the situation is unstable: a 2026-07 DEV.to write-up reports **Binance main API = HTTP 451 from datacenter IPs**, and **Bybit started returning 403 from the same server with no announcement** — *"blocks appear on a schedule you don't control."* → any source must be swappable.

---

## 2. What people say about paying from Nigeria

**The problem:** Nigerian naira cards are declined at the **BIN level** on Stripe/USD billing — Render, Vercel, AWS, GitHub, Figma. First Bank, GTBank, Access, Zenith, UBA all affected (UBA Africard reported as failing outright).

**What people report actually works** (Reddit r/Nigeria GCP thread + guides):
- **Grey** — *"works, been working for a year +"*
- **Chipper Cash dollar card** — *"works for almost anything"*
- **Cleva / Cashwise** virtual USD cards
- **Wema Bank MasterCard**, **Access Bank Visa**, **Sterling**, **gomoney MasterCard** — several naira cards do pass for some merchants
- **Figo / EverTry / GetPlu** — purpose-built virtual dollar cards; Figo = **$0.35/transaction + ~2% FX spread on NGN funding**

**Warning from Nigerian hosts (sternhost.ng, early 2026):** virtual cards carry *hidden conversion fees, low monthly limits, and can suspend without warning* — the recurring complaint for anything that bills monthly.

**The other path — pay in naira, no card at all** (billed via Paystack/bank transfer):
- **Launchverse.app** — Vercel-style deploys, **naira billing**, containers, **WebSockets + cron + long-running workers**, one-click Postgres/MySQL/Redis, BYO server
- **Pxxl** — African Vercel alternative, **naira plans**, no usage surprises
- **NaijaBase** — Lagos (Rack Centre) Postgres, Supabase-compatible, **naira**
- Local hosts: SternHost, telaHosting, QServers, Whogohost — naira billing, local support

---

## 3. The two workflows that are actually possible

### Path A — everything in naira, hosted in Nigeria 🇳🇬
App + DB + cron on a **naira-billed** platform → pay by **bank transfer / Paystack**, no dollar card, no FX risk. Market data pulled **from the same Nigerian server** via Binance Vision + MEXC + CoinGecko.

- ✅ No card problem, no FX, no relay, no geo gate
- ✅ Data proven working from Nigeria (tested above)
- ⚠️ Prices for these platforms **not yet verified** — must be fetched before any proposal number is written

### Path B — dollar-billed stack (Render + foreign VPS) 💵
Render (web + Postgres + cron) + a paid EU VPS — paid through a **virtual dollar card** (Grey/Figo/EverTry).

- ⚠️ **~$20/mo base + card funding fees (~2% FX)**
- ⚠️ Still needs a dollar card every month, forever
- ⚠️ The foreign VPS **only matters if we insist on Bybit** — and per DEV.to reports, datacenter IPs are getting 403'd from Bybit anyway, so even this path may need a proxy
- ⚠️ Render cannot reach the exchanges (already proven); the VPS would exist purely as a relay

### Path C — hybrid (what the tests actually justify)
**Naira-billed hosting** for app+DB+cron, **data from Binance Vision (REST + live WebSocket)** because it's proven to work from Nigeria. No foreign VPS at all. Bybit dropped as a source — it is unreachable and the reports say datacenter IPs get blocked regardless.

---

## 4. Dead ends (evidence recorded)

| Idea | Status | Why |
|---|---|---|
| Bybit as data source | ❌ | DNS-blocked from Nigeria (test), NCC ISP block since Feb 2024 |
| Binance main API | ❌ | HTTP 000 locally; HTTP 451 from datacenter IPs (DEV.to 2026-07) |
| Foreign VPS as the fix | ⚠️ | Works for some sources, but Bybit is 403'ing datacenters too — cost with no guarantee |
| Cloudflare Worker relay | ⚠️ | Community: *"Cloudflare Workers' egress IPs are geo-blocked by Binance"*; shared pool also can't be IP-bound |
| Naira card on Render/Stripe | ❌ | Declined at BIN level |
| Relying on one data source forever | ❌ | *"Blocks appear on a schedule you don't control"* — need ≥2 swappable sources |

---

## 6. Verified naira prices (Path A) — fetched 2026-10-07

### VPS (all billed in naira, bank transfer/card)
| Provider | Spec | Price |
|---|---|---|
| WhoGoHost C1 | 1 vCPU, 1 GB, 20 GB SSD | **₦11,050/mo** |
| WhoGoHost C2 | 1 vCPU, 2 GB | ₦18,275/mo |
| **HostingNigeria Cloud VPS 1** | 1 vCPU, 2 GB, 25 GB NVMe, 10 TB | **₦15,500/mo** |
| HostingNigeria VPS 2 | 1 vCPU, 4 GB, 50 GB | ₦22,500/mo |
| **Hostking** | 4 GB, 80 GB NVMe, 20 TB | **₦21,000/mo** |
| WhoGoHost C3 | 2 vCPU | ₦25,500/mo |
| **Lineserve (Lagos ng-1a)** | 1 vCPU, 2 GB, 40 GB | ₦21,950/mo **+7.5% VAT** |
| HostingNigeria VPS 3 | 2 vCPU, 8 GB, 80 GB | ₦34,500/mo |
| Hostraha (Lagos) | 2 vCPU, 4 GB | ₦49,980/mo |
| TelaHosting managed | 2 vCPU, 4 GB, cPanel | ₦49,000/mo |
| TK WebHosts | 1 core, 4 GB, 50 GB — **servers in EU/US**, billed in naira | ₦8,690/mo first annual term → **₦14,490 renewal** |

### Managed backend (Lagos, naira) — NaijaBase
| Plan | Price | Includes |
|---|---|---|
| Starter | **₦0** | 500 MB DB, 1 GB storage, 50k API req/mo, 1 site |
| Growth | **₦25,000/mo** | 8 GB DB, 100 GB storage, 2M API req/mo, 5 projects, 3 sites + custom domains |
| Business | ₦75,000/mo | 25 GB DB, unlimited sites, DPA, 90-day audit |

### Domains (WhoGoHost/GO54, NiRA-accredited)
| Extension | Year 1 | Renewal |
|---|---|---|
| `.ng` | **₦9,200** (promo) | ₦15,600/yr |
| `.com.ng` | **₦3,000** | ₦7,200/yr |
| `.com` | ₦14,999 | ₦24,000/yr |

### Not usable / unverified
- **Launchverse.app** — now republished as **"Helix"**, an AI-agent product (₦0 / ₦10,000 / ₦40,000 / ₦100,000). The hosting product described in the 2026-05 Nairaland post is no longer presented. **Do not price from it.**
- **Pxxl** — site renders via JavaScript; pricing not extractable. **Unverified.**
- **MEXC WebSocket**, **BitMart data**, **Binance Vision rate limits** — still untested.

---

## 7. Path A cost model (paper trading, everything naira)

**Architecture:** one naira VPS runs app + Postgres + data worker + nginx/SSL. Data pulled free from **Binance Vision (REST + WebSocket)** with **MEXC** and **CoinGecko** as swappable backups. No dollar card, no FX, no foreign VPS, no relay.

| Line | Cost |
|---|---|
| VPS (4 GB — app + DB + worker) | **₦21,000/mo** (Hostking) or ₦22,500 (HostingNigeria) |
| Domain `.ng` | ₦9,200 first year, **₦15,600/yr after** (≈ ₦1,300/mo) |
| SSL | **₦0** (Let's Encrypt) |
| Market data | **₦0** (Binance Vision / MEXC / CoinGecko free) |
| Email/OTP (if needed later) | Paystack/Termii — pay-per-use, ₦0 monthly |
| User payments (if you ever charge) | Paystack **1.5% per transaction**, ₦0 monthly |
| **Total** | **≈ ₦22,300/month** + ₦9,200 once (year 1) |

**Cheapest workable:** ₦15,500 VPS (2 GB) + `.com.ng` ₦3,000 → **≈ ₦16,800/mo**
**Managed alternative:** NaijaBase Growth ₦25,000 + domain → **≈ ₦26,300/mo** *(but cron/long-running worker capability must be confirmed first)*
**Add VAT where the provider charges it** (e.g. Lineserve +7.5%).

---

## 8. Still open before anything is signed off

1. **MEXC WebSocket** (REST works; stream timed out)
2. **BitMart real data** (host reachable, wrong path used)
3. **Binance Vision rate limits** under polling — mostly moot if we stream
4. **NaijaBase cron / long-running worker capability** — must be confirmed before its Growth plan can replace a VPS
5. **Which VPS provider** — Hostking (₦21,000, 4 GB) vs HostingNigeria (₦22,500, 4 GB) vs WhoGoHost (₦25,500, 2 vCPU)
6. **VAT treatment** — some providers add 7.5% at checkout

---

## 9. Rerun 2026-10-08 — the DNS layer got stricter; the data still works

**Why reran:** the owner asked to see the live price again.

| Test | 2026-10-07 | 2026-10-08 |
|---|---|---|
| `api.binance.com` | HTTP 000 | HTTP 000 (no change) |
| `data-api.binance.vision` — normal resolve + HTTPS | 200 ✅ | **FAILS now — system DNS refuses to resolve the hostname** (times out; other domains resolve fine) |
| Same hostname via **public DoH** (Google / Cloudflare) | — | ✅ resolves to e.g. `52.196.191.78`, `18.182.67.185` (AWS) |
| Same hostname, **HTTPS straight to the IP** (DNS bypass) | — | ✅ **200 — BTCUSDT = $83,303.67** live price |

**Meaning 1 — the block today is DNS-only.** The hostname is sinkholed by the machine's resolver, but the IPs are fully reachable and serving real prices. A DNS override / DoH / fixed-IP list is a proven workaround on this machine.

**Meaning 2 — this is the instability the 2026-07 DEV.to write-up warned about** ("blocks appear on a schedule you don't control"). Yesterday's resolver resolved Binance; today's does not. This is exactly why the architecture keeps **≥2 swappable data sources** and why the server wrapper must route around DNS (fixed IP list or non-system resolver) rather than rely on whatever resolver it inherits.

**Meaning 3 — our local test does NOT prove Supabase can reach it.** Supabase Edge Functions have **no static egress IPs** and leave from Cloudflare/Deno Deploy datacenter ranges (Supabase troubleshooting doc). Binance geo-blocks datacenter egress broadly (451 from VPS/datacenter IPs — DEV.to 2026-07, Reddit r/binance 2025-07) and Cloudflare egress specifically (binance-proxy project: *"Cloudflare Workers' egress IPs are geo-blocked by Binance"*). The local 200 proves binance.vision answers residential/office IPs — not Supabase's. **This is unproven and plausibly blocked: must be tested from a real Supabase project before it is promised anywhere.**

*Rerun executed 2026-10-08 from the same machine; getent, curl --resolve, and DoH probes.*

---

*Written by the Product Management agent. Live tests executed 2026-10-07 from a Nigerian network (rerun recorded above, 2026-10-08). Sources: direct curl/websocket probes; DEV.to "Getting past Binance and Bybit's datacenter IP blocks" (2026-07-24); Bybit Service Restricted Countries (official, Nigeria not listed — the block is Nigerian-side, NCC Feb 2024); Reddit r/Nigeria payment thread (2025-12); getplu/spendfigo/evertry guides; nairaland/naijaworld/LinkedIn on naira-billed platforms; sternhost.ng warning on virtual cards.*
