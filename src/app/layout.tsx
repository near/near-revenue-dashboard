import type { Metadata } from "next"
import localFont from "next/font/local"
import { Inter } from "next/font/google"
import { LenisProvider } from "@/providers/lenis-provider"
import { GlobalRangeProvider } from "@/providers/global-range-provider"
import "./globals.css"

const fkGrotesk = localFont({
  src: [
    { path: "../../public/fonts/fkgrotesk/FKGrotesk-Thin.otf",         weight: "100", style: "normal" },
    { path: "../../public/fonts/fkgrotesk/FKGrotesk-ThinItalic.otf",   weight: "100", style: "italic" },
    { path: "../../public/fonts/fkgrotesk/FKGrotesk-Light.otf",        weight: "300", style: "normal" },
    { path: "../../public/fonts/fkgrotesk/FKGrotesk-LightItalic.otf",  weight: "300", style: "italic" },
    { path: "../../public/fonts/fkgrotesk/FKGrotesk-Regular.otf",      weight: "400", style: "normal" },
    { path: "../../public/fonts/fkgrotesk/FKGrotesk-RegularItalic.otf",weight: "400", style: "italic" },
    { path: "../../public/fonts/fkgrotesk/FKGrotesk-Medium.otf",       weight: "500", style: "normal" },
    { path: "../../public/fonts/fkgrotesk/FKGrotesk-MediumItalic.otf", weight: "500", style: "italic" },
  ],
  variable: "--font-fk-grotesk",
  display: "swap",
})

const fkGroteskMono = localFont({
  src: [
    { path: "../../public/fonts/fkgroteskmono/woff2/FKGroteskMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/fkgroteskmono/woff2/FKGroteskMono-Italic.woff2",  weight: "400", style: "italic" },
    { path: "../../public/fonts/fkgroteskmono/woff2/FKGroteskMono-Medium.woff2",  weight: "500", style: "normal" },
    { path: "../../public/fonts/fkgroteskmono/woff2/FKGroteskMono-Bold.woff2",    weight: "700", style: "normal" },
  ],
  variable: "--font-fk-grotesk-mono",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "NEAR Revenue Dashboard",
  description: "Protocol & product revenue tracker",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://revenue.near.org"),
  openGraph: {
    title: "NEAR Revenue Dashboard",
    description: "Protocol & product revenue tracker",
    images: [{ url: "/bg-meta.jpg", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEAR Revenue Dashboard",
    description: "Protocol & product revenue tracker",
    images: ["/bg-meta.jpg"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${fkGrotesk.variable} ${fkGroteskMono.variable} ${inter.variable} antialiased`}
    >
      <body className="min-h-screen bg-near-bg text-near-text">
        <LenisProvider>
          <GlobalRangeProvider>{children}</GlobalRangeProvider>
        </LenisProvider>
      </body>
    </html>
  )
}
