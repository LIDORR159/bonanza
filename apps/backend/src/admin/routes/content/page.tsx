import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { StatusBadge, Switch, Table } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ContentTabs } from "../../components/content-tabs"
import { EmptyRow, ListShell, moved, RowActions } from "../../components/list-shell"
import { RecordDrawer, type FieldSpec } from "../../components/record-form"
import { clean, useList, useRemove, useReorder, useSave, type Row } from "../../lib/api"
import {
  BANNER_PLACEMENTS,
  pick,
  PRODUCT_SOURCES,
  publishState,
  SECTION_TYPES,
  STATE_COLOR,
} from "../../lib/options"

const PATH = "/admin/cms/sections"
const SAVED_FIELDS = [
  "type", "key", "title", "subtitle", "body", "image_url", "mobile_image_url", "image_alt",
  "cta_label", "cta_url", "secondary_cta_label", "secondary_cta_url", "is_visible", "status",
  "publish_at",
] as const

const has = (types: string[]) => (values: Record<string, any>) => types.includes(values.type)
const SOURCES_WITH_ID = ["tag", "category", "collection", "brand"]

/** The stored `settings` object, flattened into form fields. */
const toForm = (section: Row | Record<string, any>) => ({
  status: "draft",
  is_visible: true,
  type: "product_rail",
  ...section,
  source_type: section.settings?.product_source?.type ?? "newest",
  source_id: section.settings?.product_source?.id ?? "",
  limit: section.settings?.limit ?? null,
  banner_placement: section.settings?.banner_placement ?? "home_primary",
})

/** Form fields back into the `settings` shape the section's type uses. */
const toSettings = (values: Record<string, any>) => {
  const limit = values.limit ? { limit: Number(values.limit) } : {}
  switch (values.type) {
    case "product_rail":
      return {
        ...limit,
        product_source: SOURCES_WITH_ID.includes(values.source_type)
          ? { type: values.source_type, id: values.source_id }
          : { type: values.source_type },
      }
    case "banner_slot":
      return { banner_placement: values.banner_placement }
    case "categories":
    case "brands":
      return limit
    default:
      return {}
  }
}

