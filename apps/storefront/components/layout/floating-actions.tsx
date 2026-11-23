"use client"

import type { StoreSiteSettings } from "@bonanza/types"
import clsx from "clsx"
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useLocale, useT } from "@/components/i18n/locale-provider"
import {
  AccessibilityIcon,
  CalendarIcon,
  CloseIcon,
  WhatsAppIcon,
} from "@/components/ui/icons"
import { Link } from "@/components/ui/link"
import { LOCALE_SETTINGS } from "@/lib/config"
import { whatsappUrl } from "@/lib/site"

/**
 * The two buttons fixed to the bottom-left corner of every page: the
 * accessibility menu and "contact us" on WhatsApp.
 *
 * Accessibility choices are kept in the browser and applied as `data-a11y-*`
 * attributes on <html>; the matching rules are in globals.css. The same
 * attributes are set before first paint by the inline script in the layout,
 * so a returning visitor never sees the page flash back to the defaults.
 */

export const A11Y_STORAGE_KEY = "bnz_a11y"

type Preferences = { text: 0 | 1 | 2; contrast: boolean; links: boolean; motion: boolean }
const DEFAULTS: Preferences = { text: 0, contrast: false, links: false, motion: false }

function apply(preferences: Preferences) {
  const { dataset } = document.documentElement
  const set = (key: string, on: boolean, value = "on") => {
    if (on) {
      dataset[key] = value
    } else {
      delete dataset[key]
    }
  }
  set("a11yText", preferences.text > 0, String(preferences.text))
  set("a11yContrast", preferences.contrast)
  set("a11yLinks", preferences.links)
  set("a11yMotion", preferences.motion, "off")
}

const parse = (raw: string): Preferences => {
  try {
    return { ...DEFAULTS, ...JSON.parse(raw || "{}") }
  } catch {
    return DEFAULTS
  }
}

// The saved choices as an external store: the server and the first client
// render see the defaults, then the browser's saved value takes over.
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}
const readSaved = () => {
  try {
    return localStorage.getItem(A11Y_STORAGE_KEY) ?? ""
  } catch {
    return ""
  }
}
// Private browsing may refuse storage; the choice then lasts for this page.
let unsaved: string | null = null
const save = (preferences: Preferences) => {
  const raw = JSON.stringify(preferences)
  try {
    localStorage.setItem(A11Y_STORAGE_KEY, raw)
    unsaved = null
  } catch {
    unsaved = raw
  }
  apply(preferences)
  listeners.forEach((listener) => listener())
}

