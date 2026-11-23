import type { Metadata, Viewport } from "next"
import { Frank_Ruhl_Libre, Heebo, Noto_Sans_Arabic } from "next/font/google"
import type { ReactNode } from "react"
import { CartProvider } from "@/components/cart/cart-context"
import { LocaleProvider } from "@/components/i18n/locale-provider"
import { AnnouncementBar } from "@/components/layout/announcement-bar"
import { FloatingActions } from "@/components/layout/floating-actions"
import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"
import { PreviewBar } from "@/components/layout/preview-bar"
import { ALLOW_INDEXING, LOCALE_SETTINGS, SITE_URL } from "@/lib/config"
import { getLocale, getT, withLocale } from "@/lib/i18n/server"
import {
  getBanners,
  getNavigation,
  getSettings,
  isPreviewing,
} from "@/lib/medusa/content"
import "../globals.css"

// Heebo and Frank Ruhl Libre cover Hebrew and Latin; Noto Sans Arabic covers
// Arabic. All three are downloaded at build time and served from this site, so
// no request leaves for a font host. The browser only fetches the Arabic file
// on a page that actually contains Arabic text.
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
const arabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
})

/**
 * Re-applies a returning visitor's accessibility choices before the first
 * paint, so the page does not flash from the defaults. Mirrors `apply` in
 * components/layout/floating-actions.tsx.
 */
const A11Y_BOOTSTRAP = `try{var p=JSON.parse(localStorage.getItem("bnz_a11y")||"{}"),d=document.documentElement.dataset;if(p.text>0)d.a11yText=String(p.text);if(p.contrast)d.a11yContrast="on";if(p.links)d.a11yLinks="on";if(p.motion)d.a11yMotion="off"}catch(e){}`

/**
 * No pages are built ahead of time: each is rendered on its first request and
 * then cached. The build therefore needs no running backend.
 */
export function generateStaticParams() {
  return []
}

type Props = { children: ReactNode; params: Promise<{ locale: string }> }

export const generateMetadata = withLocale(
  async function generateMetadata(): Promise<Metadata> {
    const locale = getLocale()
    const settings = await getSettings()
    return {
      metadataBase: new URL(SITE_URL),
      title: {
        default: settings.default_meta_title,
        template: settings.title_template,
      },
      description: settings.default_meta_description ?? undefined,
      applicationName: settings.store_name,
      openGraph: {
        type: "website",
        siteName: settings.store_name,
        locale: LOCALE_SETTINGS[locale].og,
        images: [settings.default_og_image_url || "/brand/og-default.jpg"],
      },
      twitter: { card: "summary_large_image" },
      // Temporary URLs stay out of search engines until the real domain is live.
      robots: ALLOW_INDEXING
        ? { index: true, follow: true }
        : { index: false, follow: false },
      formatDetection: { telephone: false },
    }
  }
)

export const viewport: Viewport = {
  themeColor: "#0b0c0d",
  colorScheme: "dark",
}

export default withLocale(async function LocaleLayout({ children }: Props) {
  const locale = getLocale()
  const t = getT()
  const [navigation, settings, announcements, previewing] = await Promise.all([
    getNavigation(),
    getSettings(),
    getBanners("announcement"),
    isPreviewing(),
  ])

  return (
    <html
      lang={locale}
      dir={LOCALE_SETTINGS[locale].dir}
      className={`${heebo.variable} ${frank.variable} ${arabic.variable}`}
      // The script below adds data attributes to this element before React loads.
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOTSTRAP }} />
        <LocaleProvider locale={locale}>
          <CartProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-paper focus:px-4 focus:py-2 focus:font-semibold focus:text-ink-950"
            >
              {t.common.skipToContent}
            </a>
            {previewing && <PreviewBar />}
            <AnnouncementBar banner={announcements[0]} />
            <Header navigation={navigation.header} settings={settings} />
            <main id="main" tabIndex={-1} className="focus:outline-none">
              {children}
            </main>
            <Footer navigation={navigation.footer} settings={settings} />
            <FloatingActions settings={settings} />
          </CartProvider>
        </LocaleProvider>
      </body>
    </html>
  )
})
