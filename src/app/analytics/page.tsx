export const dynamic = 'force-dynamic'

import Link from "next/link"
import { SiteLayout } from "@/components/sections/site-layout"
import { Card } from "@/components/ui/card"
import { TvlBarChart } from "@/components/charts/tvl-bar-chart"
import { PriceLineChart } from "@/components/charts/price-chart"
import { RevenueStreams } from "@/components/sections/revenue-streams"
import { CaptureSplit } from "@/components/sections/capture-split"
import { UniqueUsersSection } from "@/components/sections/unique-users-section"
import { IntentVolumeSection } from "@/components/sections/intent-volume-section"
import { fetchAnalyticsData, type SnapshotCaptureSplit, type RevenueStreamItem, type IntentVolumePoint } from "@/lib/api"
import { debugGlow } from "@/lib/utils"
import type { TimeSeriesPoint } from "@/lib/types"

// ── Local helpers ──────────────────────────────────────────────────────────────

function SourceBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-near-border text-near-subtle font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-near-green/60 shrink-0" />
      {label}
    </span>
  )
}

function StatBadge({ value, label, positive }: { value: string; label: string; positive?: boolean }) {
  return (
    <div className="text-right">
      <p className="text-2xl font-bold text-near-green">{value}</p>
      {label && <p className={`text-xs font-medium mt-0.5 ${positive === true ? "text-near-green/70" : positive === false ? "text-red-400/70" : "text-near-muted"}`}>{label}</p>}
    </div>
  )
}

