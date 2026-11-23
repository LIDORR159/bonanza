import { expect, test, type APIRequestContext, type Page } from "@playwright/test"
import type {
  StoreGalleryItem,
  StoreReview,
  StoreReviewSummary,
  StoreServiceGroup,
  StoreSiteSettings,
  StoreTeamMember,
} from "../../packages/types/src/index"
import { ar } from "../../apps/storefront/lib/i18n/ar"
import { en } from "../../apps/storefront/lib/i18n/en"
import { he } from "../../apps/storefront/lib/i18n/he"
import { BACKEND_URL, publishableKey } from "./helpers"

/**
 * The barbershop side of the site: booking, the price list, the gallery,
 * reviews, contact details, the floating buttons and the three languages.
 *
 * Expected values are read from the backend, so the tests follow whatever the
 * admin holds instead of repeating the seed data.
 */

const BOOKING = /^https:\/\/customers\.dibs-app\.com\/business-page\//

/** The backend's locale code for each storefront language. */
const MEDUSA_LOCALE = { en: "en", ar: "ar" } as const

async function store<T>(
  request: APIRequestContext,
  path: string,
  language?: keyof typeof MEDUSA_LOCALE
): Promise<T> {
  const locale = language ? MEDUSA_LOCALE[language] : undefined
  const response = await request.get(`${BACKEND_URL}${path}`, {
    headers: {
      "x-publishable-api-key": publishableKey(),
      ...(locale ? { "x-medusa-locale": locale } : {}),
    },
    params: locale ? { locale } : undefined,
  })
  expect(response.ok(), path).toBeTruthy()
  return (await response.json()) as T
}

const settingsOf = async (request: APIRequestContext) =>
  (await store<{ settings: StoreSiteSettings }>(request, "/store/cms/settings")).settings

const centerX = async (page: Page, locator: ReturnType<Page["locator"]>) => {
  const box = (await locator.boundingBox())!
  return (box.x + box.width / 2) / page.viewportSize()!.width
}

