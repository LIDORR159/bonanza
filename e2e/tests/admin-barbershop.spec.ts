import { expect, test, type BrowserContext, type Page } from "@playwright/test"
import { join } from "node:path"
import type { StoreServiceGroup, StoreSiteSettings } from "../../packages/types/src/index"
import { adminApi, BACKEND_URL, env, publishableKey, uniqueEmail } from "./helpers"

/**
 * The barbershop content, managed the way the owner will: in the admin's
 * Price list, Gallery and Site settings screens, checked against what the
 * storefront then shows.
 *
 * One signed-in browser is shared by the whole file, so the run signs in to
 * the admin once and stays far from the sign-in rate limit.
 */

const ADMIN = `${BACKEND_URL}/app`
const SAMPLE_IMAGE = join(
  import.meta.dirname,
  "../../apps/backend/src/scripts/seed-assets/comb-silver.webp"
)
const stamp = Date.now()

test.describe.configure({ mode: "serial" })

let context: BrowserContext
let admin: Page

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext({ locale: "he-IL" })
  admin = await context.newPage()
  await admin.goto(`${ADMIN}/login`)
  await admin.locator('input[name="email"]').fill(env("ADMIN_EMAIL"))
  await admin.locator('input[name="password"]').fill(env("ADMIN_PASSWORD"))
  await admin.locator('button[type="submit"]').click()
  await admin.waitForURL(/\/app\/(?!login)/)
})

test.afterAll(async () => {
  await context?.close()
})

/** The storefront caches pages; a change shows once the backend's refresh call lands. */
async function onStorefront(
  page: Page,
  path: string,
  check: () => Promise<boolean>,
  what: string
) {
  await expect
    .poll(
      async () => {
        await page.goto(path)
        return check()
      },
      { timeout: 30_000, message: what }
    )
    .toBe(true)
}

const storeGet = async <T>(page: Page, path: string): Promise<T> => {
  const response = await page.request.get(`${BACKEND_URL}${path}`, {
    headers: { "x-publishable-api-key": publishableKey() },
  })
  expect(response.ok(), path).toBeTruthy()
  return (await response.json()) as T
}

test("the new content routes refuse anonymous callers and signed-in customers", async ({
  request,
}) => {
  // A real customer token, obtained the way the storefront gets one.
  const email = uniqueEmail("not-staff")
  const registration = await request.post(
    `${BACKEND_URL}/auth/customer/emailpass/register`,
    {
      data: { email, password: "a-long-test-password" },
    }
  )
  expect(registration.ok()).toBeTruthy()
  const customer = { authorization: `Bearer ${(await registration.json()).token}` }

  for (const route of [
    "service-groups",
    "service-items",
    "gallery",
    "team",
    "reviews",
    "settings",
  ]) {
    const url = `${BACKEND_URL}/admin/cms/${route}`
    expect((await request.get(url)).status(), `anonymous GET ${route}`).toBe(401)
    expect(
      (await request.get(url, { headers: customer })).status(),
      `customer GET ${route}`
    ).toBe(401)
  }
  const create = { data: { title: "should not be created" } }
  expect(
    (await request.post(`${BACKEND_URL}/admin/cms/service-groups`, create)).status()
  ).toBe(401)
  expect(
    (
      await request.post(`${BACKEND_URL}/admin/cms/service-groups`, {
        ...create,
        headers: customer,
      })
    ).status()
  ).toBe(401)
})

test.describe("price list", () => {
  const name = `שירות בדיקה ${stamp}`

  test("a service added in the admin appears on the site with its price", async ({
    page,
  }) => {
    await admin.goto(`${ADMIN}/content/services`)
    await expect(admin.getByRole("heading", { name: "Price list" })).toBeVisible()
    await admin.getByRole("button", { name: "Add service" }).first().click()

    const drawer = admin.getByRole("dialog")
    await drawer.locator("#field-name").fill(name)
    await drawer.locator("#field-description").fill("נוצר בבדיקה אוטומטית")
    await drawer.locator("#field-price").fill("77")
    await drawer.locator("#field-duration_minutes").fill("35")
    await drawer.getByRole("button", { name: "Save" }).click()
    await expect(admin.getByRole("row").filter({ hasText: name })).toBeVisible()

    await onStorefront(
      page,
      "/",
      async () => (await page.locator("#pricing").getByText(name).count()) > 0,
      "the new service in the price list"
    )
    const row = page.locator("#pricing").getByRole("listitem").filter({ hasText: name })
    await expect(row.locator("bdi[dir=ltr]")).toHaveText("₪77")
    await expect(row).toContainText("35")

    // A new service lands at the end of its group, not at the top.
    const { service_groups: groups } = await storeGet<{
      service_groups: StoreServiceGroup[]
    }>(page, "/store/cms/services")
    const group = groups.find((candidate) =>
      candidate.items.some((item) => item.name === name)
    )!
    expect(group.items.at(-1)!.name).toBe(name)
  })

  test("the public price list rejects bad input and hides a switched-off service", async ({
    page,
    request,
  }) => {
    const list = await adminApi(request, "get", "/admin/cms/service-items")
    const item = (await list.json()).service_items.find(
      (s: { name: string }) => s.name === name
    )
    expect(item, "the service created in the previous test").toBeTruthy()

    // Prices are whole shekels; a negative or fractional one is refused.
    for (const price of [-5, 12.5]) {
      const response = await adminApi(
        request,
        "post",
        `/admin/cms/service-items/${item.id}`,
        {
          price,
        }
      )
      expect(response.status(), `price ${price}`).toBe(400)
    }
    const unknownGroup = await adminApi(request, "post", "/admin/cms/service-items", {
      group_id: "sgrp_does_not_exist",
      name: "orphan",
    })
    expect(unknownGroup.ok()).toBeFalsy()

    await adminApi(request, "post", `/admin/cms/service-items/${item.id}`, {
      is_visible: false,
    })
    await onStorefront(
      page,
      "/",
      async () => (await page.locator("#pricing").getByText(name).count()) === 0,
      "the hidden service gone from the price list"
    )
    const { service_groups: groups } = await storeGet<{
      service_groups: StoreServiceGroup[]
    }>(page, "/store/cms/services")
    expect(
      groups.flatMap((group) => group.items).map((service) => service.name)
    ).not.toContain(name)
  })

  test.afterAll(async ({ request }) => {
    const list = await adminApi(request, "get", "/admin/cms/service-items")
    for (const item of (await list.json()).service_items ?? []) {
      if (item.name === name) {
        await adminApi(request, "delete", `/admin/cms/service-items/${item.id}`)
      }
    }
  })
})

