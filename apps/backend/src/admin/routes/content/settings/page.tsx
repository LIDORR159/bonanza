import { Button, Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { ContentTabs } from "../../../components/content-tabs"
import { FormFields, type FieldSpec } from "../../../components/record-form"
import { clean, useSave } from "../../../lib/api"
import { pick } from "../../../lib/options"
import { sdk } from "../../../lib/sdk"

const PATH = "/admin/cms/settings"
const SAVED_FIELDS = [
  "store_name", "tagline", "title_template", "default_meta_title", "default_meta_description",
  "default_og_image_url", "contact_phone", "contact_whatsapp", "contact_email", "address",
  "opening_hours", "booking_url", "map_embed_url", "map_link_url", "google_reviews_url",
  "google_rating", "google_review_count", "instagram_url", "facebook_url", "tiktok_url",
  "youtube_url", "newsletter_enabled", "free_shipping_threshold",
] as const

/**
 * Google Maps hands out a whole `<iframe>` snippet. Only its `src` address is
 * stored, so a pasted snippet is reduced to that.
 */
const embedSrc = (value: unknown) => {
  if (typeof value !== "string") {
    return value
  }
  const match = value.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i)
  return match ? match[1] : value
}

const DEFAULTS = {
  store_name: "BONANZA",
  title_template: "%s | BONANZA",
  default_meta_title: "BONANZA",
  newsletter_enabled: true,
}

const SiteSettingsPage = () => {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: [PATH],
    queryFn: () => sdk.client.fetch<{ settings: Record<string, any> | null }>(PATH),
  })
  const save = useSave(PATH, t("bonanza.common.saved"))
  const [values, setValues] = useState<Record<string, any>>(DEFAULTS)

  useEffect(() => {
    if (data?.settings) {
      setValues(data.settings)
    }
  }, [data])

  const s = (key: string) => t(`bonanza.settings.${key}`)
  const fields: FieldSpec[] = [
    { name: "store_name", label: s("storeName"), required: true },
    { name: "tagline", label: s("tagline") },
    { name: "title_template", label: s("titleTemplate"), hint: s("titleTemplateHint"), ltr: true, required: true },
    { name: "default_meta_title", label: s("defaultMetaTitle"), required: true },
    { name: "default_meta_description", label: s("defaultMetaDescription"), type: "textarea" },
    { name: "default_og_image_url", label: s("defaultOgImage"), type: "image" },
    { name: "contact_phone", label: s("contactPhone"), ltr: true },
    { name: "contact_whatsapp", label: s("contactWhatsapp"), ltr: true },
    { name: "contact_email", label: s("contactEmail"), ltr: true },
    { name: "address", label: s("address"), type: "textarea" },
    { name: "opening_hours", label: s("openingHours"), hint: s("openingHoursHint"), type: "textarea" },
    { name: "booking_url", label: s("bookingUrl"), hint: s("bookingUrlHint"), type: "url" },
    { name: "map_embed_url", label: s("mapEmbedUrl"), hint: s("mapEmbedUrlHint"), type: "url" },
    { name: "map_link_url", label: s("mapLinkUrl"), hint: s("mapLinkUrlHint"), type: "url" },
    { name: "google_reviews_url", label: s("googleReviewsUrl"), hint: s("googleReviewsUrlHint"), type: "url" },
    { name: "google_rating", label: s("googleRating"), hint: s("googleRatingHint"), type: "number" },
    { name: "google_review_count", label: s("googleReviewCount"), type: "number" },
    { name: "instagram_url", label: "Instagram", type: "url" },
    { name: "facebook_url", label: "Facebook", type: "url" },
    { name: "tiktok_url", label: "TikTok", type: "url" },
    { name: "youtube_url", label: "YouTube", type: "url" },
    { name: "newsletter_enabled", label: s("newsletterEnabled"), type: "switch" },
    { name: "free_shipping_threshold", label: s("freeShippingThreshold"), hint: s("freeShippingHint"), type: "number" },
  ]

  return (
    <div className="flex flex-col gap-3">
      <ContentTabs />
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h1">{s("heading")}</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {s("description")}
          </Text>
        </div>
        <form
          className="flex max-w-2xl flex-col gap-6 px-6 py-6"
          onSubmit={(event) => {
            event.preventDefault()
            const data = clean(pick(values, SAVED_FIELDS))
            save.mutate({ data: { ...data, map_embed_url: embedSrc(data.map_embed_url) } })
          }}
        >
          <FormFields
            fields={fields}
            values={values}
            onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))}
          />
          <div>
            <Button type="submit" isLoading={save.isPending} disabled={isLoading}>
              {t("bonanza.common.save")}
            </Button>
          </div>
        </form>
      </Container>
    </div>
  )
}

export default SiteSettingsPage
