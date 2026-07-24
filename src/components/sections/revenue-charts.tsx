"use client"

import { useState, useMemo, useEffect } from "react"
import { useGlobalRange } from "@/providers/global-range-provider"
import { Card } from "@/components/ui/card"
import { RevenueBarChart } from "@/components/charts/bar-chart"
import { EmissionsLineChart, AbsoluteEmissionsChart } from "@/components/charts/line-chart"
import { debugGlow, formatSupplyNear } from "@/lib/utils"
import type { AbsoluteRevEmissionsPoint } from "@/lib/utils"
import type { TimeSeriesPoint, RevenueBarPoint } from "@/lib/types"

interface RevenueChartsProps {
  revenueSeries: RevenueBarPoint[]
  emissionsMonthly: TimeSeriesPoint[]
  emissionsDaily: TimeSeriesPoint[]
  absoluteRevEmissions: AbsoluteRevEmissionsPoint[]
}

export function RevenueCharts({
  revenueSeries,
  emissionsMonthly,
  emissionsDaily,
  absoluteRevEmissions,
}: RevenueChartsProps) {
  const [view, setView] = useState<"pct" | "absolute">("pct")
  const [showAllRevenue, setShowAllRevenue] = useState(false)
  const { range } = useGlobalRange()

  useEffect(() => { setShowAllRevenue(false) }, [range])

  // These charts only respond to 90D and YTD — 7D/30D show 90D data dimmed, ALL shows YTD
  const ytdMonths = new Date().getMonth() + 1
  const nMonths = (range === "90D" || range === "7D" || range === "30D") ? 3 : ytdMonths
  const dimmed = !showAllRevenue && (range === "7D" || range === "30D")
  const visibleRevenue = useMemo(() => {
    const sliced = showAllRevenue ? revenueSeries : revenueSeries.slice(-nMonths)
    let running = 0
    return sliced.map(p => {
      running += p.value
      return { ...p, cumulative: running }
    })
  }, [revenueSeries, nMonths, showAllRevenue])
  const visiblePct = useMemo(
    () => emissionsMonthly.slice(-nMonths),
    [emissionsMonthly, nMonths]
  )
  // Absolute view: 90D/7D/30D → last 90 days, YTD → full data
  const visibleAbs = useMemo(() => {
    if (!absoluteRevEmissions.length) return absoluteRevEmissions
    if (range === "YTD") return absoluteRevEmissions
    const last = absoluteRevEmissions[absoluteRevEmissions.length - 1].date
    const cutoff = new Date(last + "T12:00:00Z")
    cutoff.setDate(cutoff.getDate() - 89)
    const cutoffIso = cutoff.toISOString().slice(0, 10)
    return absoluteRevEmissions.filter(d => d.date >= cutoffIso)
  }, [absoluteRevEmissions, range])
  const lastAbs = visibleAbs[visibleAbs.length - 1]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly Revenue */}
      <Card padding="none" className="overflow-hidden flex flex-col" style={debugGlow("api")}>
        <div className="p-6 pb-2 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold text-near-text">Monthly Net Revenue</h2>
              {dimmed && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-near-subtle border border-near-border">
                  Showing 90D
                </span>
              )}
            </div>
            <p className="text-xs text-near-muted">Monthly revenue after partner payouts.</p>
          </div>
          <button
            onClick={() => setShowAllRevenue(v => !v)}
            className="px-3 py-1 rounded text-xs font-medium transition-colors shrink-0"
            style={showAllRevenue
              ? { background: "#00ec97", color: "#0e0f0f" }
              : { background: "transparent", color: "#9ca3af", border: "1px solid #374151" }
            }
          >
            All time
          </button>
        </div>

        {/* Legend */}
        <div className="px-6 pb-2 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-near-muted">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: "rgba(255,255,255,0.25)" }} />
            Monthly Revenue
          </div>
          <div className="flex items-center gap-1.5 text-xs text-near-muted">
            <span className="w-3 h-0.5 shrink-0 bg-near-green" />
            Cumulative Revenue
          </div>
        </div>

        <div className="px-2 pb-4 mt-auto transition-opacity duration-300" style={{ opacity: dimmed ? 0.40 : 1 }}>
          <RevenueBarChart data={visibleRevenue} />
        </div>
      </Card>

      {/* Revenue vs Emissions */}
      <Card padding="none" className="overflow-hidden flex flex-col" style={debugGlow("api")}>
        <div className="p-6 pb-2 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold text-near-text">Revenue vs Emissions</h2>
              {dimmed && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-near-subtle border border-near-border">
                  Showing 90D
                </span>
              )}
            </div>
            <p className="text-xs text-near-muted">
              {view === "absolute" && lastAbs
                ? `Cumulative YTD issuance as share of ~${formatSupplyNear(lastAbs.referenceSupplyNear)} circulating supply.`
                : "Comparison of protocol revenue relative to token issuance."}
            </p>
          </div>
          {/* Toggle */}
          <div className="flex gap-1 shrink-0">
            {(["pct", "absolute"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                style={v === view
                  ? { background: "#00ec97", color: "#0e0f0f" }
                  : { background: "transparent", color: "#9ca3af", border: "1px solid #374151" }
                }
              >
                {v === "pct" ? "% of Emissions" : "Absolute"}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="px-6 pb-2 flex items-center gap-4 flex-wrap">
          {view === "pct" ? (
            <div className="flex items-center gap-2 text-xs text-near-muted">
              <span className="inline-block w-4 h-px bg-near-green" />
              Revenue as % of $NEAR emissions
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-xs text-near-muted">
                <span className="w-3 h-0.5 shrink-0" style={{ background: "#c2721f" }} />
                Gross emissions{lastAbs ? ` · +${lastAbs.grossPct.toFixed(1)}%` : ""}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-near-muted">
                <span className="w-3 shrink-0" style={{ borderTop: "1.5px dashed #c2721f" }} />
                Net of revenue{lastAbs ? ` · +${lastAbs.netPct.toFixed(1)}%` : ""}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-near-muted">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: "var(--near-green)", opacity: 0.5 }} />
                Revenue offset
              </div>
            </>
          )}
        </div>

        <div className="px-2 pb-4 mt-auto transition-opacity duration-300" style={{ opacity: dimmed ? 0.40 : 1 }}>
          {view === "pct" ? (
            <EmissionsLineChart data={visiblePct} mode="monthly" showYear={false} />
          ) : (
            <AbsoluteEmissionsChart data={visibleAbs} />
          )}
        </div>
      </Card>
    </div>
  )
}
