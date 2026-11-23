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

/**
 * The visitor's address. Behind Cloudflare the socket peer is Cloudflare, so
 * the real address comes from CF-Connecting-IP. That header is trusted only
 * when TRUST_CLOUDFLARE_IP=true, which must be set only when the origin
 * accepts traffic from Cloudflare alone.
 */
export function clientIp(req: MedusaRequest): string {
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
