"use client"

import clsx from "clsx"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { t } from "@/lib/i18n"

const LINKS = [
  { href: "/account", label: t.account.overview, exact: true },
  { href: "/account/orders", label: t.account.orders },
  { href: "/account/addresses", label: t.account.addresses },
  { href: "/account/profile", label: t.account.profile },
]

export function AccountNav() {
  const pathname = usePathname()
  return (
    <ul className="flex gap-1 overflow-x-auto lg:flex-col">
      {LINKS.map((link) => {
        const current = link.exact ? pathname === link.href : pathname.startsWith(link.href)
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={current ? "page" : undefined}
              className={clsx(
                "block whitespace-nowrap rounded-md px-3.5 py-2.5 text-[0.95rem] transition",
                current
                  ? "bg-white/8 font-semibold text-paper"
                  : "text-mist-300 hover:bg-white/5 hover:text-paper"
              )}
            >
              {link.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
