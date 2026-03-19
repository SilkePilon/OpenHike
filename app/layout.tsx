import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { PwaRegister } from "@/components/pwa-register"
import { cn } from "@/lib/utils"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "OpenHike — Route Planner",
  description:
    "Plan hiking routes with scouting techniques — works offline.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OpenHike",
  },
  other: {
    "mobile-web-app-capable": "yes",
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
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        fontSans.variable
      )}
    >
      <head>
        <meta name="theme-color" content="#2563eb" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <link rel="dns-prefetch" href="https://a.basemaps.cartocdn.com" />
        <link rel="dns-prefetch" href="https://b.basemaps.cartocdn.com" />
        <link rel="dns-prefetch" href="https://c.basemaps.cartocdn.com" />
        <link rel="dns-prefetch" href="https://d.basemaps.cartocdn.com" />
        <link
          rel="preconnect"
          href="https://a.basemaps.cartocdn.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://b.basemaps.cartocdn.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="overflow-hidden">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="bottom-right" />
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  )
}
