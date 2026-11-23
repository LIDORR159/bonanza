import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies, draftMode } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { IS_PRODUCTION } from "@/lib/config"
import { PREVIEW_COOKIE } from "@/lib/medusa/content"

export const dynamic = "force-dynamic"

/**
 * Checks a preview token the same way the backend does: `<body>.<hmac>`,
 * signed with CMS_PREVIEW_SECRET, carrying an expiry.
 */
function isValidPreviewToken(token: string): boolean {
  const secret = process.env.CMS_PREVIEW_SECRET
  const parts = token.split(".")
  const [body, signature] = parts
  if (
    !secret ||
    parts.length !== 2 ||
    !body ||
    !signature ||
    !/^[0-9a-f]{64}$/i.test(signature)
  ) {
    return false
  }
  const expected = createHmac("sha256", secret).update(body).digest()
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) {
    return false
  }
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
    return claims.scope === "cms-preview" && claims.exp > Date.now() / 1000
  } catch {
    return false
  }
}

/** Only ever redirect to a path on this site. */
const safePath = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : "/"

/**
 * Opens or closes content preview.
 *
 *   /api/preview?token=...&path=/about   staff link from the admin
 *   /api/preview?exit=1                  leave preview
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const draft = await draftMode()
  const jar = await cookies()

  if (searchParams.get("exit")) {
    draft.disable()
    jar.delete(PREVIEW_COOKIE)
    return NextResponse.redirect(new URL("/", request.url))
  }

  const token = searchParams.get("token") ?? ""
  if (!isValidPreviewToken(token)) {
    return NextResponse.json(
      { message: "Invalid or expired preview link" },
      { status: 401 }
    )
  }

  draft.enable()
  jar.set(PREVIEW_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PRODUCTION,
    path: "/",
    maxAge: 30 * 60,
  })
  return NextResponse.redirect(new URL(safePath(searchParams.get("path")), request.url))
}
