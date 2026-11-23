import type { Metadata } from "next"
import { AuthCard } from "@/components/account/auth-card"
import { ResetPasswordForm } from "@/components/account/auth-forms"
import { ButtonLink } from "@/components/ui/button"
import { FormMessage } from "@/components/ui/field"
import { getT, withLocale } from "@/lib/i18n/server"

export const generateMetadata = withLocale((): Metadata => {
  const t = getT()
  return {
    title: t.account.resetTitle,
    robots: { index: false, follow: false },
    // The reset token is in the address; never send it on as a referrer.
    referrer: "no-referrer",
  }
})

export default withLocale(async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>
}) {
  const t = getT()
  const { token, email } = await searchParams
  return (
    <AuthCard title={t.account.resetTitle}>
      {token && email ? (
        <ResetPasswordForm token={token} email={email} />
      ) : (
        <div className="space-y-5">
          <FormMessage tone="error">{t.account.resetInvalid}</FormMessage>
          <ButtonLink
            href="/account/forgot-password"
            variant="secondary"
            className="w-full"
          >
            {t.account.forgotTitle}
          </ButtonLink>
        </div>
      )}
    </AuthCard>
  )
})
