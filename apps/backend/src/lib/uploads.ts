import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

/**
 * Server-side checks for admin uploads. Medusa's upload route accepts any file
 * of any size; the only limit it ships is in the browser.
 */

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
export const MAX_UPLOAD_FILES = 12

/** Image types the storefront can display. SVG is left out: it can carry scripts. */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const

type AllowedType = (typeof ALLOWED_IMAGE_TYPES)[number]

/**
 * The type a file really is, read from its first bytes. The type the browser
 * declares is under the uploader's control and is not trusted on its own.
 */
export function sniffImageType(bytes: Uint8Array): AllowedType | null {
  const ascii = (start: number, end: number) =>
    Buffer.from(bytes.subarray(start, end)).toString("latin1")

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg"
  }
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") {
    return "image/png"
  }
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return "image/webp"
  }
  if (ascii(4, 8) === "ftyp" && /^(avif|avis)/.test(ascii(8, 12))) {
    return "image/avif"
  }
  return null
}

type UploadedFile = { mimetype?: string; size?: number; buffer?: Uint8Array; originalname?: string }

const reject = (res: MedusaResponse, status: number, message: string) =>
  res.status(status).json({ type: "invalid_data", message })

/**
 * Refuses a request whose declared size is over the limit, from its
 * Content-Length header alone. Medusa's own upload middleware is registered
 * ahead of this one and may already have buffered the body, so this is a
 * limit on what gets stored, not a memory guard; the reverse proxy's body
 * limit is what keeps large uploads away from the process.
 */
export function limitUploadSize(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const length = Number(req.headers["content-length"] || 0)
  // Multipart framing adds a little to every file.
  if (length > MAX_UPLOAD_FILES * MAX_UPLOAD_BYTES + 64 * 1024) {
    return reject(res, 413, "Upload is too large.")
  }
  return next()
}

/** Checks each parsed file: count, size, declared type and actual content. */
export function validateUploadedImages(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const files = ((req as unknown as { files?: UploadedFile[] }).files ?? []) as UploadedFile[]
  if (files.length > MAX_UPLOAD_FILES) {
    return reject(res, 400, `At most ${MAX_UPLOAD_FILES} files per upload.`)
  }
  for (const file of files) {
    const name = file.originalname ?? "file"
    if ((file.size ?? 0) > MAX_UPLOAD_BYTES) {
      return reject(res, 413, `${name} is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`)
    }
    const actual = file.buffer ? sniffImageType(file.buffer) : null
    if (!actual || actual !== file.mimetype) {
      return reject(
        res,
        400,
        `${name} is not an accepted image. Use JPEG, PNG, WebP or AVIF.`
      )
    }
  }
  return next()
}

/** Applies the same rules to requests for a direct-to-storage upload link. */
export function validatePresignedUpload(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const body = (req.body ?? {}) as { mime_type?: string; size?: number }
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(String(body.mime_type))) {
    return reject(res, 400, "Only JPEG, PNG, WebP and AVIF images can be uploaded.")
  }
  if (Number(body.size) > MAX_UPLOAD_BYTES) {
    return reject(res, 413, `Files are limited to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`)
  }
  return next()
}
