import "server-only"
import Medusa from "@medusajs/js-sdk"
import type { CacheTag } from "../cache-tags"
import {
  BACKEND_URL,
  DEFAULT_LOCALE,
  LOCALE_SETTINGS,
  PUBLISHABLE_KEY,
  REVALIDATE_SECONDS,
} from "../config"
import { getLocale } from "../i18n/server"

/**
 * The Medusa JS SDK, used on the server only. The browser never talks to the
 * backend directly, so tokens and the cart id stay in httpOnly cookies.
 */
export const sdk = new Medusa({
  baseUrl: BACKEND_URL,
  publishableKey: PUBLISHABLE_KEY,
  debug: false,
  // This one instance serves every visitor, so it must never remember a
  // sign-in token. Each request passes the visitor's own token explicitly
  // (see cookies.ts); `nostore` makes the SDK keep nothing in between.
  auth: { type: "jwt", jwtTokenStorageMethod: "nostore" },
})

type Query = Record<string, unknown>

/**
 * What a request adds to be answered in the language of the page being
 * rendered. Hebrew is what the backend stores, so it asks for nothing. The
 * language is part of the query, which also keeps each language's cached
 * response apart.
 */
export function localeRequest(): { query: Query; headers: Record<string, string> } {
  const locale = getLocale()
  if (locale === DEFAULT_LOCALE) {
    return { query: {}, headers: {} }
  }
  const code = LOCALE_SETTINGS[locale].medusa
  return { query: { locale: code }, headers: { "x-medusa-locale": code } }
}

/**
 * Reads public catalog or content data. The response is cached, tagged and
 * refreshed in the background, so pages built from it can be served from the
 * CDN. Never use it for anything tied to a visitor.
 */
export async function cachedFetch<T>(
  path: string,
  options: {
    query?: Query
    tags: CacheTag[]
    revalidate?: number
    headers?: Record<string, string>
  }
): Promise<T> {
  const language = localeRequest()
  return sdk.client.fetch<T>(path, {
    method: "GET",
    query: { ...options.query, ...language.query },
    headers: { ...language.headers, ...options.headers },
    next: { tags: options.tags, revalidate: options.revalidate ?? REVALIDATE_SECONDS },
  })
}

/** A request that must never be cached: carts, customers, orders, checkout. */
export async function privateFetch<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "DELETE"
    query?: Query
    body?: unknown
    headers?: Record<string, string>
  } = {}
): Promise<T> {
  return sdk.client.fetch<T>(path, {
    method: options.method ?? "GET",
    query: options.query,
    body: options.body as Record<string, unknown> | undefined,
    headers: options.headers,
    cache: "no-store",
  })
}

/** The message of a failed backend call, without internals. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message)
    if (message && message.length < 200 && !/^fetch failed|ECONNREFUSED/i.test(message)) {
      return message
    }
  }
  return fallback
}

export const isNotFound = (error: unknown): boolean =>
  !!error && typeof error === "object" && (error as { status?: number }).status === 404
