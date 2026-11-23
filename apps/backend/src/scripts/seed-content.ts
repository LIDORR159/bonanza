import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createProductCategoriesWorkflow,
  createProductTagsWorkflow,
} from "@medusajs/medusa/core-flows"
import { CMS_MODULE } from "../modules/cms"
import type CmsModuleService from "../modules/cms/service"

/**
 * Starter structure for a new store: product categories, the tags the home
 * page rails read, the home page sections, the menus, site settings and empty
 * content pages.
 *
 *   pnpm exec medusa exec ./src/scripts/seed-content.ts
 *
 * Safe to run in any environment and safe to run again: it only creates what
 * is missing and never overwrites anything edited in the admin.
 *
 * Content pages are created as drafts with no real text. Policies and legal
 * pages have to be written by the business and reviewed before they are
 * published; nothing here stands in for that.
 */

export const CATEGORIES = [
  { handle: "clippers", name: "מכונות תספורת", description: "מכונות תספורת מקצועיות לעבודה יומיומית במספרה." },
  { handle: "trimmers", name: "טרימרים", description: "טרימרים לקווים חדים, דיוקים וגימורים." },
  { handle: "shavers", name: "מכונות גילוח", description: "מכונות גילוח לגימור חלק ונקי." },
  { handle: "scissors", name: "מספריים", description: "מספרי תספורת ודילול לספרים." },
  { handle: "styling", name: "עיצוב שיער", description: "ווקסים, משחות, ג׳לים וספריי לעיצוב." },
  { handle: "beard-care", name: "טיפוח הזקן", description: "שמנים, באלמים ומוצרי טיפוח לזקן." },
  { handle: "accessories", name: "אביזרים", description: "מסרקים, מברשות, סינרים ואביזרי עבודה." },
  { handle: "professional-equipment", name: "ציוד מקצועי", description: "ציוד וריהוט לעמדת העבודה במספרה." },
] as const

/** Tags that decide which products the home page rails show. */
export const MERCHANDISING_TAGS = ["featured", "best-seller"] as const

const PAGES = [
  { slug: "about", title: "אודות" },
  { slug: "contact", title: "צור קשר" },
  { slug: "academy", title: "האקדמיה" },
  { slug: "shipping", title: "משלוחים" },
  { slug: "returns", title: "החזרות וביטולים" },
  { slug: "privacy", title: "מדיניות פרטיות" },
  { slug: "terms", title: "תקנון האתר" },
  { slug: "accessibility", title: "הצהרת נגישות" },
] as const

