import type { TimeSeriesPoint, RevenueBarPoint, WalletRow, FaqItem, StatCard, EcosystemInterface, EcosystemChain } from "./types"
import type { SwapDataPoint } from "@/components/charts/stacked-bar-chart"

// Cumulative fees — hockey-stick power curve (flat early, accelerates from Oct 2025)
// 53 points so the last tick lands in May 2026
function buildFeesSeries(): TimeSeriesPoint[] {
  const target = 22_830_000
  const startMs = new Date(2025, 4, 1).getTime() // May 1 2025
  return Array.from({ length: 53 }, (_, i) => {
    const date = new Date(startMs + i * 7 * 86400000).toISOString().slice(0, 10)
    const t = i / 52
    const value = Math.round(target * Math.pow(t, 2.8))
    return { date, value }
  })
}
export const TOTAL_FEES_SERIES: TimeSeriesPoint[] = buildFeesSeries()

// Monthly revenue after partner payouts (Apr 2025 → Apr 2026)
export const REVENUE_MONTHLY: RevenueBarPoint[] = [
  { date: "Apr '25", value:  52000, cumulative:   52000 },
  { date: "May '25", value:  78000, cumulative:  130000 },
  { date: "Jun '25", value: 105000, cumulative:  235000 },
  { date: "Jul '25", value: 138000, cumulative:  373000 },
  { date: "Aug '25", value: 172000, cumulative:  545000 },
  { date: "Sep '25", value: 210000, cumulative:  755000 },
  { date: "Oct '25", value: 255000, cumulative: 1010000 },
  { date: "Nov '25", value: 305000, cumulative: 1315000 },
  { date: "Dec '25", value: 358000, cumulative: 1673000 },
  { date: "Jan '26", value: 398000, cumulative: 2071000 },
  { date: "Feb '26", value: 438000, cumulative: 2509000 },
  { date: "Mar '26", value: 465000, cumulative: 2974000 },
  { date: "Apr '26", value: 490000, cumulative: 3464000 },
]

// Revenue as % of $NEAR emissions — starts low/flat, oscillations grow over time
export const EMISSIONS_SERIES: TimeSeriesPoint[] = Array.from({ length: 53 }, (_, i) => {
  const t = i / 52
  const base = 0.4 + t * 3.5
  const amplitude = 0.2 + t * 7.5
  const wave = Math.sin(i * 1.9) * amplitude * 0.65 + Math.cos(i * 1.2) * amplitude * 0.35
  const date = new Date(new Date(2025, 4, 1).getTime() + i * 7 * 86400000).toISOString().slice(0, 10)
  return { date, value: Math.max(0.1, base + wave) }
})

// Mini sparkline — descending trend (\) with oscillations, more data points for density
export const SPARKLINE_DATA: number[] = Array.from({ length: 40 }, (_, i) => {
  const t = i / 39
  const base = 2050000 - t * 680000   // descends from ~2.05M to ~1.37M
  const amp = 95000 + t * 40000       // amplitude grows slightly
  const wave = Math.sin(i * 1.7) * amp + Math.cos(i * 0.9) * amp * 0.4
  return Math.round(Math.max(1100000, base + wave))
})

export const WALLET_ROWS: WalletRow[] = [
  { name: "fefundsadmin.sputnik-dao.near",  nearAmount: 1405868, share: 56, pct: 55.9 },
  { name: "1csfundsadmin.sputnik-dao.near", nearAmount: 555082,  share: 22, pct: 22.1 },
  { name: "buybacks.multisignature.near",   nearAmount: 338830,  share: 13, pct: 13.5 },
  { name: "Protocol Fees (70% Burned)",     nearAmount: 212724,  share:  8, pct:  8.5 },
]