test.describe("home page", () => {
  test("the hero offers online booking and the price list, beside the photograph", async ({
    page,
  }) => {
    await page.goto("/")
    const hero = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { level: 1 }) })

    const booking = hero.getByRole("link", { name: new RegExp(he.booking.ctaOnline) })
    await expect(booking).toHaveAttribute("href", BOOKING)
    await expect(booking).toHaveAttribute("target", "_blank")
    await expect(booking).toHaveAttribute("rel", /noopener/)

    // The photograph replaces the barber pole, on the left in Hebrew.
    const photo = hero.locator("img")
    await expect(photo).toBeVisible()
    expect(
      await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)
    ).toBeGreaterThan(0)
    expect(await centerX(page, photo)).toBeLessThan(0.5)
    await expect(hero.locator('img[src*="barber-pole"]')).toHaveCount(0)

    await hero.getByRole("link", { name: he.pricing.title, exact: true }).click()
    await expect(page).toHaveURL(/#pricing$/)
    await expect(
      page.locator("#pricing").getByRole("heading", { level: 2 })
    ).toBeInViewport()
  })

  test("the story sits right below the hero, with the photograph of the shop", async ({
    page,
    request,
  }) => {
    const { sections } = await store<{
      sections: {
        key: string
        type: string
        title: string
        subtitle: string
        body: string
      }[]
    }>(request, "/store/cms/homepage")
    const story = sections.find((section) => section.key === "about")!
    // Only the thin hours/address/phone strip stands between the hero and the story.
    expect(sections.slice(0, 3).map((section) => section.type)).toEqual([
      "hero",
      "info_strip",
      "about",
    ])

    await page.goto("/")
    const about = page.locator("#about")
    await expect(about.getByRole("heading", { level: 2 })).toHaveText(story.title)
    await expect(about.getByText(story.subtitle, { exact: true })).toBeVisible()
    const paragraphs = story.body.split(/\n\s*\n/)
    expect(paragraphs.length).toBe(2)
    await expect(
      about.locator("p").filter({ hasText: paragraphs[1]!.slice(0, 30) })
    ).toBeVisible()

    const photo = about.locator("img")
    await photo.scrollIntoViewIfNeeded()
    await expect(photo).toBeVisible()
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0)
  })

  test("the header carries the booking button and the approved menu", async ({
    page,
  }) => {
    await page.goto("/")
    const header = page.getByRole("banner")
    const booking = header.getByRole("link", { name: new RegExp(`^${he.booking.cta}`) })
    await expect(booking).toHaveAttribute("href", BOOKING)
    await expect(booking).toHaveAttribute("target", "_blank")

    const nav = header.getByRole("navigation", { name: he.nav.main })
    await expect(nav.getByRole("link")).toHaveText([
      "מחירון",
      "חנות",
      "עבודות",
      "אקדמיה",
      "אודות",
      "צור קשר",
    ])
  })

  test("the sections come in the approved order", async ({ page }) => {
    await page.goto("/")
    const order = await page.evaluate(() =>
      ["about", "pricing", "shop", "academy", "gallery", "reviews", "contact"].map(
        (id) => {
          const element = document.getElementById(id)
          return element
            ? Math.round(element.getBoundingClientRect().top + window.scrollY)
            : -1
        }
      )
    )
    expect(
      order.every((top) => top > 0),
      `missing section: ${order}`
    ).toBeTruthy()
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    // Hours, address and phone sit between the hero and the first section.
    await expect(page.getByText(he.info.hours).first()).toBeVisible()
  })

  test("the price list shows the services and prices kept in the admin", async ({
    page,
    request,
  }) => {
    const { service_groups: groups } = await store<{
      service_groups: StoreServiceGroup[]
    }>(request, "/store/cms/services")
    expect(groups.length).toBeGreaterThan(0)

    await page.goto("/")
    const pricing = page.locator("#pricing")
    await expect(pricing.getByRole("heading", { level: 3 })).toHaveText(
      groups.map((group) => group.title)
    )
    for (const group of groups) {
      const card = pricing.locator("section").filter({
        has: page.getByRole("heading", { name: group.title, exact: true }),
      })
      await expect(card.getByRole("listitem")).toHaveCount(group.items.length)
      const first = group.items[0]!
      const row = card.getByRole("listitem").filter({ hasText: first.name }).first()
      if (first.price != null) {
        await expect(row.locator("bdi[dir=ltr]")).toHaveText(
          `₪${first.price.toLocaleString("he-IL")}`
        )
      }
    }
    await expect(
      pricing.getByRole("link", { name: new RegExp(he.booking.ctaOnline) })
    ).toHaveAttribute("href", BOOKING)
  })

  test("reviews show the overall score, the cards and the link to all reviews", async ({
    page,
    request,
  }) => {
    const { reviews, summary } = await store<{
      reviews: StoreReview[]
      summary: StoreReviewSummary
    }>(request, "/store/cms/reviews?limit=3")
    expect(reviews.length).toBeGreaterThan(0)

    await page.goto("/")
    const section = page.locator("#reviews")
    await expect(section.locator("figure")).toHaveCount(reviews.length)
    await expect(section.locator("figure").first()).toContainText(reviews[0]!.author_name)
    if (summary.rating != null) {
      await expect(section.getByRole("img", { name: /דירוג .+ מתוך 5/ })).toBeVisible()
    }
    if (summary.url) {
      await expect(
        section.getByRole("link", { name: he.reviews.readAll })
      ).toHaveAttribute("href", summary.url)
    }
  })

  test("the footer gives phone, WhatsApp, Instagram, opening hours and a map", async ({
    page,
    request,
  }) => {
    const settings = await settingsOf(request)
    await page.goto("/")
    const footer = page.getByRole("contentinfo")
    await expect(footer).toHaveAttribute("id", "contact")

    await expect(footer.locator(`a[href="tel:${settings.contact_phone}"]`)).toBeVisible()
    await expect(footer.getByRole("link", { name: he.contact.whatsapp })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/972\d+/
    )
    await expect(
      footer.getByRole("link", { name: he.contact.instagram })
    ).toHaveAttribute("href", settings.instagram_url!)

    const rows = (settings.opening_hours ?? "").split("\n").filter(Boolean)
    expect(rows.length).toBeGreaterThan(0)
    await expect(footer.locator("dl > div")).toHaveCount(rows.length)
    await expect(footer.locator("dl")).toContainText(rows[0]!.split("|")[0]!.trim())

    await expect(
      footer.locator(`iframe[title="${he.contact.mapTitle}"]`)
    ).toHaveAttribute("src", /^https:\/\/www\.google\.com\/maps/)
    await expect(
      footer.getByRole("link", { name: new RegExp(he.booking.ctaOnline) })
    ).toHaveAttribute("href", BOOKING)
  })
})

