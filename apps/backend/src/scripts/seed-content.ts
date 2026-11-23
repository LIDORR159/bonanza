import type { HomepageSectionType } from "@bonanza/types"
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createProductCategoriesWorkflow,
  createProductTagsWorkflow,
} from "@medusajs/medusa/core-flows"
import { CMS_MODULE } from "../modules/cms"
import type CmsModuleService from "../modules/cms/service"
import { uploadSeedAssets } from "./assets"
import { ensureTranslationLocales, seedTranslations, type Translated } from "./translations"

/**
 * Starter structure for a new site: product categories, the tags the shop
 * rail reads, the home page sections, the menus, site settings and empty
 * content pages.
 *
 *   pnpm exec medusa exec ./src/scripts/seed-content.ts
 *
 * Safe to run in any environment and safe to run again: it only creates what
 * is missing and never overwrites anything edited in the admin.
 *
 * It states nothing about the business that has not been supplied: no phone,
 * address, opening hours, prices, team, photographs of work or reviews. Those
 * are entered in the admin. Content pages are created as drafts with no text;
 * policies and legal pages have to be written by the business and reviewed
 * before they are published.
 *
 * The English and Arabic texts below are drafts for the owner to review. They
 * are stored as translations and edited under Settings → Translations.
 */

/** The external page where appointments are booked. */
const BOOKING_URL = "https://customers.dibs-app.com/business-page/6a38ed88c63c46952e6a3716"

export const CATEGORIES = [
  {
    handle: "clippers", name: "מכונות תספורת", description: "מכונות תספורת מקצועיות לעבודה יומיומית במספרה.",
    translations: {
      en: { name: "Clippers", description: "Professional clippers for everyday work in the barbershop." },
      ar: { name: "ماكينات قص الشعر", description: "ماكينات قص شعر احترافية للعمل اليومي في صالون الحلاقة." },
    },
  },
  {
    handle: "trimmers", name: "טרימרים", description: "טרימרים לקווים חדים, דיוקים וגימורים.",
    translations: {
      en: { name: "Trimmers", description: "Trimmers for sharp lines, detailing and finishing." },
      ar: { name: "ماكينات تحديد", description: "ماكينات تحديد للخطوط الحادة والتفاصيل واللمسات النهائية." },
    },
  },
  {
    handle: "shavers", name: "מכונות גילוח", description: "מכונות גילוח לגימור חלק ונקי.",
    translations: {
      en: { name: "Shavers", description: "Shavers for a smooth, clean finish." },
      ar: { name: "ماكينات حلاقة", description: "ماكينات حلاقة للمسة نهائية ناعمة ونظيفة." },
    },
  },
  {
    handle: "scissors", name: "מספריים", description: "מספרי תספורת ודילול לספרים.",
    translations: {
      en: { name: "Scissors", description: "Cutting and thinning scissors for barbers." },
      ar: { name: "مقصات", description: "مقصات قص وتخفيف للحلاقين." },
    },
  },
  {
    handle: "styling", name: "עיצוב שיער", description: "ווקסים, משחות, ג׳לים וספריי לעיצוב.",
    translations: {
      en: { name: "Hair styling", description: "Waxes, pastes, gels and styling sprays." },
      ar: { name: "تصفيف الشعر", description: "واكس، معاجين، جل وبخاخات لتصفيف الشعر." },
    },
  },
  {
    handle: "beard-care", name: "טיפוח הזקן", description: "שמנים, באלמים ומוצרי טיפוח לזקן.",
    translations: {
      en: { name: "Beard care", description: "Oils, balms and grooming products for the beard." },
      ar: { name: "العناية باللحية", description: "زيوت وبلسم ومنتجات للعناية باللحية." },
    },
  },
  {
    handle: "accessories", name: "אביזרים", description: "מסרקים, מברשות, סינרים ואביזרי עבודה.",
    translations: {
      en: { name: "Accessories", description: "Combs, brushes, capes and work accessories." },
      ar: { name: "إكسسوارات", description: "أمشاط، فُرش، مرايل وإكسسوارات للعمل." },
    },
  },
  {
    handle: "professional-equipment", name: "ציוד מקצועי", description: "ציוד וריהוט לעמדת העבודה במספרה.",
    translations: {
      en: { name: "Professional equipment", description: "Equipment and furniture for the barber station." },
      ar: { name: "معدات احترافية", description: "معدات وأثاث لمحطة العمل في صالون الحلاقة." },
    },
  },
] as const satisfies readonly {
  handle: string
  name: string
  description: string
  translations: Translated
}[]

