import { expect, test, type Page } from "@playwright/test"
import { join } from "node:path"
import { adminApi, BACKEND_URL, env, publishableKey } from "./helpers"

/**
 * Content management through the Medusa Admin screens, checked against what
 * the storefront then shows.
 */

const ADMIN = `${BACKEND_URL}/app`
const SAMPLE_IMAGE = join(
  import.meta.dirname,
  "../../apps/backend/src/scripts/seed-assets/comb-silver.webp"
)

async function signIn(page: Page) {
  await page.goto(`${ADMIN}/login`)
  await page.locator('input[name="email"]').fill(env("ADMIN_EMAIL"))
  await page.locator('input[name="password"]').fill(env("ADMIN_PASSWORD"))
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/app\/(?!login)/)
}

/** The storefront caches pages; a change shows up once the backend's refresh call lands. */
async function expectOnStorefront(page: Page, path: string, text: string, present = true) {
  await expect
    .poll(
      async () => {
        await page.goto(path)
        return (await page.getByText(text, { exact: false }).count()) > 0
      },
      { timeout: 30_000, message: `"${text}" ${present ? "on" : "gone from"} ${path}` }
    )
    .toBe(present)
}

test.describe("admin access", () => {
  test("the dashboard is at /app and requires signing in", async ({ page, request }) => {
    await page.goto(`${ADMIN}/content`)
    await expect(page).toHaveURL(/\/app\/login/)

    // The Admin API refuses anonymous requests and customer tokens alike.
    expect((await request.get(`${BACKEND_URL}/admin/cms/banners`)).status()).toBe(401)
    expect((await request.get(`${BACKEND_URL}/admin/products`)).status()).toBe(401)
  })

  test("signing in opens the dashboard with the custom screens", async ({ page }) => {
    await signIn(page)
    await expect(page.getByRole("link", { name: "Site content" })).toBeVisible()
    await page.getByRole("link", { name: "Site content" }).click()
    await expect(page.getByRole("heading", { name: "Home page sections" })).toBeVisible()
    await expect(page.getByRole("row").filter({ hasText: "hero" })).toBeVisible()

    await page.goto(`${ADMIN}/brands`)
    await expect(page.getByRole("heading", { name: "Brands" })).toBeVisible()
    await expect(page.getByRole("cell", { name: "Stahlwerk", exact: true })).toBeVisible()

    await page.goto(`${ADMIN}/settings/activity-log`)
    await expect(page.getByRole("heading", { name: "Activity log" })).toBeVisible()
  })
})

