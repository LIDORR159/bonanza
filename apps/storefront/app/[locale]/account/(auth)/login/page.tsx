import type { Metadata } from "next"
import { AuthCard } from "@/components/account/auth-card"
import { LoginForm } from "@/components/account/auth-forms"
import { t } from "@/lib/i18n"

export const metadata: Metadata = {
  title: t.account.loginTitle,
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return (
    <AuthCard title={t.account.loginTitle}>
      <LoginForm next={next ?? "/account"} />
    </AuthCard>
  )
}
