export const dynamic = 'force-dynamic'

import { SiteLayout } from "@/components/sections/site-layout"
import { Hero } from "@/components/sections/hero"
import { StatsGrid } from "@/components/sections/stats-grid"
import { CumulativeFeesSection, type CumulativeFeesPoint } from "@/components/sections/cumulative-fees-section"
import { TvlChartSection } from "@/components/sections/tvl-chart-section"
import { UniqueUsersSection } from "@/components/sections/unique-users-section"
import { RevenueCharts } from "@/components/sections/revenue-charts"
import { RevenueStreams } from "@/components/sections/revenue-streams"
import { CaptureSplit } from "@/components/sections/capture-split"
import { EfficiencyMetrics } from "@/components/sections/efficiency-metrics"
import { WalletTable } from "@/components/sections/wallet-table"
import { EcosystemMap } from "@/components/sections/ecosystem-map"
import { Faq } from "@/components/sections/faq"
import { fetchDashboardData, type RevenueStreamItem, type SnapshotCaptureSplit, type RevenueSeriesPoint, type IntentVolumePoint, type TotalFeesSeriesPoint } from "@/lib/api"
import { formatUSD, formatNear, formatMonthLabel, formatDayLabel, formatUpdatedAt, aggregateEmissionsByMonth, buildPriceByMonth, computeRevenueVsEmissions, computeAbsoluteRevVsEmissions, computeTrailingChange, debugGlow, type AbsoluteRevEmissionsPoint } from "@/lib/utils"
import { STATS, REVENUE_MONTHLY, GAUGE_VALUE, TOTAL_FEES_DISPLAY, TOTAL_NET_REVENUE_DISPLAY, FEES_CHANGE, SPARKLINE_DATA, EMISSIONS_SERIES, WALLET_ROWS } from "@/lib/data"
import type { StatCard, TimeSeriesPoint, RevenueBarPoint, WalletRow } from "@/lib/types"

