import type { StoreNavigationItem } from "@bonanza/types"
import { t } from "@/lib/i18n"
import { HeaderActions } from "./header-actions"
import { DesktopNav, MobileNav } from "./header-nav"
import { Logo } from "./logo"

/** Shown if no menu has been set up in the admin yet. */
const FALLBACK_NAV: StoreNavigationItem[] = [
  {
    id: "all",
    label: t.nav.allProducts,
    url: "/products",
    link_type: "custom",
    open_in_new_tab: false,
    children: [],
  },
]

export function Header({ navigation }: { navigation: StoreNavigationItem[] }) {
  const items = navigation.length ? navigation : FALLBACK_NAV
  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/80 bg-ink-950/85 backdrop-blur-md">
      <div className="container-site relative flex h-17 items-center justify-between gap-4 lg:h-24">
        <div className="flex items-center gap-2">
          <MobileNav items={items} />
          <Logo priority className="h-11 w-auto lg:h-16" />
        </div>
        <DesktopNav items={items} />
        <HeaderActions />
      </div>
    </header>
  )
}
