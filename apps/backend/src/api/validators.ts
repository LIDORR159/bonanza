import { z } from "@medusajs/framework/zod"
import {
  BANNER_PLACEMENTS,
  HOMEPAGE_SECTION_TYPES,
  NAVIGATION_LINK_TYPES,
  NAVIGATION_MENUS,
  PUBLISH_STATUSES,
  RESERVED_PAGE_SLUGS,
  REVIEW_SOURCES,
} from "../modules/cms/constants"

/**
 * Request schemas for the custom admin and store routes.
 * They are applied in `middlewares.ts`; handlers read `req.validatedBody`.
 */

/**
 * A link target or image address entered by staff. Only site-relative paths
 * and http(s) URLs are accepted, which keeps `javascript:` and `data:` URLs
 * out of the storefront's markup.
 */
const isSafeUrl = (value: string) => {
  if (value.startsWith("/")) {
    return !value.startsWith("//")
  }
  try {
    const { protocol } = new URL(value)
    return protocol === "https:" || protocol === "http:"
  } catch {
    return false
  }
}

const safeUrl = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(isSafeUrl, "Must be a path starting with / or an http(s) URL")

/**
 * An address on another site: a booking page, an Instagram profile, a map.
 * These open in a new tab or load in a frame, so a site-relative path makes no
 * sense for them and only absolute http(s) URLs are accepted.
 */
const externalUrl = safeUrl.refine(
  (value) => !value.startsWith("/"),
  "Must be a full address starting with https://"
)

const text = (max: number) => z.string().trim().max(max)
const rank = z.number().int().min(0).max(100000).optional()
const slug = z
  .string()
  .trim()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, digits and hyphens")

const productSource = z.discriminatedUnion("type", [
  z.object({ type: z.literal("collection"), id: z.string().min(1) }),
  z.object({ type: z.literal("category"), id: z.string().min(1) }),
  z.object({ type: z.literal("tag"), id: z.string().min(1) }),
  z.object({ type: z.literal("brand"), id: z.string().min(1) }),
  z.object({ type: z.literal("newest") }),
  z.object({ type: z.literal("on_sale") }),
])

const sectionSettings = z
  .object({
    product_source: productSource.optional(),
    limit: z.number().int().min(1).max(24).optional(),
    banner_placement: z.enum(BANNER_PLACEMENTS).optional(),
  })
  .strict()

const sectionFields = {
  type: z.enum(HOMEPAGE_SECTION_TYPES),
  key: slug,
  title: text(200).nullish(),
  subtitle: text(400).nullish(),
  body: text(5000).nullish(),
  image_url: safeUrl.nullish(),
  mobile_image_url: safeUrl.nullish(),
  image_alt: text(300).nullish(),
  cta_label: text(60).nullish(),
  cta_url: safeUrl.nullish(),
  secondary_cta_label: text(60).nullish(),
  secondary_cta_url: safeUrl.nullish(),
  settings: sectionSettings.nullish(),
  rank: z.number().int().min(0).max(100000).optional(),
  is_visible: z.boolean().optional(),
  status: z.enum(PUBLISH_STATUSES).optional(),
  publish_at: z.coerce.date().nullish(),
}
export const CreateSection = z.object(sectionFields).strict()
export const UpdateSection = z.object(sectionFields).partial().strict()

const bannerFields = {
  placement: z.enum(BANNER_PLACEMENTS),
  title: text(200).min(1),
  subtitle: text(400).nullish(),
  image_url: safeUrl.nullish(),
  mobile_image_url: safeUrl.nullish(),
  image_alt: text(300).nullish(),
  target_url: safeUrl.nullish(),
  cta_label: text(60).nullish(),
  starts_at: z.coerce.date().nullish(),
  ends_at: z.coerce.date().nullish(),
  is_enabled: z.boolean().optional(),
  rank: z.number().int().min(0).max(100000).optional(),
}
const endsAfterStart = (banner: { starts_at?: Date | null; ends_at?: Date | null }) =>
  !banner.starts_at || !banner.ends_at || banner.ends_at > banner.starts_at
export const CreateBanner = z
  .object(bannerFields)
  .strict()
  .refine(endsAfterStart, { message: "ends_at must be after starts_at", path: ["ends_at"] })
export const UpdateBanner = z
  .object(bannerFields)
  .partial()
  .strict()
  .refine(endsAfterStart, { message: "ends_at must be after starts_at", path: ["ends_at"] })

const pageSlug = slug.refine(
  (value) => !(RESERVED_PAGE_SLUGS as readonly string[]).includes(value),
  "This address is used by the store itself"
)
const pageFields = {
  slug: pageSlug,
  title: text(200).min(1),
  body: z.string().max(100_000),
  status: z.enum(PUBLISH_STATUSES).optional(),
  publish_at: z.coerce.date().nullish(),
  meta_title: text(120).nullish(),
  meta_description: text(320).nullish(),
  canonical_url: safeUrl.nullish(),
  og_image_url: safeUrl.nullish(),
  include_in_sitemap: z.boolean().optional(),
}
export const CreatePage = z.object(pageFields).strict()
export const UpdatePage = z.object(pageFields).partial().strict()

