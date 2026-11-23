import type { Metadata } from "next"
import { AuthCard } from "@/components/account/auth-card"
import { RegisterForm } from "@/components/account/auth-forms"
import { t } from "@/lib/i18n"

export const metadata: Metadata = {
  title: t.account.registerTitle,
  robots: { index: false, follow: false },
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return (
    <AuthCard title={t.account.registerTitle}>
      <RegisterForm next={next ?? "/account"} />
    </AuthCard>
  )
}
