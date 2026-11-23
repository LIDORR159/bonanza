import type { Metadata } from "next"
import { AuthCard } from "@/components/account/auth-card"
import { ForgotPasswordForm } from "@/components/account/auth-forms"
import { getT, withLocale } from "@/lib/i18n/server"

export const generateMetadata = withLocale((): Metadata => {
  const t = getT()
  return {
    title: t.account.forgotTitle,
    robots: { index: false, follow: false },
  }
})

export default withLocale(function ForgotPasswordPage() {
  const t = getT()
  return (
    <AuthCard title={t.account.forgotTitle}>
      <ForgotPasswordForm />
    </AuthCard>
  )
})