function AccessibilityMenu() {
  const t = useT()
  const { dir } = LOCALE_SETTINGS[useLocale()]
  const [open, setOpen] = useState(false)
  const raw = useSyncExternalStore(
    subscribe,
    () => unsaved ?? readSaved(),
    () => ""
  )
  const preferences = useMemo(() => parse(raw), [raw])
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("pointerdown", onPointer)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("pointerdown", onPointer)
    }
  }, [open])

  const update = (change: Partial<Preferences>) => save({ ...preferences, ...change })

  const toggles: { key: "contrast" | "links" | "motion"; label: string }[] = [
    { key: "contrast", label: t.a11y.highContrast },
    { key: "links", label: t.a11y.highlightLinks },
    { key: "motion", label: t.a11y.stopMotion },
  ]
  const sizeButton =
    "inline-flex size-10 items-center justify-center rounded-md border border-ink-500 text-lg font-bold text-paper hover:border-paper disabled:opacity-40"

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t.a11y.open}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-12 items-center justify-center rounded-full border border-ink-500 bg-ink-850 text-paper shadow-raised transition hover:border-paper"
      >
        <AccessibilityIcon className="size-6" />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t.a11y.title}
          dir={dir}
          className="absolute bottom-full left-0 mb-3 w-72 rounded-lg border border-ink-600 bg-ink-850 p-4 text-start shadow-raised animate-fade"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">{t.a11y.title}</h2>
            <button
              type="button"
              aria-label={t.common.close}
              onClick={() => setOpen(false)}
              className="inline-flex size-9 items-center justify-center rounded-md text-mist-300 hover:bg-white/5 hover:text-paper"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-ink-700 pb-3">
            <span className="text-sm text-mist-200">{t.a11y.textSize}</span>
            <span className="flex gap-2" dir="ltr">
              <button
                type="button"
                className={sizeButton}
                aria-label={t.a11y.decreaseText}
                disabled={preferences.text === 0}
                onClick={() =>
                  update({ text: Math.max(0, preferences.text - 1) as 0 | 1 | 2 })
                }
              >
                A−
              </button>
              <button
                type="button"
                className={sizeButton}
                aria-label={t.a11y.increaseText}
                disabled={preferences.text === 2}
                onClick={() =>
                  update({ text: Math.min(2, preferences.text + 1) as 0 | 1 | 2 })
                }
              >
                A+
              </button>
            </span>
          </div>

          <ul className="divide-y divide-ink-700">
            {toggles.map(({ key, label }) => (
              <li key={key}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences[key]}
                  onClick={() => update({ [key]: !preferences[key] })}
                  className="flex w-full items-center justify-between gap-3 py-3 text-sm text-mist-200 hover:text-paper"
                >
                  {label}
                  <span
                    aria-hidden="true"
                    dir="ltr"
                    className={clsx(
                      "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors",
                      preferences[key]
                        ? "justify-end bg-paper"
                        : "justify-start bg-ink-600"
                    )}
                  >
                    <span
                      className={clsx(
                        "size-5 rounded-full",
                        preferences[key] ? "bg-ink-950" : "bg-mist-300"
                      )}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={() => update(DEFAULTS)}
              className="text-mist-300 underline underline-offset-4 hover:text-paper"
            >
              {t.a11y.reset}
            </button>
            <Link
              href="/accessibility"
              onClick={() => setOpen(false)}
              className="text-mist-300 underline underline-offset-4 hover:text-paper"
            >
              {t.a11y.statement}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export function FloatingActions({
  settings,
}: {
  settings: Pick<StoreSiteSettings, "contact_whatsapp" | "contact_phone" | "booking_url">
}) {
  const t = useT()
  const { dir } = LOCALE_SETTINGS[useLocale()]
  const whatsapp = whatsappUrl(
    settings.contact_whatsapp || settings.contact_phone,
    t.contact.whatsappMessage
  )
  const pill =
    "inline-flex h-12 items-center gap-2 rounded-full bg-whatsapp px-5 text-[0.95rem] font-bold text-ink-950 shadow-raised transition hover:brightness-110 max-[359px]:px-3.5"

  return (
    <>
      {settings.booking_url && (
        <a
          href={settings.booking_url}
          target="_blank"
          rel="noopener noreferrer"
          data-booking-link
          dir={dir}
          className="fixed bottom-4 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-paper px-5 text-[0.95rem] font-bold text-ink-950 shadow-raised transition hover:bg-white print:hidden"
        >
          <CalendarIcon className="size-5" />
          <span>{t.booking.cta}</span>
          <span className="sr-only"> ({t.booking.newTab})</span>
        </a>
      )}
      {/* Always the physical bottom-left corner, in every language. */}
      <div
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2.5 print:hidden"
        dir="ltr"
      >
        <AccessibilityMenu />
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.contact.whatsappLabel}
            className={pill}
            dir={dir}
          >
            <WhatsAppIcon className="size-5.5" />
            <span className="max-[359px]:sr-only">{t.contact.whatsappCta}</span>
          </a>
        ) : (
          // No number set yet: lead to the contact details in the footer.
          <Link href="/#contact" aria-label={t.contact.title} className={pill} dir={dir}>
            <WhatsAppIcon className="size-5.5" />
            <span className="max-[359px]:sr-only">{t.contact.whatsappCta}</span>
          </Link>
        )}
      </div>
    </>
  )
}
