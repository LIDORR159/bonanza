import clsx from "clsx"
import { Link } from "@/components/ui/link"
import { buttonClass } from "@/components/ui/button"
import { inputClass } from "@/components/ui/field"
import { FilterIcon } from "@/components/ui/icons"
import {
  catalogHref,
  hasActiveFilters,
  type ParsedCatalogParams,
} from "@/lib/catalog-params"
import { getT } from "@/lib/i18n/server"
import type { CatalogResult, SortOption } from "@/lib/medusa/catalog"

type Props = {
  basePath: string
  params: ParsedCatalogParams
  facets: CatalogResult["facets"]
  /** Brand handle → display name. */
  brandNames: Record<string, string>
  /** Hide the brand filter, e.g. on a brand's own page. */
  hideBrand?: boolean
  categories?: { name: string; href: string; current: boolean }[]
}

/**
 * The filter panel. It is a plain GET form: choosing filters and pressing the
 * button loads the same page with new parameters, with or without JavaScript.
 * On small screens it folds into a <details> element.
 */
export function CatalogFilters({
  basePath,
  params,
  facets,
  brandNames,
  hideBrand,
  categories,
}: Props) {
  const t = getT()
  const sortOptions: SortOption[] = params.q
    ? ["relevance", "newest", "price-asc", "price-desc", "title"]
    : ["newest", "price-asc", "price-desc", "title"]

  // The form appears twice, folded on phones and open on desktop. `idPrefix`
  // keeps the two copies' element ids apart.
  const form = (idPrefix: string) => (
    <form action={basePath} method="get" className="space-y-7">
      {params.q && <input type="hidden" name="q" value={params.q} />}

      <fieldset>
        <legend className="mb-2.5 text-sm font-semibold text-paper">
          {t.catalog.sort}
        </legend>
        <label htmlFor={`${idPrefix}-catalog-sort`} className="sr-only">
          {t.catalog.sort}
        </label>
        <select
          id={`${idPrefix}-catalog-sort`}
          name="sort"
          defaultValue={params.sort ?? sortOptions[0]}
          className={clsx(inputClass, "h-11 text-sm")}
        >
          {sortOptions.map((option) => (
            <option key={option} value={option}>
              {t.catalog.sortOptions[option]}
            </option>
          ))}
        </select>
      </fieldset>

      {categories && categories.length > 0 && (
        <div>
          <p className="mb-2.5 text-sm font-semibold text-paper">{t.catalog.category}</p>
          <ul className="space-y-0.5 text-sm">
            {categories.map((category) => (
              <li key={category.href}>
                <Link
                  href={category.href}
                  aria-current={category.current ? "page" : undefined}
                  className={clsx(
                    "block rounded-md px-2.5 py-1.5 transition",
                    category.current
                      ? "bg-white/8 font-semibold text-paper"
                      : "text-mist-300 hover:bg-white/5 hover:text-paper"
                  )}
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!hideBrand && facets.brands.length > 0 && (
        <fieldset>
          <legend className="mb-2.5 text-sm font-semibold text-paper">
            {t.catalog.brand}
          </legend>
          <ul className="space-y-1.5 text-sm">
            {facets.brands.map((brand) => (
              <li key={brand.value}>
                <label className="flex cursor-pointer items-center gap-2.5 text-mist-200 hover:text-paper">
                  <input
                    type="radio"
                    name="brand"
                    value={brand.value}
                    defaultChecked={params.brand === brand.value}
                    className="size-4 accent-[var(--color-paper)]"
                  />
                  <bdi className="flex-1">{brandNames[brand.value] ?? brand.value}</bdi>
                  <span className="text-xs text-mist-400">{brand.count}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-2.5 text-sm font-semibold text-paper">
          {t.catalog.priceRange}
        </legend>
        <div className="flex items-center gap-2">
          <label htmlFor={`${idPrefix}-catalog-min`} className="sr-only">
            {t.catalog.minPrice}
          </label>
          <input
            id={`${idPrefix}-catalog-min`}
            name="min"
            type="number"
            inputMode="numeric"
            min={0}
            dir="ltr"
            placeholder={facets.price ? `₪${facets.price.min}` : t.catalog.minPrice}
            defaultValue={params.minPrice}
            className={clsx(inputClass, "h-11 text-sm")}
          />
          <span aria-hidden="true" className="text-mist-400">
            –
          </span>
          <label htmlFor={`${idPrefix}-catalog-max`} className="sr-only">
            {t.catalog.maxPrice}
          </label>
          <input
            id={`${idPrefix}-catalog-max`}
            name="max"
            type="number"
            inputMode="numeric"
            min={0}
            dir="ltr"
            placeholder={facets.price ? `₪${facets.price.max}` : t.catalog.maxPrice}
            defaultValue={params.maxPrice}
            className={clsx(inputClass, "h-11 text-sm")}
          />
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-mist-200 hover:text-paper">
        <input
          type="checkbox"
          name="sale"
          value="1"
          defaultChecked={params.onSale}
          className="size-4 accent-[var(--color-paper)]"
        />
        {t.catalog.onSaleOnly}
      </label>

      <div className="flex flex-col gap-2.5">
        <button type="submit" className={buttonClass("primary", "md", "w-full")}>
          {t.catalog.apply}
        </button>
        {hasActiveFilters(params) && (
          <Link
            href={catalogHref(basePath, params, {
              brand: null,
              min: null,
              max: null,
              sale: null,
              page: null,
            })}
            className={buttonClass("ghost", "sm", "w-full")}
          >
            {t.catalog.clearFilters}
          </Link>
        )}
      </div>
    </form>
  )

  return (
    <>
      <details className="group rounded-lg border border-ink-600 bg-ink-850 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <FilterIcon className="size-5" />
            {t.catalog.showFilters}
          </span>
          <span
            aria-hidden="true"
            className="text-mist-400 transition group-open:rotate-45"
          >
            +
          </span>
        </summary>
        <div className="border-t border-ink-600 p-4">{form("m")}</div>
      </details>
      <aside aria-label={t.catalog.filters} className="hidden lg:block">
        {form("d")}
      </aside>
    </>
  )
}