/** Tags that decide which products the home page rails show. */
export const MERCHANDISING_TAGS = ["featured", "best-seller"] as const

const PAGES: { slug: string; title: string; translations: Translated }[] = [
  { slug: "about", title: "אודות", translations: { en: { title: "About" }, ar: { title: "من نحن" } } },
  { slug: "contact", title: "צור קשר", translations: { en: { title: "Contact" }, ar: { title: "اتصل بنا" } } },
  { slug: "academy", title: "האקדמיה", translations: { en: { title: "The Academy" }, ar: { title: "الأكاديمية" } } },
  { slug: "shipping", title: "משלוחים", translations: { en: { title: "Shipping" }, ar: { title: "الشحن" } } },
  { slug: "returns", title: "החזרות וביטולים", translations: { en: { title: "Returns & cancellations" }, ar: { title: "الإرجاع والإلغاء" } } },
  { slug: "privacy", title: "מדיניות פרטיות", translations: { en: { title: "Privacy policy" }, ar: { title: "سياسة الخصوصية" } } },
  { slug: "terms", title: "תקנון האתר", translations: { en: { title: "Terms of use" }, ar: { title: "شروط الاستخدام" } } },
  { slug: "accessibility", title: "הצהרת נגישות", translations: { en: { title: "Accessibility statement" }, ar: { title: "بيان إمكانية الوصول" } } },
]

type SectionSeed = {
  type: HomepageSectionType
  /** Also the section's anchor on the home page: `/#pricing`. */
  key: string
  title?: string
  subtitle?: string
  body?: string
  /** A picture in `seed-assets/`. */
  image?: string
  image_alt?: string
  cta_label?: string
  cta_url?: string
  secondary_cta_label?: string
  secondary_cta_url?: string
  settings?: Record<string, unknown>
  translations?: Translated
}

type MenuEntry = {
  label: string
  link_type: "custom" | "page"
  url?: string
  link_ref?: string
  translations: Translated
}

const custom = (label: string, url: string, en: string, ar: string): MenuEntry => ({
  label,
  link_type: "custom",
  url,
  translations: { en: { label: en }, ar: { label: ar } },
})

/** A link to a content page. It appears in the menu once the page is published. */
const page = (label: string, slug: string, en: string, ar: string): MenuEntry => ({
  label,
  link_type: "page",
  link_ref: slug,
  translations: { en: { label: en }, ar: { label: ar } },
})

