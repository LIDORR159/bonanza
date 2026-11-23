import { getT } from "@/lib/i18n/server"

/** Tells staff they are looking at unpublished content, with a way out. */
export function PreviewBar() {
  const t = getT()
  return (
    <div className="bg-warning text-ink-950">
      <p className="container-site flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-2 text-sm font-medium">
        {t.common.previewBanner}
        {/* A route handler that clears a cookie and redirects: it needs a real request. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/preview?exit=1" className="underline underline-offset-4">
          {t.common.exitPreview}
        </a>
      </p>
    </div>
  )
}
