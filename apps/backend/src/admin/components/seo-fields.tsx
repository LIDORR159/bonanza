import { Button, Container, Heading, Text } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { FormFields, type FieldSpec } from "./record-form"

/**
 * Search-engine fields kept in a record's `metadata`: title, description,
 * sharing image and whether to leave the page out of the sitemap. Used on the
 * product and the category pages; the storefront reads the same keys.
 */
export const SeoFields = ({
  metadata,
  onSave,
  saving,
}: {
  metadata: Record<string, unknown> | null | undefined
  onSave: (metadata: Record<string, unknown>) => void
  saving: boolean
}) => {
  const { t } = useTranslation()
  const [values, setValues] = useState<Record<string, any>>({
    seo_title: metadata?.seo_title ?? "",
    seo_description: metadata?.seo_description ?? "",
    seo_og_image: metadata?.seo_og_image ?? "",
    seo_exclude_from_sitemap: metadata?.seo_exclude_from_sitemap === "true",
  })

  const fields: FieldSpec[] = [
    { name: "seo_title", label: t("bonanza.fields.metaTitle") },
    { name: "seo_description", label: t("bonanza.fields.metaDescription"), type: "textarea" },
    { name: "seo_og_image", label: t("bonanza.fields.ogImage"), type: "image" },
    { name: "seo_exclude_from_sitemap", label: t("bonanza.seo.excludeFromSitemap"), type: "switch" },
  ]

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("bonanza.seo.widgetTitle")}</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          {t("bonanza.seo.description")}
        </Text>
      </div>
      <form
        className="flex flex-col gap-5 px-6 py-4"
        onSubmit={(event) => {
          event.preventDefault()
          // Metadata values are strings. An empty string removes the key.
          onSave({
            ...(metadata ?? {}),
            seo_title: values.seo_title || "",
            seo_description: values.seo_description || "",
            seo_og_image: values.seo_og_image || "",
            seo_exclude_from_sitemap: values.seo_exclude_from_sitemap ? "true" : "",
          })
        }}
      >
        <FormFields
          fields={fields}
          values={values}
          onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))}
        />
        <div>
          <Button type="submit" size="small" variant="secondary" isLoading={saving}>
            {t("bonanza.common.save")}
          </Button>
        </div>
      </form>
    </Container>
  )
}