test.describe("gallery", () => {
  const alt = `תמונת בדיקה ${stamp}`

  test("a photo uploaded in the admin appears on the gallery page; a draft does not", async ({
    page,
    request,
  }) => {
    await admin.goto(`${ADMIN}/content/gallery`)
    await expect(admin.getByRole("heading", { name: "Gallery" })).toBeVisible()
    await admin.getByRole("button", { name: "Add photo" }).click()

    const drawer = admin.getByRole("dialog")
    await drawer.locator('input[type="file"]').first().setInputFiles(SAMPLE_IMAGE)
    await expect(drawer.locator("img").first()).toBeVisible({ timeout: 20_000 })
    await drawer.locator("#field-alt").fill(alt)
    await drawer.getByRole("button", { name: "Save" }).click()
    await expect(admin.getByRole("row").filter({ hasText: alt })).toBeVisible()

    const list = await adminApi(request, "get", "/admin/cms/gallery")
    const item = (await list.json()).gallery_items.find(
      (g: { alt: string }) => g.alt === alt
    )

    // New photos start as drafts unless published in the form.
    if (item.status !== "published") {
      await page.goto("/gallery")
      await expect(page.getByRole("img", { name: alt })).toHaveCount(0)
      await adminApi(request, "post", `/admin/cms/gallery/${item.id}`, {
        status: "published",
      })
    }
    await onStorefront(
      page,
      "/gallery",
      async () => (await page.getByRole("img", { name: alt }).count()) > 0,
      "the uploaded photo on the gallery page"
    )
    const photo = page.getByRole("img", { name: alt })
    await photo.scrollIntoViewIfNeeded()
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0)

    // The seeded draft photo never reaches the public page or the public API.
    const drafts = (await list.json()).gallery_items.filter(
      (g: { status: string }) => g.status === "draft"
    )
    for (const draft of drafts.filter((g: { alt: string }) => g.alt && g.alt !== alt)) {
      await expect(page.getByRole("img", { name: draft.alt, exact: true })).toHaveCount(0)
    }
  })

  test("only a real image can be used as a gallery photo address", async ({
    request,
  }) => {
    for (const image_url of [
      "javascript:alert(1)",
      "ftp://example.com/a.png",
      "//example.com/a.png",
    ]) {
      const response = await adminApi(request, "post", "/admin/cms/gallery", {
        image_url,
      })
      expect(response.status(), image_url).toBe(400)
    }
  })

  test.afterAll(async ({ request }) => {
    const list = await adminApi(request, "get", "/admin/cms/gallery")
    for (const item of (await list.json()).gallery_items ?? []) {
      if (item.alt === alt) {
        await adminApi(request, "delete", `/admin/cms/gallery/${item.id}`)
      }
    }
  })
})

test.describe("site settings", () => {
  let original: Pick<StoreSiteSettings, "contact_phone" | "opening_hours">

  test("contact details changed in the admin reach the footer and the info strip", async ({
    page,
    request,
  }) => {
    const current = (await (await adminApi(request, "get", "/admin/cms/settings")).json())
      .settings
    original = {
      contact_phone: current.contact_phone,
      opening_hours: current.opening_hours,
    }

    const saved = await adminApi(request, "post", "/admin/cms/settings", {
      contact_phone: "03-5551234",
      opening_hours: "ראשון–חמישי | 10:00–19:00\nשישי | 09:00–13:00",
    })
    expect(saved.ok()).toBeTruthy()

    await onStorefront(
      page,
      "/",
      async () =>
        (await page.getByRole("contentinfo").getByText("03-5551234").count()) > 0,
      "the new phone number in the footer"
    )
    const footer = page.getByRole("contentinfo")
    await expect(footer.locator("dl > div")).toHaveCount(2)
    await expect(footer.locator("dl")).toContainText("10:00–19:00")
    // The strip under the hero reads the same settings.
    await expect(page.getByRole("link", { name: "03-5551234" }).first()).toBeVisible()
  })

  test("links in settings must be web addresses", async ({ request }) => {
    for (const field of ["booking_url", "instagram_url", "google_reviews_url"]) {
      const response = await adminApi(request, "post", "/admin/cms/settings", {
        [field]: "javascript:alert(1)",
      })
      expect(response.status(), field).toBe(400)
    }
  })

  test.afterAll(async ({ request }) => {
    if (original) {
      await adminApi(request, "post", "/admin/cms/settings", original)
    }
  })
})
