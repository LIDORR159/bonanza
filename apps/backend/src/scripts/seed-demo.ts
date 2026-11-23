import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { ExecArgs, PricingTypes } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  PriceListStatus,
  PriceListType,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  createPriceListsWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createPromotionsWorkflow,
  createShippingOptionsWorkflow,
  updateRegionsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows"
import { isDevPaymentEnabled, isProduction } from "../lib/env"
import { BRAND_MODULE } from "../modules/brand"
import type BrandModuleService from "../modules/brand/service"
import { CMS_MODULE } from "../modules/cms"
import type CmsModuleService from "../modules/cms/service"
import { DEMO_BRANDS, DEMO_OPTIONS, DEMO_PRODUCTS } from "./demo-catalog"
import { seedDemoSite } from "./demo-site"
import {
  BRAND_TRANSLATIONS,
  PAGE_BODY_TRANSLATIONS,
  PRODUCT_TITLES,
} from "./demo-translations"
import seedContent from "./seed-content"
import { seedTranslations, type Translated } from "./translations"

/**
 * Demo data for development and testing: a sample price list, gallery, team
 * and reviews, placeholder contact details, invented brands and products with
 * generated images, placeholder shipping prices, a sale, a discount code,
 * banners and placeholder page text, with draft English and Arabic
 * translations. It also attaches the development payment provider to the
 * region.
 *
 *   pnpm exec medusa exec ./src/scripts/seed-demo.ts
 *
 * Refuses to run when APP_ENV=production. Each part is loaded once: the site
 * content while its lists are empty, the catalog while there are no products.
 */

const FREE_SHIPPING_THRESHOLD = 399
const DEV_PAYMENT_PROVIDER = "pp_dev-hosted_dev"

const PLACEHOLDER_NOTICE =
  "> **טקסט לדוגמה.** העמוד הזה נוצר אוטומטית לסביבת הפיתוח. את התוכן האמיתי כותבים בממשק הניהול, ועמודי מדיניות ותקנון טעונים בדיקה משפטית לפני פרסום."

const PAGE_BODIES: Record<string, string> = {
  about: `${PLACEHOLDER_NOTICE}\n\n## מי אנחנו\n\nBONANZA היא מספרה ואקדמיה לספרים, ועכשיו גם חנות לציוד מקצועי. כאן יופיע הסיפור של העסק.\n\n## מה תמצאו כאן\n\n- ציוד מקצועי לספרים\n- מוצרי טיפוח ועיצוב\n- אביזרים לעמדת העבודה`,
  contact: `${PLACEHOLDER_NOTICE}\n\n## דברו איתנו\n\nכאן יופיעו פרטי ההתקשרות: טלפון, וואטסאפ, כתובת ושעות פעילות.`,
  academy: `${PLACEHOLDER_NOTICE}\n\n## BONANZA ACADEMY\n\nכאן יופיע מידע על הקורסים והסדנאות: למי הם מתאימים, מה לומדים ואיך נרשמים.`,
  shipping: `${PLACEHOLDER_NOTICE}\n\n## משלוחים\n\nכאן יופיעו אפשרויות המשלוח, זמני האספקה והמחירים בפועל.`,
  returns: `${PLACEHOLDER_NOTICE}\n\n## החזרות וביטולים\n\nכאן תופיע מדיניות הביטולים וההחזרות של העסק.`,
  privacy: `${PLACEHOLDER_NOTICE}\n\n## מדיניות פרטיות\n\nכאן תופיע מדיניות הפרטיות.`,
  terms: `${PLACEHOLDER_NOTICE}\n\n## תקנון האתר\n\nכאן יופיע תקנון האתר.`,
  accessibility: `${PLACEHOLDER_NOTICE}\n\n## הצהרת נגישות\n\nכאן תופיע הצהרת הנגישות של האתר ופרטי רכז הנגישות.`,
}

