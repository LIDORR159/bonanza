import { clx } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { NavLink } from "react-router-dom"

const TABS = [
  { to: "/content", key: "homepage", end: true },
  { to: "/content/services", key: "services" },
  { to: "/content/gallery", key: "gallery" },
  { to: "/content/team", key: "team" },
  { to: "/content/reviews", key: "reviews" },
  { to: "/content/banners", key: "banners" },
  { to: "/content/pages", key: "pages" },
  { to: "/content/navigation", key: "navigation" },
  { to: "/content/settings", key: "settings" },
  // Medusa's own screen: English and Arabic text for everything above.
  { to: "/settings/translations", key: "translations" },
] as const

/** The row of links shared by every "Site content" screen. */
export const ContentTabs = () => {
  const { t } = useTranslation()
  return (
    <nav className="border-ui-border-base mb-3 flex flex-wrap gap-1 border-b pb-3">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={"end" in tab ? tab.end : false}
          className={({ isActive }) =>
            clx(
              "txt-compact-small-plus rounded-md px-3 py-1.5 transition-colors",
              isActive
                ? "bg-ui-bg-base text-ui-fg-base shadow-elevation-card-rest"
                : "text-ui-fg-subtle hover:text-ui-fg-base"
            )
          }
        >
          {t(`bonanza.tabs.${tab.key}`)}
        </NavLink>
      ))}
    </nav>
  )
}
