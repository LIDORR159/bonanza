"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useCart } from "@/components/cart/cart-context"
import { CartIcon, CloseIcon, SearchIcon, UserIcon } from "@/components/ui/icons"
import { t } from "@/lib/i18n"

const iconButton =
  "relative inline-flex size-11 items-center justify-center rounded-md text-mist-200 " +
  "transition hover:bg-white/5 hover:text-paper"

/** Search, account and cart, at the end of the header. */
export function HeaderActions() {
  const { count } = useCart()
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!searchOpen) {
      return
    }
    inputRef.current?.focus()
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setSearchOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [searchOpen])

  return (
    <>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className={iconButton}
          aria-label={t.nav.search}
          aria-expanded={searchOpen}
          aria-controls="site-search"
          onClick={() => setSearchOpen((open) => !open)}
        >
          {searchOpen ? <CloseIcon /> : <SearchIcon />}
        </button>
        <Link href="/account" className={`${iconButton} max-sm:hidden`} aria-label={t.nav.account}>
          <UserIcon />
        </Link>
        <Link
          href="/cart"
          className={iconButton}
          aria-label={count ? t.nav.cartWithCount(count) : t.nav.cart}
        >
          <CartIcon />
          {!!count && (
            <span
              aria-hidden="true"
              className="absolute end-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-paper px-1 text-[0.7rem] font-bold leading-5 text-ink-950"
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Link>
      </div>

      {searchOpen && (
        <div
          id="site-search"
          className="absolute inset-x-0 top-full border-b border-ink-600 bg-ink-900/98 backdrop-blur animate-fade"
        >
          <form
            role="search"
            className="container-site flex items-center gap-3 py-4"
            onSubmit={(event) => {
              event.preventDefault()
              const query = inputRef.current?.value.trim()
              setSearchOpen(false)
              router.push(query ? `/products?q=${encodeURIComponent(query)}` : "/products")
            }}
          >
            <SearchIcon className="shrink-0 text-mist-400" />
            <label htmlFor="site-search-input" className="sr-only">
              {t.nav.search}
            </label>
            <input
              ref={inputRef}
              id="site-search-input"
              type="search"
              name="q"
              placeholder={t.nav.searchPlaceholder}
              autoComplete="off"
              enterKeyHint="search"
              className="h-11 w-full bg-transparent text-lg text-paper placeholder:text-mist-400 focus:outline-none"
            />
            <button
              type="submit"
              className="h-10 shrink-0 rounded-md bg-paper px-5 text-sm font-semibold text-ink-950 hover:bg-white"
            >
              {t.nav.search}
            </button>
          </form>
        </div>
      )}
    </>
  )
}
