import { StatusBadge, Switch, Table } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ContentTabs } from "../../../components/content-tabs"
import { EmptyRow, ListShell, moved, RowActions } from "../../../components/list-shell"
import { RecordDrawer, type FieldSpec } from "../../../components/record-form"
import { clean, useList, useRemove, useReorder, useSave } from "../../../lib/api"
import { forSave, nextRank, publishState, STATE_COLOR, statusOptions } from "../../../lib/options"

const PATH = "/admin/cms/gallery"
const SAVED_FIELDS = ["image_url", "alt", "caption", "is_featured", "status", "rank"] as const

/** The photographs of the gallery page. Featured ones also show on the home page. */
const GalleryPage = () => {
  const { t } = useTranslation()
  const { data, isLoading } = useList(PATH, "gallery_items", { limit: 200 })
  const save = useSave(PATH, t("bonanza.common.saved"))
  const remove = useRemove(PATH, t("bonanza.common.deleted"))
  const reorder = useReorder(PATH, "/admin/cms/gallery-order")
  const [editing, setEditing] = useState<Record<string, any> | null>(null)

  const rows = data?.rows ?? []
  const ids = rows.map((row) => row.id)

  const fields: FieldSpec[] = [
    { name: "image_url", label: t("bonanza.fields.image"), type: "image", required: true },
    { name: "alt", label: t("bonanza.fields.imageAlt"), hint: t("bonanza.fields.imageAltHint") },
    { name: "caption", label: t("bonanza.gallery.caption"), hint: t("bonanza.gallery.captionHint") },
    { name: "is_featured", label: t("bonanza.fields.isFeatured"), type: "switch" },
    { name: "status", label: t("bonanza.common.status"), type: "select", options: statusOptions(t) },
  ]

  return (
    <div className="flex flex-col gap-3">
      <ContentTabs />
      <ListShell
        heading={t("bonanza.gallery.heading")}
        description={t("bonanza.gallery.description")}
        addLabel={t("bonanza.gallery.add")}
        onAdd={() => setEditing({ status: "published", is_featured: false, rank: nextRank(rows) })}
      >
        {rows.length ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("bonanza.fields.image")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.fields.imageAlt")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.common.status")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.fields.isFeatured")}</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((item, index) => {
                const state = publishState(item)
                return (
                  <Table.Row key={item.id}>
                    <Table.Cell>
                      <img
                        src={item.image_url}
                        alt=""
                        className="border-ui-border-base bg-ui-bg-subtle my-2 h-12 w-12 rounded-md border object-cover"
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <span className="txt-compact-small-plus">{item.alt || "—"}</span>
                      {item.caption && <span className="text-ui-fg-muted ms-2">{item.caption}</span>}
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge color={STATE_COLOR[state]}>{t(`bonanza.common.${state}`)}</StatusBadge>
                    </Table.Cell>
                    <Table.Cell>
                      <Switch
                        size="small"
                        aria-label={t("bonanza.fields.isFeatured")}
                        checked={item.is_featured}
                        onCheckedChange={(checked) =>
                          save.mutate({ id: item.id, data: { is_featured: checked } })
                        }
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <RowActions
                        onMoveUp={() => { const next = moved(ids, index, -1); if (next) reorder.mutate(next) }}
                        onMoveDown={() => { const next = moved(ids, index, 1); if (next) reorder.mutate(next) }}
                        onEdit={() => setEditing(item)}
                        onDelete={() => remove.mutate(item.id)}
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
        title={editing?.id ? t("bonanza.common.edit") : t("bonanza.gallery.add")}
        fields={fields}
        initial={editing ?? {}}
        saving={save.isPending}
        onSave={(values) =>
          save.mutate(
            { id: values.id, data: clean(forSave(values, SAVED_FIELDS)) },
            { onSuccess: () => setEditing(null) }
          )
        }
      />
    </div>
  )
}

export default GalleryPage
