import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CMS_MODULE } from "../modules/cms"
import type CmsModuleService from "../modules/cms/service"
import { uploadSeedAssets } from "./assets"
import { seedTranslations, type Translated } from "./translations"

/**
 * Sample barbershop content for development: a price list, gallery pictures,
 * team members, reviews and contact details.
 *
 * None of it is real. Names, prices, hours and contact details are invented
 * and say so wherever a visitor could take them for the real thing; the
 * pictures are grey drawings marked SAMPLE. Each part is loaded only while its
 * list is still empty, and settings only where a field is still blank.
 *
 * The English and Arabic texts are drafts for the owner to review.
 */

type ServiceSeed = {
  name: string
  description?: string
  /** Whole shekels. Invented. */
  price?: number
  price_note?: string
  duration_minutes?: number
  is_visible?: boolean
  translations?: Translated
}

type GroupSeed = {
  title: string
  note?: string
  status?: "draft" | "published"
  translations?: Translated
  items: ServiceSeed[]
}

type PictureSeed = {
  data: {
    image_url: string
    alt: string
    is_featured: boolean
    status: "draft" | "published"
    rank: number
  }
  translations: Translated
}

/** The three groups of the approved design. Service names and prices are samples. */
const PRICE_LIST: GroupSeed[] = [
  {
    title: "תספורות",
    translations: { en: { title: "Haircuts" }, ar: { title: "قصّات الشعر" } },
    items: [
      {
        name: "תספורת גבר", price: 80, duration_minutes: 30,
        translations: { en: { name: "Men's haircut" }, ar: { name: "قصة شعر رجالية" } },
      },
      {
        name: "תספורת + זקן", price: 110, duration_minutes: 45,
        translations: { en: { name: "Haircut + beard" }, ar: { name: "قصة شعر + لحية" } },
      },
      {
        name: "תספורת ילד", price: 60, duration_minutes: 25,
        translations: { en: { name: "Kids' haircut" }, ar: { name: "قصة شعر للأطفال" } },
      },
      {
        name: "פייד", description: "מעבר הדרגתי בצדדים ובעורף", price: 90, duration_minutes: 40,
        translations: {
          en: { name: "Fade", description: "A gradual blend on the sides and back" },
          ar: { name: "فيد", description: "تدرّج على الجانبين والخلف" },
        },
      },
    ],
  },
  {
    title: "זקן וטיפוח",
    translations: { en: { title: "Beard & grooming" }, ar: { title: "اللحية والعناية" } },
    items: [
      {
        name: "עיצוב זקן", price: 50, duration_minutes: 20,
        translations: { en: { name: "Beard styling" }, ar: { name: "تهذيب اللحية" } },
      },
      {
        name: "גילוח בתער", price: 70, duration_minutes: 30,
        translations: { en: { name: "Straight-razor shave" }, ar: { name: "حلاقة بالموس" } },
      },
      {
        name: "טיפול פנים", price: 120, price_note: "החל מ-", duration_minutes: 40,
        translations: {
          en: { name: "Facial treatment", price_note: "from" },
          ar: { name: "عناية بالوجه", price_note: "ابتداءً من" },
        },
      },
      // No price: shows how a service priced on request looks.
      {
        name: "שירות בהתאמה אישית", price_note: "לפי הצעת מחיר",
        translations: {
          en: { name: "Custom service", price_note: "by quote" },
          ar: { name: "خدمة حسب الطلب", price_note: "حسب عرض السعر" },
        },
      },
      // Exists to show, and to test, that a hidden service stays off the site.
      { name: "שירות מוסתר לדוגמה", price: 1, is_visible: false },
    ],
  },
  {
    title: "חבילות",
    note: "מחיר מיוחד לשילוב של כמה שירותים.",
    translations: {
      en: { title: "Packages", note: "A special price for several services together." },
      ar: { title: "باقات", note: "سعر خاص لعدة خدمات معًا." },
    },
    items: [
      {
        name: "חבילה לדוגמה א׳", description: "תספורת, עיצוב זקן וטיפול פנים", price: 220, duration_minutes: 90,
        translations: {
          en: { name: "Sample package A", description: "Haircut, beard styling and facial treatment" },
          ar: { name: "باقة نموذجية أ", description: "قصة شعر، تهذيب اللحية وعناية بالوجه" },
        },
      },
      {
        name: "חבילה לדוגמה ב׳", description: "תספורת וגילוח בתער", price: 135, duration_minutes: 60,
        translations: {
          en: { name: "Sample package B", description: "Haircut and straight-razor shave" },
          ar: { name: "باقة نموذجية ب", description: "قصة شعر وحلاقة بالموس" },
        },
      },
    ],
  },
  // Exists to show, and to test, that a draft group stays off the site.
  {
    title: "קבוצה בטיוטה לדוגמה",
    status: "draft",
    items: [{ name: "שירות בקבוצת טיוטה", price: 1 }],
  },
]

