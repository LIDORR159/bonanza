import type { MetadataRoute } from "next"
import { ALLOW_INDEXING, SITE_URL } from "@/lib/config"

export default function robots(): MetadataRoute.Robots {
  // On a temporary URL nothing should be indexed at all.
  if (!ALLOW_INDEXING) {
    return { rules: [{ userAgent: "*", disallow: "/" }] }
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/cart", "/checkout", "/account", "/order", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
