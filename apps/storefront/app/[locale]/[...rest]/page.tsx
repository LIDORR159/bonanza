import { notFound } from "next/navigation"

/**
 * Any address that matches no page lands here, so it gets the site's own
 * "not found" page, in the visitor's language, instead of a bare one.
 */
export default function CatchAll() {
  notFound()
}
