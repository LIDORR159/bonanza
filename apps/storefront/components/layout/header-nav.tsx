"use client"

import type { StoreNavigationItem } from "@bonanza/types"
import clsx from "clsx"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { ChevronDownIcon, CloseIcon, MenuIcon } from "@/components/ui/icons"
import { t } from "@/lib/i18n"

/**
 * Whether a menu link points at the page being viewed. A link with a query
 * string (such as the sale filter) is a filtered view of another page, so it
 * is never marked as the current page on its own.
 */
const isCurrent = (pathname: string, url: string) => {
  if (url.includes("?") || /^https?:/.test(url)) {
    return false
  }
  return url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(`${url}/`)
}

const linkProps = (item: StoreNavigationItem) =>
  item.open_in_new_tab ? { target: "_blank", rel: "noopener noreferrer" } : {}

/** Desktop menu: a row of links, the current one underlined, children in a panel. */
export function DesktopNav({ items }: { items: StoreNavigationItem[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState<string | null>(null)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => setOpen(null), [pathname])

  useEffect(() => {
    if (!open) {
      return
    }
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(null)
      }
    }
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(null)
    window.addEventListener("pointerdown", onPointer)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointerdown", onPointer)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <nav ref={ref} aria-label={t.nav.main} className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {items.map((item) => {
          const current = isCurrent(pathname, item.url)
          const linkClass = clsx(
            "relative inline-flex h-11 items-center px-3.5 text-[0.95rem] font-medium transition",
            "after:absolute after:inset-x-3.5 after:bottom-1.5 after:h-px after:origin-center after:bg-paper after:transition-transform",
            current
              ? "text-paper after:scale-x-100"
              : "text-mist-300 hover:text-paper after:scale-x-0 hover:after:scale-x-100"
          )
          if (!item.children.length) {
            return (
              <li key={item.id}>
                <Link
                  href={item.url}
                  className={linkClass}
                  aria-current={current ? "page" : undefined}
                  {...linkProps(item)}
                >
                  {item.label}
                </Link>
              </li>
            )
          }
          const expanded = open === item.id
          return (
            <li key={item.id} className="relative">
              <button
                type="button"
                className={clsx(linkClass, "gap-1")}
                aria-expanded={expanded}
                aria-controls={`nav-panel-${item.id}`}
                onClick={() => setOpen(expanded ? null : item.id)}
              >
                {item.label}
                <ChevronDownIcon
                  className={clsx("size-4 transition-transform", expanded && "rotate-180")}
                />
              </button>
              {expanded && (
                <div
                  id={`nav-panel-${item.id}`}
                  className="absolute start-0 top-full z-40 mt-2 w-72 rounded-lg border border-ink-600 bg-ink-850 p-2 shadow-raised animate-fade"
                >
                  <ul>
                    <li>
                      <Link
                        href={item.url}
                        className="block rounded-md px-3 py-2.5 text-sm font-semibold text-paper hover:bg-white/5"
                      >
                        {item.label}
                      </Link>
                    </li>
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={child.url}
                          className="block rounded-md px-3 py-2.5 text-sm text-mist-200 hover:bg-white/5 hover:text-paper"
                          {...linkProps(child)}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Mobile menu: a full-height panel opened from the header. */
export function MobileNav({ items }: { items: StoreNavigationItem[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) {
      return
    }
    closeRef.current?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-md text-mist-200 hover:bg-white/5 hover:text-paper"
        aria-label={t.nav.openMenu}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-label={t.nav.menu}
          className="fixed inset-0 z-50 flex flex-col bg-ink-950 animate-fade"
        >
          <div className="container-site flex h-17 shrink-0 items-center justify-between border-b border-ink-700">
            <span className="text-lg font-bold">{t.nav.menu}</span>
            <button
              ref={closeRef}
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-md text-mist-200 hover:bg-white/5 hover:text-paper"
              aria-label={t.nav.closeMenu}
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>
          <nav aria-label={t.nav.main} className="container-site flex-1 overflow-y-auto py-4">
            <ul className="divide-y divide-ink-700">
              {items.map((item) => (
                <li key={item.id} className="py-1">
                  <Link
                    href={item.url}
                    className="block py-3 text-xl font-bold text-paper"
                    aria-current={isCurrent(pathname, item.url) ? "page" : undefined}
                    {...linkProps(item)}
                  >
                    {item.label}
                  </Link>
                  {item.children.length > 0 && (
                    <ul className="grid grid-cols-2 gap-x-4 pb-3">
                      {item.children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={child.url}
                            className="block py-2 text-[0.95rem] text-mist-300 hover:text-paper"
                            {...linkProps(child)}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              <li className="py-1">
                <Link href="/account" className="block py-3 text-xl font-bold text-paper">
                  {t.nav.account}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  )
}
