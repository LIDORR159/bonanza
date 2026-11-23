import type { Metadata, Viewport } from "next"
import { Frank_Ruhl_Libre, Heebo } from "next/font/google"
import type { ReactNode } from "react"
import { ALLOW_INDEXING, DEFAULT_LOCALE, LOCALE_SETTINGS, SITE_URL } from "@/lib/config"
import { getSettings } from "@/lib/medusa/content"
import "./globals.css"

// Both faces cover Hebrew and Latin, and are downloaded at build time and
// served from this site: no request leaves for a font host.
const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
})
const frank = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-frank",
  display: "swap",
})

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: settings.default_meta_title,
      template: settings.title_template,
    },
    description: settings.default_meta_description ?? undefined,
    applicationName: settings.store_name,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: settings.store_name,
      locale: "he_IL",
      images: [settings.default_og_image_url || "/brand/og-default.jpg"],
    },
    twitter: { card: "summary_large_image" },
    // Temporary URLs stay out of search engines until the real domain is live.
    robots: ALLOW_INDEXING ? { index: true, follow: true } : { index: false, follow: false },
    formatDetection: { telephone: false },
  }
}

export const viewport: Viewport = {
  themeColor: "#0b0c0d",
  colorScheme: "dark",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const { dir } = LOCALE_SETTINGS[DEFAULT_LOCALE]
  return (
    <html lang={DEFAULT_LOCALE} dir={dir} className={`${heebo.variable} ${frank.variable}`}>
      <body>{children}</body>
    </html>
  )
}
