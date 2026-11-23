import { Switch, Table } from "@medusajs/ui"
import { Fragment, useState } from "react"
import { useTranslation } from "react-i18next"
import { ContentTabs } from "../../../components/content-tabs"
import { EmptyRow, ListShell, moved, RowActions } from "../../../components/list-shell"
import { RecordDrawer, type FieldSpec } from "../../../components/record-form"
import { clean, useList, useRemove, useReorder, useSave, type Row } from "../../../lib/api"
import { LINK_TYPES, NAVIGATION_MENUS, pick } from "../../../lib/options"

const PATH = "/admin/cms/navigation"
const SAVED_FIELDS = [
  "menu", "label", "link_type", "link_ref", "url", "parent_id", "is_visible", "open_in_new_tab",
] as const

const NavigationPage = () => {
  const { t } = useTranslation()
  const { data, isLoading } = useList(PATH, "items", { limit: 200 })
  const save = useSave(PATH, t("bonanza.common.saved"))
  const remove = useRemove(PATH, t("bonanza.common.deleted"))
  const reorder = useReorder(PATH, "/admin/cms/navigation-order")
  const [editing, setEditing] = useState<Record<string, any> | null>(null)

  // What a link can point to.
  const categories = useList("/admin/product-categories", "product_categories", { limit: 200, fields: "id,name,handle" })
  const pages = useList("/admin/cms/pages", "pages", { limit: 200 })
  const brands = useList("/admin/brands", "brands", { limit: 200 })

  const rows = data?.rows ?? []
  const siblings = (item: Row) =>
    rows
      .filter((row) => row.menu === item.menu && (row.parent_id ?? null) === (item.parent_id ?? null))
      .map((row) => row.id)

  const targets = (type: string) => {
    const list =
      type === "category" ? categories.data?.rows.map((row) => ({ value: row.handle, label: row.name }))
      : type === "page" ? pages.data?.rows.map((row) => ({ value: row.slug, label: row.title }))
      : brands.data?.rows.map((row) => ({ value: row.handle, label: row.name }))
    return list ?? []
  }

  const fields: FieldSpec[] = [
    {
      name: "menu", label: t("bonanza.fields.menu"), type: "select", required: true,
      options: NAVIGATION_MENUS.map((menu) => ({ value: menu, label: t(`bonanza.navigation.menus.${menu}`) })),
    },
    { name: "label", label: t("bonanza.fields.label"), required: true },
    {
      name: "link_type", label: t("bonanza.fields.linkType"), type: "select", required: true,
      options: LINK_TYPES.map((type) => ({ value: type, label: t(`bonanza.navigation.linkTypes.${type}`) })),
    },
    {
      name: "url", label: t("bonanza.fields.url"), type: "url", hint: t("bonanza.fields.urlHint"),
      when: (values) => values.link_type === "custom",
    },
    {
      name: "link_ref", label: t("bonanza.fields.linkRef"), type: "select",
      options: (values) => targets(values.link_type),
      when: (values) => values.link_type !== "custom",
    },
    {
      name: "parent_id", label: t("bonanza.fields.parent"), type: "select",
      // One level of nesting: only top-level entries of the same menu can be parents.
      options: (values) => [
        { value: "none", label: t("bonanza.navigation.topLevel") },
        ...rows
          .filter((row) => row.menu === values.menu && !row.parent_id && row.id !== values.id)
          .map((row) => ({ value: row.id, label: row.label })),
      ],
    },
    { name: "is_visible", label: t("bonanza.fields.isVisible"), type: "switch" },
    { name: "open_in_new_tab", label: t("bonanza.fields.openInNewTab"), type: "switch" },
  ]

  const renderRow = (item: Row, depth: number) => {
    const group = siblings(item)
    const index = group.indexOf(item.id)
    return (
      <Table.Row key={item.id}>
        <Table.Cell>
          <span className={depth ? "ps-6" : "txt-compact-small-plus"}>{item.label}</span>
        </Table.Cell>
        <Table.Cell>
          <span dir="ltr" className="text-ui-fg-subtle">
            {item.link_type === "custom" ? item.url : `${item.link_type}: ${item.link_ref}`}
          </span>
        </Table.Cell>
        <Table.Cell>
          <Switch
            size="small"
            aria-label={t("bonanza.fields.isVisible")}
            checked={item.is_visible}
            onCheckedChange={(checked) => save.mutate({ id: item.id, data: { is_visible: checked } })}
          />
        </Table.Cell>
        <Table.Cell>
          <RowActions
            onMoveUp={() => { const next = moved(group, index, -1); if (next) reorder.mutate(next) }}
            onMoveDown={() => { const next = moved(group, index, 1); if (next) reorder.mutate(next) }}
            onEdit={() => setEditing({ ...item, parent_id: item.parent_id ?? "none" })}
            onDelete={() => remove.mutate(item.id)}
          />
        </Table.Cell>
      </Table.Row>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <ContentTabs />
      <ListShell
        heading={t("bonanza.navigation.heading")}
        description={t("bonanza.navigation.description")}
        addLabel={t("bonanza.navigation.add")}
        onAdd={() =>
          setEditing({ menu: "header", link_type: "custom", parent_id: "none", is_visible: true })
        }
      >
        {rows.length ? (
          <Table>
            <Table.Body>
              {NAVIGATION_MENUS.map((menu) => (
                <Fragment key={menu}>
                  <tr className="bg-ui-bg-subtle border-ui-border-base border-b">
                    <td colSpan={4} className="txt-compact-small-plus px-6 py-2.5">
                      {t(`bonanza.navigation.menus.${menu}`)}
                    </td>
                  </tr>
                  {rows
                    .filter((row) => row.menu === menu && !row.parent_id)
                    .map((parent) => (
                      <Fragment key={parent.id}>
                        {renderRow(parent, 0)}
                        {rows
                          .filter((row) => row.parent_id === parent.id)
                          .map((child) => renderRow(child, 1))}
                      </Fragment>
                    ))}
                </Fragment>
              ))}
            </Table.Body>
          </Table>
        ) : (
          <EmptyRow loading={isLoading} />
        )}
      </ListShell>

      <RecordDrawer
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing?.id ? t("bonanza.common.edit") : t("bonanza.navigation.add")}
        fields={fields}
        initial={editing ?? {}}
        saving={save.isPending}
        onSave={(values) => {
          const data = clean(pick(values, SAVED_FIELDS))
          // Keep only the target that matches the link type.
          if (data.link_type === "custom") data.link_ref = null
          else data.url = null
          if (data.parent_id === "none") data.parent_id = null
          save.mutate({ id: values.id, data }, { onSuccess: () => setEditing(null) })
        }}
      />
    </div>
  )
}

export default NavigationPage
