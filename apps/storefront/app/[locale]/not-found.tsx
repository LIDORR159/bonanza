import { ButtonLink } from "@/components/ui/button"
import { t } from "@/lib/i18n"

export default function NotFound() {
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