const HomepageSectionsPage = () => {
  const { t } = useTranslation()
  const { data, isLoading } = useList(PATH, "sections")
  const save = useSave(PATH, t("bonanza.common.saved"))
  const remove = useRemove(PATH, t("bonanza.common.deleted"))
  const reorder = useReorder(PATH, "/admin/cms/section-order")
  const [editing, setEditing] = useState<Record<string, any> | null>(null)

  // What a product row can take its products from.
  const collections = useList("/admin/collections", "collections", { limit: 200, fields: "id,title" })
  const categories = useList("/admin/product-categories", "product_categories", { limit: 200, fields: "id,name" })
  const tags = useList("/admin/product-tags", "product_tags", { limit: 200, fields: "id,value" })
  const brands = useList("/admin/brands", "brands", { limit: 200 })

  const sourceOptions = (type: string) => {
    const rows =
      type === "collection" ? collections.data?.rows
      : type === "category" ? categories.data?.rows
      : type === "tag" ? tags.data?.rows
      : brands.data?.rows
    return (rows ?? []).map((row) => ({
      value: row.id,
      label: String(row.title ?? row.name ?? row.value ?? row.id),
    }))
  }

  const rows = data?.rows ?? []
  const ids = rows.map((row) => row.id)
  const urlHint = t("bonanza.fields.urlHint")
  const withText = has(["hero", "product_rail", "categories", "brands", "academy", "editorial", "newsletter"])

  const fields: FieldSpec[] = [
    {
      name: "type", label: t("bonanza.fields.type"), type: "select", required: true,
      options: SECTION_TYPES.map((type) => ({ value: type, label: t(`bonanza.sections.types.${type}`) })),
    },
    { name: "key", label: t("bonanza.fields.key"), hint: t("bonanza.fields.keyHint"), required: true, ltr: true },
    { name: "title", label: t("bonanza.fields.title"), when: withText },
    { name: "subtitle", label: t("bonanza.fields.subtitle"), when: has(["hero", "academy", "editorial", "newsletter"]) },
    { name: "body", label: t("bonanza.fields.body"), type: "textarea", when: has(["academy", "editorial"]) },
    { name: "image_url", label: t("bonanza.fields.image"), type: "image", when: has(["hero", "academy"]) },
    { name: "image_alt", label: t("bonanza.fields.imageAlt"), hint: t("bonanza.fields.imageAltHint"), when: has(["hero", "academy"]) },
    { name: "cta_label", label: t("bonanza.fields.ctaLabel"), when: has(["hero", "product_rail", "categories", "brands", "academy"]) },
    { name: "cta_url", label: t("bonanza.fields.ctaUrl"), type: "url", hint: urlHint, when: has(["hero", "product_rail", "categories", "brands", "academy"]) },
    { name: "secondary_cta_label", label: t("bonanza.fields.secondaryCtaLabel"), when: has(["hero"]) },
    { name: "secondary_cta_url", label: t("bonanza.fields.secondaryCtaUrl"), type: "url", when: has(["hero"]) },
    {
      name: "source_type", label: t("bonanza.fields.productSource"), type: "select", when: has(["product_rail"]),
      options: PRODUCT_SOURCES.map((source) => ({ value: source, label: t(`bonanza.sections.sources.${source}`) })),
    },
    {
      name: "source_id", label: t("bonanza.fields.linkRef"), type: "select",
      options: (values) => sourceOptions(values.source_type),
      when: (current) => current.type === "product_rail" && SOURCES_WITH_ID.includes(current.source_type),
    },
    { name: "limit", label: t("bonanza.fields.limit"), type: "number", when: has(["product_rail", "categories", "brands"]) },
    {
      name: "banner_placement", label: t("bonanza.fields.bannerPlacement"), type: "select", when: has(["banner_slot"]),
      options: BANNER_PLACEMENTS.map((placement) => ({ value: placement, label: t(`bonanza.banners.placements.${placement}`) })),
    },
    { name: "is_visible", label: t("bonanza.fields.isVisible"), type: "switch" },
    {
      name: "status", label: t("bonanza.common.status"), type: "select",
      options: [
        { value: "draft", label: t("bonanza.common.draft") },
        { value: "published", label: t("bonanza.common.published") },
      ],
    },
    { name: "publish_at", label: t("bonanza.fields.publishAt"), type: "datetime", hint: t("bonanza.fields.publishAtHint"), when: (current) => current.status === "published" },
  ]

  return (
    <div className="flex flex-col gap-3">
      <ContentTabs />
      <ListShell
        heading={t("bonanza.sections.heading")}
        description={t("bonanza.sections.description")}
        addLabel={t("bonanza.sections.add")}
        onAdd={() => setEditing(toForm({}))}
      >
        {rows.length ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("bonanza.fields.title")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.fields.type")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.common.status")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.common.visible")}</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((section, index) => {
                const state = publishState(section)
                return (
                  <Table.Row key={section.id}>
                    <Table.Cell>
                      <span className="txt-compact-small-plus">{section.title || section.key}</span>
                      <span className="text-ui-fg-muted ms-2" dir="ltr">{section.key}</span>
                    </Table.Cell>
                    <Table.Cell>{t(`bonanza.sections.types.${section.type}`)}</Table.Cell>
                    <Table.Cell>
                      <StatusBadge color={STATE_COLOR[state]}>{t(`bonanza.common.${state}`)}</StatusBadge>
                    </Table.Cell>
                    <Table.Cell>
                      <Switch
                        size="small"
                        aria-label={t("bonanza.fields.isVisible")}
                        checked={section.is_visible}
                        onCheckedChange={(checked) =>
                          save.mutate({ id: section.id, data: { is_visible: checked } })
                        }
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <RowActions
                        onMoveUp={() => { const next = moved(ids, index, -1); if (next) reorder.mutate(next) }}
                        onMoveDown={() => { const next = moved(ids, index, 1); if (next) reorder.mutate(next) }}
                        onEdit={() => setEditing(toForm(section))}
                        onDelete={() => remove.mutate(section.id)}
                      />
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        ) : (
          <EmptyRow loading={isLoading} />
        )}
      </ListShell>

      <RecordDrawer
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing?.id ? t("bonanza.common.edit") : t("bonanza.sections.add")}
        fields={fields}
        initial={editing ?? {}}
        saving={save.isPending}
        onSave={(values) =>
          save.mutate(
            {
              id: values.id,
              data: { ...clean(pick(values, SAVED_FIELDS)), settings: toSettings(values) },
            },
            { onSuccess: () => setEditing(null) }
          )
        }
      />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Site content",
  icon: DocumentText,
})

export default HomepageSectionsPage
