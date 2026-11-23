import { Link } from "@/components/ui/link"
import { breadcrumbJsonLd, JsonLd } from "@/components/seo/json-ld"
import { getT } from "@/lib/i18n/server"

export type Crumb = { name: string; path: string }

/** The trail above a page title. The last item is the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = getT()
  const trail = [{ name: t.common.home, path: "/" }, ...items]
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(trail)} />
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-mist-400">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {trail.map((item, index) => {
            const last = index === trail.length - 1
            return (
              <li key={item.path} className="flex items-center gap-2">
                {index > 0 && <span aria-hidden="true">/</span>}
                {last ? (
                  <span aria-current="page" className="text-mist-200">
                    {item.name}
                  </span>
                ) : (
                  <Link href={item.path} className="hover:text-paper">
                    {item.name}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
