import type { Metadata } from "next"
import { DefaultHome, HomeSections } from "@/components/home/home-sections"
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/components/seo/json-ld"
import { getHomepageSections, getSettings } from "@/lib/medusa/content"
import { alternates, getLocale, withLocale } from "@/lib/i18n/server"

// Next.js reads this export without running the file, so it has to be a
// literal. Keep it equal to REVALIDATE_SECONDS in lib/config.ts.
export const revalidate = 300

export const generateMetadata = withLocale((): Metadata => ({
  alternates: alternates("/"),
}))

export default withLocale(async function HomePage() {
  const [sections, settings] = await Promise.all([getHomepageSections(), getSettings()])
  return (
    <>
      <JsonLd data={organizationJsonLd(settings)} />
      <JsonLd data={websiteJsonLd(settings, getLocale())} />
      {sections.length ? <HomeSections sections={sections} /> : <DefaultHome />}
    </>
  )
})
