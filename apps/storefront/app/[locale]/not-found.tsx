"use client"

import { useT } from "@/components/i18n/locale-provider"
import { ButtonLink } from "@/components/ui/button"

// A client component on purpose: a "not found" page is given no address
// parameters, and the language context is the one source that is always set.
export default function NotFound() {
  const t = useT()
  return (
    <div className="container-site flex min-h-[55vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow mb-4" dir="ltr">
        404
      </p>
      <h1 className="text-4xl sm:text-5xl">{t.errors.notFoundTitle}</h1>
      <p className="mt-4 text-lg text-mist-300">{t.errors.notFoundBody}</p>
      <ButtonLink href="/" size="lg" className="mt-8">
        {t.errors.backHome}
      </ButtonLink>
    </div>
  )
}
