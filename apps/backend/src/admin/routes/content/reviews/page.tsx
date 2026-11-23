import { StatusBadge, Table } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ContentTabs } from "../../../components/content-tabs"
import { EmptyRow, ListShell, moved, RowActions } from "../../../components/list-shell"
import { RecordDrawer, type FieldSpec } from "../../../components/record-form"
import { clean, useList, useRemove, useReorder, useSave } from "../../../lib/api"
import {
  forSave,
  nextRank,
  publishState,
  REVIEW_SOURCES,
  STATE_COLOR,
  statusOptions,
} from "../../../lib/options"

const PATH = "/admin/cms/reviews"
const SAVED_FIELDS = [
  "author_name", "rating", "text", "date_label", "source", "status", "rank",
] as const
const RATINGS = [5, 4, 3, 2, 1]

/**
 * Customer reviews, copied in by hand exactly as they were written. The
 * overall score above them is kept in the site settings.
 */
const ReviewsPage = () => {
  const { t } = useTranslation()
  const { data, isLoading } = useList(PATH, "reviews", { limit: 200 })
  const save = useSave(PATH, t("bonanza.common.saved"))
  const remove = useRemove(PATH, t("bonanza.common.deleted"))
  const reorder = useReorder(PATH, "/admin/cms/review-order")
  const [editing, setEditing] = useState<Record<string, any> | null>(null)

  const rows = data?.rows ?? []
  const ids = rows.map((row) => row.id)

  const fields: FieldSpec[] = [
    { name: "author_name", label: t("bonanza.reviews.authorName"), required: true },
    {
      name: "rating", label: t("bonanza.reviews.rating"), type: "select", required: true,
      options: RATINGS.map((rating) => ({ value: String(rating), label: "★".repeat(rating) })),
    },
    { name: "text", label: t("bonanza.reviews.text"), hint: t("bonanza.reviews.textHint"), type: "textarea", required: true },
    { name: "date_label", label: t("bonanza.reviews.dateLabel"), hint: t("bonanza.reviews.dateLabelHint") },
    {
      name: "source", label: t("bonanza.reviews.source"), type: "select",
      options: REVIEW_SOURCES.map((source) => ({ value: source, label: t(`bonanza.reviews.sources.${source}`) })),
    },
    { name: "status", label: t("bonanza.common.status"), type: "select", options: statusOptions(t) },
  ]

  return (
    <div className="flex flex-col gap-3">
      <ContentTabs />
      <ListShell
        heading={t("bonanza.reviews.heading")}
        description={t("bonanza.reviews.description")}
        addLabel={t("bonanza.reviews.add")}
        onAdd={() =>
          setEditing({ status: "published", source: "google", rating: 5, rank: nextRank(rows) })
        }
      >
        {rows.length ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("bonanza.reviews.authorName")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.reviews.rating")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.reviews.text")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.common.status")}</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((review, index) => {
                const state = publishState(review)
                return (
                  <Table.Row key={review.id}>
                    <Table.Cell>
                      <span className="txt-compact-small-plus">{review.author_name}</span>
                      <span className="text-ui-fg-muted ms-2">
                        {t(`bonanza.reviews.sources.${review.source}`)}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span aria-label={`${review.rating} / 5`}>{"★".repeat(review.rating)}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-ui-fg-subtle line-clamp-1 max-w-md">{review.text}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge color={STATE_COLOR[state]}>{t(`bonanza.common.${state}`)}</StatusBadge>
                    </Table.Cell>
                    <Table.Cell>
                      <RowActions
                        onMoveUp={() => { const next = moved(ids, index, -1); if (next) reorder.mutate(next) }}
                        onMoveDown={() => { const next = moved(ids, index, 1); if (next) reorder.mutate(next) }}
                        onEdit={() => setEditing(review)}
                        onDelete={() => remove.mutate(review.id)}
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
        title={editing?.id ? t("bonanza.common.edit") : t("bonanza.reviews.add")}
        fields={fields}
        initial={editing ?? {}}
        saving={save.isPending}
        onSave={(values) =>
          save.mutate(
            {
              id: values.id,
              // The select holds its value as text.
              data: { ...clean(forSave(values, SAVED_FIELDS)), rating: Number(values.rating) },
            },
            { onSuccess: () => setEditing(null) }
          )
        }
      />
    </div>
  )
}

export default ReviewsPage