const GALLERY_PICTURES = 8
const FEATURED_PICTURES = 4
const TEAM_MEMBERS = 3

/** Line format: `days | hours`. A line without `|` is shown as a note. */
const OPENING_HOURS = {
  he: "ראשון–חמישי | 09:00–20:00\nשישי | 08:00–14:00\nשבת | סגור\nשעות לדוגמה בלבד.",
  en: "Sunday–Thursday | 09:00–20:00\nFriday | 08:00–14:00\nSaturday | Closed\nSample hours only.",
  ar: "الأحد–الخميس | 09:00–20:00\nالجمعة | 08:00–14:00\nالسبت | مغلق\nساعات للتوضيح فقط.",
}

/**
 * Stand-ins for what the owner has not supplied. Each is plainly not real: a
 * phone number of zeros, an example.com mailbox, and links that lead to a
 * service's front page rather than to a business. The address is real and
 * comes from seed-content.ts; the storefront draws the map from it.
 */
const PLACEHOLDER_SETTINGS = {
  contact_phone: "050-000-0000",
  contact_whatsapp: "050-000-0000",
  contact_email: "hello@example.com",
  opening_hours: OPENING_HOURS.he,
  google_reviews_url: "https://www.google.com/maps",
  google_rating: 4.9,
  google_review_count: 120,
  instagram_url: "https://www.instagram.com/",
} as const

const PLACEHOLDER_SETTINGS_TRANSLATIONS: Translated = {
  en: { opening_hours: OPENING_HOURS.en },
  ar: { opening_hours: OPENING_HOURS.ar },
}