test.describe("banners", () => {
  const title = `באנר בדיקה ${Date.now()}`

  test("a banner created in the admin, with an uploaded image, appears on the storefront", async ({
    page,
    request,
  }) => {
    await signIn(page)
    await page.goto(`${ADMIN}/content/banners`)
    await page.getByRole("button", { name: "Add banner" }).click()

    const drawer = page.getByRole("dialog")
    await drawer.getByRole("combobox").first().click()
    await page.getByRole("option", { name: "Top of catalog" }).click()
    await drawer.locator("#field-title").fill(title)
    await drawer.locator("#field-subtitle").fill("נוצר בבדיקה אוטומטית")
    await drawer.locator("#field-target_url").fill("/products?sale=1")
    await drawer.locator("#field-cta_label").fill("למבצעים")

    // Upload an image through the admin's own upload route.
    await drawer.locator('input[type="file"]').first().setInputFiles(SAMPLE_IMAGE)
    await expect(drawer.locator("img").first()).toBeVisible({ timeout: 20_000 })

    await drawer.getByRole("button", { name: "Save" }).click()
    await expect(page.getByRole("row").filter({ hasText: title })).toContainText("Showing")

    // The image really is stored and served.
    const list = await adminApi(request, "get", "/admin/cms/banners?placement=catalog_top")
    const banner = (await list.json()).banners.find((b: { title: string }) => b.title === title)
    expect(banner.image_url).toMatch(/^https?:\/\//)
    expect((await request.get(banner.image_url)).status()).toBe(200)

    await expectOnStorefront(page, "/products", title)
    await expect(page.getByRole("link", { name: "למבצעים" })).toHaveAttribute(
      "href",
      "/products?sale=1"
    )
  })

  test("disabling the banner removes it from the storefront", async ({ page }) => {
    await signIn(page)
    await page.goto(`${ADMIN}/content/banners`)
    const row = page.getByRole("row").filter({ hasText: title })
    await row.getByRole("switch").click()
    await expect(row).toContainText("Not showing")
    await expectOnStorefront(page, "/products", title, false)
  })

  test.afterAll(async ({ request }) => {
    const list = await adminApi(request, "get", "/admin/cms/banners?placement=catalog_top")
    for (const banner of (await list.json()).banners) {
      if (banner.title === title) {
        await adminApi(request, "delete", `/admin/cms/banners/${banner.id}`)
      }
    }
  })
})

test.describe("home page", () => {
  let original: string

  test("editing the hero title in the admin changes the storefront", async ({ page, request }) => {
    const list = await adminApi(request, "get", "/admin/cms/sections")
    original = (await list.json()).sections.find((s: { key: string }) => s.key === "hero").title
    const edited = `כותרת בדיקה ${Date.now()}`

    await signIn(page)
    await page.goto(`${ADMIN}/content`)
    await page.getByRole("row").filter({ hasText: "hero" }).getByRole("button", { name: "Edit" }).click()
    const drawer = page.getByRole("dialog")
    await drawer.locator("#field-title").fill(edited)
    await drawer.getByRole("button", { name: "Save" }).click()
    await expect(page.getByRole("row").filter({ hasText: edited })).toBeVisible()

    await expectOnStorefront(page, "/", edited)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(edited)
  })

  test("hiding a section removes it from the home page", async ({ page, request }) => {
    await page.goto("/")
    await expect(page.locator("#brands")).toBeVisible()

    const list = await adminApi(request, "get", "/admin/cms/sections")
    const brands = (await list.json()).sections.find((s: { key: string }) => s.key === "brands")
    await adminApi(request, "post", `/admin/cms/sections/${brands.id}`, { is_visible: false })

    await expect
      .poll(
        async () => {
          await page.goto("/")
          return page.locator("#brands").count()
        },
        { timeout: 30_000 }
      )
      .toBe(0)

    await adminApi(request, "post", `/admin/cms/sections/${brands.id}`, { is_visible: true })
  })

  test.afterAll(async ({ request }) => {
    if (!original) {
      return
    }
    const list = await adminApi(request, "get", "/admin/cms/sections")
    const hero = (await list.json()).sections.find((s: { key: string }) => s.key === "hero")
    await adminApi(request, "post", `/admin/cms/sections/${hero.id}`, { title: original })
  })
})

test.describe("pages and drafts", () => {
  const slug = `test-page-${Date.now()}`

  test("a draft page is not public; a preview link shows it; publishing makes it public", async ({
    page,
    request,
  }) => {
    const created = await adminApi(request, "post", "/admin/cms/pages", {
      slug,
      title: "עמוד בדיקה",
      body: "## כותרת משנה\n\nתוכן **מודגש** של העמוד.\n\n<script>window.__xss = 1</script>",
      status: "draft",
    })
    expect(created.status()).toBe(201)
    const pageId = (await created.json()).page.id

    // Draft: the storefront and the Store API both answer "not found".
    expect((await page.goto(`/${slug}`))?.status()).toBe(404)
    const store = await request.get(`${BACKEND_URL}/store/cms/pages/${slug}`, {
      headers: { "x-publishable-api-key": publishableKey() },
    })
    expect(store.status()).toBe(404)

    // A preview link from the admin shows the draft, marked as a preview.
    const token = await adminApi(request, "post", "/admin/cms/preview-token", { path: `/${slug}` })
    await page.goto((await token.json()).url)
    await expect(page).toHaveURL(new RegExp(`/${slug}$`))
    await expect(page.getByRole("heading", { name: "עמוד בדיקה", level: 1 })).toBeVisible()
    await expect(page.getByText("מצב תצוגה מקדימה")).toBeVisible()
    await expect(page.locator("strong", { hasText: "מודגש" })).toBeVisible()
    // Raw HTML typed into a page is never rendered.
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()

    // Leaving preview hides the draft again.
    await page.getByRole("link", { name: "יציאה מתצוגה מקדימה" }).click()
    expect((await page.goto(`/${slug}`))?.status()).toBe(404)

    // Publishing makes it public.
    await adminApi(request, "post", `/admin/cms/pages/${pageId}`, { status: "published" })
    await expect
      .poll(async () => (await page.goto(`/${slug}`))?.status(), { timeout: 30_000 })
      .toBe(200)
    await expect(page.getByRole("heading", { name: "עמוד בדיקה", level: 1 })).toBeVisible()

    // Scheduling it for the future hides it again until that time.
    const future = new Date(Date.now() + 86_400_000).toISOString()
    await adminApi(request, "post", `/admin/cms/pages/${pageId}`, { publish_at: future })
    const scheduled = await request.get(`${BACKEND_URL}/store/cms/pages/${slug}`, {
      headers: { "x-publishable-api-key": publishableKey() },
    })
    expect(scheduled.status()).toBe(404)
  })

  test("a forged preview link is refused", async ({ page }) => {
    const response = await page.goto("/api/preview?token=abc.def&path=/draft-example")
    expect(response?.status()).toBe(401)
    expect((await page.goto("/draft-example"))?.status()).toBe(404)
  })

  test.afterAll(async ({ request }) => {
    const list = await adminApi(request, "get", "/admin/cms/pages?limit=200")
    for (const entry of (await list.json()).pages) {
      if (entry.slug === slug) {
        await adminApi(request, "delete", `/admin/cms/pages/${entry.id}`)
      }
    }
  })
})

test("content changes are written to the activity log", async ({ request }) => {
  const log = await adminApi(request, "get", "/admin/activity-log?limit=50")
  const { entries } = await log.json()
  const actions = entries.map((entry: { action: string }) => entry.action)
  expect(actions).toContain("cms.banner.created")
  expect(actions).toContain("cms.homepage_section.updated")
  // Entries name the admin who made the change.
  expect(entries.find((entry: { action: string }) => entry.action === "cms.banner.created").actor_id).toMatch(
    /^user_/
  )
})
