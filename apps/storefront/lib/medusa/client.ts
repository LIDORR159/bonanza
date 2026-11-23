import "server-only"
import Medusa from "@medusajs/js-sdk"
import type { CacheTag } from "../cache-tags"
import { BACKEND_URL, PUBLISHABLE_KEY, REVALIDATE_SECONDS } from "../config"

/**
 * The Medusa JS SDK, used on the server only. The browser never talks to the
 * backend directly, so tokens and the cart id stay in httpOnly cookies.
 */
export const sdk = new Medusa({
  baseUrl: BACKEND_URL,
  publishableKey: PUBLISHABLE_KEY,
  debug: false,
})

type Query = Record<string, unknown>

/**
 * Reads public catalog or content data. The response is cached, tagged and
 * refreshed in the background, so pages built from it can be served from the
 * CDN. Never use it for anything tied to a visitor.
 */
export async function cachedFetch<T>(
  path: string,
  options: { query?: Query; tags: CacheTag[]; revalidate?: number; headers?: Record<string, string> }
): Promise<T> {
  return sdk.client.fetch<T>(path, {
    method: "GET",
    query: options.query,
    headers: options.headers,
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