export const STATS: StatCard[] = [
  { label: "Revenue · all-time",             value: "3.27M",    unit: "NEAR",    sub: "Captured by NEAR",                           source: "static" },
  { label: "Intent Volume · all-time",        value: "$20.44B",  unit: "", sub: "Routed and settled through NEAR Intents",                   source: "static" },
  { label: "Confidential TVL · Now",          value: "$15.53M",  unit: "", sub: "NEAR Intents Confidential TVL",       source: "static" },
  { label: "Unique Users · 30D",              value: "552.7K",   unit: "",        sub: "Users who expressed an intent",                source: "static" },
  { label: "Stablecoin Liquidity Depth · Now",value: "$1M",      unit: "", sub: "Max Swap size on NEAR Intents",               source: "static" },
]

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "01",
    question: "What is the difference between total fees and revenue?",
    answer:
      "Total Fees is the gross amount of fees collected across NEAR Protocol and NEAR Intents activity. Revenue is the portion captured by NEAR Protocol after payouts to integration partners, solvers, and dApps. The gap between the two figures represents fees distributed to ecosystem participants under NEAR's revenue-sharing model. All fees are denominated in $NEAR; fees collected in other assets may be converted to $NEAR prior to distribution.",
  },
  {
    id: "02",
    question: "How does the fee split work?",
    answer:
      "Fee splits depend on where the transaction originates. Swaps executed through NEAR's native frontend (near.com) direct 100% of fees to a NEAR revenue wallet. Swaps executed through third-party integration partners are split 50/50 between NEAR and the partner. NEAR Intents charges a protocol fee of 0.0001% per swap, plus distribution fees set by integration partners.",
  },
  {
    id: "03",
    question: "How do protocol-level transaction fees work?",
    answer:
      "Every transaction on NEAR Protocol incurs a small base fee. Of that fee, 70% is permanently burned—removed from $NEAR circulating supply—and 30% is paid to the developer of the smart contract being called. These protocol-level fees are separate from NEAR Intents product fees.",
  },
  {
    id: "04",
    question: "What happens to revenue after it is collected?",
    answer:
      "Protocol fees are split at collection: 70% is permanently burned and 30% is paid to the developer of the smart contract being called. Product revenue—fees captured by NEAR Intents and other products—can be deployed for $NEAR buybacks, buyback-and-earn (through locking or staking), and other supply-management approaches.",
  },
  {
    id: "05",
    question: "What is the data source and how often does the dashboard update?",
    answer:
      "The dashboard pulls data directly from onchain sources, including the NEAR Intents smart contract. Data is updated in real time as transactions are executed and recorded onchain.",
  },
  {
    id: "06",
    question: "Where can I learn more about NEAR's tokenomics?",
    answer:
      "For a full breakdown of how NEAR's economic model is evolving—including the fee switch and the relationship between protocol revenue and NEAR value capture—read the tokenomics blog post:",
    link: { href: "http://near.org/blog/evolving-near-tokenomics", label: "near.org/blog/evolving-near-tokenomics" },
  },
]

export const CONFIDENTIAL_TVL: TimeSeriesPoint[] = [
  { date: "Apr '25", value: 8000 },
  { date: "May '25", value: 95000 },
  { date: "Jun '25", value: 120000 },
  { date: "Jul '25", value: 148000 },
  { date: "Aug '25", value: 178000 },
  { date: "Sep '25", value: 215000 },
  { date: "Oct '25", value: 258000 },
  { date: "Nov '25", value: 370000 },
  { date: "Dec '25", value: 355000 },
  { date: "Jan '26", value: 390000 },
  { date: "Feb '26", value: 420000 },
  { date: "Mar '26", value: 375000 },
  { date: "Apr '26", value: 290000 },
]

export const SWAP_BREAKDOWN: SwapDataPoint[] = [
  { date: "Apr '25", confidential: 5000, normal: 0 },
  { date: "May '25", confidential: 80000, normal: 25000 },
  { date: "Jun '25", confidential: 105000, normal: 30000 },
  { date: "Jul '25", confidential: 128000, normal: 35000 },
  { date: "Aug '25", confidential: 145000, normal: 45000 },
  { date: "Sep '25", confidential: 175000, normal: 50000 },
  { date: "Oct '25", confidential: 210000, normal: 60000 },
  { date: "Nov '25", confidential: 245000, normal: 80000 },
  { date: "Dec '25", confidential: 260000, normal: 95000 },
  { date: "Jan '26", confidential: 270000, normal: 100000 },
  { date: "Feb '26", confidential: 255000, normal: 105000 },
  { date: "Mar '26", confidential: 240000, normal: 95000 },
  { date: "Apr '26", confidential: 200000, normal: 90000 },
]

