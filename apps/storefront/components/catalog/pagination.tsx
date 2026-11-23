import clsx from "clsx"
import { Link } from "@/components/ui/link"
import { catalogHref, type ParsedCatalogParams } from "@/lib/catalog-params"
import { getT } from "@/lib/i18n/server"

const cell =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm transition"

/** Page links. Shows the first, last and current pages with their neighbours. */
export function Pagination({
  basePath,
  params,
  pageCount,
}: {
  basePath: string
  params: ParsedCatalogParams
  pageCount: number
}) {
  const t = getT()
  if (pageCount <= 1) {
    return null
  }
  const current = Math.min(params.page, pageCount)
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (page) => page === 1 || page === pageCount || Math.abs(page - current) <= 1
  )
  const href = (page: number) =>
    catalogHref(basePath, params, { page: page > 1 ? String(page) : null })

  return (
    <nav aria-label={t.catalog.pagination} className="mt-12 flex justify-center">
      <ul className="flex flex-wrap items-center gap-2">
        {current > 1 && (
          <li>
            <Link
              href={href(current - 1)}
              rel="prev"
              className={clsx(
                cell,
                "border-ink-500 text-mist-200 hover:border-paper hover:text-paper"
              )}
            >
              {t.catalog.previous}
            </Link>
          </li>
        )}
        {pages.map((page, index) => (
          <li key={page} className="flex items-center gap-2">
            {index > 0 && page - pages[index - 1]! > 1 && (
              <span aria-hidden="true" className="text-mist-400">
                …
              </span>
            )}
            {page === current ? (
              <span
                aria-current="page"
                aria-label={t.catalog.page(page)}
                className={clsx(cell, "border-paper bg-paper font-bold text-ink-950")}
              >
                {page}
              </span>
            ) : (
              <Link
                href={href(page)}
                aria-label={t.catalog.page(page)}
                className={clsx(
                  cell,
                  "border-ink-500 text-mist-200 hover:border-paper hover:text-paper"
                )}
              >
                {page}
              </Link>
            )}
          </li>
        ))}
        {current < pageCount && (
          <li>
            <Link
              href={href(current + 1)}
              rel="next"
              className={clsx(
                cell,
                "border-ink-500 text-mist-200 hover:border-paper hover:text-paper"
              )}
            >
              {t.catalog.next}
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
