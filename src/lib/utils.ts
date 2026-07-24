import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { EmissionsSeriesPoint, PricePoint, RevenueSeriesPoint } from "./api"
import type { TimeSeriesPoint } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function debugGlow(source: "api" | "static"): { boxShadow?: string } {
  if (process.env.NEXT_PUBLIC_DEBUG_SOURCES !== "true") return {}
  return {
    boxShadow:
      source === "api"
        ? "0 0 0 1px rgba(0,236,151,0.20), 0 0 20px rgba(0,236,151,0.08)"
        : "0 0 0 1px rgba(239,68,68,0.20), 0 0 14px rgba(239,68,68,0.07)",
  }
}

/** Format a NEAR amount as an AnimatedNumber-compatible string (e.g. "1.38M", "345.2K"). */
export function formatNear(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toFixed(0)
}

/** Format a large NEAR supply figure with a B suffix when applicable (e.g. "1.32B", "890.4M"). */
export function formatSupplyNear(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  return formatNear(value)
}

/** Format a USD amount as an AnimatedNumber-compatible string (e.g. "$34.59M", "$3.76M"). */
export function formatUSD(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

/** Convert ISO date "2025-08-01" → "Aug '25" */
export function formatMonthLabel(isoDate: string): string {
  const [year, month] = isoDate.split("-")
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return `${names[parseInt(month) - 1]} '${year.slice(2)}`
}

/** Convert ISO date "2026-06-04" → "Jun 4" */
export function formatDayLabel(isoDate: string): string {
  const [, month, day] = isoDate.split("-")
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return `${names[parseInt(month) - 1]} ${parseInt(day)}`
}

/** Format ISO datetime "2026-06-04T19:37:39.927127Z" → "Jun 04, 2026" */
export function formatUpdatedAt(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  })
}

/**
 * Build a map of month key "YYYY-MM" → average daily NEAR price for that month.
 * Used to convert revenue_usd → revenue_near using the API price feed.
 */
export function buildPriceByMonth(priceSeries: PricePoint[]): Record<string, number> {
  const sums: Record<string, { total: number; count: number }> = {}
  for (const p of priceSeries) {
    if (p.near_price_usd <= 0) continue
    const key = p.date_at.slice(0, 7)
    if (!sums[key]) sums[key] = { total: 0, count: 0 }
    sums[key].total += p.near_price_usd
    sums[key].count += 1
  }
  const result: Record<string, number> = {}
  for (const [k, v] of Object.entries(sums)) {
    result[k] = v.total / v.count
  }
  return result
}

/**
 * Multiple between the latest point in a series and the closest point ~`days`
 * earlier (e.g. 2.5 = grew 2.5x). Returns null if the series doesn't have
 * enough history to make a meaningful comparison (avoids comparing against
 * the series' first point and calling it a "30d change" when only a few days
 * of data exist). Expressed as a multiple rather than a percentage because
 * young, fast-growing series (a product's first months) routinely produce
 * percentage changes in the thousands, which read as broken rather than real.
 */
export function computeTrailingChange(
  series: TimeSeriesPoint[],
  days: number
): { multiple: number; positive: boolean } | null {
  if (series.length < 2) return null
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sorted[sorted.length - 1]
  const latestMs = new Date(latest.date + "T12:00:00Z").getTime()
  const targetMs = latestMs - days * 86_400_000

  let closest = sorted[0]
  for (const p of sorted) {
    if (new Date(p.date + "T12:00:00Z").getTime() <= targetMs) closest = p
    else break
  }
  if (closest === latest || closest.value <= 0) return null

  const gapDays = (latestMs - new Date(closest.date + "T12:00:00Z").getTime()) / 86_400_000
  if (gapDays < days * 0.5) return null

  const multiple = latest.value / closest.value
  return { multiple, positive: multiple >= 1 }
}

/** Sum daily emissions_near by month key "YYYY-MM". */
export function aggregateEmissionsByMonth(
  points: EmissionsSeriesPoint[]
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const p of points) {
    const key = p.date_at.slice(0, 7) // "2025-08"
    result[key] = (result[key] ?? 0) + p.emissions_near
  }
  return result
}

/**
 * Compute revenue_near / monthly_emissions * 100 for each month present in both series.
 * Returns TimeSeriesPoint[] with value = ratio %.
 */