const navigationFields = {
  menu: z.enum(NAVIGATION_MENUS),
  label: text(80).min(1),
  link_type: z.enum(NAVIGATION_LINK_TYPES),
  link_ref: text(200).nullish(),
  url: safeUrl.nullish(),
  parent_id: z.string().nullish(),
  rank: z.number().int().min(0).max(100000).optional(),
  is_visible: z.boolean().optional(),
  open_in_new_tab: z.boolean().optional(),
}
export const CreateNavigationItem = z
  .object(navigationFields)
  .strict()
  .refine((item) => (item.link_type === "custom" ? !!item.url : !!item.link_ref), {
    message: "A custom link needs a URL; other link types need a reference",
    path: ["link_type"],
  })
export const UpdateNavigationItem = z.object(navigationFields).partial().strict()

export const UpdateSiteSettings = z
  .object({
    store_name: text(120).min(1),
    tagline: text(200).nullish(),
    title_template: text(120).refine((value) => value.includes("%s"), "Must contain %s"),
    default_meta_title: text(120).min(1),
    default_meta_description: text(320).nullish(),
    default_og_image_url: safeUrl.nullish(),
    contact_phone: text(40).nullish(),
    contact_whatsapp: text(40).nullish(),
    contact_email: z.string().trim().email().max(254).nullish(),
    address: text(300).nullish(),
    opening_hours: text(500).nullish(),
    booking_url: externalUrl.nullish(),
    map_embed_url: externalUrl.nullish(),
    map_link_url: externalUrl.nullish(),
    google_reviews_url: externalUrl.nullish(),
    google_rating: z.number().min(1).max(5).nullish(),
    google_review_count: z.number().int().min(0).max(10_000_000).nullish(),
    instagram_url: safeUrl.nullish(),
    facebook_url: safeUrl.nullish(),
    tiktok_url: safeUrl.nullish(),
    youtube_url: safeUrl.nullish(),
    newsletter_enabled: z.boolean(),
    free_shipping_threshold: z.number().min(0).max(1_000_000).nullish(),
  })
  .partial()
  .strict()

const serviceGroupFields = {
  title: text(120).min(1),
  note: text(300).nullish(),
  rank,
  status: z.enum(PUBLISH_STATUSES).optional(),
}
export const CreateServiceGroup = z.object(serviceGroupFields).strict()
export const UpdateServiceGroup = z.object(serviceGroupFields).partial().strict()

const serviceItemFields = {
  group_id: z.string().min(1),
  name: text(120).min(1),
  description: text(300).nullish(),
  // Whole shekels, VAT included.
  price: z.number().int().min(0).max(1_000_000).nullish(),
  price_note: text(60).nullish(),
  duration_minutes: z.number().int().min(1).max(24 * 60).nullish(),
  rank,
  is_visible: z.boolean().optional(),
}
export const CreateServiceItem = z.object(serviceItemFields).strict()
export const UpdateServiceItem = z.object(serviceItemFields).partial().strict()

const galleryItemFields = {
  image_url: safeUrl,
  alt: text(300).nullish(),
  caption: text(200).nullish(),
  is_featured: z.boolean().optional(),
  rank,
  status: z.enum(PUBLISH_STATUSES).optional(),
}
export const CreateGalleryItem = z.object(galleryItemFields).strict()
export const UpdateGalleryItem = z.object(galleryItemFields).partial().strict()

const teamMemberFields = {
  name: text(120).min(1),
  role: text(120).nullish(),
  photo_url: safeUrl.nullish(),
  instagram_url: externalUrl.nullish(),
  rank,
  status: z.enum(PUBLISH_STATUSES).optional(),
}
export const CreateTeamMember = z.object(teamMemberFields).strict()
export const UpdateTeamMember = z.object(teamMemberFields).partial().strict()

const reviewFields = {
  author_name: text(120).min(1),
  rating: z.number().int().min(1).max(5),
  text: text(2000).min(1),
  date_label: text(60).nullish(),
  source: z.enum(REVIEW_SOURCES).optional(),
  rank,
  status: z.enum(PUBLISH_STATUSES).optional(),
}
export const CreateReview = z.object(reviewFields).strict()
export const UpdateReview = z.object(reviewFields).partial().strict()

export const Reorder = z.object({ ids: z.array(z.string().min(1)).min(1).max(500) }).strict()

export const CreatePreviewToken = z
  .object({ path: z.string().trim().startsWith("/").max(300) })
  .strict()

const brandFields = {
  name: text(120).min(1),
  handle: slug,
  logo_url: safeUrl.nullish(),
  description: text(2000).nullish(),
  is_featured: z.boolean().optional(),
  rank: z.number().int().min(0).max(100000).optional(),
}
export const CreateBrand = z.object(brandFields).strict()
export const UpdateBrand = z.object(brandFields).partial().strict()

export const SetProductBrand = z.object({ brand_id: z.string().min(1).nullable() }).strict()

export const SubscribeToNewsletter = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    // The visitor must have ticked the consent box.
    consent: z.literal(true),
    source: text(40).optional(),
  })
  .strict()