export default async function seedContent({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const cms: CmsModuleService = container.resolve(CMS_MODULE)

  // ── Languages ─────────────────────────────────────────────────────────────
  await ensureTranslationLocales(container)

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
    await seedTranslations(
      container,
      "product_category",
      result.map((category) => ({
        id: category.id,
        translations: CATEGORIES.find((c) => c.handle === category.handle)?.translations,
      }))
    )
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
  // The booking link and the address were supplied by the owner. Phone,
  // WhatsApp, Instagram, opening hours and Google review details are left
  // empty: the owner enters them in the admin. With no map address set, the
  // storefront draws the map from the street address.
  const [settings] = await cms.listSiteSettings({}, { take: 1 })
  if (!settings) {
    const created = await cms.createSiteSettings({
      store_name: "BONANZA",
      tagline: "BARBERSHOP & ACADEMY",
      title_template: "%s | BONANZA",
      default_meta_title: "BONANZA — מספרה, אקדמיה וחנות",
      default_meta_description: "מספרה, אקדמיה לספרים וחנות לציוד מקצועי ומוצרי טיפוח.",
      booking_url: BOOKING_URL,
      address: "בוגרשוב 56, תל אביב",
      newsletter_enabled: true,
    })
    await seedTranslations(container, "site_setting", [
      {
        id: created.id,
        translations: {
          en: {
            address: "56 Bograshov St., Tel Aviv",
            default_meta_title: "BONANZA — Barbershop, Academy & Shop",
            default_meta_description:
              "A barbershop, a barber academy and a shop for professional equipment and grooming products.",
          },
          ar: {
            address: "شارع بوغراشوف 56، تل أبيب",
            default_meta_title: "BONANZA — صالون حلاقة، أكاديمية ومتجر",
            default_meta_description:
              "صالون حلاقة، أكاديمية للحلاقين ومتجر للمعدات الاحترافية ومنتجات العناية.",
          },
        },
      },
    ])
    logger.info("Created site settings.")
  }

  // ── Content pages (drafts) ────────────────────────────────────────────────
  const existingPages = await cms.listContentPages({}, { select: ["slug"], take: 500 })
  const pageSlugs = new Set(existingPages.map((existing) => existing.slug))
  const missingPages = PAGES.filter((candidate) => !pageSlugs.has(candidate.slug))
  if (missingPages.length) {
    const created = await cms.createContentPages(
      missingPages.map(({ slug, title }) => ({ slug, title, body: "", status: "draft" as const }))
    )
    await seedTranslations(
      container,
      "content_page",
      created.map((record) => ({
        id: record.id,
        translations: PAGES.find((candidate) => candidate.slug === record.slug)?.translations,
      }))
    )
    logger.info(`Created ${missingPages.length} draft content pages.`)
  }

  // ── Home page ─────────────────────────────────────────────────────────────
  const existingSections = await cms.listHomepageSections({}, { select: ["key"], take: 200 })
  if (!existingSections.length) {
    // The page as approved, top to bottom. The storefront links to these keys
    // as anchors (`/#pricing`), so they are part of its contract.
    const layout: SectionSeed[] = [
      {
        type: "hero",
        key: "hero",
        title: "מספרה. אקדמיה. חנות.",
        subtitle: "קובעים תור, לומדים את המקצוע וקונים את הכלים. הכול במקום אחד.",
        image: "site/hero.jpg",
        image_alt: "ספר מדייק קו תספורת של לקוח במכונת תספורת",
        cta_label: "קביעת תור אונליין",
        cta_url: BOOKING_URL,
        secondary_cta_label: "מחירון",
        secondary_cta_url: "/#pricing",
        translations: {
          en: {
            title: "Barbershop. Academy. Shop.",
            subtitle: "Book a chair, learn the craft and buy the tools. All in one place.",
            image_alt: "A barber sharpening a customer's hairline with a clipper",
            cta_label: "Book online",
            secondary_cta_label: "Price list",
          },
          ar: {
            title: "صالون حلاقة. أكاديمية. متجر.",
            subtitle: "احجزوا موعدًا، تعلّموا المهنة واشتروا الأدوات. كل شيء في مكان واحد.",
            image_alt: "حلاق يحدد قصة شعر زبون بماكينة حلاقة",
            cta_label: "احجزوا موعدًا أونلاين",
            secondary_cta_label: "قائمة الأسعار",
          },
        },
      },
      // Opening hours, address and phone, read from the site settings.
      { type: "info_strip", key: "info" },
      // The shop's story, in the owner's words, beside the photograph of the
      // shop front. The title is the opening quote.
      {
        type: "about",
        key: "about",
        subtitle: "הסיפור",
        title: "”כל תספורת מתחילה בשיחה. רק אחרי שמבינים מה מתאים לך, מתחילים לעבוד.“",
        body: [
          "בוננזה היא מספרת גברים קטנה בבוגרשוב 56, בלב תל אביב. אנחנו עובדים בקצב שמאפשר לכל לקוח זמן ותשומת לב מלאה, בלי פס ייצור.",
          "אנחנו מתמחים בפיידים, טייפר, עבודת מספריים לשיער ארוך ועיצוב זקן. כל תספורת כוללת ייעוץ, שטיפה, עיצוב והמלצה על המוצר הנכון לבית.",
        ].join("\n\n"),
        image: "site/about.jpg",
        image_alt: "חזית המספרה של BONANZA: שלט מואר וכיסאות ספר מבעד לחלון הראווה",
        translations: {
          en: {
            subtitle: "Our story",
            title:
              "“Every haircut starts with a conversation. Only once we understand what suits you do we start working.”",
            body: [
              "Bonanza is a small men's barbershop at 56 Bograshov St., in the heart of Tel Aviv. We work at a pace that gives every customer time and full attention, with no production line.",
              "We specialise in fades, tapers, scissor work for long hair and beard styling. Every haircut includes a consultation, a wash, styling and a recommendation for the right product to use at home.",
            ].join("\n\n"),
            image_alt: "The BONANZA barbershop front: a lit sign and barber chairs seen through the window",
          },
          ar: {
            subtitle: "حكايتنا",
            title: "”كل قصة شعر تبدأ بحديث. فقط بعد أن نفهم ما يناسبك، نبدأ العمل.“",
            body: [
              "بونانزا صالون حلاقة رجالي صغير في شارع بوغراشوف 56، في قلب تل أبيب. نعمل بوتيرة تمنح كل زبون الوقت والاهتمام الكامل، بلا خط إنتاج.",
              "نتخصص في قصات الفيد والتيبر، قص الشعر الطويل بالمقص وتهذيب اللحية. كل قصة تشمل استشارة، غسل الشعر، تصفيفه وتوصية بالمنتج المناسب للبيت.",
            ].join("\n\n"),
            image_alt: "واجهة صالون BONANZA: لافتة مضيئة وكراسي الحلاقة من خلف الواجهة الزجاجية",
          },
        },
      },
      // The groups and prices come from the Price list tab.
      {
        type: "pricing",
        key: "pricing",
        subtitle: "שירותי המספרה",
        title: "מחירון",
        body: "המחירים כוללים מע״מ.",
        cta_label: "קביעת תור אונליין",
        cta_url: BOOKING_URL,
        translations: {
          en: {
            subtitle: "Barbershop services",
            title: "Price list",
            body: "Prices include VAT.",
            cta_label: "Book online",
          },
          ar: {
            subtitle: "خدمات الصالون",
            title: "قائمة الأسعار",
            body: "الأسعار تشمل ضريبة القيمة المضافة.",
            cta_label: "احجزوا موعدًا أونلاين",
          },
        },
      },
      {
        type: "product_rail",
        key: "shop",
        title: "החנות",
        subtitle: "ציוד מקצועי ומוצרי טיפוח",
        cta_label: "לכל המוצרים",
        cta_url: "/products",
        settings: {
          product_source: { type: "tag", id: tagIds.get("featured")! },
          limit: 4,
        },
        translations: {
          en: {
            title: "The shop",
            subtitle: "Professional equipment and grooming products",
            cta_label: "All products",
          },
          ar: {
            title: "المتجر",
            subtitle: "معدات احترافية ومنتجات عناية",
            cta_label: "كل المنتجات",
          },
        },
      },
      {
        type: "academy",
        key: "academy",
        subtitle: "BONANZA ACADEMY",
        title: "מקצוע לומדים מהידיים.",
        body: "קורסים וסדנאות לספרים בתחילת הדרך ולספרים מנוסים.",
        // The Academy page is a draft until its text is written and published.
        cta_label: "לפרטים על האקדמיה",
        cta_url: "/academy",
        secondary_cta_label: "דברו איתנו",
        secondary_cta_url: "/#contact",
        translations: {
          en: {
            title: "A craft you learn hands-on.",
            body: "Courses and workshops for new and experienced barbers.",
            cta_label: "About the academy",
            secondary_cta_label: "Talk to us",
          },
          ar: {
            title: "مهنة تُتعلَّم باليدين.",
            body: "دورات وورش عمل للحلاقين المبتدئين وذوي الخبرة.",
            cta_label: "تفاصيل عن الأكاديمية",
            secondary_cta_label: "تواصلوا معنا",
          },
        },
      },
      // The photographs come from the Gallery tab: the ones marked for the home page.
      {
        type: "gallery",
        key: "gallery",
        subtitle: "גלריה",
        title: "עבודות",
        cta_label: "לכל העבודות",
        cta_url: "/gallery",
        settings: { limit: 4 },
        translations: {
          en: { subtitle: "Gallery", title: "Our work", cta_label: "See all work" },
          ar: { subtitle: "المعرض", title: "أعمالنا", cta_label: "كل الأعمال" },
        },
      },
      // The reviews come from the Reviews tab; the score and link from the settings.
      {
        type: "reviews",
        key: "reviews",
        subtitle: "ביקורות בגוגל",
        title: "מה הלקוחות אומרים",
        settings: { limit: 3 },
        translations: {
          en: { subtitle: "Google reviews", title: "What customers say" },
          ar: { subtitle: "تقييمات جوجل", title: "ماذا يقول الزبائن" },
        },
      },
    ]

    // Ready to use but switched off: the owner turns one on with "Show on the
    // site" in the admin.
    const hidden: SectionSeed[] = [
      {
        type: "categories",
        key: "categories",
        title: "קטגוריות",
        settings: { limit: 8 },
        translations: { en: { title: "Categories" }, ar: { title: "الفئات" } },
      },
      {
        type: "banner_slot",
        key: "promo-primary",
        settings: { banner_placement: "home_primary" },
      },
      {
        type: "product_rail",
        key: "best-sellers",
        title: "הנמכרים ביותר",
        settings: {
          product_source: { type: "tag", id: tagIds.get("best-seller")! },
          limit: 4,
        },
        translations: { en: { title: "Best sellers" }, ar: { title: "الأكثر مبيعًا" } },
      },
      {
        type: "product_rail",
        key: "new-arrivals",
        title: "חדש על המדף",
        cta_label: "לכל החדשים",
        cta_url: "/products?sort=newest",
        settings: { product_source: { type: "newest" }, limit: 4 },
        translations: {
          en: { title: "New arrivals", cta_label: "All new arrivals" },
          ar: { title: "وصل حديثًا", cta_label: "كل الجديد" },
        },
      },
      {
        type: "brands",
        key: "brands",
        title: "המותגים שלנו",
        cta_label: "לכל המותגים",
        cta_url: "/brands",
        settings: { limit: 8 },
        translations: {
          en: { title: "Our brands", cta_label: "All brands" },
          ar: { title: "علاماتنا التجارية", cta_label: "كل العلامات التجارية" },
        },
      },
      {
        type: "product_rail",
        key: "deals",
        title: "מבצעים",
        cta_label: "לכל המבצעים",
        cta_url: "/products?sale=1",
        settings: { product_source: { type: "on_sale" }, limit: 4 },
        translations: {
          en: { title: "Deals", cta_label: "All deals" },
          ar: { title: "عروض", cta_label: "كل العروض" },
        },
      },
      {
        type: "product_rail",
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
        translations: {
          en: { title: "Professional barbershop equipment", cta_label: "View category" },
          ar: { title: "معدات احترافية لصالون الحلاقة", cta_label: "إلى الفئة" },
        },
      },
      {
        type: "banner_slot",
        key: "promo-secondary",
        settings: { banner_placement: "home_secondary" },
      },
      {
        type: "newsletter",
        key: "newsletter",
        title: "נשארים מעודכנים",
        subtitle: "מוצרים חדשים ומבצעים, ישירות למייל.",
        translations: {
          en: { title: "Stay in the loop", subtitle: "New products and deals, straight to your inbox." },
          ar: { title: "ابقوا على اطلاع", subtitle: "منتجات جديدة وعروض، مباشرة إلى بريدكم." },
        },
      },
    ]

    const seeds = [
      ...layout.map((section) => ({ ...section, is_visible: true })),
      ...hidden.map((section) => ({ ...section, is_visible: false })),
    ]
    const images = await uploadSeedAssets(
      container,
      seeds.flatMap((section) => (section.image ? [section.image] : []))
    )
    const created = await cms.createHomepageSections(
      seeds.map(({ image, translations: _translations, ...section }, index) => {
        const imageUrl = image ? images.get(image) : undefined
        return {
          ...section,
          // An alt text without its picture would describe nothing.
          image_alt: imageUrl ? section.image_alt : undefined,
          image_url: imageUrl,
          status: "published" as const,
          rank: index * 10,
        }
      })
    )
    await seedTranslations(
      container,
      "homepage_section",
      created.map((record) => ({
        id: record.id,
        translations: seeds.find((section) => section.key === record.key)?.translations,
      }))
    )
    logger.info(
      `Created ${layout.length} home page sections, and ${hidden.length} more that are switched off.`
    )
  }

  // ── Menus ─────────────────────────────────────────────────────────────────
  const existingNavigation = await cms.listNavigationItems({}, { select: ["id"], take: 1 })
  if (!existingNavigation.length) {
    const labels: { id: string; translations: Translated }[] = []

    const createMenu = async (
      menu: "header" | "footer",
      tree: { item: MenuEntry; children?: MenuEntry[] }[]
    ) => {
      for (const [index, { item, children }] of tree.entries()) {
        const { translations, ...parentData } = item
        const parent = await cms.createNavigationItems({ menu, rank: index * 10, ...parentData })
        labels.push({ id: parent.id, translations })
        if (children?.length) {
          const createdChildren = await cms.createNavigationItems(
            children.map(({ translations: _translations, ...child }, childIndex) => ({
              menu,
              parent_id: parent.id,
              rank: childIndex * 10,
              ...child,
            }))
          )
          createdChildren.forEach((child, childIndex) =>
            labels.push({ id: child.id, translations: children[childIndex].translations })
          )
        }
      }
    }

    // `/#…` links scroll to the home page section with that key. `/#contact`
    // is the contact block of the footer.
    await createMenu("header", [
      { item: custom("מחירון", "/#pricing", "Price list", "قائمة الأسعار") },
      { item: custom("חנות", "/products", "Shop", "المتجر") },
      { item: custom("עבודות", "/gallery", "Our work", "أعمالنا") },
      { item: custom("אקדמיה", "/#academy", "Academy", "الأكاديمية") },
      { item: custom("אודות", "/#about", "About", "من نحن") },
      { item: custom("צור קשר", "/#contact", "Contact", "اتصل بنا") },
    ])

    await createMenu("footer", [
      {
        item: custom("חנות", "/products", "Shop", "المتجر"),
        children: [
          custom("כל המוצרים", "/products", "All products", "كل المنتجات"),
          custom("מבצעים", "/products?sale=1", "Deals", "عروض"),
          custom("מותגים", "/brands", "Brands", "العلامات التجارية"),
        ],
      },
      {
        item: custom("שירות לקוחות", "/account", "Customer service", "خدمة الزبائن"),
        children: [
          page("משלוחים", "shipping", "Shipping", "الشحن"),
          page("החזרות וביטולים", "returns", "Returns & cancellations", "الإرجاع والإلغاء"),
          page("צור קשר", "contact", "Contact", "اتصل بنا"),
          custom("החשבון שלי", "/account", "My account", "حسابي"),
        ],
      },
      {
        item: custom("מידע", "/", "Information", "معلومات"),
        children: [
          page("אודות", "about", "About", "من نحن"),
          page("האקדמיה", "academy", "The Academy", "الأكاديمية"),
          page("תקנון האתר", "terms", "Terms of use", "شروط الاستخدام"),
          page("מדיניות פרטיות", "privacy", "Privacy policy", "سياسة الخصوصية"),
          page("הצהרת נגישות", "accessibility", "Accessibility statement", "بيان إمكانية الوصول"),
        ],
      },
    ])
    await seedTranslations(container, "navigation_item", labels)
    logger.info("Created header and footer menus.")
  }

  logger.info("Starter content is in place.")
}
