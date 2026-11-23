import {
  allowFields,
  configureStoreSearch,
  defineMiddlewares,
  validateAndTransformBody,
  type MiddlewareRoute,
} from "@medusajs/framework/http"
import { byEmail, byIp, rateLimit } from "../lib/rate-limit"
import {
  limitUploadSize,
  validatePresignedUpload,
  validateUploadedImages,
} from "../lib/uploads"
import {
  CreateBanner,
  CreateBrand,
  CreateGalleryItem,
  CreateNavigationItem,
  CreatePage,
  CreatePreviewToken,
  CreateReview,
  CreateSection,
  CreateServiceGroup,
  CreateServiceItem,
  CreateTeamMember,
  Reorder,
  SetProductBrand,
  SubscribeToNewsletter,
  UpdateBanner,
  UpdateBrand,
  UpdateGalleryItem,
  UpdateNavigationItem,
  UpdatePage,
  UpdateReview,
  UpdateSection,
  UpdateServiceGroup,
  UpdateServiceItem,
  UpdateSiteSettings,
  UpdateTeamMember,
} from "./validators"

const MINUTE = 60
const HOUR = 60 * MINUTE

/** POST body validation for one admin route. */
const body = (
  matcher: string,
  schema: Parameters<typeof validateAndTransformBody>[0]
): MiddlewareRoute => ({
  method: ["POST"],
  matcher,
  middlewares: [validateAndTransformBody(schema)],
})

// ── Rate limits ─────────────────────────────────────────────────────────────
// Matchers are regular expressions so each limit applies to exactly one path
// and never to the longer paths that share its prefix.
const rateLimits: MiddlewareRoute[] = [
  {
    // Sign-in, for customers and admin users.
    method: ["POST"],
    matcher: /^\/auth\/[^/]+\/emailpass\/?$/,
    middlewares: [
      rateLimit(
        { name: "login-ip", points: 20, duration: 5 * MINUTE, key: byIp },
        { name: "login-email", points: 8, duration: 15 * MINUTE, key: byEmail }
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: /^\/auth\/[^/]+\/emailpass\/register\/?$/,
    middlewares: [rateLimit({ name: "register-ip", points: 10, duration: HOUR, key: byIp })],
  },
  {
    method: ["POST"],
    matcher: /^\/auth\/[^/]+\/emailpass\/reset-password\/?$/,
    middlewares: [
      rateLimit(
        { name: "reset-ip", points: 10, duration: HOUR, key: byIp },
        { name: "reset-email", points: 3, duration: HOUR, key: byEmail }
      ),
    ],
  },
  {
    // Setting a new password with a reset token.
    method: ["POST"],
    matcher: /^\/auth\/[^/]+\/emailpass\/update\/?$/,
    middlewares: [rateLimit({ name: "reset-use-ip", points: 10, duration: HOUR, key: byIp })],
  },
  {
    method: ["POST"],
    matcher: /^\/store\/customers\/?$/,
    middlewares: [rateLimit({ name: "signup-ip", points: 10, duration: HOUR, key: byIp })],
  },
  {
    method: ["POST"],
    matcher: /^\/store\/newsletter\/?$/,
    middlewares: [rateLimit({ name: "newsletter-ip", points: 5, duration: HOUR, key: byIp })],
  },
]

export default defineMiddlewares({
  routes: [
    ...rateLimits,

    // ── Store ───────────────────────────────────────────────────────────────
    {
      // The product index declares filterable `status` and `sales_channel_ids`,
      // so the route narrows it to published products in the key's sales channels.
      method: ["POST"],
      matcher: "/store/search",
      middlewares: [configureStoreSearch({ allowed_indexes: { product: true } })],
    },
    {
      // Lets the storefront ask for a product's brand through `?fields=`.
      matcher: "/store/products",
      middlewares: [
        allowFields("brand.id", "brand.name", "brand.handle", "brand.logo_url"),
      ],
    },
    {
      matcher: "/store/products/:id",
      middlewares: [
        allowFields("brand.id", "brand.name", "brand.handle", "brand.logo_url"),
      ],
    },
    {
      method: ["POST"],
      matcher: "/store/newsletter",
      middlewares: [validateAndTransformBody(SubscribeToNewsletter)],
    },

    // ── Admin: uploads ──────────────────────────────────────────────────────
    {
      method: ["POST"],
      matcher: "/admin/uploads",
      middlewares: [limitUploadSize, validateUploadedImages],
    },
    {
      method: ["POST"],
      matcher: "/admin/uploads/presigned-urls",
      middlewares: [validatePresignedUpload],
    },

    // ── Admin: site content ─────────────────────────────────────────────────
    // Reordering has its own paths (`*-order`) because a matcher such as
    // `/sections/:id` would also catch `/sections/reorder` and validate it
    // against the wrong schema.
    body("/admin/cms/sections", CreateSection),
    body("/admin/cms/section-order", Reorder),
    body("/admin/cms/sections/:id", UpdateSection),
    body("/admin/cms/banners", CreateBanner),
    body("/admin/cms/banner-order", Reorder),
    body("/admin/cms/banners/:id", UpdateBanner),
    body("/admin/cms/pages", CreatePage),
    body("/admin/cms/pages/:id", UpdatePage),
    body("/admin/cms/navigation", CreateNavigationItem),
    body("/admin/cms/navigation-order", Reorder),
    body("/admin/cms/navigation/:id", UpdateNavigationItem),
    body("/admin/cms/service-groups", CreateServiceGroup),
    body("/admin/cms/service-group-order", Reorder),
    body("/admin/cms/service-groups/:id", UpdateServiceGroup),
    body("/admin/cms/service-items", CreateServiceItem),
    body("/admin/cms/service-item-order", Reorder),
    body("/admin/cms/service-items/:id", UpdateServiceItem),
    body("/admin/cms/gallery", CreateGalleryItem),
    body("/admin/cms/gallery-order", Reorder),
    body("/admin/cms/gallery/:id", UpdateGalleryItem),
    body("/admin/cms/team", CreateTeamMember),
    body("/admin/cms/team-order", Reorder),
    body("/admin/cms/team/:id", UpdateTeamMember),
    body("/admin/cms/reviews", CreateReview),
    body("/admin/cms/review-order", Reorder),
    body("/admin/cms/reviews/:id", UpdateReview),
    body("/admin/cms/settings", UpdateSiteSettings),
    body("/admin/cms/preview-token", CreatePreviewToken),

    // ── Admin: brands ───────────────────────────────────────────────────────
    body("/admin/brands", CreateBrand),
    body("/admin/brands/:id", UpdateBrand),
    body("/admin/products/:id/brand", SetProductBrand),
  ],
})
