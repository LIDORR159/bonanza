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
  "opening_hours", "instagram_url", "facebook_url", "tiktok_url", "youtube_url",
  "newsletter_enabled", "free_shipping_threshold",
] as const

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
    { name: "opening_hours", label: s("openingHours"), type: "textarea" },
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
            save.mutate({ data: clean(pick(values, SAVED_FIELDS)) })
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