test.describe("gallery page", () => {
  test("shows the works, and each barber with a link to their Instagram", async ({
    page,
    request,
  }) => {
    const { gallery_items: items } = await store<{ gallery_items: StoreGalleryItem[] }>(
      request,
      "/store/cms/gallery?limit=60"
    )
    const { team_members: team } = await store<{ team_members: StoreTeamMember[] }>(
      request,
      "/store/cms/team"
    )
    expect(items.length).toBeGreaterThan(0)
    expect(team.length).toBeGreaterThan(0)

    await page.goto("/gallery")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(he.gallery.title)
    await expect(page.locator("figure img")).toHaveCount(items.length)

    for (const member of team) {
      const link = page.getByRole("link", { name: he.gallery.instagramOf(member.name) })
      await expect(link).toHaveAttribute("href", member.instagram_url!)
      await expect(link).toHaveAttribute("target", "_blank")
    }
    await expect(
      page.getByRole("main").getByRole("link", { name: new RegExp(he.booking.ctaOnline) })
    ).toHaveAttribute("href", BOOKING)
  })

  test("the home page teaser leads to it", async ({ page }) => {
    await page.goto("/")
    await page.locator("#gallery").getByRole("link", { name: he.gallery.viewAll }).click()
    await expect(page).toHaveURL(/\/gallery$/)
  })
})

test.describe("floating buttons", () => {
  test("booking stays in the bottom-right corner, in every language", async ({
    page,
  }) => {
    for (const [path, label] of [
      ["/gallery", he.booking.cta],
      ["/en/products", en.booking.cta],
      ["/ar", ar.booking.cta],
    ] as const) {
      await page.goto(path)
      const booking = page.locator("a.fixed[data-booking-link]")
      await expect(booking).toContainText(label)
      await expect(booking).toHaveAttribute("href", BOOKING)
      await expect(booking).toHaveAttribute("target", "_blank")
      await page.evaluate(() => window.scrollTo({ top: 900, behavior: "instant" }))
      const box = (await booking.boundingBox())!
      const viewport = page.viewportSize()!
      expect(box.x, path).toBeGreaterThan(viewport.width / 2)
      expect(box.y, path).toBeGreaterThan(viewport.height * 0.8)
    }
  })

  test("WhatsApp and accessibility stay in the bottom-left corner", async ({ page }) => {
    await page.goto("/products")
    const whatsapp = page.getByRole("link", { name: he.contact.whatsappLabel })
    await expect(whatsapp).toHaveText(he.contact.whatsappCta)
    await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\/972\d+\?text=/)

    for (const scroll of [0, 1200]) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), scroll)
      for (const button of [whatsapp, page.getByRole("button", { name: he.a11y.open })]) {
        const box = (await button.boundingBox())!
        const viewport = page.viewportSize()!
        expect(box.x + box.width).toBeLessThan(viewport.width / 2)
        expect(box.y).toBeGreaterThan(viewport.height * 0.8)
      }
    }
  })

  test("the accessibility menu changes the page and is remembered", async ({ page }) => {
    await page.goto("/")
    const html = page.locator("html")
    const fontSize = () =>
      page.evaluate(() => getComputedStyle(document.documentElement).fontSize)
    const before = parseFloat(await fontSize())

    await page.getByRole("button", { name: he.a11y.open }).click()
    const menu = page.getByRole("dialog", { name: he.a11y.title })
    await menu.getByRole("button", { name: he.a11y.increaseText }).click()
    expect(parseFloat(await fontSize())).toBeGreaterThan(before)

    const contrast = menu.getByRole("switch", { name: he.a11y.highContrast })
    await contrast.click()
    await expect(contrast).toHaveAttribute("aria-checked", "true")
    await expect(html).toHaveAttribute("data-a11y-contrast", "on")
    await menu.getByRole("switch", { name: he.a11y.stopMotion }).click()
    await expect(html).toHaveAttribute("data-a11y-motion", "off")

    // Remembered on the next page, and applied before the page is interactive.
    await page.goto("/products")
    await expect(html).toHaveAttribute("data-a11y-contrast", "on")
    expect(parseFloat(await fontSize())).toBeGreaterThan(before)

    await page.getByRole("button", { name: he.a11y.open }).click()
    await page
      .getByRole("dialog", { name: he.a11y.title })
      .getByRole("button", { name: he.a11y.reset })
      .click()
    await expect(html).not.toHaveAttribute("data-a11y-contrast")
    expect(parseFloat(await fontSize())).toBe(before)

    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog", { name: he.a11y.title })).toHaveCount(0)
  })
})

