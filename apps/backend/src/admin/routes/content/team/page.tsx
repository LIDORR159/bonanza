import { StatusBadge, Table } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ContentTabs } from "../../../components/content-tabs"
import { EmptyRow, ListShell, moved, RowActions } from "../../../components/list-shell"
import { RecordDrawer, type FieldSpec } from "../../../components/record-form"
import { clean, useList, useRemove, useReorder, useSave } from "../../../lib/api"
import { forSave, nextRank, publishState, STATE_COLOR, statusOptions } from "../../../lib/options"

const PATH = "/admin/cms/team"
const SAVED_FIELDS = ["name", "role", "photo_url", "instagram_url", "status", "rank"] as const

/** The barbers shown on the gallery page, each linking to their Instagram. */
const TeamPage = () => {
  const { t } = useTranslation()
  const { data, isLoading } = useList(PATH, "team_members", { limit: 200 })
  const save = useSave(PATH, t("bonanza.common.saved"))
  const remove = useRemove(PATH, t("bonanza.common.deleted"))
  const reorder = useReorder(PATH, "/admin/cms/team-order")
  const [editing, setEditing] = useState<Record<string, any> | null>(null)

  const rows = data?.rows ?? []
  const ids = rows.map((row) => row.id)

  const fields: FieldSpec[] = [
    { name: "name", label: t("bonanza.fields.name"), required: true },
    { name: "role", label: t("bonanza.team.role"), hint: t("bonanza.team.roleHint") },
    { name: "photo_url", label: t("bonanza.team.photo"), type: "image" },
    { name: "instagram_url", label: t("bonanza.team.instagram"), hint: t("bonanza.team.instagramHint"), type: "url" },
    { name: "status", label: t("bonanza.common.status"), type: "select", options: statusOptions(t) },
  ]

  return (
    <div className="flex flex-col gap-3">
      <ContentTabs />
      <ListShell
        heading={t("bonanza.team.heading")}
        description={t("bonanza.team.description")}
        addLabel={t("bonanza.team.add")}
        onAdd={() => setEditing({ status: "published", rank: nextRank(rows) })}
      >
        {rows.length ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("bonanza.fields.name")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.team.role")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.team.instagram")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.common.status")}</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((member, index) => {
                const state = publishState(member)
                return (
                  <Table.Row key={member.id}>
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        {member.photo_url ? (
                          <img
                            src={member.photo_url}
                            alt=""
                            className="border-ui-border-base bg-ui-bg-subtle my-2 h-10 w-10 rounded-full border object-cover"
                          />
                        ) : (
                          <span className="border-ui-border-base bg-ui-bg-subtle my-2 h-10 w-10 rounded-full border" />
                        )}
                        <span className="txt-compact-small-plus">{member.name}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>{member.role || "—"}</Table.Cell>
                    <Table.Cell>
                      <span dir="ltr" className="text-ui-fg-subtle">
                        {member.instagram_url || "—"}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge color={STATE_COLOR[state]}>{t(`bonanza.common.${state}`)}</StatusBadge>
                    </Table.Cell>
                    <Table.Cell>
                      <RowActions
                        onMoveUp={() => { const next = moved(ids, index, -1); if (next) reorder.mutate(next) }}
                        onMoveDown={() => { const next = moved(ids, index, 1); if (next) reorder.mutate(next) }}
                        onEdit={() => setEditing(member)}
                        onDelete={() => remove.mutate(member.id)}
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
        title={editing?.id ? t("bonanza.common.edit") : t("bonanza.team.add")}
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

export default TeamPage
