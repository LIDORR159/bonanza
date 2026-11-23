import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import Redis from "ioredis"
import {
  RateLimiterMemory,
  RateLimiterRedis,
  type RateLimiterAbstract,
  type RateLimiterRes,
} from "rate-limiter-flexible"
import { sign, signaturesMatch } from "./signing"

/**
 * Request rate limiting for the routes attackers probe: sign-in, registration,
 * password reset and newsletter sign-up. Medusa has none built in.
 *
 * Counters live in Redis when REDIS_URL is set, so they are shared by every
 * backend process; otherwise they are kept in memory (single process only).
 */

type Rule = {
  /** Namespace for the counters. */
  name: string
  /** Allowed requests per window. */
  points: number
  /** Window length in seconds. */
  duration: number
  /** What is counted. Return null to skip this rule for a request. */
  key: (req: MedusaRequest) => string | null
}

let redis: Redis | null = null
const limiters = new Map<string, RateLimiterAbstract>()

const isEnabled = () =>
  process.env.RATE_LIMIT_ENABLED === "true" ||
  (process.env.RATE_LIMIT_ENABLED !== "false" && process.env.NODE_ENV === "production")

function limiterFor(rule: Rule): RateLimiterAbstract {
  let limiter = limiters.get(rule.name)
  if (limiter) {
    return limiter
  }
  const options = {
    keyPrefix: `rl:${rule.name}`,
    points: rule.points,
    duration: rule.duration,
  }
  if (process.env.REDIS_URL) {
    redis ??= new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    })
    limiter = new RateLimiterRedis({
      ...options,
      storeClient: redis,
      // If Redis is unreachable, keep limiting in memory rather than failing
      // open or blocking every sign-in.
      insuranceLimiter: new RateLimiterMemory(options),
    })
  } else {
    limiter = new RateLimiterMemory(options)
  }
  limiters.set(rule.name, limiter)
  return limiter
}

const STOREFRONT_VISITOR_HEADER = "x-storefront-visitor"
const VISITOR_MAX_AGE_MS = 5 * 60_000
const IP_ADDRESS = /^[0-9a-fA-F:.]{3,45}$/

/**
 * The visitor a storefront request is made for.
 *
 * Shoppers never call the backend themselves: the storefront server does, so
 * every sign-in would otherwise arrive from the storefront's own address and
 * all shoppers would share one rate limit. The storefront therefore states
 * the visitor's address in a header, `<time>|<address>|<signature>`, signed
 * with the secret the two already share (REVALIDATE_SECRET). An unsigned,
 * stale or malformed header is ignored, so nobody else can choose the address
 * they are counted under.
 */
function visitorFromStorefront(req: MedusaRequest): string | null {
  const secret = process.env.REVALIDATE_SECRET
  const header = req.headers[STOREFRONT_VISITOR_HEADER]
  if (!secret || typeof header !== "string") {
    return null
  }
  const [timestamp, address, signature, ...extra] = header.split("|")
  if (!timestamp || !address || !signature || extra.length || !IP_ADDRESS.test(address)) {
    return null
  }
  const age = Date.now() - Number(timestamp)
  if (!Number.isFinite(age) || Math.abs(age) > VISITOR_MAX_AGE_MS) {
    return null
  }
  return signaturesMatch(sign(secret, `visitor|${timestamp}|${address}`), signature)
    ? address
    : null
}

/**
 * The visitor's address: the one the storefront vouches for, when the request
 * comes through it; otherwise the caller's own. Behind Cloudflare the socket
 * peer is Cloudflare, so the caller's address comes from CF-Connecting-IP.
 * That header is trusted only when TRUST_CLOUDFLARE_IP=true, which must be set
 * only when the origin accepts traffic from Cloudflare alone.
 */
export function clientIp(req: MedusaRequest): string {
  const visitor = visitorFromStorefront(req)
  if (visitor) {
    return visitor
  }
  if (process.env.TRUST_CLOUDFLARE_IP === "true") {
    const header = req.headers["cf-connecting-ip"]
    if (typeof header === "string" && header) {
      return header
    }
  }
  return req.ip || req.socket?.remoteAddress || "unknown"
}

export const byIp = (req: MedusaRequest) => clientIp(req)

/** Counts per email address in the body, so one address cannot be hammered from many IPs. */
export const byEmail = (req: MedusaRequest) => {
  const body = req.body as Record<string, unknown> | undefined
  const email = body?.email ?? body?.identifier
  return typeof email === "string" && email ? email.trim().toLowerCase() : null
}

export function rateLimit(...rules: Rule[]) {
  return async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    if (!isEnabled()) {
      return next()
    }
    try {
      for (const rule of rules) {
        const key = rule.key(req)
        if (key) {
          await limiterFor(rule).consume(key)
        }
      }
      return next()
    } catch (rejection) {
      const retryAfter = Math.ceil(
        ((rejection as RateLimiterRes).msBeforeNext ?? 60_000) / 1000
      )
      res.setHeader("Retry-After", String(retryAfter))
      res.status(429).json({
        type: "too_many_requests",
        message: "Too many requests. Please try again later.",
      })
    }
  }
}

/** Closes the Redis connection. Used by tests. */
export async function closeRateLimiter(): Promise<void> {
  limiters.clear()
  await redis?.quit().catch(() => undefined)
  redis = null
}
