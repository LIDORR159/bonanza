import type { Metadata } from "next"
import Image from "next/image"
import { GalleryGrid } from "@/components/home/gallery-grid"
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld"
import { BookingLink } from "@/components/ui/booking-link"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { InstagramIcon } from "@/components/ui/icons"
import { alternates, getT, withLocale } from "@/lib/i18n/server"
import { getGalleryItems, getSettings, getTeamMembers } from "@/lib/medusa/content"

export const generateMetadata = withLocale((): Metadata => {
  const t = getT()
  return {
    title: t.gallery.title,
    description: t.gallery.metaDescription,
    alternates: alternates("/gallery"),
  }
})

/** The works page: every published photograph, then the barbers and their Instagram pages. */
export default withLocale(async function GalleryPage() {
  const t = getT()
  const [items, team, settings] = await Promise.all([
    getGalleryItems({ limit: 60 }),
    getTeamMembers(),
    getSettings(),
  ])
  const crumbs = [{ name: t.gallery.title, path: "/gallery" }]

  return (
    <div className="container-site py-10 lg:py-14">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />

      <header className="mb-9 mt-4 max-w-2xl">
        <h1 className="text-4xl sm:text-5xl">{t.gallery.title}</h1>
        <p className="mt-3 text-lg text-mist-300">{t.gallery.subtitle}</p>
      </header>

      {items.length ? (
        <GalleryGrid
          items={items}
          columns="grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 48vw"
          captions
        />
      ) : (
        <p className="rounded-xl border border-dashed border-ink-600 p-10 text-center text-mist-300">
          {t.gallery.empty}
        </p>
      )}

      {team.length > 0 && (
        <section aria-labelledby="team-title" className="mt-20 lg:mt-24">
          <h2 id="team-title" className="text-3xl sm:text-4xl">
            {t.gallery.teamTitle}
          </h2>
          <p className="mt-2 text-mist-300">{t.gallery.teamSubtitle}</p>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((member) => (
              <li
                key={member.id}
                className="flex items-center gap-5 rounded-xl border border-ink-600/80 bg-ink-850 p-5 shadow-card"
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-full border border-ink-500 bg-ink-700">
                  {member.photo_url ? (
                    <Image
                      src={member.photo_url}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex size-full items-center justify-center text-2xl font-black text-mist-200"
                    >
                      {member.name.trim().charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold">{member.name}</h3>
                  {member.role && <p className="text-sm text-mist-300">{member.role}</p>}
                  {member.instagram_url && (
                    <a
                      href={member.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t.gallery.instagramOf(member.name)}
                      className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-ink-500 px-3.5 text-sm font-semibold text-paper transition hover:border-paper hover:bg-white/5"
                    >
                      <InstagramIcon className="size-4.5" />
                      {t.gallery.instagram}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {settings.booking_url && (
        <section className="mt-20 flex flex-wrap items-center justify-between gap-6 rounded-xl border border-ink-600/80 bg-ink-850 p-7 sm:p-10 lg:mt-24">
          <div>
            <h2 className="text-2xl sm:text-3xl">{t.gallery.bookTitle}</h2>
            <p className="mt-2 text-mist-300">{t.gallery.bookBody}</p>
          </div>
          <BookingLink
            href={settings.booking_url}
            label={t.booking.ctaOnline}
            size="lg"
            icon
          />
        </section>
      )}
    </div>
  )
})
