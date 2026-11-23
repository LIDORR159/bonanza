import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Tag } from "@medusajs/icons"
import { Switch, Table } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { EmptyRow, ListShell, RowActions } from "../../components/list-shell"
import { RecordDrawer, type FieldSpec } from "../../components/record-form"
import { clean, useList, useRemove, useSave } from "../../lib/api"
import { pick } from "../../lib/options"

const PATH = "/admin/brands"
const SAVED_FIELDS = ["name", "handle", "logo_url", "description", "is_featured", "rank"] as const

const BrandsPage = () => {
  const { t } = useTranslation()
  const { data, isLoading } = useList(PATH, "brands", { limit: 200 })
  const save = useSave(PATH, t("bonanza.common.saved"))
  const remove = useRemove(PATH, t("bonanza.common.deleted"))
  const [editing, setEditing] = useState<Record<string, any> | null>(null)

  const fields: FieldSpec[] = [
    { name: "name", label: t("bonanza.fields.name"), required: true },
    { name: "handle", label: t("bonanza.fields.handle"), hint: t("bonanza.fields.slugHint"), required: true, ltr: true },
    { name: "logo_url", label: t("bonanza.fields.logo"), type: "image" },
    { name: "description", label: t("bonanza.fields.description"), type: "textarea" },
    { name: "is_featured", label: t("bonanza.fields.isFeatured"), type: "switch" },
  ]

  const rows = data?.rows ?? []

  return (
    <div className="flex flex-col gap-3">
      <ListShell
        heading={t("bonanza.brands.heading")}
        description={t("bonanza.brands.description")}
        addLabel={t("bonanza.brands.add")}
        onAdd={() => setEditing({ is_featured: false })}
      >
        {rows.length ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("bonanza.fields.name")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.fields.handle")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.fields.isFeatured")}</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((brand) => (
                <Table.Row key={brand.id}>
                  <Table.Cell className="txt-compact-small-plus">{brand.name}</Table.Cell>
                  <Table.Cell>
                    <span dir="ltr">{brand.handle}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <Switch
                      size="small"
                      aria-label={t("bonanza.fields.isFeatured")}
                      checked={brand.is_featured}
                      onCheckedChange={(checked) =>
                        save.mutate({ id: brand.id, data: { is_featured: checked } })
                      }
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <RowActions
                      onEdit={() => setEditing(brand)}
                      onDelete={() => remove.mutate(brand.id)}
                    />
                  </Table.Cell>
                </Table.Row>
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
        title={editing?.id ? t("bonanza.common.edit") : t("bonanza.brands.add")}
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

export const config = defineRouteConfig({
  label: "Brands",
  icon: Tag,
  nested: "/products",
})

export default BrandsPage