export default async function Page() {
  // ── Fallback values (static data) ─────────────────────────────────────────
  let totalFeesDisplay = TOTAL_FEES_DISPLAY
  let totalNetRevenueDisplay = TOTAL_NET_REVENUE_DISPLAY
  let feesLast30dUsd = "$2.83M"
  let netFeesLast30dUsd = "$874.5K"
  let gaugeValue = GAUGE_VALUE
  let feesChange = parseFloat(FEES_CHANGE)
  let sparklineData: number[] = SPARKLINE_DATA
  let stats: StatCard[] = STATS.slice(1, 4) // exclude Stablecoin Liquidity Depth (no API yet)
  let revenueChartSeries: RevenueBarPoint[] = REVENUE_MONTHLY
  let updatedAt = "—"
  let emissionsMonthly: TimeSeriesPoint[] = EMISSIONS_SERIES
  let emissionsDaily: TimeSeriesPoint[] = EMISSIONS_SERIES
  let absoluteRevEmissions: AbsoluteRevEmissionsPoint[] = []
  let cumulativeFeesData: CumulativeFeesPoint[] = []
  let revenueStreams: RevenueStreamItem[] = []
  let captureSplit: SnapshotCaptureSplit | null = null
  let effRevenueSeries: RevenueSeriesPoint[] = []
  let effVolumeSeries: IntentVolumePoint[] = []
  let effFeesSeries: TotalFeesSeriesPoint[] = []
  let tvlChartSeries: TimeSeriesPoint[] = []
  let tvlCurrentUsd = 0
  let tvlGrowthX: string | null = null
  let uniqueUsersD1 = 0
  let uniqueUsersD7 = 0
  let uniqueUsersD30 = 0
  let walletRows: WalletRow[] = WALLET_ROWS

  try {
    const { snapshot, revenueSeries, emissionsDaily: emissionsDailyRaw, totalFeesSeries: totalFeesRaw, intentVolumeSeries, uniqueUsers, confidentialTvlUsd, tvlSeries: tvlRaw, revenueStreams: streamsRaw, captureSplit: captureSplitRaw, priceSeries, walletBreakdown } = await fetchDashboardData()
    const snap = snapshot.data

    // Build price map for NEAR conversions using the API price feed
    const priceByMonth = buildPriceByMonth(priceSeries)

    totalFeesDisplay = formatUSD(snap.total_fees.fees_usd_all_time)
    totalNetRevenueDisplay = formatUSD(snap.revenue.revenue_usd_all_time)
    feesLast30dUsd = formatUSD(snap.total_fees.fees_usd_d30)
    netFeesLast30dUsd = formatUSD(snap.revenue.revenue_usd_d30)
    gaugeValue = parseFloat((snap.capture_rate.capture_rate_d30 * 100).toFixed(1))
    feesChange =
      snap.revenue.revenue_usd_d30_prior > 0
        ? ((snap.revenue.revenue_usd_d30_current - snap.revenue.revenue_usd_d30_prior) /
            snap.revenue.revenue_usd_d30_prior) *
          100
        : 0

    sparklineData = revenueSeries.map((p) => Math.round(p.revenue_usd))

    const intentVolumeTotal = intentVolumeSeries.length > 0
      ? intentVolumeSeries[intentVolumeSeries.length - 1].cumulative_volume_usd
      : 0
    const intentVolumeYoY = computeTrailingChange(
      intentVolumeSeries.map((p) => ({ date: p.date_at, value: p.cumulative_volume_usd })),
      365
    )

    // Confidential TVL chart series — computed early so its real MoM change
    // can feed the "Confidential TVL" stat card below.
    const validTvl = tvlRaw.filter(p => p.tvl_usd > 0)
    if (validTvl.length > 0) {
      tvlChartSeries = validTvl.map(p => ({ date: p.date_at, value: p.tvl_usd }))
      tvlCurrentUsd = validTvl[validTvl.length - 1].tvl_usd
      const launchTvl = validTvl[0].tvl_usd
      if (launchTvl > 0) tvlGrowthX = Math.round(tvlCurrentUsd / launchTvl).toLocaleString()
    }
    const tvlMoM = computeTrailingChange(tvlChartSeries, 30)

    stats = [
      {
        ...STATS[1],
        value:  intentVolumeTotal > 0 ? formatUSD(intentVolumeTotal) : STATS[1].value,
        source: intentVolumeTotal > 0 ? "api" : "static",
        change: intentVolumeYoY
          ? { label: `${intentVolumeYoY.multiple.toFixed(1)}× YoY`, positive: intentVolumeYoY.positive }
          : undefined,
      },
      {
        ...STATS[2],
        value:  confidentialTvlUsd > 0 ? formatUSD(confidentialTvlUsd) : STATS[2].value,
        source: confidentialTvlUsd > 0 ? "api" : "static",
        change: tvlMoM
          ? { label: `${tvlMoM.multiple.toFixed(1)}× MoM`, positive: tvlMoM.positive }
          : undefined,
      },
      {
        ...STATS[3],
        value:  uniqueUsers ? formatNear(uniqueUsers.d30) : STATS[3].value,
        source: uniqueUsers ? "api" : "static",
      },
    ]

    revenueChartSeries = revenueSeries.map((p) => ({
      date: formatMonthLabel(p.period_month),
      value: Math.round(p.revenue_usd),
      cumulative: Math.round(p.cumulative_revenue_usd),
    }))

    updatedAt = formatUpdatedAt(snapshot.updated_at)

    const monthlyEmissionsMap = aggregateEmissionsByMonth(emissionsDailyRaw)
    emissionsMonthly = computeRevenueVsEmissions(revenueSeries, monthlyEmissionsMap, priceByMonth)
    absoluteRevEmissions = computeAbsoluteRevVsEmissions(revenueSeries, emissionsDailyRaw, priceByMonth)
    emissionsDaily = emissionsDailyRaw
      .slice(-90)
      .map((p) => ({ date: p.date_at, value: Math.round(p.emissions_near) }))

    revenueStreams = streamsRaw
    captureSplit  = captureSplitRaw

    effRevenueSeries = revenueSeries
    effVolumeSeries  = intentVolumeSeries
    effFeesSeries    = totalFeesRaw

    // Unique users
    if (uniqueUsers) {
      uniqueUsersD1  = uniqueUsers.d1
      uniqueUsersD7  = uniqueUsers.d7
      uniqueUsersD30 = uniqueUsers.d30
    }

    // Cumulative Fees section — real daily fees split by fee type, cumulative line,
    // plus same-day intent volume joined by date for the tooltip.
    const volumeByDate = new Map(intentVolumeSeries.map((p) => [p.date_at, p.volume_usd]))
    cumulativeFeesData = totalFeesRaw
      .filter((p) => p.fees_usd > 0)
      .map((p) => {
        // Split USD fees by the NEAR protocol/intents ratio.
        // For early records (Aug-Dec 2025) total_fees_near = 0 — attribute all to intents.
        const protocolShare = p.total_fees_near > 0 ? p.protocol_fee_near / p.total_fees_near : 0
        const protocolUsd = p.fees_usd * protocolShare
        return {
          isoDate: p.date_at,
          label: formatDayLabel(p.date_at),
          protocolUsd,
          intentsUsd: p.fees_usd - protocolUsd,
          cumulativeUsd: p.cumulative_fees_usd,
          volumeUsd: volumeByDate.get(p.date_at) ?? 0,
        }
      })
    if (walletBreakdown.length > 0) {
      const walletTotal = walletBreakdown.reduce((sum, w) => sum + w.inflow_near_all_time, 0)
      if (walletTotal > 0) {
        walletRows = walletBreakdown.map((w) => {
          const pct = parseFloat(((w.inflow_near_all_time / walletTotal) * 100).toFixed(1))
          return { name: w.wallet, nearAmount: w.inflow_near_all_time, share: pct, pct }
        })
      }
    }
  } catch {
    // API unavailable — render with static fallback data
  }

  return (
    <SiteLayout updatedAt={updatedAt}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <Hero
          totalFeesDisplay={totalFeesDisplay}
          totalNetRevenueDisplay={totalNetRevenueDisplay}
          feesLast30dUsd={feesLast30dUsd}
          netFeesLast30dUsd={netFeesLast30dUsd}
          gaugeValue={gaugeValue}
          feesChange={feesChange}
          sparklineData={sparklineData}
        />
        <StatsGrid stats={stats} />
        <RevenueCharts
          revenueSeries={revenueChartSeries}
          emissionsMonthly={emissionsMonthly}
          emissionsDaily={emissionsDaily}
          absoluteRevEmissions={absoluteRevEmissions}
        />
        <div className="hidden">
          <CumulativeFeesSection data={cumulativeFeesData} />
        </div>
        <TvlChartSection data={tvlChartSeries} currentTvl={tvlCurrentUsd} growthX={tvlGrowthX} />

        {/* Revenue by Stream */}
        {revenueStreams.length > 0 && (
          <div className="rounded-2xl border border-near-border bg-near-card overflow-hidden" style={debugGlow("api")}>
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2 className="text-base font-semibold text-near-text">Revenue by Stream</h2>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-near-border text-near-subtle font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-near-green/60 shrink-0" />
                  Onchain
                </span>
              </div>
              <p className="text-xs text-near-muted max-w-2xl leading-relaxed">
                Protocol net revenue broken down by originating source. Figures denominated in USD.
              </p>
            </div>
            <div className="px-6 pb-6">
              <RevenueStreams streams={revenueStreams} />
            </div>
          </div>
        )}

        {/* Fee Capture Mechanics */}
        {captureSplit && (
          <div>
            <div className="mb-5">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2 className="text-base font-semibold text-near-text">Fee Capture Mechanics</h2>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-near-border text-near-subtle font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-near-green/60 shrink-0" />
                  Onchain
                </span>
              </div>
              <p className="text-xs text-near-muted max-w-2xl leading-relaxed">
                Share of total gross fees captured as net protocol revenue, segmented by collection mechanism. Toggle between time windows to see how capture efficiency has evolved.
              </p>
            </div>
            <CaptureSplit data={captureSplit} />
          </div>
        )}

        <EfficiencyMetrics
          revenueSeries={effRevenueSeries}
          intentVolumeSeries={effVolumeSeries}
          totalFeesSeries={effFeesSeries}
        />

        <WalletTable rows={walletRows} />

        <EcosystemMap />

        <Faq />
      </div>
    </SiteLayout>
  )
}