export function computeRevenueVsEmissions(
  revenueSeries: RevenueSeriesPoint[],
  monthlyEmissions: Record<string, number>,
  priceByMonth: Record<string, number>
): TimeSeriesPoint[] {
  return revenueSeries
    .map((p) => {
      const key = p.period_month.slice(0, 7)
      const emissions = monthlyEmissions[key]
      if (!emissions || emissions === 0) return null
      const price = priceByMonth[key]
      if (!price || price === 0) return null
      const revenueNear = p.revenue_usd / price
      return {
        date: p.period_month,
        value: parseFloat(((revenueNear / emissions) * 100).toFixed(2)),
      }
    })
    .filter((p): p is TimeSeriesPoint => p !== null && p.value > 0)
}

export interface AbsoluteRevEmissionsPoint {
  date: string        // "YYYY-MM"
  revenueNear: number // cumulative_revenue_near
  emissionsNear: number // cumulative_emissions_near (last day of month)
  referenceSupplyNear: number // constant across the series — latest known total_supply_near
  grossPct: number    // emissionsNear / referenceSupplyNear * 100
  netPct: number      // max(0, emissionsNear - revenueNear) / referenceSupplyNear * 100
  offsetPct: number   // grossPct - netPct (== revenueNear / referenceSupplyNear * 100)
}

/** Scan from the most recent date backward for the first valid (>0) total_supply_near. */
function findLatestValidSupply(points: EmissionsSeriesPoint[]): number {
  const sorted = [...points].sort((a, b) => b.date_at.localeCompare(a.date_at))
  for (const p of sorted) {
    if (p.total_supply_near > 0) return p.total_supply_near
  }
  return 0
}

/**
 * Build daily points for the "Absolute" Revenue vs Emissions chart.
 * Both series start at 0 on Jan 1 of the current year (YTD window), expressed
 * as a share of a single reference circulating supply (the latest known
 * total_supply_near) rather than raw NEAR — raw cumulative NEAR reads as a
 * near-doubling of supply to anyone unfamiliar with how large total supply is.
 * Emissions: running sum of daily emissions_near from Jan 1.
 * Revenue:   running sum of monthly revenue_near — steps up once per month.
 */
export function computeAbsoluteRevVsEmissions(
  revenueSeries: RevenueSeriesPoint[],
  emissionsDaily: EmissionsSeriesPoint[],
  priceByMonth: Record<string, number>
): AbsoluteRevEmissionsPoint[] {
  const referenceSupplyNear = findLatestValidSupply(emissionsDaily)
  if (referenceSupplyNear <= 0) return []

  const ytdStart = `${new Date().getFullYear()}-01-01`
  const ytdMonthStart = ytdStart.slice(0, 7)

  // Build month → cumulative revenue in NEAR using price feed (running sum from Jan 1)
  const monthRevCumulative: Record<string, number> = {}
  let runningRev = 0
  const sortedRev = [...revenueSeries]
    .filter(p => p.period_month.slice(0, 7) >= ytdMonthStart && p.revenue_usd > 0)
    .sort((a, b) => a.period_month.localeCompare(b.period_month))
  for (const p of sortedRev) {
    const key = p.period_month.slice(0, 7)
    const price = priceByMonth[key]
    if (!price || price === 0) continue
    runningRev += p.revenue_usd / price
    monthRevCumulative[key] = runningRev
  }

  // Walk daily emissions, accumulate from Jan 1, carry forward monthly revenue
  const ytdEmissions = emissionsDaily
    .filter(p => p.date_at >= ytdStart)
    .sort((a, b) => a.date_at.localeCompare(b.date_at))

  let cumEmissions = 0
  let currentRev = 0
  return ytdEmissions.map(p => {
    cumEmissions += p.emissions_near
    const mk = p.date_at.slice(0, 7)
    if (monthRevCumulative[mk] !== undefined) currentRev = monthRevCumulative[mk]

    const grossPct = (cumEmissions / referenceSupplyNear) * 100
    const netEmissions = Math.max(0, cumEmissions - currentRev)
    const netPct = (netEmissions / referenceSupplyNear) * 100
    const offsetPct = Math.max(0, grossPct - netPct)

    return {
      date: p.date_at,
      emissionsNear: cumEmissions,
      revenueNear: currentRev,
      referenceSupplyNear,
      grossPct,
      netPct,
      offsetPct,
    }
  })
}
