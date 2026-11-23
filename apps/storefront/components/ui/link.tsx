"use client"

import NextLink from "next/link"
import type { ComponentProps } from "react"
import { useLocale } from "@/components/i18n/locale-provider"
import { localePath } from "@/lib/i18n"

type Props = Omit<ComponentProps<typeof NextLink>, "href"> & { href: string }

/**
 * `next/link` that keeps the visitor in their language: `/products` leads to
 * `/en/products` on an English page. Use it for every internal link.
 */
export function Link({ href, ...props }: Props) {
  const locale = useLocale()
  return <NextLink href={localePath(locale, href)} {...props} />
}
