# NEAR Revenue Dashboard

Internal revenue analytics dashboard for the NEAR Foundation — a dark-themed view of protocol and product revenue, fee capture, and on-chain wallet distribution, backed by a live API with a static-mock-data fallback.

> Numbers render from a live API when available and fall back to illustrative mock data otherwise. See [Data layer](#data-layer) and [ARCHITECTURE.md](ARCHITECTURE.md) for the full picture, including every API endpoint.

---

## Features

- **Header** — NEAR branding, a live "last updated" indicator, and global date-range controls (7D/30D/90D/YTD).
- **Hero** — Animated headline metric (total fees generated), a custom SVG **capture-rate gauge**, and a 30-day fees **sparkline**.
- **Stats grid** — Selectable revenue cards (revenue, intent volume, confidential TVL, unique users) with a highlighted active state.
- **Total fees chart** — Full-width cumulative area chart over the trailing year.
- **Revenue charts** — Monthly revenue **bar chart** and revenue-vs-emissions **line chart**, each with a dropdown control.
- **TVL & efficiency sections** — Confidential TVL chart, revenue-by-stream breakdown, fee-capture-mechanics split, and derived efficiency metrics.
- **Wallet table** — On-chain revenue distribution with scroll-triggered progress bars and links out to `nearblocks.io`.
- **FAQ** — Accessible accordion (single-open).
- **Footer** — Data-source attribution and NEAR wordmark.
- **Motion** — Scroll-triggered counter animations (GSAP) and Lenis smooth scrolling throughout.
- **`/analytics`** — "Deep Dive" page: intent volume, revenue by stream, capture split, NEAR token price.
- **`/data`** — "Data Guide" page documenting every API endpoint the dashboard can consume.

---

## Tech stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | [Next.js](https://nextjs.org) (App Router) | 16.2.7 |
| UI runtime | React | 19.2.4 |
| Language | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS v4 (`@theme`, no config file) | 4.x |
| Charts | [Recharts](https://recharts.org) | 2.15.4 |
| Animation | [GSAP](https://gsap.com) | 3.x |
| Smooth scroll | [Lenis](https://github.com/darkroomengineering/lenis) | 1.3.x |
| Component utils | class-variance-authority · clsx · tailwind-merge | — |
| Icons | [lucide-react](https://lucide.dev) | 0.511 |
| Package manager | pnpm | 11.5.1 |

> **Note:** This project does **not** use shadcn/ui. UI primitives are built directly with CVA + `clsx` + `tailwind-merge`.

---

## Prerequisites

- **Node.js** 20 or newer
- **pnpm** 11+ (pinned via the `packageManager` field; `npm` also works)

---

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The dashboard renders correctly with zero configuration — without a `NEAR_API_KEY` it falls back to static mock data. To see live numbers, copy `.env.example` to `.env.local` and fill in `NEAR_API_KEY`. See [Environment variables](#environment-variables).

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the development server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |

---

## Project structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout: FK Grotesk + Inter fonts, LenisProvider, GlobalRangeProvider
│   ├── page.tsx            # Main dashboard route (force-dynamic) — fetches live API, falls back to lib/data.ts
│   ├── analytics/page.tsx  # "Deep Dive" route (force-dynamic)
│   ├── data/page.tsx       # "Data Guide" — catalog of every API endpoint
│   ├── maintenance/page.tsx# Static placeholder page
│   └── globals.css         # Tailwind v4 import + NEAR theme tokens
├── lib/
│   ├── api.ts              # Live API client — fetch(), types, per-endpoint + composite fetchers
│   ├── data.ts             # Static fallback data, used when the API is unavailable
│   ├── types.ts            # TimeSeriesPoint, WalletRow, FaqItem, StatCard
│   └── utils.ts            # cn(), formatters, debugGlow(), revenue/emissions derivations
├── providers/
│   ├── lenis-provider.tsx        # Smooth-scroll context ("use client")
│   └── global-range-provider.tsx # Shared 7D/30D/90D/YTD range context ("use client")
└── components/
    ├── ui/                 # card, badge, separator, dropdown, accordion, animated-number
    ├── charts/             # gauge, sparkline, area/bar/line/price/stacked/tvl charts
    └── sections/           # header, hero, stats-grid, fees-chart, revenue-charts,
                            #   tvl-chart-section, revenue-streams, capture-split,
                            #   efficiency-metrics, wallet-table, faq, footer
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for a one-line responsibility per file and the full data flow.

---

## Design system

Always-dark theme. Colors are defined as CSS custom properties in `src/app/globals.css` and exposed to Tailwind via `@theme` (e.g. `bg-near-card`, `text-near-green`).

| Token | Value | Usage |
|-------|-------|-------|
| `--near-bg` | `#0b0d0d` | Page background |
| `--near-card` | `#111414` | Card surface |
| `--near-card-hover` | `#161919` | Card hover surface |
| `--near-border` | `#1f2424` | Borders / grid lines |
| `--near-green` | `#00ec97` | Primary accent / positive |
| `--near-green-dim` | `#00c880` | Secondary green |
| `--near-green-muted` | `rgba(0,236,151,0.12)` | Green fills / glows |
| `--near-red` | `#ff5f57` | Negative / alerts |
| `--near-red-muted` | `rgba(255,95,87,0.15)` | Red fills |
| `--near-text` | `#ffffff` | Primary text |
| `--near-muted` | `#b4b9b9` | Secondary text |
| `--near-subtle` | `#6b7070` | Tertiary text / axis labels |

**Fonts:** FK Grotesk / FK Grotesk Mono (local files via `next/font/local`) for body and mono text, and Inter (`next/font/google`) — not Geist.

---

## Data layer

The dashboard is **API-first with a static fallback**, not purely static:

1. `src/app/page.tsx` and `src/app/analytics/page.tsx` are `force-dynamic` Server Components that call `fetchDashboardData()` / `fetchAnalyticsData()` from **`src/lib/api.ts`** — a typed `fetch()` client hitting a live revenue API.
2. Each individual endpoint call is fault-tolerant on its own (a failed field falls back to an empty/neutral value without breaking the rest of the page).
3. If the whole composite fetch throws, the page's `try/catch` falls back to the static mock constants in **`src/lib/data.ts`**, typed by `src/lib/types.ts` — `STATS`, `REVENUE_MONTHLY`, `WALLET_ROWS`, `FAQ_ITEMS`, `GAUGE_VALUE`, `TOTAL_FEES_DISPLAY`, `FEES_CHANGE`, and more.

The app never crashes or shows a blank screen: without a working `NEAR_API_KEY` it simply renders the static mock dataset. See **[ARCHITECTURE.md](ARCHITECTURE.md)** for the full data-flow diagram and a reference table of every API endpoint.

To change a *static fallback* figure, edit `src/lib/data.ts` directly — no component changes needed.

---

## Environment variables

None are required — the app renders from static mock data if they're unset. Copy `.env.example` to `.env.local` to configure:

| Variable | Purpose |
|---|---|
| `NEAR_API_KEY` | Auth key for the live revenue API. Without it, all API calls fail and the dashboard falls back to static mock data. |
| `NEAR_API_BASE_URL` | Overrides the API host (defaults to the production Railway URL). |
| `NEXT_PUBLIC_SITE_URL` | Base URL used for Open Graph / Twitter card metadata. |
| `NEXT_PUBLIC_DEBUG_SOURCES` | Set to `"true"` to show extra nav links and a green/red glow indicating whether each stat is API- or fallback-sourced. Keep `false` in production. |

---

## Deployment

Two step-by-step guides are provided:

- **[Deploy to Vercel](docs/deploy-vercel.md)** — recommended, zero-config.
- **[Deploy to Railway](docs/deploy-railway.md)** — container-based self-hosting.

Both work with no environment variables set (static mock data), or with the variables above set for live data. See each guide for how to configure them on that platform.

---

## License

Internal project — not licensed for public distribution.
