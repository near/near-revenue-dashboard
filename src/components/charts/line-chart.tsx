"use client"

import {
  LineChart,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts"
import type { TimeSeriesPoint } from "@/lib/types"
import { formatNear, type AbsoluteRevEmissionsPoint } from "@/lib/utils"

interface EmissionsLineChartProps {
  data: TimeSeriesPoint[]
  mode?: "monthly" | "daily"
  showYear?: boolean
}

function MonthlyTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const val = payload[0].value ?? 0
  return (
    <div className="bg-near-card border border-near-border rounded-lg px-3 py-2 text-sm">
      <p className="text-near-subtle text-xs mb-1">{label}</p>
      <span className="text-near-green font-medium">{val.toFixed(2)}%</span>
    </div>
  )
}

function DailyTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const val = payload[0].value ?? 0
  return (
    <div className="bg-near-card border border-near-border rounded-lg px-3 py-2 text-sm">
      <p className="text-near-subtle text-xs mb-1">{label}</p>
      <span className="text-near-green font-medium">{formatNear(val)} NEAR</span>
    </div>
  )
}

function formatMonthTick(dateStr: string, showYear = false): string {
  const d = new Date(dateStr + (dateStr.length === 7 ? "-01" : "") + "T12:00:00Z")
  if (showYear) return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
  return d.toLocaleDateString("en-US", { month: "short" })
}

function formatDayTick(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function getBimonthlyTicks(data: TimeSeriesPoint[]): string[] {
  if (data.length === 0) return []
  const targets = [4, 6, 8, 10, 0, 2, 4]
  const seen = new Set<number>()
  const ticks: string[] = []
  for (const d of data) {
    const m = new Date(d.date).getMonth()
    if (targets.includes(m) && !seen.has(m)) {
      seen.add(m)
      ticks.push(d.date)
    }
  }
  return ticks
}

function getMonthlyTicks(data: TimeSeriesPoint[]): string[] {
  if (data.length === 0) return []
  return data.map((p) => p.date)
}

function buildLineTicks(data: TimeSeriesPoint[]): number[] {
  const max = data.reduce((m, p) => Math.max(m, p.value), 0)
  const ceil = Math.ceil(max * 1.15)
  const step = Math.ceil(ceil / 4 / 10) * 10
  return [0, step, step * 2, step * 3, step * 4]
}

// ── Absolute Revenue vs Emissions chart ───────────────────────────────────────

function buildPctTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0]
  const step = max / count
  return Array.from({ length: count + 1 }, (_, i) => parseFloat((step * i).toFixed(2)))
}

function AbsolutePctTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as AbsoluteRevEmissionsPoint
  return (
    <div className="bg-near-card border border-near-border rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="text-near-subtle text-xs mb-1.5">{label}</p>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: "#c2721f" }} />
        <span className="text-near-subtle text-xs">Gross emissions</span>
        <span className="ml-auto text-white font-medium text-xs pl-3">+{d.grossPct.toFixed(2)}%</span>
      </div>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: "#c2721f", opacity: 0.6 }} />
        <span className="text-near-subtle text-xs">Net of revenue</span>
        <span className="ml-auto text-white font-medium text-xs pl-3">+{d.netPct.toFixed(2)}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: "var(--near-green)" }} />
        <span className="text-near-subtle text-xs">Revenue offset</span>
        <span className="ml-auto text-white font-medium text-xs pl-3">{d.offsetPct.toFixed(2)}%</span>
      </div>
    </div>
  )
}

export function AbsoluteEmissionsChart({ data }: { data: AbsoluteRevEmissionsPoint[] }) {
  if (data.length === 0) return null
  const maxGross = Math.max(0, ...data.map(d => d.grossPct))
  const yTicks = buildPctTicks(maxGross * 1.1)
  const yMax   = yTicks[yTicks.length - 1]
  // One tick per month (first occurrence of each month)
  const seenMonths = new Set<string>()
  const xTicks = data.filter(d => {
    const m = d.date.slice(0, 7)
    if (seenMonths.has(m)) return false
    seenMonths.add(m)
    return true
  }).map(d => d.date)

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="offsetPctGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--near-green)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--near-green)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--near-border)" vertical={false} />
        <XAxis
          dataKey="date"
          ticks={xTicks}
          tickFormatter={(s: string) => new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short" })}
          tick={{ fill: "var(--near-subtle)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          ticks={yTicks}
          tickFormatter={(v: number) => `${v.toFixed(1)}%`}
          tick={{ fill: "var(--near-subtle)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
          domain={[0, yMax]}
        />
        <Tooltip content={<AbsolutePctTooltip />} cursor={{ stroke: "var(--near-border)" }} />
        {/* Invisible base at netPct, then the visible band from netPct up to grossPct */}
        <Area
          type="monotone"
          dataKey="netPct"
          stackId="band"
          stroke="none"
          fill="transparent"
          isAnimationActive
          animationDuration={800}
        />
        <Area
          type="monotone"
          dataKey="offsetPct"
          stackId="band"
          name="Revenue offset"
          fill="url(#offsetPctGrad)"
          stroke="none"
          isAnimationActive
          animationDuration={800}
        />
        <Line
          type="monotone"
          dataKey="grossPct"
          name="Gross emissions"
          stroke="#c2721f"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: "#c2721f", stroke: "var(--near-card)", strokeWidth: 2 }}
          isAnimationActive
          animationDuration={800}
        />
        <Line
          type="monotone"
          dataKey="netPct"
          name="Net of revenue"
          stroke="#c2721f"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={false}
          activeDot={{ r: 3, fill: "#c2721f", stroke: "var(--near-card)", strokeWidth: 2 }}
          isAnimationActive
          animationDuration={800}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function EmissionsLineChart({ data, mode = "monthly", showYear }: EmissionsLineChartProps) {
  if (data.length === 0) return null

  const isDaily = mode === "daily"
  const ticks = isDaily ? getBimonthlyTicks(data) : getMonthlyTicks(data)
  const yTicks = buildLineTicks(data)
  const yMax = yTicks[yTicks.length - 1]
  const yFmt = isDaily ? (v: number) => formatNear(v) : (v: number) => `${v.toFixed(1)}%`
  const axisWidth = isDaily ? 56 : 48
  const multiYear = showYear ?? false

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="emissionsLineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--near-green)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--near-green)" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--near-border)" vertical={false} />
        <XAxis
          dataKey="date"
          ticks={ticks}
          tickFormatter={isDaily ? formatDayTick : (d: string) => formatMonthTick(d, multiYear)}
          tick={{ fill: "var(--near-subtle)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          ticks={yTicks}
          tickFormatter={yFmt}
          tick={{ fill: "var(--near-subtle)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={axisWidth}
          domain={[0, yMax]}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          ticks={yTicks}
          tick={false}
          axisLine={false}
          tickLine={false}
          width={0}
          domain={[0, yMax]}
        />
        <Tooltip
          content={isDaily ? <DailyTooltip /> : <MonthlyTooltip />}
          cursor={{ stroke: "var(--near-border)" }}
        />
        <Area
          type="monotone"
          dataKey="value"
          fill="url(#emissionsLineGrad)"
          stroke="var(--near-green)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: "var(--near-green)", stroke: "var(--near-card)", strokeWidth: 2 }}
          isAnimationActive={true}
          animationDuration={1000}
          animationEasing="ease-out"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