export async function seedDemoSite(container: MedusaContainer): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const cms: CmsModuleService = container.resolve(CMS_MODULE)

  // ── Price list ────────────────────────────────────────────────────────────
  const [anyGroup] = await cms.listServiceGroups({}, { select: ["id"], take: 1 })
  if (!anyGroup) {
    const groups = await cms.createServiceGroups(
      PRICE_LIST.map((group, index) => ({
        title: group.title,
        note: group.note,
        status: group.status ?? ("published" as const),
        rank: index * 10,
      }))
    )
    await seedTranslations(
      container,
      "service_group",
      groups.map((group, index) => ({ id: group.id, translations: PRICE_LIST[index].translations }))
    )

    const itemSeeds = PRICE_LIST.flatMap((group, groupIndex) =>
      group.items.map((item, itemIndex) => ({
        seed: item,
        data: {
          group_id: groups[groupIndex].id,
          name: item.name,
          description: item.description,
          price: item.price,
          price_note: item.price_note,
          duration_minutes: item.duration_minutes,
          is_visible: item.is_visible ?? true,
          rank: itemIndex * 10,
        },
      }))
    )
    const items = await cms.createServiceItems(itemSeeds.map(({ data }) => data))
    await seedTranslations(
      container,
      "service_item",
      items.map((item, index) => ({ id: item.id, translations: itemSeeds[index].seed.translations }))
    )
    logger.info(`Created a sample price list: ${groups.length} groups, ${items.length} services.`)
  }

  // ── Gallery ───────────────────────────────────────────────────────────────
  const [anyPicture] = await cms.listGalleryItems({}, { select: ["id"], take: 1 })
  if (!anyPicture) {
    const paths = Array.from({ length: GALLERY_PICTURES }, (_, i) => `site/gallery-${i + 1}.webp`)
    const urls = await uploadSeedAssets(container, paths)
    const pictures: PictureSeed[] = paths.flatMap((path, index) => {
      const url = urls.get(path)
      const number = index + 1
      return url
        ? [
            {
              data: {
                image_url: url,
                alt: `תמונת עבודה לדוגמה ${number}`,
                is_featured: index < FEATURED_PICTURES,
                status: "published",
                rank: index * 10,
              },
              translations: {
                en: { alt: `Sample work photo ${number}` },
                ar: { alt: `صورة عمل نموذجية ${number}` },
              },
            },
          ]
        : []
    })
    if (pictures.length) {
      // Exists to show, and to test, that a draft picture stays off the site.
      pictures.push({
        data: {
          image_url: pictures[0].data.image_url,
          alt: "תמונה בטיוטה לדוגמה",
          is_featured: true,
          status: "draft",
          rank: pictures.length * 10,
        },
        translations: { en: { alt: "Sample draft photo" }, ar: { alt: "صورة مسودة نموذجية" } },
      })
      const created = await cms.createGalleryItems(pictures.map(({ data }) => data))
      await seedTranslations(
        container,
        "gallery_item",
        created.map((item, index) => ({ id: item.id, translations: pictures[index].translations }))
      )
      logger.info(`Created ${created.length} sample gallery pictures.`)
    }
  }

  // ── Team ──────────────────────────────────────────────────────────────────
  const [anyMember] = await cms.listTeamMembers({}, { select: ["id"], take: 1 })
  if (!anyMember) {
    const paths = Array.from({ length: TEAM_MEMBERS }, (_, i) => `site/team-${i + 1}.webp`)
    const urls = await uploadSeedAssets(container, paths)
    const members = [
      ...paths.map((path, index) => ({
        data: {
          name: `ספר לדוגמה ${index + 1}`,
          role: "ספר",
          photo_url: urls.get(path),
          // Instagram's front page: a real profile link is entered in the admin.
          instagram_url: "https://www.instagram.com/",
          status: "published" as "draft" | "published",
          rank: index * 10,
        },
        translations: {
          en: { name: `Sample barber ${index + 1}`, role: "Barber" },
          ar: { name: `حلاق نموذجي ${index + 1}`, role: "حلاق" },
        } as Translated,
      })),
      // Exists to show, and to test, that a draft team member stays off the site.
      {
        data: {
          name: "ספר בטיוטה לדוגמה",
          role: "ספר",
          photo_url: undefined,
          instagram_url: "https://www.instagram.com/",
          status: "draft" as "draft" | "published",
          rank: paths.length * 10,
        },
        translations: undefined,
      },
    ]
    const created = await cms.createTeamMembers(members.map(({ data }) => data))
    await seedTranslations(
      container,
      "team_member",
      created.map((member, index) => ({ id: member.id, translations: members[index].translations }))
    )
    logger.info(`Created ${created.length} sample team members.`)
  }

  // ── Reviews ───────────────────────────────────────────────────────────────
  // Not reviews: the author and the text both say they are samples. Real ones
  // are copied in by the owner, word for word. The text is never translated.
  const [anyReview] = await cms.listReviews({}, { select: ["id"], take: 1 })
  if (!anyReview) {
    const sampleText =
      "טקסט לדוגמה בלבד, לא ביקורת אמיתית. כאן תופיע ביקורת מגוגל, כפי שהלקוח כתב אותה."
    const reviews: {
      rating: number
      date_label: string
      status?: "draft"
      translations?: Translated
    }[] = [
      { rating: 5, date_label: "לפני שבוע", translations: { en: { date_label: "a week ago" }, ar: { date_label: "قبل أسبوع" } } },
      { rating: 5, date_label: "לפני חודש", translations: { en: { date_label: "a month ago" }, ar: { date_label: "قبل شهر" } } },
      { rating: 4, date_label: "לפני חודשיים", translations: { en: { date_label: "two months ago" }, ar: { date_label: "قبل شهرين" } } },
      // Exists to show, and to test, that a draft review stays off the site.
      { rating: 5, date_label: "טיוטה", status: "draft" },
    ]
    const created = await cms.createReviews(
      reviews.map((review, index) => ({
        author_name: "לקוח לדוגמה",
        rating: review.rating,
        text: sampleText,
        date_label: review.date_label,
        source: "google" as const,
        status: review.status ?? ("published" as const),
        rank: index * 10,
      }))
    )
    await seedTranslations(
      container,
      "review",
      created.map((review, index) => ({ id: review.id, translations: reviews[index].translations }))
    )
    logger.info(`Created ${created.length} sample reviews.`)
  }

  // ── Contact details, hours, map and review score ──────────────────────────
  const [settings] = await cms.listSiteSettings({}, { take: 1 })
  if (settings) {
    const blank = Object.fromEntries(
      Object.entries(PLACEHOLDER_SETTINGS).filter(
        ([field]) => (settings as Record<string, unknown>)[field] == null
      )
    )
    if (Object.keys(blank).length) {
      await cms.updateSiteSettings({ id: settings.id, ...blank })
      // Only the fields filled in just now get the matching translation.
      const translated = (locale: "en" | "ar") =>
        Object.fromEntries(
          Object.entries(PLACEHOLDER_SETTINGS_TRANSLATIONS[locale] ?? {}).filter(
            ([field]) => field in blank
          )
        )
      await seedTranslations(container, "site_setting", [
        { id: settings.id, translations: { en: translated("en"), ar: translated("ar") } },
      ])
      logger.info(`Filled ${Object.keys(blank).length} blank site settings with placeholders.`)
    }
  }
}