export default async function seedDemo(args: ExecArgs) {
  const { container } = args
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const cms: CmsModuleService = container.resolve(CMS_MODULE)
  const brands: BrandModuleService = container.resolve(BRAND_MODULE)

  if (isProduction()) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "The demo seed must not run when APP_ENV=production."
    )
  }

  // Categories, tags, home page sections, menus and draft pages.
  await seedContent(args)

  // Sample price list, gallery, team, reviews and contact details.
  await seedDemoSite(container)

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id"],
    pagination: { take: 1 },
  })
  if (existingProducts.length) {
    logger.info("Products already exist. Demo seed skipped.")
    return
  }

  // ── Lookups ───────────────────────────────────────────────────────────────
  const [{ data: categories }, { data: tags }, { data: salesChannels }] = await Promise.all([
    query.graph({ entity: "product_category", fields: ["id", "handle"] }),
    query.graph({ entity: "product_tag", fields: ["id", "value"] }),
    query.graph({ entity: "sales_channel", fields: ["id"] }),
  ])
  const [{ data: shippingProfiles }, { data: stockLocations }, { data: regions }] =
    await Promise.all([
      query.graph({ entity: "shipping_profile", fields: ["id"] }),
      query.graph({ entity: "stock_location", fields: ["id"] }),
      query.graph({ entity: "region", fields: ["id", "currency_code"] }),
    ])
  const { data: fulfillmentSets } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "type", "service_zones.id"],
  })

  const categoryId = new Map(categories.map((c) => [c.handle, c.id]))
  const tagId = new Map(tags.map((t) => [t.value, t.id]))
  const salesChannel = salesChannels[0]
  const shippingProfile = shippingProfiles[0]
  const stockLocation = stockLocations[0]
  const region = regions[0]
  if (!salesChannel || !shippingProfile || !stockLocation || !region) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "The base store setup is missing. Run `medusa db:migrate` first."
    )
  }

  // ── Images ────────────────────────────────────────────────────────────────
  logger.info("Uploading demo images...")
  const imageNames = Array.from(
    new Set(DEMO_PRODUCTS.flatMap((p) => [p.image, ...p.variants.map((v) => v.image ?? p.image)]))
  )
  const { result: uploaded } = await uploadFilesWorkflow(container).run({
    input: {
      files: imageNames.map((name) => ({
        filename: `${name}.webp`,
        mimeType: "image/webp",
        content: readFileSync(join(__dirname, "seed-assets", `${name}.webp`)).toString(
          "base64"
        ),
        access: "public" as const,
      })),
    },
  })
  const imageUrl = new Map(imageNames.map((name, index) => [name, uploaded[index].url]))

  // ── Brands ────────────────────────────────────────────────────────────────
  // Looked up first so the script can be run again after a failed attempt.
  const existingBrands = await brands.listBrands({}, { take: 500 })
  const brandId = new Map(existingBrands.map((b) => [b.handle, b.id]))
  const missingBrands = DEMO_BRANDS.map((brand, index) => ({
    ...brand,
    rank: index * 10,
  })).filter((brand) => !brandId.has(brand.handle))
  if (missingBrands.length) {
    const createdBrands = await brands.createBrands(missingBrands)
    for (const brand of createdBrands) {
      brandId.set(brand.handle, brand.id)
    }
    await seedTranslations(
      container,
      "brand",
      createdBrands.map((brand) => ({
        id: brand.id,
        translations: BRAND_TRANSLATIONS[brand.handle],
      }))
    )
    logger.info(`Created ${missingBrands.length} brands.`)
  }

  // ── Products ──────────────────────────────────────────────────────────────
  const { data: existingOptions } = await query.graph({
    entity: "product_option",
    fields: ["id", "title"],
  })
  const optionId = new Map(existingOptions.map((o) => [o.title, o.id]))
  const missingOptions = Object.values(DEMO_OPTIONS).filter((o) => !optionId.has(o.title))
  if (missingOptions.length) {
    const { result: options } = await createProductOptionsWorkflow(container).run({
      input: {
        product_options: missingOptions.map((option) => ({
          title: option.title,
          values: [...option.values],
        })),
      },
    })
    for (const option of options) {
      optionId.set(option.title, option.id)
    }
  }

  const { result: products } = await createProductsWorkflow(container).run({
    input: {
      products: DEMO_PRODUCTS.map((product) => {
        const option = DEMO_OPTIONS[product.option ?? "standard"]
        const images = Array.from(
          new Set([product.image, ...product.variants.map((v) => v.image ?? product.image)])
        )
        return {
          title: product.title,
          subtitle: product.subtitle,
          handle: product.handle,
          description: product.description,
          status: ProductStatus.PUBLISHED,
          weight: product.weight,
          thumbnail: imageUrl.get(product.image),
          images: images.map((name) => ({ url: imageUrl.get(name)! })),
          category_ids: [categoryId.get(product.category)!],
          tag_ids: (product.tags ?? []).map((tag) => tagId.get(tag)!),
          shipping_profile_id: shippingProfile.id,
          sales_channels: [{ id: salesChannel.id }],
          // Specifications are plain metadata entries prefixed with `spec:`,
          // editable from the product's Metadata section in the admin.
          metadata: Object.fromEntries(
            Object.entries(product.specs ?? {}).map(([label, value]) => [
              `spec:${label}`,
              value,
            ])
          ),
          options: [{ id: optionId.get(option.title)! }],
          variants: product.variants.map((variant) => ({
            title: variant.value ?? product.title,
            sku: `${product.sku}-${variant.sku}`,
            manage_inventory: true,
            options: { [option.title]: variant.value ?? option.values[0] },
            // ILS prices include VAT.
            prices: [{ amount: variant.price, currency_code: "ils" }],
          })),
        }
      }),
    },
  })
  await seedTranslations(
    container,
    "product",
    products.flatMap((product) => {
      const titles = PRODUCT_TITLES[product.handle]
      return titles
        ? [{ id: product.id, translations: { en: { title: titles[0] }, ar: { title: titles[1] } } }]
        : []
    })
  )
  logger.info(`Created ${products.length} products.`)

  await link.create(
    DEMO_PRODUCTS.map((demo) => ({
      [Modules.PRODUCT]: { product_id: products.find((p) => p.handle === demo.handle)!.id },
      [BRAND_MODULE]: { brand_id: brandId.get(demo.brand)! },
    }))
  )

  // ── Stock ─────────────────────────────────────────────────────────────────
  const stockBySku = new Map<string, number>(
    DEMO_PRODUCTS.flatMap((p) =>
      p.variants.map((v): [string, number] => [`${p.sku}-${v.sku}`, v.stock])
    )
  )
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku"],
  })
  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryItems.map((item) => ({
        location_id: stockLocation.id,
        inventory_item_id: item.id,
        stocked_quantity: stockBySku.get(item.sku ?? "") ?? 0,
      })),
    },
  })

  // ── Sale prices ───────────────────────────────────────────────────────────
  const saleBySku = new Map<string, number>(
    DEMO_PRODUCTS.flatMap((p) =>
      p.variants
        .filter((v) => v.sale)
        .map((v): [string, number] => [`${p.sku}-${v.sku}`, v.sale!])
    )
  )
  const salePrices = products.flatMap((product) =>
    (product.variants ?? [])
      .filter((variant) => saleBySku.has(variant.sku ?? ""))
      .map((variant) => ({
        variant_id: variant.id,
        amount: saleBySku.get(variant.sku!)!,
        currency_code: "ils",
      }))
  )
  await createPriceListsWorkflow(container).run({
    input: {
      price_lists_data: [
        // `type` is accepted by the pricing module but missing from the
        // workflow's input type. `sale` keeps the regular price as the
        // crossed-out original.
        {
          title: "מבצע השקה",
          description: "מחירי מבצע לדוגמה",
          status: PriceListStatus.ACTIVE,
          type: PriceListType.SALE,
          prices: salePrices,
        } as PricingTypes.CreatePriceListWorkflowInputDTO,
      ],
    },
  })
  logger.info(`Created a sale price list with ${salePrices.length} prices.`)

  // ── Shipping options (placeholder prices) ─────────────────────────────────
  const zone = (type: string) =>
    fulfillmentSets.find((set) => set.type === type)?.service_zones?.[0]?.id
  const rules = [
    { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
    { attribute: "is_return", value: "false", operator: "eq" as const },
  ]
  const flat = (amount: number, freeAbove?: number) => [
    { currency_code: "ils", amount },
    { region_id: region.id, amount },
    ...(freeAbove
      ? [
          {
            currency_code: "ils",
            amount: 0,
            rules: [{ attribute: "item_total", operator: "gte" as const, value: freeAbove }],
          },
        ]
      : []),
  ]
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "משלוח עד הבית",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: zone("shipping")!,
        shipping_profile_id: shippingProfile.id,
        type: { label: "רגיל", description: "3 עד 5 ימי עסקים", code: "standard" },
        prices: flat(35, FREE_SHIPPING_THRESHOLD),
        rules,
      },
      {
        name: "משלוח אקספרס",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: zone("shipping")!,
        shipping_profile_id: shippingProfile.id,
        type: { label: "אקספרס", description: "עד 2 ימי עסקים", code: "express" },
        prices: flat(60),
        rules,
      },
      {
        name: "איסוף עצמי מהחנות",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: zone("pickup")!,
        shipping_profile_id: shippingProfile.id,
        type: { label: "איסוף עצמי", description: "בתיאום מראש", code: "pickup" },
        prices: flat(0),
        rules,
      },
    ],
  })
  logger.info("Created shipping options.")

  // ── Discount code ─────────────────────────────────────────────────────────
  await createPromotionsWorkflow(container).run({
    input: {
      promotionsData: [
        {
          code: "BONANZA10",
          type: "standard",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "percentage",
            target_type: "order",
            allocation: "across",
            value: 10,
            currency_code: "ils",
          },
        },
      ],
    },
  })

  // ── Payment provider ──────────────────────────────────────────────────────
  if (isDevPaymentEnabled()) {
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: { payment_providers: [DEV_PAYMENT_PROVIDER] },
      },
    })
    logger.info("Attached the development payment provider to the region.")
  }

  // ── Content ───────────────────────────────────────────────────────────────
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const banners = await cms.createBanners([
    {
      placement: "announcement",
      title: `משלוח חינם בהזמנה מעל ‎₪${FREE_SHIPPING_THRESHOLD}`,
      target_url: "/shipping",
      is_enabled: true,
      rank: 0,
    },
    {
      placement: "home_primary",
      title: "מבצע השקה",
      subtitle: "מחירים מיוחדים על מכונות, טרימרים ומוצרי עיצוב נבחרים.",
      cta_label: "לכל המבצעים",
      target_url: "/products?sale=1",
      is_enabled: true,
      rank: 0,
    },
    {
      placement: "home_secondary",
      title: "מקימים עמדה חדשה?",
      subtitle: "כיסאות, פנים ומזוודות ציוד לספרים מקצועיים.",
      cta_label: "לציוד המקצועי",
      target_url: "/categories/professional-equipment",
      is_enabled: true,
      rank: 0,
    },
    // The next three exist to show, and to test, when a banner is hidden.
    {
      placement: "home_primary",
      title: "באנר כבוי לדוגמה",
      is_enabled: false,
      rank: 10,
    },
    {
      placement: "home_primary",
      title: "באנר שתוקפו פג לדוגמה",
      is_enabled: true,
      ends_at: new Date(now - day),
      rank: 20,
    },
    {
      placement: "home_primary",
      title: "באנר עתידי לדוגמה",
      is_enabled: true,
      starts_at: new Date(now + 30 * day),
      rank: 30,
    },
  ])
  // The three banners that show, in the order created above.
  const bannerTranslations: Translated[] = [
    {
      en: { title: `Free shipping on orders over ₪${FREE_SHIPPING_THRESHOLD}` },
      ar: { title: `شحن مجاني للطلبات فوق ₪${FREE_SHIPPING_THRESHOLD}` },
    },
    {
      en: {
        title: "Launch sale",
        subtitle: "Special prices on selected clippers, trimmers and styling products.",
        cta_label: "All deals",
      },
      ar: {
        title: "عرض الافتتاح",
        subtitle: "أسعار خاصة على ماكينات قص وتحديد ومنتجات تصفيف مختارة.",
        cta_label: "كل العروض",
      },
    },
    {
      en: {
        title: "Setting up a new station?",
        subtitle: "Chairs, dryers and tool cases for professional barbers.",
        cta_label: "Professional equipment",
      },
      ar: {
        title: "تجهّزون محطة جديدة؟",
        subtitle: "كراسٍ، مجففات وحقائب أدوات للحلاقين المحترفين.",
        cta_label: "إلى المعدات الاحترافية",
      },
    },
  ]
  await seedTranslations(
    container,
    "banner",
    bannerTranslations.map((translations, index) => ({ id: banners[index].id, translations }))
  )

  const pages = await cms.listContentPages({}, { take: 500 })
  const emptyPages = pages.filter((page) => PAGE_BODIES[page.slug] && !page.body)
  await cms.updateContentPages(
    emptyPages.map((page) => ({
      id: page.id,
      body: PAGE_BODIES[page.slug],
      status: "published" as const,
      published_at: new Date(),
    }))
  )
  await seedTranslations(
    container,
    "content_page",
    emptyPages.map((page) => ({ id: page.id, translations: PAGE_BODY_TRANSLATIONS[page.slug] }))
  )
  if (!pages.some((page) => page.slug === "draft-example")) {
    await cms.createContentPages({
      slug: "draft-example",
      title: "עמוד טיוטה לדוגמה",
      body: "העמוד הזה במצב טיוטה ואינו נגיש לגולשים.",
      status: "draft",
    })
  }

  const [settings] = await cms.listSiteSettings({}, { take: 1 })
  if (settings && settings.free_shipping_threshold == null) {
    await cms.updateSiteSettings({
      id: settings.id,
      free_shipping_threshold: FREE_SHIPPING_THRESHOLD,
    })
  }

  // ── Search index ──────────────────────────────────────────────────────────
  // Products are indexed from events, which this short-lived script does not
  // wait for, and price lists emit none. Rebuild the index directly.
  await container.resolve(Modules.SEARCH).reindex()
  logger.info("Search index rebuilt.")

  logger.info("Demo data is in place.")
}
