import { DefaultHome, HomeSections } from "@/components/home/home-sections"
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/components/seo/json-ld"
import { REVALIDATE_SECONDS } from "@/lib/config"
import { getHomepageSections, getSettings } from "@/lib/medusa/content"

export const revalidate = REVALIDATE_SECONDS

export default async function HomePage() {
  const [sections, settings] = await Promise.all([getHomepageSections(), getSettings()])
  return (
    <>
      <JsonLd data={organizationJsonLd(settings)} />
      <JsonLd data={websiteJsonLd(settings)} />
      {sections.length ? <HomeSections sections={sections} /> : <DefaultHome />}
    </>
  )
}
