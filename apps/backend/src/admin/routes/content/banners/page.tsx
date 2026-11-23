import { StatusBadge, Switch, Table } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ContentTabs } from "../../../components/content-tabs"
import { EmptyRow, ListShell, moved, RowActions } from "../../../components/list-shell"
import { RecordDrawer, type FieldSpec } from "../../../components/record-form"
import { clean, useList, useRemove, useReorder, useSave } from "../../../lib/api"
import { BANNER_PLACEMENTS, pick } from "../../../lib/options"

const PATH = "/admin/cms/banners"
const SAVED_FIELDS = [
  "placement", "title", "subtitle", "image_url", "mobile_image_url", "image_alt", "target_url",
  "cta_label", "starts_at", "ends_at", "is_enabled",
] as const

/** Enabled and inside its date window: the same rule the storefront applies. */
const isShowing = (banner: Record<string, any>) => {
  const now = new Date()
  return (
    banner.is_enabled &&
    (!banner.starts_at || new Date(banner.starts_at) <= now) &&
    (!banner.ends_at || new Date(banner.ends_at) > now)
  )
}

const BannersPage = () => {
  const { t } = useTranslation()
  const { data, isLoading } = useList(PATH, "banners")
  const save = useSave(PATH, t("bonanza.common.saved"))
  const remove = useRemove(PATH, t("bonanza.common.deleted"))
  const reorder = useReorder(PATH, "/admin/cms/banner-order")
  const [editing, setEditing] = useState<Record<string, any> | null>(null)

  const rows = data?.rows ?? []
  const urlHint = t("bonanza.fields.urlHint")

  const fields: FieldSpec[] = [
    {
      name: "placement", label: t("bonanza.fields.placement"), type: "select", required: true,
      options: BANNER_PLACEMENTS.map((placement) => ({
        value: placement,
        label: t(`bonanza.banners.placements.${placement}`),
      })),
    },
    { name: "title", label: t("bonanza.fields.title"), required: true },
    { name: "subtitle", label: t("bonanza.fields.subtitle") },
    { name: "image_url", label: t("bonanza.fields.image"), type: "image" },
    { name: "mobile_image_url", label: t("bonanza.fields.mobileImage"), type: "image" },
    { name: "image_alt", label: t("bonanza.fields.imageAlt"), hint: t("bonanza.fields.imageAltHint") },
    { name: "target_url", label: t("bonanza.fields.targetUrl"), type: "url", hint: urlHint },
    { name: "cta_label", label: t("bonanza.fields.ctaLabel") },
    { name: "starts_at", label: t("bonanza.fields.startsAt"), type: "datetime" },
    { name: "ends_at", label: t("bonanza.fields.endsAt"), type: "datetime" },
    { name: "is_enabled", label: t("bonanza.fields.isEnabled"), type: "switch" },
  ]

  return (
    <div className="flex flex-col gap-3">
      <ContentTabs />
      <ListShell
        heading={t("bonanza.banners.heading")}
        description={t("bonanza.banners.description")}
        addLabel={t("bonanza.banners.add")}
        onAdd={() => setEditing({ placement: "home_primary", is_enabled: true })}
      >
        {rows.length ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("bonanza.fields.title")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.fields.placement")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.common.status")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.fields.isEnabled")}</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((banner) => {
                // Order is kept within a placement.
                const group = rows.filter((row) => row.placement === banner.placement).map((row) => row.id)
                const index = group.indexOf(banner.id)
                return (
                  <Table.Row key={banner.id}>
                    <Table.Cell className="txt-compact-small-plus">{banner.title}</Table.Cell>
                    <Table.Cell>{t(`bonanza.banners.placements.${banner.placement}`)}</Table.Cell>
                    <Table.Cell>
                      <StatusBadge color={isShowing(banner) ? "green" : "grey"}>
                        {isShowing(banner) ? t("bonanza.banners.active") : t("bonanza.banners.inactive")}
                      </StatusBadge>
                    </Table.Cell>
                    <Table.Cell>
                      <Switch
                        size="small"
                        aria-label={t("bonanza.fields.isEnabled")}
                        checked={banner.is_enabled}
                        onCheckedChange={(checked) =>
                          save.mutate({ id: banner.id, data: { is_enabled: checked } })
                        }
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <RowActions
                        onMoveUp={() => { const next = moved(group, index, -1); if (next) reorder.mutate(next) }}
                        onMoveDown={() => { const next = moved(group, index, 1); if (next) reorder.mutate(next) }}
                        onEdit={() => setEditing(banner)}
                        onDelete={() => remove.mutate(banner.id)}
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
        title={editing?.id ? t("bonanza.common.edit") : t("bonanza.banners.add")}
        fields={fields}
        initial={editing ?? {}}
        saving={save.isPending}
        onSave={(values) =>
          save.mutate(
            { id: values.id, data: clean(pick(values, SAVED_FIELDS)) },
            { onSuccess: () => setEditing(null) }
          )
        }
      />
    </div>
  )
}

export default BannersPage
