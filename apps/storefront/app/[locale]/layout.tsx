import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { CartProvider } from "@/components/cart/cart-context"
import { AnnouncementBar } from "@/components/layout/announcement-bar"
import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"
import { PreviewBar } from "@/components/layout/preview-bar"
import { isLocale } from "@/lib/config"
import { t } from "@/lib/i18n"
import { getBanners, getNavigation, getSettings, isPreviewing } from "@/lib/medusa/content"

/**
 * No pages are built ahead of time: each is rendered on its first request and
 * then cached. The build therefore needs no running backend.
 */
export function generateStaticParams() {
  return []
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) {
    notFound()
  }

  const [navigation, settings, announcements, previewing] = await Promise.all([
    getNavigation(),
    getSettings(),
    getBanners("announcement"),
    isPreviewing(),
  ])

  return (
    <CartProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-paper focus:px-4 focus:py-2 focus:font-semibold focus:text-ink-950"
      >
        {t.common.skipToContent}
      </a>
      {previewing && <PreviewBar />}
      <AnnouncementBar banner={announcements[0]} />
      <Header navigation={navigation.header} />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <Footer navigation={navigation.footer} settings={settings} />
    </CartProvider>
  )
}
