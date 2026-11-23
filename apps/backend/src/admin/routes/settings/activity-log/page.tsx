import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Table } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { EmptyRow, ListShell } from "../../../components/list-shell"
import { useList } from "../../../lib/api"

const PAGE_SIZE = 50

/** A read-only record of who changed site content, brands and admin accounts. */
const ActivityLogPage = () => {
  const { t, i18n } = useTranslation()
  const [offset, setOffset] = useState(0)
  const { data, isLoading } = useList("/admin/activity-log", "entries", { limit: PAGE_SIZE, offset })
  const users = useList("/admin/users", "users", { limit: 200, fields: "id,email" })

  const email = (id: string | null) =>
    users.data?.rows.find((user) => user.id === id)?.email ?? id ?? t("bonanza.activity.system")
  const when = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" })
  const rows = data?.rows ?? []
  const count = data?.count ?? 0

  return (
    <ListShell heading={t("bonanza.activity.heading")} description={t("bonanza.activity.description")}>
      {rows.length ? (
        <>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("bonanza.activity.when")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.activity.who")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.activity.action")}</Table.HeaderCell>
                <Table.HeaderCell>{t("bonanza.activity.what")}</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((entry) => (
                <Table.Row key={entry.id}>
                  <Table.Cell>{when.format(new Date(entry.created_at))}</Table.Cell>
                  <Table.Cell>
                    <span dir="ltr">{email(entry.actor_id)}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span dir="ltr" className="font-mono text-xs">{entry.action}</span>
                  </Table.Cell>
                  <Table.Cell>{entry.summary ?? entry.resource_id ?? "—"}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
          <div className="flex items-center justify-between px-6 py-3">
            <span className="txt-small text-ui-fg-subtle" dir="ltr">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, count)} / {count}
            </span>
            <div className="flex gap-2">
              <Button size="small" variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                ‹
              </Button>
              <Button size="small" variant="secondary" disabled={offset + PAGE_SIZE >= count} onClick={() => setOffset(offset + PAGE_SIZE)}>
                ›
              </Button>
            </div>
          </div>
        </>
      ) : (
        <EmptyRow loading={isLoading} />
      )}
    </ListShell>
  )
}

export const config = defineRouteConfig({
  label: "Activity log",
})

export default ActivityLogPage
