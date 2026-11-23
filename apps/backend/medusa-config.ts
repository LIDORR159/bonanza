import { defineConfig, loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

type AppEnv = "development" | "test" | "staging" | "production"

/**
 * APP_ENV says which deployment this is; NODE_ENV only says how Node should run.
 * A locally run production build has NODE_ENV=production and APP_ENV=staging,
 * which is what lets the development payment provider be exercised against a
 * production build without it ever being loadable in the real production.
 */
const APP_ENV = (process.env.APP_ENV ||
  (process.env.NODE_ENV === "production" ? "production" : "development")) as AppEnv
const isProduction = APP_ENV === "production"

const redisUrl = process.env.REDIS_URL
const backendUrl = (process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "")
const workerMode = (process.env.MEDUSA_WORKER_MODE || "shared") as
  | "shared"
  | "server"
  | "worker"

const paymentDevEnabled = process.env.PAYMENT_DEV_ENABLED === "true"
if (paymentDevEnabled && isProduction) {
  throw new Error(
    "PAYMENT_DEV_ENABLED=true is not allowed when APP_ENV=production. " +
      "The development payment provider must never run in production."
  )
}
if (paymentDevEnabled && !process.env.PAYMENT_DEV_WEBHOOK_SECRET) {
  throw new Error("PAYMENT_DEV_ENABLED=true requires PAYMENT_DEV_WEBHOOK_SECRET.")
}

const modules: Record<string, unknown>[] = [
  { resolve: "./src/modules/cms" },
  { resolve: "./src/modules/brand" },
  { resolve: "./src/modules/activity-log" },

  // Product search in PostgreSQL. `simple` does no English stemming, which is
  // what Hebrew text needs. The `medusa_search_simple` text search
  // configuration is created by a migration in the cms module.
  {
    resolve: "@medusajs/medusa/search",
    options: {
      providers: [
        {
          resolve: "@medusajs/medusa/search-postgres",
          id: "postgres",
          options: { engine: "native", language: "simple" },
        },
      ],
    },
  },
]

// ── Redis-backed infrastructure ─────────────────────────────────────────────
// Without REDIS_URL Medusa falls back to its in-memory modules, which is what
// the integration tests use.
if (redisUrl) {
  modules.push(
    {
      resolve: "@medusajs/medusa/event-bus-redis",
      options: {
        redisUrl,
        jobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 7 * 24 * 3600 },
        },
      },
    },
    {
      resolve: "@medusajs/medusa/workflow-engine-redis",
      options: { redis: { redisUrl } },
    },
    {
      resolve: "@medusajs/medusa/locking",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/locking-redis",
            id: "locking-redis",
            is_default: true,
            options: { redisUrl },
          },
        ],
      },
    }
  )
}

// ── Files ───────────────────────────────────────────────────────────────────
// S3-compatible storage (Cloudflare R2 in production, MinIO locally) when a
// bucket is configured; local disk otherwise.
if (process.env.S3_BUCKET) {
  modules.push({
    resolve: "@medusajs/medusa/file",
    options: {
      providers: [
        {
          resolve: "@medusajs/medusa/file-s3",
          id: "s3",
          options: {
            file_url: (process.env.S3_FILE_URL || "").replace(/\/$/, ""),
            access_key_id: process.env.S3_ACCESS_KEY_ID,
            secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
            region: process.env.S3_REGION || "auto",
            bucket: process.env.S3_BUCKET,
            endpoint: process.env.S3_ENDPOINT,
            prefix: process.env.S3_PREFIX || "",
            // R2 does not implement ACLs; the bucket's public domain decides
            // what is public.
            acl: false,
            additional_client_config: {
              forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
              // R2 rejects the CRC32 checksums newer AWS SDKs add by default.
              requestChecksumCalculation: "WHEN_REQUIRED",
              responseChecksumValidation: "WHEN_REQUIRED",
            },
          },
        },
      ],
    },
  })
} else {
  modules.push({
    resolve: "@medusajs/medusa/file",
    options: {
      providers: [
        {
          resolve: "@medusajs/medusa/file-local",
          id: "local",
          options: {
            upload_dir: "static",
            backend_url: `${backendUrl}/static`,
          },
        },
      ],
    },
  })
}

// ── Notifications ───────────────────────────────────────────────────────────
const notificationProviders: Record<string, unknown>[] = [
  {
    resolve: "@medusajs/medusa/notification-local",
    id: "local",
    options: { channels: ["feed"] },
  },
]
if (process.env.SMTP_HOST) {
  notificationProviders.push({
    resolve: "./src/modules/notification-smtp",
    id: "smtp",
    options: {
      channels: ["email"],
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      from: process.env.SMTP_FROM || "BONANZA <no-reply@localhost>",
    },
  })
}
modules.push({
  resolve: "@medusajs/medusa/notification",
  options: { providers: notificationProviders },
})

// ── Payments ────────────────────────────────────────────────────────────────
// No real provider yet. See docs/payments-integration.md.
// Outside production a simulated hosted-page gateway (the dev_gateway module)
// and the provider that talks to it can be switched on for testing checkout.
if (paymentDevEnabled) {
  // Where the provider and the gateway reach each other. Inside Docker this is
  // the API container's internal address, not the public URL.
  const internalUrl = (process.env.PAYMENT_DEV_GATEWAY_URL || backendUrl).replace(/\/$/, "")
  const storefrontUrl = (process.env.STOREFRONT_URL || "http://localhost:8000").replace(
    /\/$/,
    ""
  )
  modules.push(
    { resolve: "./src/modules/dev-gateway" },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        // The default five-second wait before a webhook is processed makes
        // local checkout feel broken; one second is enough here.
        webhook_delay: 1000,
        providers: [
          {
            resolve: "./src/modules/payment-dev-hosted",
            id: "dev",
            options: {
              gatewayUrl: internalUrl,
              webhookUrl: `${internalUrl}/hooks/payment/dev-hosted_dev`,
              returnUrl: `${storefrontUrl}/checkout/return`,
              secret: process.env.PAYMENT_DEV_WEBHOOK_SECRET,
              captureMode: process.env.PAYMENT_DEV_CAPTURE_MODE || "automatic",
            },
          },
        ],
      },
    }
  )
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl,
    workerMode,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  },
  admin: {
    // The dashboard is served by the API server at /app. The worker never
    // serves it.
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true" || workerMode === "worker",
    storefrontUrl: process.env.STOREFRONT_URL || "http://localhost:8000",
    maxUploadFileSize: 8 * 1024 * 1024,
  },
  modules,
})
