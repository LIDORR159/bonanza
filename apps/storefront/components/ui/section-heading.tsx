import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowIcon } from "./icons"

/** A section title with an optional "see all" link at the end of the line. */
export function SectionHeading({
  title,
  eyebrow,
  link,
  as: Tag = "h2",
}: {
  title: ReactNode
  eyebrow?: string | null
  link?: { label: string; url: string } | null
  as?: "h1" | "h2"
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <Tag className="text-2xl sm:text-3xl">{title}</Tag>
      </div>
      {link && (
        <Link
          href={link.url}
          className="group/link inline-flex items-center gap-1.5 text-sm font-medium text-mist-300 hover:text-paper"
        >
          {link.label}
          <ArrowIcon className="size-4 transition-transform group-hover/link:-translate-x-1" />
        </Link>
      )}
    </div>
  )
}
