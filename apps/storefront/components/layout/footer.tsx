import type { StoreNavigationItem, StoreSiteSettings } from "@bonanza/types"
import { BookingLink } from "@/components/ui/booking-link"
import {
  ExternalIcon,
  InstagramIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  WhatsAppIcon,
} from "@/components/ui/icons"
import { Link } from "@/components/ui/link"
import { formatIsraeliPhone } from "@/lib/format"
import { getT } from "@/lib/i18n/server"
import { mapEmbedUrl, mapLinkUrl, parseOpeningHours, whatsappUrl } from "@/lib/site"
import { Logo } from "./logo"

const OTHER_SOCIAL: {
  key: "facebook_url" | "tiktok_url" | "youtube_url"
  label: string
}[] = [
  { key: "facebook_url", label: "Facebook" },
  { key: "tiktok_url", label: "TikTok" },
  { key: "youtube_url", label: "YouTube" },
]

const contactLink =
  "inline-flex items-center gap-3 text-[0.95rem] text-mist-200 transition hover:text-paper"
const columnTitle = "mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-mist-400"

/**
 * The footer doubles as the contact section (`#contact`): how to reach the
 * shop, when it is open and where it is, then the site links.
 */
export function Footer({
  navigation,
  settings,
}: {
  navigation: StoreNavigationItem[]
  settings: StoreSiteSettings
}) {
  const t = getT()
  const hours = parseOpeningHours(settings.opening_hours)
  const whatsapp = whatsappUrl(
    settings.contact_whatsapp || settings.contact_phone,
    t.contact.whatsappMessage
  )
  const map = mapEmbedUrl(settings)
  const mapLink = mapLinkUrl(settings)
  const social = OTHER_SOCIAL.filter(({ key }) => settings[key])

  return (
    <footer
      id="contact"
      className="mt-24 scroll-mt-24 border-t border-ink-700 bg-ink-900"
    >
      <div className="container-site grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1.25fr]">
        <div>
          <Logo className="h-16 w-auto" />
          <h2 className={`${columnTitle} mt-8`}>{t.footer.contact}</h2>
          <ul className="space-y-3.5">
            {settings.contact_phone && (
              <li>
                <a href={`tel:${settings.contact_phone}`} className={contactLink}>
                  <PhoneIcon className="size-5 shrink-0 text-mist-400" />
                  <bdi dir="ltr">{formatIsraeliPhone(settings.contact_phone)}</bdi>
                </a>
              </li>
            )}
            {whatsapp && (
              <li>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={contactLink}
                >
                  <WhatsAppIcon className="size-5 shrink-0 text-mist-400" />
                  {t.contact.whatsapp}
                </a>
              </li>
            )}
            {settings.instagram_url && (
              <li>
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={contactLink}
                >
                  <InstagramIcon className="size-5 shrink-0 text-mist-400" />
                  {t.contact.instagram}
                </a>
              </li>
            )}
            {settings.contact_email && (
              <li>
                <a href={`mailto:${settings.contact_email}`} className={contactLink}>
                  <MailIcon className="size-5 shrink-0 text-mist-400" />
                  <bdi dir="ltr">{settings.contact_email}</bdi>
                </a>
              </li>
            )}
          </ul>
          {social.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-mist-300">
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
          )}
        </div>

        <div>
          <h2 className={columnTitle}>{t.contact.hours}</h2>
          {hours.length > 0 && (
            <dl className="mb-7 divide-y divide-ink-700 border-y border-ink-700 text-[0.95rem]">
              {hours.map((row, index) => (
                <div
                  key={index}
                  className="flex items-baseline justify-between gap-6 py-3"
                >
                  <dt className="text-mist-200">{row.days}</dt>
                  {row.hours && (
                    <dd className="font-medium text-paper">
                      <bdi>{row.hours}</bdi>
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          )}
          <BookingLink href={settings.booking_url} label={t.booking.ctaOnline} icon />
        </div>

        <div className="md:col-span-2 lg:col-span-1">
          <h2 className={columnTitle}>{t.contact.location}</h2>
          {settings.address && (
            <address className="mb-4 flex items-start gap-3 text-[0.95rem] not-italic text-mist-200">
              <MapPinIcon className="mt-0.5 size-5 shrink-0 text-mist-400" />
              <span className="whitespace-pre-line">{settings.address}</span>
            </address>
          )}
          {map && (
            <div className="overflow-hidden rounded-lg border border-ink-600 bg-ink-850">
              <iframe
                src={map}
                title={t.contact.mapTitle}
                loading="lazy"
                // Google is never told which page the map sits on: some
                // addresses carry a password-reset token or an order id.
                referrerPolicy="no-referrer"
                allowFullScreen
                // Tints Google's light map to sit in the dark page.
                className="block h-60 w-full border-0 [filter:grayscale(1)_invert(0.92)_contrast(0.9)]"
              />
            </div>
          )}
          {mapLink && (
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-mist-200 underline-offset-4 hover:text-paper hover:underline"
            >
              {t.contact.openInMaps}
              <ExternalIcon className="size-4" />
            </a>
          )}
        </div>
      </div>

      {navigation.length > 0 && (
        <div className="border-t border-ink-700">
          <nav
            aria-label={t.nav.footer}
            className="container-site grid grid-cols-2 gap-8 py-10 sm:grid-cols-3 lg:grid-cols-4"
          >
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
      )}

      <div className="border-t border-ink-700">
        {/* Extra room at the bottom so the floating buttons never cover this line. */}
        <div className="container-site flex flex-col items-center justify-between gap-3 pb-20 pt-5 text-xs text-mist-400 sm:flex-row sm:px-56 sm:pb-5">
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
