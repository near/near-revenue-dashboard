# Architecture

Deep-dive reference for how the NEAR Revenue Dashboard actually works: rendering
model, data flow, the live API, and every environment variable that affects
behavior. For features and setup, see [README.md](README.md). For AI-agent
coding conventions, see [CLAUDE.md](CLAUDE.md).

> **Note:** this project started as a static-mock-data dashboard. It has since
> grown a real API integration. `src/lib/data.ts` is now the **fallback**, not
> the source of truth — read on for the current model.

---

## 1. Overview

The dashboard is a Next.js 16 App Router app with three real pages (`/`,
`/analytics`, `/data`) plus a `/maintenance` placeholder. There is **no
Next.js API layer** (`src/app/api/**` does not exist) and **no server
actions** — every page is a Server Component that calls a typed `fetch()`
client (`src/lib/api.ts`) directly during render.

Both data-driven pages opt out of static rendering:

```ts
export const dynamic = 'force-dynamic'
```

This forces the route to render per-request rather than at build time. Inside
that render, the individual `fetch()` calls in `src/lib/api.ts` still use
Next's data cache with a 5-minute revalidation window (`next: { revalidate:
300 }`), so a burst of concurrent requests doesn't hammer the upstream API —
only `force-dynamic` guarantees the *page* is never frozen into a static HTML
file at build time.

## 2. Request / data flow

```
Server Component (page.tsx / analytics/page.tsx)
        │
        ▼
fetchDashboardData() / fetchAnalyticsData()   (src/lib/api.ts)
        │
        ▼
Promise.all([ fetchSnapshot(), fetchRevenueSeries(), fetchWalletBreakdown(), … ])
        │  each wrapped in safe(promise, fallback) or .catch()
        ▼
apiFetch<T>(path, params)   — the one real fetch(), with 25s timeout + X-API-Key
        │
        ├── success → live data flows into the page
        └── failure → per-field fallback (empty array / null / NULL_SNAPSHOT)
                            │
                            ▼
        page.tsx wraps the whole composite call in try/catch too —
        if fetchDashboardData() itself throws, the page falls back to the
        static constants imported from src/lib/data.ts (STATS, REVENUE_MONTHLY,
        GAUGE_VALUE, WALLET_ROWS, …) and renders those instead.