test.describe("languages", () => {
  test("English: left-to-right, translated, and links stay in English", async ({
    page,
  }) => {
    await page.goto("/")
    await page
      .getByRole("banner")
      .getByRole("group", { name: he.languages.label })
      .getByRole("link", { name: "English" })
      .click()
    await expect(page).toHaveURL(/\/en$/)
    const html = page.locator("html")
    await expect(html).toHaveAttribute("lang", "en")
    await expect(html).toHaveAttribute("dir", "ltr")

    // Mirrored for real: the logo is on the left now.
    const header = page.getByRole("banner")
    expect(
      await centerX(page, header.getByRole("link", { name: /BONANZA/ }))
    ).toBeLessThan(0.5)
    await expect(
      header.getByRole("link", { name: new RegExp(`^${en.booking.cta}`) })
    ).toHaveAttribute("href", BOOKING)
    await expect(page.getByRole("link", { name: en.contact.whatsappLabel })).toHaveText(
      en.contact.whatsappCta
    )

    await header
      .getByRole("navigation", { name: en.nav.main })
      .getByRole("link", { name: "Shop" })
      .click()
    await expect(page).toHaveURL(/\/en\/products$/)
    await page.getByRole("article").first().getByRole("link").first().click()
    await expect(page).toHaveURL(/\/en\/products\/[a-z0-9-]+$/)

    await page.getByRole("button", { name: en.product.addToCart }).click()
    await expect(page.getByText(en.product.added)).toBeVisible()
    await page.goto("/en/cart")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.cart.title)
    await expect(page.getByRole("link", { name: en.cart.checkout })).toHaveAttribute(
      "href",
      "/en/checkout"
    )
  })

  test("Arabic: right-to-left, with content translated by the backend", async ({
    page,
    request,
  }) => {
    const { sections } = await store<{ sections: { key: string; title: string }[] }>(
      request,
      "/store/cms/homepage",
      "ar"
    )
    const hero = sections.find((section) => section.key === "hero")!

    await page.goto("/ar")
    const html = page.locator("html")
    await expect(html).toHaveAttribute("lang", "ar")
    await expect(html).toHaveAttribute("dir", "rtl")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(hero.title)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/[؀-ۿ]/)
    await expect(page.getByRole("link", { name: ar.contact.whatsappLabel })).toBeVisible()
    await expect(page.locator("#pricing").getByRole("heading", { level: 2 })).toHaveText(
      /[؀-ۿ]/
    )
  })

  test("a form error comes back in the visitor's language", async ({ page }) => {
    await page.goto("/en/account/login")
    await page.getByLabel(en.account.email).fill("nobody@example.com")
    await page.getByLabel(en.account.password, { exact: true }).fill("wrong-password-1")
    await page.getByRole("button", { name: en.account.signIn }).click()
    await expect(page.getByText(en.account.errors.invalidCredentials)).toBeVisible()
  })

  test("Hebrew has no prefix, and each page names its other languages", async ({
    page,
    request,
  }) => {
    const prefixed = await request.get("/he/gallery", { maxRedirects: 0 })
    expect(prefixed.status()).toBe(308)
    expect(prefixed.headers().location).toBe("/gallery")

    await page.goto("/en/gallery")
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/en\/gallery$/
    )
    await expect(page.locator('link[rel="alternate"][hreflang="he"]')).toHaveAttribute(
      "href",
      /\/gallery$/
    )
    await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute(
      "href",
      /\/ar\/gallery$/
    )
  })

  test("an unknown address in English shows the English not-found page", async ({
    page,
  }) => {
    const response = await page.goto("/en/no-such-page-here")
    expect(response?.status()).toBe(404)
    await expect(
      page.getByRole("heading", { name: en.errors.notFoundTitle })
    ).toBeVisible()
  })
})
