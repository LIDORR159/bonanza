import { ArrowDownMini, ArrowUpMini, PencilSquare, Trash } from "@medusajs/icons"
import { Button, Container, Heading, IconButton, Text, usePrompt } from "@medusajs/ui"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

/** The framed card every list screen sits in: heading, description, add button. */
export const ListShell = ({
  heading,
  description,
  addLabel,
  onAdd,
  children,
}: {
  heading: string
  description?: string
  addLabel?: string
  onAdd?: () => void
  children: ReactNode
}) => (
  <Container className="divide-y p-0">
    <div className="flex items-start justify-between gap-4 px-6 py-4">
      <div>
        <Heading level="h1">{heading}</Heading>
        {description && (
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {description}
          </Text>
        )}
      </div>
      {onAdd && addLabel && (
        <Button size="small" variant="secondary" onClick={onAdd}>
          {addLabel}
        </Button>
      )}
    </div>
    {children}
  </Container>
)

/** Edit, delete and optional move buttons for one row. */
export const RowActions = ({
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  extra,
}: {
  onEdit?: () => void
  onDelete?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  extra?: ReactNode
}) => {
  const { t } = useTranslation()
  const prompt = usePrompt()

  const confirmDelete = async () => {
    const confirmed = await prompt({
      title: t("bonanza.common.deleteTitle"),
      description: t("bonanza.common.deleteBody"),
      confirmText: t("bonanza.common.delete"),
      cancelText: t("bonanza.common.cancel"),
    })
    if (confirmed) {
      onDelete?.()
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {extra}
      {onMoveUp !== undefined && (
        <IconButton
          size="small"
          variant="transparent"
          aria-label={t("bonanza.common.moveUp")}
          onClick={onMoveUp}
        >
          <ArrowUpMini />
        </IconButton>
      )}
      {onMoveDown !== undefined && (
        <IconButton
          size="small"
          variant="transparent"
          aria-label={t("bonanza.common.moveDown")}
          onClick={onMoveDown}
        >
          <ArrowDownMini />
        </IconButton>
      )}
      {onEdit && (
        <IconButton
          size="small"
          variant="transparent"
          aria-label={t("bonanza.common.edit")}
          onClick={onEdit}
        >
          <PencilSquare />
        </IconButton>
      )}
      {onDelete && (
        <IconButton
          size="small"
          variant="transparent"
          aria-label={t("bonanza.common.delete")}
          onClick={() => void confirmDelete()}
        >
          <Trash />
        </IconButton>
      )}
    </div>
  )
}

/** Moves the item at `index` one place up or down and returns the new id order. */
export const moved = (ids: string[], index: number, direction: -1 | 1): string[] | null => {
  const target = index + direction
  if (target < 0 || target >= ids.length) {
    return null
  }
  const next = ids.slice()
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}

export const EmptyRow = ({ loading }: { loading: boolean }) => {
  const { t } = useTranslation()
  return (
    <div className="text-ui-fg-subtle txt-small px-6 py-10 text-center">
      {loading ? t("bonanza.common.loading") : t("bonanza.common.empty")}
    </div>
  )
}
