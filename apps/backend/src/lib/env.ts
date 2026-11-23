/**
 * Environment helpers shared by routes, subscribers and workflows.
 * `medusa-config.ts` cannot import from `src`, so it repeats the two checks it
 * needs.
 */
export type AppEnv = "development" | "test" | "staging" | "production"

export const appEnv = (): AppEnv =>
  (process.env.APP_ENV ||
    (process.env.NODE_ENV === "production" ? "production" : "development")) as AppEnv

export const isProduction = (): boolean => appEnv() === "production"

/** The simulated payment gateway exists only outside production. */
export const isDevPaymentEnabled = (): boolean =>
  process.env.PAYMENT_DEV_ENABLED === "true" && !isProduction()

const trimSlash = (url: string) => url.replace(/\/$/, "")

export const backendUrl = (): string =>
  trimSlash(process.env.MEDUSA_BACKEND_URL || "http://localhost:9000")

export const storefrontUrl = (): string =>
  trimSlash(process.env.STOREFRONT_URL || "http://localhost:8000")
