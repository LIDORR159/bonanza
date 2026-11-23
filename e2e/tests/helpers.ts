import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, type APIRequestContext, type Page } from "@playwright/test"

export const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9000"
export const MAILPIT_URL = process.env.MAILPIT_URL || "http://localhost:8025"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")

/** Reads one variable from a local env file. Values never appear in test output. */
function fromEnvFile(file: string, name: string): string | undefined {
  try {
    const line = readFileSync(join(root, file), "utf8")
      .split("\n")
      .find((candidate) => candidate.startsWith(`${name}=`))
    return line?.slice(name.length + 1).trim()
  } catch {
    return undefined
  }
}

export const env = (name: string, file = "apps/backend/.env"): string => {
  const value = process.env[name] ?? fromEnvFile(file, name)
  if (!value) {
    throw new Error(`${name} is not set (looked in the environment and ${file})`)
  }
  return value
}

export const publishableKey = () =>
  env("MEDUSA_PUBLISHABLE_KEY", "apps/storefront/.env.local")

let cachedToken: string | undefined

/** A bearer token for the seeded admin user. */
export async function adminToken(request: APIRequestContext): Promise<string> {
  if (cachedToken) {
    return cachedToken
  }
  const response = await request.post(`${BACKEND_URL}/auth/user/emailpass`, {
    data: { email: env("ADMIN_EMAIL"), password: env("ADMIN_PASSWORD") },
  })
  expect(response.ok(), "admin sign-in").toBeTruthy()
  cachedToken = (await response.json()).token as string
  return cachedToken
}

export async function adminApi(
  request: APIRequestContext,
  method: "get" | "post" | "delete",
  path: string,
  data?: unknown
) {
  const token = await adminToken(request)
  return request[method](`${BACKEND_URL}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    ...(data !== undefined ? { data } : {}),
  })
}

export const uniqueEmail = (prefix = "shopper") =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`

/** Adds a product to the cart from its page and waits for the confirmation. */
export async function addToCart(page: Page, handle: string) {
  await page.goto(`/products/${handle}`)
  await page.getByRole("button", { name: "הוספה לסל" }).click()
  await expect(page.getByText("המוצר נוסף לסל")).toBeVisible()
}

export const shopper = {
  firstName: "דנה",
  lastName: "כהן",
  phone: "050-1234567",
  street: "הרצל 10",
  city: "תל אביב",
  postalCode: "6100000",
}

/** Fills step 1 of the checkout and moves on to the shipping step. */
export async function fillCheckoutDetails(page: Page, email: string) {
  await page.getByLabel("אימייל").fill(email)
  await page.getByLabel("שם פרטי").fill(shopper.firstName)
  await page.getByLabel("שם משפחה").fill(shopper.lastName)
  await page.getByLabel("טלפון נייד").fill(shopper.phone)
  await page.getByLabel("רחוב ומספר בית").fill(shopper.street)
  await page.getByLabel("עיר").fill(shopper.city)
  await page.getByLabel("מיקוד").fill(shopper.postalCode)
  await page.getByRole("button", { name: "המשך לבחירת משלוח" }).click()
  await expect(page.getByRole("group", { name: "שיטת משלוח" })).toBeVisible()
}

/** From a filled cart: goes through the checkout up to the hosted payment page. */
export async function checkoutToPaymentPage(page: Page, email: string) {
  await page.goto("/checkout")
  await fillCheckoutDetails(page, email)
  await page.getByRole("button", { name: "המשך לתשלום" }).click()
  await page.getByRole("button", { name: "מעבר לתשלום מאובטח" }).click()
  await page.waitForURL(/\/dev-gateway\/pay\//)
  await expect(page.getByText("סביבת בדיקות")).toBeVisible()
}

/** Waits for a message to a recipient to arrive in Mailpit and returns its HTML. */
export async function waitForEmail(
  request: APIRequestContext,
  to: string,
  subjectPart: string
): Promise<string> {
  let html = ""
  await expect
    .poll(
      async () => {
        const list = await request.get(
          `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`
        )
        const messages = ((await list.json()).messages ?? []) as {
          ID: string
          Subject: string
        }[]
        const match = messages.find((message) => message.Subject.includes(subjectPart))
        if (!match) {
          return false
        }
        const message = await request.get(`${MAILPIT_URL}/api/v1/message/${match.ID}`)
        html = (await message.json()).HTML as string
        return true
      },
      { timeout: 30_000, message: `email "${subjectPart}" to ${to}` }
    )
    .toBe(true)
  return html
}