export default async function seedContent({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const cms: CmsModuleService = container.resolve(CMS_MODULE)

  // ── Categories ────────────────────────────────────────────────────────────
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
  })
  const categoryIds = new Map(existingCategories.map((c) => [c.handle, c.id]))
  const missingCategories = CATEGORIES.filter((c) => !categoryIds.has(c.handle))
  if (missingCategories.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingCategories.map((category) => ({
          name: category.name,
          handle: category.handle,
          description: category.description,
          is_active: true,
          is_internal: false,
          rank: CATEGORIES.findIndex((c) => c.handle === category.handle),
        })),
      },
    })
    for (const category of result) {
      categoryIds.set(category.handle, category.id)
    }
    logger.info(`Created ${result.length} product categories.`)
  }

  // ── Merchandising tags ────────────────────────────────────────────────────
  const { data: existingTags } = await query.graph({
    entity: "product_tag",
    fields: ["id", "value"],
  })
  const tagIds = new Map(existingTags.map((t) => [t.value, t.id]))
  const missingTags = MERCHANDISING_TAGS.filter((value) => !tagIds.has(value))
  if (missingTags.length) {
    const { result } = await createProductTagsWorkflow(container).run({
      input: { product_tags: missingTags.map((value) => ({ value })) },
    })
    for (const tag of result) {
      tagIds.set(tag.value, tag.id)
    }
    logger.info(`Created ${result.length} product tags.`)
  }

  // ── Site settings ─────────────────────────────────────────────────────────
  const [settings] = await cms.listSiteSettings({}, { take: 1 })
  if (!settings) {
    await cms.createSiteSettings({
      store_name: "BONANZA",
      tagline: "BARBERSHOP & ACADEMY",
      title_template: "%s | BONANZA",
      default_meta_title: "BONANZA — ציוד מקצועי לספרים",
      default_meta_description:
        "מכונות תספורת, טרימרים, מספריים, מוצרי טיפוח ואביזרים מקצועיים לספרים ולמספרות.",
      newsletter_enabled: true,
    })
    logger.info("Created site settings.")
  }

  // ── Content pages (drafts) ────────────────────────────────────────────────
  const existingPages = await cms.listContentPages({}, { select: ["slug"], take: 500 })
  const pageSlugs = new Set(existingPages.map((page) => page.slug))
  const missingPages = PAGES.filter((page) => !pageSlugs.has(page.slug))
  if (missingPages.length) {
    await cms.createContentPages(
      missingPages.map((page) => ({
        slug: page.slug,
        title: page.title,
        body: "",
        status: "draft" as const,
      }))
    )
    logger.info(`Created ${missingPages.length} draft content pages.`)
  }

  // ── Home page ─────────────────────────────────────────────────────────────
  const existingSections = await cms.listHomepageSections({}, { select: ["key"], take: 200 })
  if (!existingSections.length) {
    const published = { status: "published" as const, is_visible: true }
    const sections = [
      {
        type: "hero" as const,
        key: "hero",
        title: "הכלים של המקצוענים.",
        subtitle: "ציוד ספרות מקצועי, מוצרי טיפוח ואביזרים. הכול במקום אחד.",
        cta_label: "לחנות",
        cta_url: "/products",
        secondary_cta_label: "האקדמיה",
        secondary_cta_url: "/academy",
      },
      // Directly after the hero, so its cards overlap the hero's bottom edge.
      {
        type: "product_rail" as const,
        key: "featured",
        title: "מוצרים נבחרים",
        cta_label: "לכל המוצרים",
        cta_url: "/products",
        settings: {
          product_source: { type: "tag", id: tagIds.get("featured")! },
          limit: 4,
        },
      },
      {
        type: "categories" as const,
        key: "categories",
        title: "קטגוריות",
        settings: { limit: 8 },
      },
      {
        type: "banner_slot" as const,
        key: "promo-primary",
        settings: { banner_placement: "home_primary" },
      },
      {
        type: "product_rail" as const,
        key: "best-sellers",
        title: "הנמכרים ביותר",
        settings: {
          product_source: { type: "tag", id: tagIds.get("best-seller")! },
          limit: 4,
        },
      },
      {
        type: "product_rail" as const,
        key: "new-arrivals",
        title: "חדש על המדף",
        cta_label: "לכל החדשים",
        cta_url: "/products?sort=newest",
        settings: { product_source: { type: "newest" }, limit: 4 },
      },
      {
        type: "brands" as const,
        key: "brands",
        title: "המותגים שלנו",
        cta_label: "לכל המותגים",
        cta_url: "/brands",
        settings: { limit: 8 },
      },
      {
        type: "product_rail" as const,
        key: "deals",
        title: "מבצעים",
        cta_label: "לכל המבצעים",
        cta_url: "/products?sale=1",
        settings: { product_source: { type: "on_sale" }, limit: 4 },
      },
      {
        type: "product_rail" as const,
        key: "pro-equipment",
        title: "ציוד מקצועי למספרה",
        cta_label: "לקטגוריה",
        cta_url: "/categories/professional-equipment",
        settings: {
          product_source: {
            type: "category",
            id: categoryIds.get("professional-equipment")!,
          },
          limit: 4,
        },
      },
      {
        type: "academy" as const,
        key: "academy",
        title: "מקצוע לומדים מהידיים.",
        subtitle: "BONANZA ACADEMY",
        body: "קורסים וסדנאות לספרים בתחילת הדרך ולספרים מנוסים.",
        cta_label: "לפרטים על האקדמיה",
        cta_url: "/academy",
      },
      {
        type: "banner_slot" as const,
        key: "promo-secondary",
        settings: { banner_placement: "home_secondary" },
      },
      {
        type: "newsletter" as const,
        key: "newsletter",
        title: "נשארים מעודכנים",
        subtitle: "מוצרים חדשים ומבצעים, ישירות למייל.",
      },
    ]
    await cms.createHomepageSections(
      sections.map((section, index) => ({ ...published, ...section, rank: index * 10 }))
    )
    logger.info(`Created ${sections.length} home page sections.`)
  }

  // ── Menus ─────────────────────────────────────────────────────────────────
  const existingNavigation = await cms.listNavigationItems({}, { select: ["id"], take: 1 })
  if (!existingNavigation.length) {
    type MenuEntry = {
      label: string
      link_type: "custom" | "page" | "category"
      url?: string
      link_ref?: string
    }
    const custom = (label: string, url: string): MenuEntry => ({
      label,
      link_type: "custom",
      url,
    })
    const page = (label: string, slug: string): MenuEntry => ({
      label,
      link_type: "page",
      link_ref: slug,
    })
    const category = (handle: string): MenuEntry => ({
      label: CATEGORIES.find((c) => c.handle === handle)!.name,
      link_type: "category",
      link_ref: handle,
    })

    const createMenu = async (
      menu: "header" | "footer",
      tree: { item: MenuEntry; children?: MenuEntry[] }[]
    ) => {
      for (const [index, { item, children }] of tree.entries()) {
        const parent = await cms.createNavigationItems({ menu, rank: index * 10, ...item })
        if (children?.length) {
          await cms.createNavigationItems(
            children.map((child, childIndex) => ({
              menu,
              parent_id: parent.id,
              rank: childIndex * 10,
              ...child,
            }))
          )
        }
      }
    }

    await createMenu("header", [
      {
        item: custom("כל המוצרים", "/products"),
        children: CATEGORIES.map((c) => category(c.handle)),
      },
      { item: custom("מותגים", "/brands") },
      { item: custom("מבצעים", "/products?sale=1") },
      { item: page("האקדמיה", "academy") },
      { item: page("אודות", "about") },
      { item: page("צור קשר", "contact") },
    ])

    await createMenu("footer", [
      {
        item: custom("חנות", "/products"),
        children: [
          custom("כל המוצרים", "/products"),
          custom("מבצעים", "/products?sale=1"),
          custom("מותגים", "/brands"),
        ],
      },
      {
        item: custom("שירות לקוחות", "/account"),
        children: [
          page("משלוחים", "shipping"),
          page("החזרות וביטולים", "returns"),
          page("צור קשר", "contact"),
          custom("החשבון שלי", "/account"),
        ],
      },
      {
        item: custom("מידע", "/"),
        children: [
          page("אודות", "about"),
          page("האקדמיה", "academy"),
          page("תקנון האתר", "terms"),
          page("מדיניות פרטיות", "privacy"),
          page("הצהרת נגישות", "accessibility"),
        ],
      },
    ])
    logger.info("Created header and footer menus.")
  }

  logger.info("Starter content is in place.")
}
