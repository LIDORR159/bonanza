import { createHmac } from "node:crypto"
import { expect, test, type APIRequestContext } from "@playwright/test"
import { BACKEND_URL, env, publishableKey, uniqueEmail } from "./helpers"

/**
 * Rate limits count per visitor, not per storefront server.
 *
 * Shoppers reach the backend only through the storefront, which names the
 * visitor in a signed header. These tests speak to the backend the way the
 * storefront does, using the newsletter route because its limit is the
 * lowest (5 an hour per address).
 */

const LIMIT = 5

const visitorHeader = (
  address: string,
  options: { at?: number; secret?: string } = {}
) => {
  const timestamp = options.at ?? Date.now()
  const signature = createHmac("sha256", options.secret ?? env("REVALIDATE_SECRET"))
    .update(`visitor|${timestamp}|${address}`)
    .digest("hex")
  return `${timestamp}|${address}|${signature}`
}

const subscribe = (request: APIRequestContext, header?: string) =>
  request.post(`${BACKEND_URL}/store/newsletter`, {
    headers: {
      "x-publishable-api-key": publishableKey(),
      ...(header ? { "x-storefront-visitor": header } : {}),
    },
    data: { email: uniqueEmail("limit"), consent: true, source: "test" },
  })

// Documentation addresses (RFC 5737), unique per run so reruns start clean.
const octet = () => 1 + Math.floor(Math.random() * 250)
const first = `203.0.113.${octet()}`
const second = `198.51.100.${octet()}`

test("one visitor reaching the limit does not block another", async ({ request }) => {
  for (let attempt = 1; attempt <= LIMIT; attempt++) {
    expect(
      (await subscribe(request, visitorHeader(first))).status(),
      `attempt ${attempt}`
    ).toBe(200)
  }
  const blocked = await subscribe(request, visitorHeader(first))
  expect(blocked.status()).toBe(429)
  expect(Number(blocked.headers()["retry-after"])).toBeGreaterThan(0)

  expect((await subscribe(request, visitorHeader(second))).status()).toBe(200)
})

test("a visitor address is believed only with a valid, recent signature", async ({
  request,
}) => {
  // Each of these claims to be the visitor who is already blocked. If the
  // claim were believed the answer would be 429; ignored, the request is
  // counted under the caller's own address, which is well under the limit.
  const claims = {
    "signed with the wrong secret": visitorHeader(first, { secret: "not-the-secret" }),
    "signed ten minutes ago": visitorHeader(first, { at: Date.now() - 10 * 60_000 }),
    "signature with junk appended": `${visitorHeader(first)}00`,
    "extra field": `${visitorHeader(first)}|x`,
  }
  // The valid form of the same claim is refused, which proves the others
  // were not simply let through for a different reason.
  expect((await subscribe(request, visitorHeader(first))).status()).toBe(429)
  for (const [name, header] of Object.entries(claims)) {
    expect((await subscribe(request, header)).status(), name).toBe(200)
  }
})
