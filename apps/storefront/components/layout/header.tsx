import type { StoreNavigationItem, StoreSiteSettings } from "@bonanza/types"
import { BookingLink } from "@/components/ui/booking-link"
import { getT } from "@/lib/i18n/server"
import { HeaderActions } from "./header-actions"
import { DesktopNav, MobileNav } from "./header-nav"
import { LanguageSwitcher } from "./language-switcher"
import { Logo } from "./logo"

export function Header({
  navigation,
  settings,
}: {
  navigation: StoreNavigationItem[]
  settings: Pick<StoreSiteSettings, "booking_url">
}) {
  const t = getT()
  // Shown if no menu has been set up in the admin yet.
  const fallback: StoreNavigationItem[] = [
    {
      id: "all",
      label: t.nav.allProducts,
      url: "/products",
      link_type: "custom",
      open_in_new_tab: false,
      children: [],
    },
  ]
  const items = navigation.length ? navigation : fallback

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/80 bg-ink-950/85 backdrop-blur-md">
      <div className="container-site relative flex h-17 items-center justify-between gap-3 xl:h-24">
        <div className="flex items-center gap-2">
          <MobileNav items={items} bookingUrl={settings.booking_url} />
          <Logo priority className="h-11 w-auto xl:h-16" />
        </div>
        <DesktopNav items={items} />
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <LanguageSwitcher className="hidden xl:inline-flex" />
          <HeaderActions />
          <BookingLink
            href={settings.booking_url}
            size="sm"
            className="sm:h-11 sm:px-6 sm:text-[0.95rem]"
          />
        </div>
      </div>
    </header>
  )
}
