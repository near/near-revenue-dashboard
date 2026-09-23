import { debugGlow } from "@/lib/utils"
import { Gauge } from "@/components/charts/gauge"
import { Sparkline } from "@/components/charts/sparkline"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AnimatedNumber } from "@/components/ui/animated-number"

interface HeroProps {
  totalFeesDisplay: string
  totalNetRevenueDisplay: string
  feesLast30dUsd: string
  netFeesLast30dUsd: string
  gaugeValue: number
  /** Signed percentage change in revenue (last 30 days). Positive = up. */
  feesChange: number
  sparklineData: number[]
}

export function Hero({
  totalFeesDisplay,
  totalNetRevenueDisplay,
  feesLast30dUsd,
  netFeesLast30dUsd,
  gaugeValue,
  feesChange,
  sparklineData,
}: HeroProps) {
  const isUp = feesChange >= 0
  const changeLabel = Math.abs(feesChange).toFixed(1)

  return (
    <section
      className="relative grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 rounded-2xl overflow-hidden px-10 py-12"
      style={{ backgroundImage: "url('/images/background-1.jpg')", backgroundSize: "cover", backgroundPosition: "center", ...debugGlow("api") }}
    >
      <div className="absolute -inset-px pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(11,13,13,0.3), rgba(11,13,13,1) 90%)" }} />
      <div className="absolute -inset-px pointer-events-none" style={{ background: "linear-gradient(225deg, rgba(11,13,13,0.2), rgba(11,13,13,1))" }} />
      {/* Left: headline + big number */}
      <div className="relative z-10 lg:col-span-3 flex flex-col justify-center gap-5">
        <div>
          <p className="text-near-muted text-base leading-snug mb-3">
            NEAR is earning{" "}
            <em className="not-italic text-near-green font-medium">revenue</em>, in real time.
          </p>
          <div className="flex items-baseline gap-4 flex-wrap">
            <AnimatedNumber
              value={totalNetRevenueDisplay}
              duration={2}
              className="text-near-text font-light leading-none"
              style={{ fontSize: "clamp(3rem, 7vw, 5.5rem)" }}
            />
            <span
              className="text-near-green font-light leading-none"
              style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
            >
              USD
            </span>
          </div>
        </div>

        <p className="text-near-muted text-sm leading-relaxed max-w-lg text-pretty">
          NEAR captures a growing share of fees, feeding buybacks that permanently remove NEAR from circulation.
        </p>

        <div className="flex items-center gap-2">
          <span className="text-near-muted text-xs font-medium tracking-widest uppercase">Total fees generated</span>
          <span className="text-near-text text-xs font-semibold">{totalFeesDisplay}</span>
        </div>

        <div className="hidden">
          <Badge variant={isUp ? "green" : "red"}>
            <span>{isUp ? "▲" : "▼"} <AnimatedNumber value={changeLabel} duration={1.2} />%</span>
            <span className={isUp ? "text-near-green/60" : "text-near-red/60"}>·</span>
            <span>rev 30d</span>
          </Badge>
        </div>
      </div>

      {/* Right: capture rate card */}
      <div className="relative z-10 lg:col-span-2">
        <div className="rounded-2xl border border-near-border bg-near-card p-6 flex flex-col gap-4">
          <Gauge value={gaugeValue} />

          <p className="text-xs text-near-muted text-center leading-relaxed">
            Share of total fees captured as net revenue.
          </p>

          <Separator />

          <div>
            <p className="text-xs text-near-subtle mb-3">Last 30 days</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-near-subtle uppercase tracking-wider mb-1">Net revenue</p>
                <div className="flex items-baseline gap-1.5">
                  <AnimatedNumber
                    value={netFeesLast30dUsd}
                    duration={1.5}
                    delay={0.3}
                    className="text-xl font-bold text-near-text"
                  />
                  <span className="text-xs text-near-muted font-medium">USD</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-near-subtle uppercase tracking-wider mb-1">Fees generated</p>
                <div className="flex items-baseline gap-1.5">
                  <AnimatedNumber
                    value={feesLast30dUsd}
                    duration={1.5}
                    delay={0.4}
                    className="text-xl font-bold text-near-text"
                  />
                  <span className="text-xs text-near-muted font-medium">USD</span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Sparkline data={sparklineData} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
