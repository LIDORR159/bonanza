import type { StoreNavigationItem, StoreSiteSettings } from "@bonanza/types"
import Link from "next/link"
import { LockIcon } from "@/components/ui/icons"
import { formatIsraeliPhone } from "@/lib/format"
import { t } from "@/lib/i18n"
import { Logo } from "./logo"

const SOCIAL: { key: keyof StoreSiteSettings; label: string }[] = [
  { key: "instagram_url", label: "Instagram" },
  { key: "facebook_url", label: "Facebook" },
  { key: "tiktok_url", label: "TikTok" },
  { key: "youtube_url", label: "YouTube" },
]

export function Footer({
  navigation,
  settings,
}: {
  navigation: StoreNavigationItem[]
  settings: StoreSiteSettings
}) {
  const social = SOCIAL.filter(({ key }) => settings[key])
  const hasContact =
    settings.contact_phone || settings.contact_email || settings.address || settings.opening_hours

  return (
    <footer className="mt-24 border-t border-ink-700 bg-ink-900">
      <div className="container-site grid gap-12 py-14 lg:grid-cols-[1.3fr_2fr]">
        <div>
          <Logo className="h-16 w-auto" />
          {hasContact && (
            <address className="mt-7 space-y-1.5 text-sm not-italic leading-relaxed text-mist-300">
              <p className="mb-2 font-semibold text-paper">{t.footer.contact}</p>
              {settings.address && <p className="whitespace-pre-line">{settings.address}</p>}
              {settings.opening_hours && (
                <p className="whitespace-pre-line">{settings.opening_hours}</p>
              )}
              {settings.contact_phone && (
                <p>
                  <a href={`tel:${settings.contact_phone}`} className="hover:text-paper">
                    <bdi dir="ltr">{formatIsraeliPhone(settings.contact_phone)}</bdi>
                  </a>
                </p>
              )}
              {settings.contact_email && (
                <p>
                  <a href={`mailto:${settings.contact_email}`} className="hover:text-paper">
                    <bdi dir="ltr">{settings.contact_email}</bdi>
                  </a>
                </p>
              )}
            </address>
          )}
          {social.length > 0 && (
            <div className="mt-7">
              <p className="mb-2 text-sm font-semibold text-paper">{t.footer.followUs}</p>
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-mist-300">
                {social.map(({ key, label }) => (
                  <li key={key}>
                    <a
                      href={String(settings[key])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-paper"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <nav aria-label={t.nav.footer} className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {navigation.map((group) => (
            <div key={group.id}>
              <h2 className="mb-3.5 text-sm font-semibold text-paper">{group.label}</h2>
              <ul className="space-y-2.5 text-sm text-mist-300">
                {group.children.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.url}
                      className="underline-offset-4 hover:text-paper hover:underline"
                      {...(item.open_in_new_tab
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-ink-700">
        <div className="container-site flex flex-col items-center justify-between gap-3 py-5 text-xs text-mist-400 sm:flex-row">
          <p>{t.footer.rights(new Date().getFullYear())}</p>
          <p className="inline-flex items-center gap-1.5">
            <LockIcon className="size-4" />
            {t.footer.secureNote}
          </p>
        </div>
      </div>
    </footer>
  )
}
