import { timingSafeEqual } from "node:crypto"
import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"
import { isCacheTag } from "@/lib/cache-tags"

export const dynamic = "force-dynamic"

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * Called by the backend when products or content change, so cached pages are
 * refreshed at once instead of waiting for their timer.
 *
 *   POST /api/revalidate
 *   Authorization: Bearer <REVALIDATE_SECRET>
 *   { "tags": ["products", "cms"] }      or      { "all": true }
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET
  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : ""
  if (!secret || !safeEqual(secret, token)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    tags?: unknown
    all?: unknown
  }

  if (body.all === true) {
    revalidatePath("/", "layout")
    return NextResponse.json({ revalidated: "all" })
  }

  const tags = Array.isArray(body.tags) ? body.tags.filter(isCacheTag) : []
  for (const tag of tags) {
    // Expire immediately: the next request renders fresh content.
    revalidateTag(tag, { expire: 0 })
  }
  return NextResponse.json({ revalidated: tags })
}
