import { Button, StatusBadge, Switch, Table } from "@medusajs/ui"
import { useQueryClient } from "@tanstack/react-query"
import { Fragment, useState } from "react"
import { useTranslation } from "react-i18next"
import { ContentTabs } from "../../../components/content-tabs"
import { EmptyRow, ListShell, moved, RowActions } from "../../../components/list-shell"
import { RecordDrawer, type FieldSpec } from "../../../components/record-form"
import { clean, useList, useRemove, useReorder, useSave, type Row } from "../../../lib/api"
import { forSave, nextRank, publishState, STATE_COLOR, statusOptions } from "../../../lib/options"

const GROUPS = "/admin/cms/service-groups"
const ITEMS = "/admin/cms/service-items"
const GROUP_FIELDS = ["title", "note", "status", "rank"] as const
const ITEM_FIELDS = [
  "group_id", "name", "description", "price", "price_note", "duration_minutes", "is_visible",
  "rank",
] as const

/** What a visitor sees in the price column: the note, the price, or both. */
const priceText = (item: Row) =>
  [item.price_note, item.price != null ? `₪${item.price}` : null].filter(Boolean).join(" ") || "—"

/**
 * The price list: groups such as haircuts and beard, each holding its
 * services. A group shows on the site once published; a service can be hidden
 * on its own.
 */