```

There are two independent layers of resilience:

1. **Per-endpoint** (`safe()` helper in `api.ts`) — if one endpoint fails, the
   rest of the dashboard still gets live data; that one field silently uses an
   empty/neutral value.
2. **Whole-page** (`try/catch` in `page.tsx` / `analytics/page.tsx`) — if the
   composite fetch throws unexpectedly, the entire page renders with the
   static mock data from `src/lib/data.ts`, so the dashboard never crashes or
   shows a blank screen.

## 3. API client (`src/lib/api.ts`)

```ts
const BASE_URL = process.env.NEAR_API_BASE_URL ?? "https://revenue-dashboard-api-production.up.railway.app"
const API_KEY  = process.env.NEAR_API_KEY ?? ""
```

- **Auth**: every request sends `X-API-Key: <API_KEY>`. An empty key still
  sends the header — the upstream API will simply reject it, which is caught
  by the fallback logic described above.
- **Envelope**: every endpoint returns the same wrapper —
  `{ metric, as_of, data, denomination, is_stale, updated_at }`. `apiFetch<T>`
  returns `Envelope<T>`; callers read `.data`.
- **Timeout**: 25s via `AbortController`.
- **Caching**: `next: { revalidate: 300 }` — Next's fetch cache, independent of
  the page's own `force-dynamic` rendering.

### Exported fetchers

| Fetcher | Endpoint | Returns |
|---|---|---|
| `fetchSnapshot()` | `GET /v1/snapshot?denomination=usd` | `SnapshotData` (fees, revenue, capture rate, capture split) |
| `fetchRevenueSeries()` | `GET /v1/series/revenue` (monthly, from 2025-01-01) | `RevenueSeriesPoint[]` |
| `fetchWalletBreakdown()` | `GET /v1/wallets/breakdown` | `WalletBreakdownItem[]` |
| `fetchBuyback()` | `GET /v1/wallets/buyback` | `BuybackData` |
| `fetchEmissionsSeries()` | `GET /v1/series/emissions` (daily, from 2025-01-01) | `EmissionsSeriesPoint[]` |
| `fetchTotalFeesSeries()` | `GET /v1/series/total-fees` (daily, from 2025-01-01) | `TotalFeesSeriesPoint[]` |
| `fetchIntentVolumeSeries()` | `GET /v1/series/intent-volume` (daily, from 2025-01-01) | `IntentVolumePoint[]` |
| `fetchUniqueUsers()` | `GET /v1/metrics/unique-users` | `UniqueUsersData` (d1/d7/d30) |
| `fetchPriceSeries()` | `GET /v1/series/price` (daily, trailing 90d) | `PricePoint[]` |
| `fetchConfidentialTvlSeries()` | `GET /v1/series/confidential-tvl` (daily, from 2026-01-01) | `ConfidentialTvlPoint[]` |
| `fetchConfidentialTvlLatest()` | same endpoint, trailing 3d | `ConfidentialTvlPoint[]` (lightweight scalar read) |
| `fetchRevenueByStream()` | `GET /v1/metrics/revenue-by-stream` | `RevenueStreamItem[]` |
| `fetchCaptureSplit()` | `GET /v1/metrics/capture-split` | `SnapshotCaptureSplit` |

Two composite fetchers combine these with `Promise.all`:

- **`fetchDashboardData()`** — used by `/` (`src/app/page.tsx`). Fetches all 12
  primitives above (minus the "latest" TVL variant) plus buyback data.
- **`fetchAnalyticsData()`** — used by `/analytics`. Fetches price series, TVL
  series, revenue-by-stream, capture split, unique users, intent volume.

## 4. API reference

The `/data` route (`src/app/data/page.tsx`, "Data Guide") is a living,
human-readable catalog of every endpoint the upstream API
exposes — including ones the dashboard doesn't use yet. It's the best source
of truth for *why* each metric matters; this table is the condensed version.

| Group | Endpoint | What | Source | Status |
|---|---|---|---|---|
| Protocol Revenue | `/v1/metrics/revenue` | Net revenue over 24h/7d/30d/all-time, NEAR + USD | Onchain | On dashboard |
| Protocol Revenue | `/v1/series/revenue` | Monthly net revenue since early 2025 + running cumulative | Onchain | On dashboard |
| Protocol Revenue | `/v1/metrics/revenue-by-stream` | Revenue split by source (frontend UI, quote improvement, B2B partners, private deals) | Onchain | On analytics |
| Gross Fees | `/v1/metrics/total-fees` (via `/v1/snapshot`) | All-time/YTD/30d/7d/24h fee totals | Onchain | On dashboard (hero number) |
| Gross Fees | `/v1/series/total-fees` | Daily fees (NEAR + USD) + cumulative | Onchain | On dashboard (area chart) |
| Capture Rate & Mechanics | `/v1/metrics/capture-rate` (via `/v1/snapshot`) | % of gross fees retained as net revenue, 4 windows + 30d delta | Onchain | On dashboard (gauge) |
| Capture Rate & Mechanics | `/v1/metrics/capture-split` | Capture rate split by mechanism: front-end fees / quote improvement / B2B | Onchain | On analytics |
| Activity | `/v1/metrics/unique-users` | Distinct wallets in last 24h/7d/30d (snapshot, not live count) | Dune Analytics (`dune:5180328`) | On dashboard |
| Activity | `/v1/series/intent-volume` | Daily swap volume through NEAR Intents (USD) + cumulative (~$20B+) | Dune Analytics (`dune:5179085`) | On dashboard |
| Confidential TVL & Liquidity | `/v1/series/confidential-tvl` | Daily TVL in confidential pools since launch (2026-02-20) | Dune Analytics (`dune:7586891`) | On analytics |
| Emissions & Token Economics | `/v1/series/emissions` | Daily new NEAR minted (validator rewards) + total supply + cumulative | Onchain | On dashboard (revenue-vs-emissions) |
| Emissions & Token Economics | `/v1/series/revenue-vs-emissions` | Pre-computed revenue/emissions ratio, daily | Onchain | **Evaluated, not used** — see caveats below |
| Emissions & Token Economics | `/v1/series/price` | Daily NEAR/USD close | CoinMarketCap | On dashboard + analytics (all USD conversions) |
| Wallets & Distribution | `/v1/wallets/breakdown` | Ranked revenue-receiving wallets, all-time + 30d inflow, share of revenue | Onchain | On dashboard (wallet table) |
| Wallets & Distribution | `/v1/wallets/buyback` | NEAR bought back with protocol revenue, 4 windows + % of revenue | Onchain | On dashboard |
| Not yet available | `/v1/offchain` | Off-chain revenue (licensing, deals) — currently returns `[]` | Manual input | Not connected |
| Internal | `/v1/status` | Pipeline health / freshness per table — not for end users | DB metadata | Not connected |

All endpoints live under the same base URL and require the `X-API-Key`
header; see [§7](#7-environment-variables).

## 5. Routing

| Route | File | Rendering | Purpose |
|---|---|---|---|
| `/` | `src/app/page.tsx` | `force-dynamic` | Main dashboard — hero, stats, fees/revenue/TVL charts, wallet table, FAQ |
| `/analytics` | `src/app/analytics/page.tsx` | `force-dynamic` | "Deep Dive" — intent volume, revenue by stream, capture split, NEAR price |
| `/data` | `src/app/data/page.tsx` | static | "Data Guide" — human-readable catalog of every API endpoint (see §4) |
| `/health` | `src/app/health/page.tsx` | `force-dynamic` | Live per-endpoint API status (see §11) — bypassed by `MAINTENANCE_MODE` |
| `/maintenance` | `src/app/maintenance/page.tsx` | static | Maintenance screen shown site-wide when `MAINTENANCE_MODE=true` (see §11) |

No `src/app/api/**` route handlers exist — this app is a pure API *consumer*,
not a provider. (`tick-worker/` is a separate standalone service — see §11 —
and is not part of this Next.js app.)

## 6. State & providers

Both wrap the tree in `src/app/layout.tsx`, outermost first:

- **`LenisProvider`** (`src/providers/lenis-provider.tsx`) — wraps the app in
  `ReactLenis` for smooth scrolling. No shared state.
- **`GlobalRangeProvider`** (`src/providers/global-range-provider.tsx`) —
  React Context holding a single shared `GlobalRange` value
  (`"7D" | "30D" | "90D" | "YTD"`, default `"90D"`) and its setter, consumed via
  `useGlobalRange()`. Drives the header's range buttons
  (`header-range-controls.tsx`) and every range-aware chart section
  (`cumulative-fees-section`, `tvl-chart-section`, `revenue-streams`, etc.).

## 7. Fallback & debug pattern

Two mechanisms make it visible, at a glance, whether a given number on screen
came from the live API or from static mock data:

- **`StatCard.source?: "api" | "static"`** (`src/lib/types.ts`) — set per stat
  card in `page.tsx` depending on whether the corresponding API value came back
  non-zero.
- **`debugGlow(source)`** (`src/lib/utils.ts`) — returns an inline `boxShadow`
  style: a faint green glow for `"api"`, a faint red glow for `"static"`. It's
  a no-op (`{}`) unless `NEXT_PUBLIC_DEBUG_SOURCES=true`.

The same flag also toggles extra nav links (Dashboard / Analytics / Data
Guide) in `site-layout.tsx` — with it off (the default), the site presents as
a single clean page even though `/analytics` and `/data` are reachable
directly by URL.

## 8. Environment variables

| Variable | Required? | Default if unset | Effect |
|---|---|---|---|
| `NEAR_API_KEY` | No | `""` | Sent as `X-API-Key`. Without a valid key, every API call fails and the app falls back to static mock data everywhere — the dashboard still renders correctly. |
| `NEAR_API_BASE_URL` | No | `https://revenue-dashboard-api-production.up.railway.app` | Overrides the API host — useful for pointing at a staging/local backend. |
| `NEXT_PUBLIC_SITE_URL` | No | `https://revenue.near.org` | Used as `metadataBase` for Open Graph / Twitter card URLs in `layout.tsx`. |
| `NEXT_PUBLIC_DEBUG_SOURCES` | No | `false`/unset | When `"true"`, shows extra nav links and the green/red API-vs-static glow described in §7. Never enable in production screenshots/demos. |
| `MAINTENANCE_MODE` | No | `false`/unset | When `"true"`, `src/proxy.ts` rewrites every route except `/health` and `/data` to `/maintenance`, so the public dashboard shows a maintenance screen while the team can still check API status. Server-only — read at request time, so flipping it in Railway only needs a restart, not a rebuild. |
| `DATABASE_URL` | No | unset | Optional Postgres connection string, consumed by `src/lib/db.ts`. When set, `/health` renders an extra "Persisted history" section sourced from the `api_ticks` table (see §11). Without it, `/health` behaves exactly as if this variable didn't exist — no error, no missing-section warning. |

**The app has no strictly required environment variables** — it always
renders. `NEAR_API_KEY` is what determines whether you see live numbers or
the static mock dataset. See `.env.example` for a ready-to-copy template.

## 9. Design tokens

Covered in full in [README.md → Design system](README.md#design-system). In
short: all colors are CSS custom properties (`--near-*`) in
`src/app/globals.css`, exposed to Tailwind v4 via `@theme inline`. Fonts are
**FK Grotesk / FK Grotesk Mono** (local, `next/font/local`) for body/mono text
and **Inter** (`next/font/google`) — not Geist.

## 10. Known caveats

- **NEAR-denominated fee fields are unused.** The hero's Gross/Net 30d figures
  are USD-only (`fees_usd_d30` / `revenue_usd_d30`); the API's `fees_near_d30`
  has a broken price conversion upstream, and the price-feed workaround that
  used to correct it was removed along with the NEAR display. Reintroducing a
  NEAR figure anywhere means solving that conversion again — do not trust
  `*_near_*` snapshot fields as-is.
- **`/v1/series/revenue-vs-emissions` is intentionally unused.** The dashboard
  computes the revenue-vs-emissions ratio manually
  (`aggregateEmissionsByMonth` + `computeRevenueVsEmissions` in
  `src/lib/utils.ts`) instead of using this pre-computed endpoint, because: (1)
  its `grain=month` parameter doesn't actually aggregate — it always returns
  daily rows; (2) valid data only starts around April 2026, losing ~1 year of
  history the manual computation covers; (3) most recent points are flagged
  `is_stale: 1`. Revisit if the endpoint is fixed.
- **`/v1/offchain`** exists but currently always returns an empty array — not
  wired into any UI.
- **`/v1/status`** is an internal pipeline-health endpoint, not meant for
  end-user display — not wired into any UI.
- **Wallet table burn row**: the "Protocol Fees (70% Burned)" row in
  `WALLET_ROWS` (static fallback) is not a real wallet — it represents the
  burned portion of protocol fees, included for narrative completeness. The
  live `/v1/wallets/breakdown` response replaces the whole table when available.

## 11. Health monitoring, maintenance mode, and the tick-worker

Three pieces work together to catch and communicate an upstream API outage —
all optional, all additive, none of them change `/`, `/analytics`, or the
existing fetchers in `src/lib/api.ts` if left unconfigured.

- **`/health`** (`src/app/health/page.tsx`) — pings all 12 endpoints the
  dashboard depends on directly via `fetchHealthReport()` in `src/lib/api.ts`
  (bypassing the `safe()` fallback and the 5-minute fetch cache, `cache:
  "no-store"`, 10s timeout), and shows per-endpoint HTTP status, latency, and
  staleness. This is a **live ping** — it only reflects the moment the page is
  loaded.
- **`MAINTENANCE_MODE`** (`src/proxy.ts`) — when `"true"`, rewrites every route
  to `/maintenance` except `/health`, `/data`, and static assets, so the
  public dashboard shows a maintenance screen while the team can still check
  API status. See §8.
- **`tick-worker/`** — a standalone Node script, deployed as its **own**
  Railway service (Cron Job, e.g. every 5 minutes), that duplicates the same
  12-endpoint check and writes one row per endpoint per run to a Postgres
  `api_ticks` table it creates on first run (`CREATE TABLE IF NOT EXISTS`).
  It intentionally has no import from `src/` and its own `package.json` — a
  failure or misconfiguration here cannot affect the dashboard's build or
  runtime, it can only mean no new rows get written.
- **`src/lib/db.ts`** — the dashboard's *read* side of that table. Exposes
  `fetchTickHistory()`, which returns the latest tick per endpoint, or `null`
  on any failure (`DATABASE_URL` unset, table missing, connection error).
  `/health` renders a "Persisted history" section only when this returns
  data — this is what lets the team see "last confirmed tick: 3 days ago"
  even if nobody had `/health` open when the outage started.

To provision: add a PostgreSQL service to the same Railway project as the
dashboard (Railway injects `DATABASE_URL` automatically to services in the
project that reference it), then deploy `tick-worker/` as a second service
with its own copy of `DATABASE_URL`, `NEAR_API_KEY`, `NEAR_API_BASE_URL`, and
a Cron Schedule. Nothing about the dashboard's own deploy changes.
