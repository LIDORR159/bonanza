"use client"

import clsx from "clsx"
import type { ComponentProps, ReactNode } from "react"
import { useT } from "@/components/i18n/locale-provider"

export const inputClass =
  "block h-12 w-full rounded-md border border-ink-500 bg-ink-900 px-3.5 text-base text-paper " +
  "placeholder:text-mist-400 transition focus:border-paper focus:outline-none " +
  "focus:ring-1 focus:ring-paper aria-[invalid=true]:border-danger"

type FieldProps = Omit<ComponentProps<"input">, "id"> & {
  label: string
  name: string
  hint?: string
  error?: string
  /** Text that reads left to right even in Hebrew: email, phone, codes. */
  ltr?: boolean
}

/** A labelled text input with its hint and error wired up for screen readers. */
export function Field({
  label,
  name,
  hint,
  error,
  ltr,
  required,
  className,
  ...props
}: FieldProps) {
  const t = useT()
  const id = `field-${name.replace(/[^a-z0-9]+/gi, "-")}`
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ")
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-baseline gap-1.5 text-sm font-medium text-mist-200"
      >
        {label}
        {!required && (
          <span className="text-xs font-normal text-mist-400">({t.common.optional})</span>
        )}
      </label>
      <input
        id={id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        dir={ltr ? "ltr" : undefined}
        className={clsx(inputClass, ltr && "text-start")}
        {...props}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-mist-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function FormMessage({
  tone,
  children,
}: {
  tone: "error" | "success" | "info"
  children: ReactNode
}) {
  if (!children) {
    return null
  }
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-md border px-4 py-3 text-sm",
        tone === "error" && "border-danger/40 bg-danger/10 text-danger",
        tone === "success" && "border-success/40 bg-success/10 text-success",
        tone === "info" && "border-ink-500 bg-ink-850 text-mist-200"
      )}
    >
      {children}
    </p>
  )
}