const ServicesPage = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const groups = useList(GROUPS, "service_groups", { limit: 200 })
  const items = useList(ITEMS, "service_items", { limit: 200 })
  const saveGroup = useSave(GROUPS, t("bonanza.common.saved"))
  const saveItem = useSave(ITEMS, t("bonanza.common.saved"))
  const removeGroup = useRemove(GROUPS, t("bonanza.common.deleted"))
  const removeItem = useRemove(ITEMS, t("bonanza.common.deleted"))
  const reorderGroups = useReorder(GROUPS, "/admin/cms/service-group-order")
  const reorderItems = useReorder(ITEMS, "/admin/cms/service-item-order")
  const [editingGroup, setEditingGroup] = useState<Record<string, any> | null>(null)
  const [editingItem, setEditingItem] = useState<Record<string, any> | null>(null)

  const groupRows = groups.data?.rows ?? []
  const itemRows = items.data?.rows ?? []
  const groupIds = groupRows.map((group) => group.id)
  const itemsOf = (groupId: string) => itemRows.filter((item) => item.group_id === groupId)

  const groupFields: FieldSpec[] = [
    { name: "title", label: t("bonanza.fields.title"), required: true },
    { name: "note", label: t("bonanza.services.note"), hint: t("bonanza.services.noteHint") },
    { name: "status", label: t("bonanza.common.status"), type: "select", options: statusOptions(t) },
  ]

  const itemFields: FieldSpec[] = [
    {
      name: "group_id", label: t("bonanza.services.group"), type: "select", required: true,
      options: groupRows.map((group) => ({ value: group.id, label: group.title })),
    },
    { name: "name", label: t("bonanza.fields.name"), required: true },
    { name: "description", label: t("bonanza.fields.description"), hint: t("bonanza.services.descriptionHint") },
    { name: "price", label: t("bonanza.services.price"), hint: t("bonanza.services.priceHint"), type: "number" },
    { name: "price_note", label: t("bonanza.services.priceNote"), hint: t("bonanza.services.priceNoteHint") },
    { name: "duration_minutes", label: t("bonanza.services.duration"), type: "number" },
    { name: "is_visible", label: t("bonanza.fields.isVisible"), type: "switch" },
  ]

  return (
    <div className="flex flex-col gap-3">
      <ContentTabs />
      <ListShell
        heading={t("bonanza.services.heading")}
        description={t("bonanza.services.description")}
        addLabel={t("bonanza.services.addGroup")}
        onAdd={() => setEditingGroup({ status: "published", rank: nextRank(groupRows) })}
      >
        {groupRows.length ? (
          <Table>
            <Table.Body>
              {groupRows.map((group, groupIndex) => {
                const state = publishState(group)
                const groupItems = itemsOf(group.id)
                const itemIds = groupItems.map((item) => item.id)
                return (
                  <Fragment key={group.id}>
                    <Table.Row className="bg-ui-bg-subtle">
                      <Table.Cell>
                        <span className="txt-compact-small-plus">{group.title}</span>
                        {group.note && <span className="text-ui-fg-muted ms-2">{group.note}</span>}
                      </Table.Cell>
                      <Table.Cell />
                      <Table.Cell>
                        <StatusBadge color={STATE_COLOR[state]}>{t(`bonanza.common.${state}`)}</StatusBadge>
                      </Table.Cell>
                      <Table.Cell>
                        <RowActions
                          extra={
                            <Button
                              size="small"
                              variant="transparent"
                              onClick={() =>
                                setEditingItem({
                                  group_id: group.id,
                                  is_visible: true,
                                  rank: nextRank(groupItems),
                                })
                              }
                            >
                              {t("bonanza.services.addItem")}
                            </Button>
                          }
                          onMoveUp={() => { const next = moved(groupIds, groupIndex, -1); if (next) reorderGroups.mutate(next) }}
                          onMoveDown={() => { const next = moved(groupIds, groupIndex, 1); if (next) reorderGroups.mutate(next) }}
                          onEdit={() => setEditingGroup(group)}
                          onDelete={() =>
                            removeGroup.mutate(group.id, {
                              // Deleting a group deletes its services with it.
                              onSuccess: () => void queryClient.invalidateQueries({ queryKey: [ITEMS] }),
                            })
                          }
                        />
                      </Table.Cell>
                    </Table.Row>
                    {groupItems.map((item, itemIndex) => (
                      <Table.Row key={item.id}>
                        <Table.Cell>
                          <span className="ps-6">{item.name}</span>
                          {item.description && (
                            <span className="text-ui-fg-muted ms-2">{item.description}</span>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <span dir="ltr">{priceText(item)}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <Switch
                            size="small"
                            aria-label={t("bonanza.fields.isVisible")}
                            checked={item.is_visible}
                            onCheckedChange={(checked) =>
                              saveItem.mutate({ id: item.id, data: { is_visible: checked } })
                            }
                          />
                        </Table.Cell>
                        <Table.Cell>
                          <RowActions
                            onMoveUp={() => { const next = moved(itemIds, itemIndex, -1); if (next) reorderItems.mutate(next) }}
                            onMoveDown={() => { const next = moved(itemIds, itemIndex, 1); if (next) reorderItems.mutate(next) }}
                            onEdit={() => setEditingItem(item)}
                            onDelete={() => removeItem.mutate(item.id)}
                          />
                        </Table.Cell>
                      </Table.Row>
                    ))}
                    {!groupItems.length && !items.isLoading && (
                      // A plain row: the kit's cell does not take `colSpan`.
                      <tr className="border-ui-border-base border-b">
                        <td colSpan={4} className="text-ui-fg-muted txt-small py-3 pe-6 ps-12">
                          {t("bonanza.services.noItems")}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </Table.Body>
          </Table>
        ) : (
          <EmptyRow loading={groups.isLoading} />
        )}
      </ListShell>

      <RecordDrawer
        open={!!editingGroup}
        onOpenChange={(open) => !open && setEditingGroup(null)}
        title={editingGroup?.id ? t("bonanza.common.edit") : t("bonanza.services.addGroup")}
        fields={groupFields}
        initial={editingGroup ?? {}}
        saving={saveGroup.isPending}
        onSave={(values) =>
          saveGroup.mutate(
            { id: values.id, data: clean(forSave(values, GROUP_FIELDS)) },
            { onSuccess: () => setEditingGroup(null) }
          )
        }
      />

      <RecordDrawer
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        title={editingItem?.id ? t("bonanza.common.edit") : t("bonanza.services.addItem")}
        fields={itemFields}
        initial={editingItem ?? {}}
        saving={saveItem.isPending}
        onSave={(values) =>
          saveItem.mutate(
            { id: values.id, data: clean(forSave(values, ITEM_FIELDS)) },
            { onSuccess: () => setEditingItem(null) }
          )
        }
      />
    </div>
  )
}

export default ServicesPage
