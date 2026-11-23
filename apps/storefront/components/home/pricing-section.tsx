import type {
  StoreHomepageSection,
  StoreServiceGroup,
  StoreServiceItem,
} from "@bonanza/types"
import { BookingLink } from "@/components/ui/booking-link"
import { formatPrice } from "@/lib/format"
import { getT } from "@/lib/i18n/server"

function ServiceRow({ item }: { item: StoreServiceItem }) {
  const t = getT()
  return (
    <li className="flex items-baseline gap-3 py-3.5">
      <span className="min-w-0">
        <span className="block font-medium text-paper">{item.name}</span>
        {(item.description || item.duration_minutes) && (
          <span className="mt-0.5 block text-sm text-mist-400">
            {[
              item.description,
              item.duration_minutes && t.pricing.minutes(item.duration_minutes),
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </span>
      {/* The dotted leader between the service and its price. */}
      <span
        aria-hidden="true"
        className="min-w-6 flex-1 -translate-y-1 border-b border-dotted border-ink-500"
      />
      <span className="shrink-0 whitespace-nowrap text-start font-semibold text-paper">
        {item.price_note && (
          <span className="text-sm font-normal text-mist-300">{item.price_note} </span>
        )}
        {item.price != null && <bdi dir="ltr">{formatPrice(item.price)}</bdi>}
      </span>
    </li>
  )
}

/**
 * The service price list: one card per group, each row a service with a dotted
 * leader to its price. Groups, services and prices are managed in the admin.
 */
export function PricingSection({
  section,
  groups,
  bookingUrl,
}: {
  section: StoreHomepageSection
  groups: StoreServiceGroup[]
  bookingUrl: string | null
}) {
  const t = getT()
  const filled = groups.filter((group) => group.items.length)

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          {section.subtitle && <p className="eyebrow mb-2">{section.subtitle}</p>}
          <h2 className="text-3xl sm:text-4xl">{section.title || t.pricing.title}</h2>
          <p className="mt-3 text-mist-300">{section.body || t.pricing.vatNote}</p>
        </div>
        {/* The section's own button when one is set in the admin; otherwise booking. */}
        <BookingLink
          href={section.cta?.url ?? bookingUrl}
          label={section.cta?.label ?? t.booking.ctaOnline}
          icon
        />
      </div>

      {filled.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filled.map((group) => (
            <section
              key={group.id}
              aria-labelledby={`services-${group.id}`}
              className="rounded-xl border border-ink-600/80 bg-ink-850 p-6 shadow-card sm:p-7"
            >
              <h3 id={`services-${group.id}`} className="text-xl font-bold">
                {group.title}
              </h3>
              {group.note && <p className="mt-1 text-sm text-mist-400">{group.note}</p>}
              <ul className="mt-3 divide-y divide-ink-700">
                {group.items.map((item) => (
                  <ServiceRow key={item.id} item={item} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-ink-600 p-8 text-center text-mist-300">
          {t.pricing.empty}
        </p>
      )}
    </>
  )
}
