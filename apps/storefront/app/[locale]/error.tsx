"use client"

import { Button, ButtonLink } from "@/components/ui/button"
import { t } from "@/lib/i18n"

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-site flex min-h-[55vh] flex-col items-center justify-center py-20 text-center">
      <h1 className="text-4xl sm:text-5xl">{t.errors.errorTitle}</h1>
      <p className="mt-4 text-lg text-mist-300">{t.errors.errorBody}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={reset}>
          {t.errors.retry}
        </Button>
        <ButtonLink href="/" size="lg" variant="secondary">
          {t.errors.backHome}
        </ButtonLink>
      </div>
    </div>
  )
}
