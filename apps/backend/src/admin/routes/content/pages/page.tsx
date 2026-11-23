import { Button, StatusBadge, Table, toast } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ContentTabs } from "../../../components/content-tabs"
import { EmptyRow, ListShell, RowActions } from "../../../components/list-shell"
import { RecordDrawer, type FieldSpec } from "../../../components/record-form"
import { clean, useList, useRemove, useSave } from "../../../lib/api"
import { pick, publishState, STATE_COLOR } from "../../../lib/options"
import { sdk } from "../../../lib/sdk"

const PATH = "/admin/cms/pages"
const SAVED_FIELDS = [
  "slug", "title", "body", "status", "publish_at", "meta_title", "meta_description",
  "canonical_url", "og_image_url", "include_in_sitemap",
] as const

const PagesPage = () => {
  const { t } = useTranslation()
  const { data, isLoading } = useList(PATH, "pages")
  const save = useSave(PATH, t("bonanza.common.saved"))
  const remove = useRemove(PATH, t("bonanza.common.deleted"))
  const [editing, setEditing] = useState<Record<string, any> | null>(null)

  /** Opens the storefront with drafts visible, through a short-lived signed link. */
  const preview = async (slug: string) => {
    try {
      const { url } = await sdk.client.fetch<{ url: string }>("/admin/cms/preview-token", {
        method: "POST",
        body: { path: `/${slug}` },
      })
      window.open(url, "_blank", "noopener")
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const fields: FieldSpec[] = [
    { name: "title", label: t("bonanza.fields.title"), required: true },
    { name: "slug", label: t("bonanza.fields.slug"), hint: t("bonanza.fields.slugHint"), required: true, ltr: true },
    { name: "body", label: t("bonanza.fields.pageBody"), type: "markdown" },
    {
      name: "status", label: t("bonanza.common.status"), type: "select",
      options: [
        { value: "draft", label: t("bonanza.common.draft") },
        { value: "published", label: t("bonanza.common.published") },
      ],
    },
    {
      name: "publish_at", label: t("bonanza.fields.publishAt"), type: "datetime",
      hint: t("bonanza.fields.publishAtHint"), when: (values) => values.status === "published",
    },
    { name: "meta_title", label: t("bonanza.fields.metaTitle") },
    { name: "meta_description", label: t("bonanza.fields.metaDescription"), type: "textarea" },
    { name: "canonical_url", label: t("bonanza.fields.canonicalUrl"), type: "url" },
    { name: "og_image_url", label: t("bonanza.fields.ogImage"), type: "image" },
    { name: "include_in_sitemap", label: t("bonanza.fields.includeInSitemap"), type: "switch" },
  ]

  const rows = data?.rows ?? []

  return (
    <div className="flex flex-col gap-3">
      <ContentTabs />
      <ListShell
        heading={t("bonanza.pages.heading")}
        description={t("bonanza.pages.description")}
        addLabel={t("bonanza.pages.add")}
        onAdd={() => setEditing({ status: "draft", body: "", include_in_sitemap: true })}
      >
        {rows.length ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("bonanza.fields.title")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.fields.slug")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.common.status")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.pages.revision")}</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((page) => {
                const state = publishState(page)
                return (
                  <Table.Row key={page.id}>
                    <Table.Cell className="txt-compact-small-plus">{page.title}</Table.Cell>
                    <Table.Cell>
                      <span dir="ltr">/{page.slug}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge color={STATE_COLOR[state]}>{t(`bonanza.common.${state}`)}</StatusBadge>
                    </Table.Cell>
                    <Table.Cell>{page.revision}</Table.Cell>
                    <Table.Cell>
                      <RowActions
                        extra={
                          <Button
                            size="small"
                            variant="transparent"
                            title={t("bonanza.pages.previewHint")}
                            onClick={() => void preview(page.slug)}
                          >
                            {t("bonanza.common.preview")}
                          </Button>
                        }
                        onEdit={() => setEditing(page)}
                        onDelete={() => remove.mutate(page.id)}
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
        title={editing?.id ? t("bonanza.common.edit") : t("bonanza.pages.add")}
        fields={fields}
        initial={editing ?? {}}
        saving={save.isPending}
        onSave={(values) =>
          save.mutate(
            // The body may be an empty string; every other blank becomes null.
            { id: values.id, data: { ...clean(pick(values, SAVED_FIELDS)), body: values.body ?? "" } },
            { onSuccess: () => setEditing(null) }
          )
        }
      />
    </div>
  )
}

export default PagesPage
