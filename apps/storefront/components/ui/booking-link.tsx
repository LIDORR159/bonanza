"use client"

import { useT } from "@/components/i18n/locale-provider"
import { buttonClass } from "./button"
import { CalendarIcon } from "./icons"

/**
 * The "book an appointment" button. Booking happens on an external page, so it
 * opens in a new tab and says so to screen readers. With no booking address
 * set in the admin it renders nothing.
 */
export function BookingLink({
  href,
  label,
  size = "md",
  variant = "primary",
  icon = false,
  className,
}: {
  href: string | null | undefined
  /** Defaults to the short "book an appointment" text. */
  label?: string
  size?: "sm" | "md" | "lg"
  variant?: "primary" | "secondary"
  icon?: boolean
  className?: string
}) {
  const t = useT()
  if (!href) {
    return null
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-booking-link
      className={buttonClass(variant, size, className)}
    >
      {icon && <CalendarIcon className="size-5" />}
      {label ?? t.booking.cta}
      <span className="sr-only"> ({t.booking.newTab})</span>
    </a>
  )
}
