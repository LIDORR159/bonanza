"use client"

import clsx from "clsx"
import { usePathname } from "next/navigation"
import { useLocale, useT } from "@/components/i18n/locale-provider"
import { LOCALES, LOCALE_SETTINGS } from "@/lib/config"
import { localePath, splitLocale } from "@/lib/i18n"

/**
 * Switches between Hebrew, English and Arabic, staying on the same page. Each
 * language is named in its own script. Plain anchors on purpose: a language
 * change also changes the page direction and fonts, so a full load is the
 * honest thing to do.
 */
export function LanguageSwitcher({
  className = "inline-flex",
}: {
  /** Display classes, e.g. `hidden xl:inline-flex`. */
  className?: string
}) {
  const t = useT()
  const current = useLocale()
  const page = splitLocale(usePathname()).rest

  return (
    <div
      role="group"
      aria-label={t.languages.label}
      dir="ltr"
      className={clsx(
        "items-center rounded-md border border-ink-600 p-0.5 text-[0.8rem] font-semibold",
        className
      )}
    >
      {LOCALES.map((locale) => {
        const { label, short } = LOCALE_SETTINGS[locale]
        const active = locale === current
        return (
          <a
            key={locale}
            href={localePath(locale, page)}
            lang={locale}
            hrefLang={locale}
            title={label}
            aria-label={label}
            aria-current={active ? "true" : undefined}
            className={clsx(
              // System font: the one Arabic letter here should not pull in the
              // Arabic web font on Hebrew and English pages.
              "inline-flex h-8 min-w-9 items-center justify-center rounded-[5px] px-2 font-[system-ui] transition",
              active ? "bg-paper text-ink-950" : "text-mist-300 hover:text-paper"
            )}
          >
            {short}
          </a>
        )
      })}
    </div>
  )
}