// Curated "Top Interfaces" — sourced from the NEAR Intents partners directory (verified + featured).
export const ECOSYSTEM_INTERFACES: EcosystemInterface[] = [
  { name: "Brave Wallet", logo: "/images/ecosystem/interfaces/brave-wallet.svg", url: "https://brave.com/wallet/" },
  { name: "Rabby Wallet",  logo: "/images/ecosystem/interfaces/rabby-wallet.svg", url: "https://rabby.io/" },
  { name: "ZODL",          logo: "/images/ecosystem/interfaces/zodl.svg",         url: "https://zodl.com/" },
  { name: "Trust Wallet",  logo: "/images/ecosystem/interfaces/trust-wallet.svg", url: "https://trustwallet.com/" },
  { name: "SafePal",       logo: "/images/ecosystem/interfaces/safepal.png",      url: "https://www.safepal.com/" },
  { name: "LiFi",          logo: "/images/ecosystem/interfaces/lifi.svg",         url: "https://li.fi/" },
  { name: "SwapKit",       logo: "/images/ecosystem/interfaces/swapkit.png",      url: "https://swapkit.dev/" },
  { name: "Ledger",        logo: "/images/ecosystem/interfaces/ledger.svg",       url: "https://www.ledger.com/" },
]

// Supported chains — decorative grid, no outbound link (source has no per-chain URL).
export const ECOSYSTEM_CHAINS: EcosystemChain[] = [
  { name: "Ethereum",     logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_ETH.svg",        color: "#627EEA" },
  { name: "Arbitrum",     logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_ARBITRUM.svg",   color: "#28A0F0" },
  { name: "Base",         logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_BASE.svg",       color: "#0052FF" },
  { name: "Optimism",     logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_OPTIMISM.svg",   color: "#FF0420" },
  { name: "Polygon",      logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_POLYGON.svg",    color: "#8247E5" },
  { name: "BNB Chain",    logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_BNB CHAIN.svg",  color: "#F3BA2F" },
  { name: "Avalanche",    logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_AVALANCHE.svg",  color: "#E84142" },
  { name: "Berachain",    logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_BERACHAIN.svg",  color: "#964B00" },
  { name: "Scroll",       logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_SCROLL.svg",     color: "#F5C55E" },
  { name: "Gnosis",       logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_GNOSIS.svg",     color: "#3E6957" },
  { name: "Aurora",       logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_AURORA.svg",     color: "#70D44B" },
  { name: "Tron",         logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_TRX.svg",        color: "#FF0013" },
  { name: "Bitcoin",      logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_BTC.svg",        color: "#F7931A" },
  { name: "Dogecoin",     logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_DOGECOIN.svg",   color: "#C2A633" },
  { name: "Litecoin",     logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_LITECOIN.svg",   color: "#345D9D" },
  { name: "Zcash",        logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_ZEC.svg",        color: "#ECB244" },
  { name: "Dash",         logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_DASH.svg",       color: "#008CE7" },
  { name: "Bitcoin Cash", logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_BTC CASH.svg",   color: "#0AC18E" },
  { name: "Aptos",        logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_APTOS.svg",      color: "#00BCD4" },
  { name: "Movement",     logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_MOVEMENT.svg",   color: "#2B5CE6" },
  { name: "NEAR",         logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_NEAR.svg",       color: "#00EC97" },
  { name: "Solana",       logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_SOL.svg",        color: "#9945FF" },
  { name: "Starknet",     logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_STARKNET.svg",   color: "#29296E" },
  { name: "Sui",          logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_SUI.svg",        color: "#4DA2FF" },
  { name: "TON",          logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_TON.svg",        color: "#0088CC" },
  { name: "Cardano",      logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_CARDANO.svg",    color: "#0033AD" },
  { name: "Stellar",      logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_STELLAR.svg",    color: "#7D00FF" },
  { name: "XRP",          logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_XRP.svg",        color: "#23292F" },
  { name: "Monad",        logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_MONAD.svg",      color: "#836EF9" },
  { name: "Plasma",       logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_PLASMA.svg",     color: "#00D4AA" },
  { name: "XLayer",       logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_XLAYER.svg",     color: "#333333" },
  { name: "Aleo",         logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_ALEO.svg",       color: "#00C0F9" },
  { name: "ADI",          logo: "/images/ecosystem/chains/Allcoins_fullcolor_V02_ADI.svg",        color: "#C4A962" },
]

export const GAUGE_VALUE = 30.9
export const TOTAL_FEES_DISPLAY = "$34.84M"
export const FEES_CHANGE = "121.1"
