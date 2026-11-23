import type { StoreSiteSettings } from "@bonanza/types"
import type { ReactNode } from "react"
import { ClockIcon, MapPinIcon, PhoneIcon } from "@/components/ui/icons"
import { formatIsraeliPhone } from "@/lib/format"
import { getT } from "@/lib/i18n/server"
import { mapLinkUrl, parseOpeningHours } from "@/lib/site"

function Fact({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-3.5 px-1 py-5 sm:px-6">
      <span className="mt-0.5 text-mist-400">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-mist-400">
          {label}
        </dt>
        <dd className="mt-1 text-[0.95rem] font-medium leading-snug text-paper">
          {children}
        </dd>
      </div>
    </div>
  )
}

/**
 * Opening hours, address and phone in one thin band under the hero. Each fact
 * appears once it has been filled in in site settings; with none, the band is
 * not rendered at all.
 */
export function InfoStrip({ settings }: { settings: StoreSiteSettings }) {
  const t = getT()
  const hours = parseOpeningHours(settings.opening_hours).filter((row) => row.hours)
  const mapLink = mapLinkUrl(settings)
  if (!hours.length && !settings.address && !settings.contact_phone) {
    return null
  }

  return (
    <section aria-label={t.footer.contact} className="border-y border-ink-700 bg-ink-900">
      <dl className="container-site grid divide-y divide-ink-700 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {hours.length > 0 && (
          <Fact icon={<ClockIcon className="size-5" />} label={t.info.hours}>
            {hours.slice(0, 2).map((row, index) => (
              <span key={index} className="block">
                {row.days} <bdi className="text-mist-200">{row.hours}</bdi>
              </span>
            ))}
          </Fact>
        )}
        {settings.address && (
          <Fact icon={<MapPinIcon className="size-5" />} label={t.info.address}>
            {mapLink ? (
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:underline"
              >
                {settings.address}
              </a>
            ) : (
              settings.address
            )}
          </Fact>
        )}
        {settings.contact_phone && (
          <Fact icon={<PhoneIcon className="size-5" />} label={t.info.phone}>
            <a
              href={`tel:${settings.contact_phone}`}
              className="underline-offset-4 hover:underline"
            >
              <bdi dir="ltr">{formatIsraeliPhone(settings.contact_phone)}</bdi>
            </a>
          </Fact>
        )}
      </dl>
    </section>
  )
}