function formatUSD(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${v.toFixed(2)}`
}


// ── Page ───────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  let tvlSeries: TimeSeriesPoint[] = []
  let priceSeries: TimeSeriesPoint[] = []
  let revenueStreams: RevenueStreamItem[] = []
  let captureSplit: SnapshotCaptureSplit | null = null
  let intentVolumeSeries: IntentVolumePoint[] = []
  let uniqueUsersD1 = 0
  let uniqueUsersD7 = 0
  let uniqueUsersD30 = 0

  try {
    const data = await fetchAnalyticsData()

    tvlSeries = data.tvlSeries
      .filter((p) => p.tvl_usd > 0)
      .map((p) => ({ date: p.date_at, value: p.tvl_usd }))

    priceSeries = data.priceSeries.map((p) => ({
      date: p.date_at,
      value: p.near_price_usd,
    }))

    revenueStreams = data.revenueStreams
    captureSplit = data.captureSplit
    intentVolumeSeries = data.intentVolumeSeries

    if (data.uniqueUsers) {
      uniqueUsersD1  = data.uniqueUsers.d1
      uniqueUsersD7  = data.uniqueUsers.d7
      uniqueUsersD30 = data.uniqueUsers.d30
    }
  } catch {
    // Render empty states — API unavailable
  }

  const currentTvl = tvlSeries.length > 0 ? tvlSeries[tvlSeries.length - 1].value : 0
  const launchTvl = tvlSeries.length > 0 ? tvlSeries[0].value : 0
  const tvlGrowthX =
    launchTvl > 0 && currentTvl > 0
      ? Math.round(currentTvl / launchTvl).toLocaleString()
      : null

  const currentPrice = priceSeries.length > 0 ? priceSeries[priceSeries.length - 1].value : 0
  const price7dAgo = priceSeries.length >= 8 ? priceSeries[priceSeries.length - 8].value : 0
  const priceChange7d =
    price7dAgo > 0 && currentPrice > 0
      ? ((currentPrice - price7dAgo) / price7dAgo) * 100
      : 0
  const priceIsUp = priceChange7d >= 0

  return (
    <SiteLayout updatedAt="Live">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section
          className="relative rounded-2xl overflow-hidden px-8 py-12"
          style={{
            backgroundImage: "url('/images/background-1.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            className="absolute -inset-px pointer-events-none"
            style={{ background: "linear-gradient(to bottom, rgba(11,13,13,0.3), rgba(11,13,13,1) 90%)" }}
          />
          <div
            className="absolute -inset-px pointer-events-none"
            style={{ background: "linear-gradient(225deg, rgba(11,13,13,0.2), rgba(11,13,13,1))" }}
          />
          <div className="relative z-10 max-w-2xl">
            <p className="text-near-muted text-xs font-medium tracking-widest uppercase mb-4">
              + Protocol Analytics
            </p>
            <h1
              className="text-near-text font-light leading-none mb-4"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
            >
              Deep Dive
            </h1>
            <p className="text-near-muted text-sm leading-relaxed max-w-lg text-pretty">
              A closer look at NEAR's onchain economic activity — Intents TVL growth, token
              price, revenue by source, and fee capture mechanics. All data sourced directly
              from the chain or verified third-party APIs.
            </p>
          </div>
        </section>

        {/* ── Intent Volume ─────────────────────────────────────────────────── */}
        <IntentVolumeSection data={intentVolumeSeries} />

        {/* ── Revenue by Stream (hidden for now — remove the `false &&` to restore) ── */}
        {false && (
          <Card
            padding="none"
            className="overflow-hidden" style={debugGlow("api")}
          >
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2 className="text-base font-semibold text-near-text">Revenue by Stream</h2>
                <SourceBadge label="Onchain" />
              </div>
              <p className="text-xs text-near-muted max-w-2xl leading-relaxed">
                Protocol net revenue broken down by originating source. <strong className="text-near-subtle font-medium">Front-end</strong> captures fees
                charged through the NEAR Intents UI. <strong className="text-near-subtle font-medium">Quote Improvement</strong> is the spread
                retained when execution beats the quoted price. <strong className="text-near-subtle font-medium">Authorized</strong> and{" "}
                <strong className="text-near-subtle font-medium">unauthorized partner</strong> volumes come from external integrations routing
                through NEAR Intents. <strong className="text-near-subtle font-medium">Private agreements</strong> are bespoke deals with
                select partners. Figures denominated in USD.
              </p>
            </div>
            <div className="px-6 pb-6">
              {revenueStreams.length > 0 ? (
                <RevenueStreams streams={revenueStreams} />
              ) : (
                <p className="text-sm text-near-subtle py-8 text-center">
                  Revenue stream data unavailable
                </p>
              )}
            </div>
          </Card>
        )}

        {/* ── Fee Capture Mechanics ─────────────────────────────────────────── */}
        {captureSplit && (
          <div>
            <div className="mb-5">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2 className="text-base font-semibold text-near-text">Fee Capture Mechanics</h2>
                <SourceBadge label="Onchain" />
              </div>
              <p className="text-xs text-near-muted max-w-2xl leading-relaxed">
                Share of total gross fees captured as net protocol revenue, segmented by collection
                mechanism. A higher percentage means more revenue was retained per dollar of fees
                generated. Toggle between time windows to see how capture efficiency has evolved.
              </p>
            </div>
            <CaptureSplit data={captureSplit} />
          </div>
        )}

        {/* ── NEAR Token Price ──────────────────────────────────────────────── */}
        <Card
          padding="none"
          className="overflow-hidden" style={debugGlow("api")}
        >
          <div className="p-6 pb-2">
            <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-base font-semibold text-near-text">NEAR Token Price</h2>
                <SourceBadge label="CoinMarketCap" />
              </div>
              {currentPrice > 0 && (
                <StatBadge
                  value={`$${currentPrice.toFixed(3)}`}
                  label={`${priceIsUp ? "▲" : "▼"} ${Math.abs(priceChange7d).toFixed(1)}% vs 7d ago`}
                  positive={priceIsUp}
                />
              )}
            </div>
            <p className="text-xs text-near-muted max-w-2xl leading-relaxed">
              Daily closing price of the NEAR token in USD over the last 90 days. This rate is used
              across the dashboard to convert onchain NEAR amounts to USD equivalents. Data is sourced
              from CoinMarketCap and updated daily.
            </p>
          </div>
          <div className="px-2 pb-4 pt-2">
            {priceSeries.length > 0 ? (
              <PriceLineChart data={priceSeries} />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-near-subtle text-sm">
                Price data unavailable
              </div>
            )}
          </div>
        </Card>

      </div>
    </SiteLayout>
  )
}
