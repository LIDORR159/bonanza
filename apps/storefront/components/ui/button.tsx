import clsx from "clsx"
import { Link } from "@/components/ui/link"
import type { ComponentProps, ReactNode } from "react"

type Variant = "primary" | "secondary" | "ghost"
type Size = "md" | "lg" | "sm"

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition " +
  "duration-200 disabled:cursor-not-allowed disabled:opacity-50 select-none whitespace-nowrap"

const variants: Record<Variant, string> = {
  // The solid white button from the references.
  primary: "bg-paper text-ink-950 hover:bg-white active:scale-[0.98]",
  secondary:
    "border border-ink-500 text-paper hover:border-paper hover:bg-white/5 active:scale-[0.98]",
  ghost: "text-mist-200 hover:text-paper underline-offset-4 hover:underline",
}

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-[0.95rem]",
  lg: "h-13 px-8 text-base",
}

export const buttonClass = (
  variant: Variant = "primary",
  size: Size = "md",
  extra?: string
) => clsx(base, variants[variant], sizes[size], extra)

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size }

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...props} />
  )
}

type ButtonLinkProps = {
  href: string
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
  target?: string
}

/** A link that looks like a button. External addresses open as plain anchors. */
export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  target,
}: ButtonLinkProps) {
  const classes = buttonClass(variant, size, className)
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} className={classes} target={target} rel="noopener noreferrer">
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  )
}
