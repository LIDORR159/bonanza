import {
  Button,
  Drawer,
  Hint,
  Input,
  Label,
  Select,
  Switch,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { uploadImage } from "../lib/api"

/**
 * A form described by data. Each content screen lists its fields once and gets
 * the drawer, the inputs, image upload and the save button from here.
 */

export type Option = { value: string; label: string }

export type FieldSpec = {
  name: string
  label: string
  type?: "text" | "textarea" | "markdown" | "url" | "image" | "number" | "switch" | "select" | "datetime"
  /** Choices for a select. A function receives the form's current values. */
  options?: Option[] | ((values: Record<string, any>) => Option[])
  hint?: string
  required?: boolean
  /** Latin text that reads left to right even in a Hebrew admin. */
  ltr?: boolean
  /** Show the field only when this returns true for the current values. */
  when?: (values: Record<string, any>) => boolean
}

/** `2026-01-31T09:30` in local time, the format <input type="datetime-local"> uses. */
const toLocalInput = (value: unknown): string => {
  if (!value) {
    return ""
  }
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function ImageInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const onFile = async (file: File | undefined) => {
    if (!file) {
      return
    }
    setUploading(true)
    try {
      onChange(await uploadImage(file))
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value && (
        <img
          src={value}
          alt=""
          className="border-ui-border-base bg-ui-bg-subtle max-h-40 w-fit rounded-md border object-contain"
        />
      )}
      <div className="flex gap-2">
        <Input
          dir="ltr"
          value={value}
          placeholder="https://"
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="secondary"
          isLoading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {t("bonanza.common.upload")}
        </Button>
        {value && (
          <Button type="button" variant="transparent" onClick={() => onChange("")}>
            {t("bonanza.common.clear")}
          </Button>
        )}
      </div>
    </div>
  )
}

export function FormFields({
  fields,
  values,
  onChange,
}: {
  fields: FieldSpec[]
  values: Record<string, any>
  onChange: (name: string, value: unknown) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      {fields
        .filter((field) => !field.when || field.when(values))
        .map((field) => {
          const id = `field-${field.name}`
          const value = values[field.name]
          const text = value == null ? "" : String(value)
          let control: ReactNode

          switch (field.type) {
            case "textarea":
              control = (
                <Textarea
                  id={id}
                  rows={3}
                  value={text}
                  onChange={(event) => onChange(field.name, event.target.value)}
                />
              )
              break
            case "markdown":
              control = (
                <Textarea
                  id={id}
                  rows={16}
                  className="font-mono"
                  value={text}
                  onChange={(event) => onChange(field.name, event.target.value)}
                />
              )
              break
            case "image":
              control = (
                <ImageInput value={text} onChange={(next) => onChange(field.name, next)} />
              )
              break
            case "switch":
              control = (
                <Switch
                  id={id}
                  checked={!!value}
                  onCheckedChange={(checked) => onChange(field.name, checked)}
                />
              )
              break
            case "select":
              control = (
                <Select value={text || undefined} onValueChange={(next) => onChange(field.name, next)}>
                  <Select.Trigger id={id}>
                    <Select.Value placeholder="—" />
                  </Select.Trigger>
                  <Select.Content>
                    {(typeof field.options === "function"
                      ? field.options(values)
                      : (field.options ?? [])
                    ).map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              )
              break
            case "number":
              control = (
                <Input
                  id={id}
                  type="number"
                  dir="ltr"
                  value={text}
                  onChange={(event) =>
                    onChange(field.name, event.target.value === "" ? null : Number(event.target.value))
                  }
                />
              )
              break
            case "datetime":
              control = (
                <Input
                  id={id}
                  type="datetime-local"
                  dir="ltr"
                  value={toLocalInput(value)}
                  onChange={(event) =>
                    onChange(
                      field.name,
                      event.target.value ? new Date(event.target.value).toISOString() : null
                    )
                  }
                />
              )
              break
            default:
              control = (
                <Input
                  id={id}
                  dir={field.ltr || field.type === "url" ? "ltr" : undefined}
                  value={text}
                  onChange={(event) => onChange(field.name, event.target.value)}
                />
              )
          }

          return (
            <div
              key={field.name}
              className={
                field.type === "switch" ? "flex items-center justify-between gap-4" : "flex flex-col gap-2"
              }
            >
              <div>
                <Label htmlFor={id} weight="plus" size="small">
                  {field.label}
                  {field.required && <span className="text-ui-fg-error"> *</span>}
                </Label>
                {field.hint && <Hint className="mt-1 block">{field.hint}</Hint>}
              </div>
              {control}
            </div>
          )
        })}
    </div>
  )
}

/** A side drawer holding a `FormFields` form with Save and Cancel. */
export function RecordDrawer({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initial,
  onSave,
  saving,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  fields: FieldSpec[]
  initial: Record<string, any>
  onSave: (values: Record<string, any>) => void
  saving?: boolean
  /** Extra controls rendered under the fields. Receives the live values. */
  children?: (values: Record<string, any>, set: (name: string, value: unknown) => void) => ReactNode
}) {
  const { t } = useTranslation()
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        {/* Remounted per record so the form always starts from that record. */}
        {open && (
          <DrawerForm
            key={String(initial.id ?? "new")}
            title={title}
            description={description}
            fields={fields}
            initial={initial}
            onSave={onSave}
            saving={saving}
            cancelLabel={t("bonanza.common.cancel")}
            saveLabel={t("bonanza.common.save")}
          >
            {children}
          </DrawerForm>
        )}
      </Drawer.Content>
    </Drawer>
  )
}

function DrawerForm({
  title,
  description,
  fields,
  initial,
  onSave,
  saving,
  cancelLabel,
  saveLabel,
  children,
}: {
  title: string
  description?: string
  fields: FieldSpec[]
  initial: Record<string, any>
  onSave: (values: Record<string, any>) => void
  saving?: boolean
  cancelLabel: string
  saveLabel: string
  children?: (values: Record<string, any>, set: (name: string, value: unknown) => void) => ReactNode
}) {
  const [values, setValues] = useState<Record<string, any>>(initial)
  const set = (name: string, value: unknown) =>
    setValues((current) => ({ ...current, [name]: value }))

  return (
    <form
      className="flex h-full flex-col overflow-hidden"
      onSubmit={(event) => {
        event.preventDefault()
        onSave(values)
      }}
    >
      <Drawer.Header>
        <Drawer.Title>{title}</Drawer.Title>
        {description && (
          <Drawer.Description asChild>
            <Text size="small" className="text-ui-fg-subtle">
              {description}
            </Text>
          </Drawer.Description>
        )}
      </Drawer.Header>
      <Drawer.Body className="flex-1 overflow-y-auto">
        <FormFields fields={fields} values={values} onChange={set} />
        {children && <div className="mt-5">{children(values, set)}</div>}
      </Drawer.Body>
      <Drawer.Footer>
        <Drawer.Close asChild>
          <Button type="button" variant="secondary">
            {cancelLabel}
          </Button>
        </Drawer.Close>
        <Button type="submit" isLoading={saving}>
          {saveLabel}
        </Button>
      </Drawer.Footer>
    </form>
  )
}
