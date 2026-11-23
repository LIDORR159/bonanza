import type { Metadata } from "next"
import { AuthCard } from "@/components/account/auth-card"
import { ForgotPasswordForm } from "@/components/account/auth-forms"
import { t } from "@/lib/i18n"

export const metadata: Metadata = {
  title: t.account.forgotTitle,
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <AuthCard title={t.account.forgotTitle}>
      <ForgotPasswordForm />
    </AuthCard>
  )
}
