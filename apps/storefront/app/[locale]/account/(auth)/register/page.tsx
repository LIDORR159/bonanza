import type { Metadata } from "next"
import { AuthCard } from "@/components/account/auth-card"
import { RegisterForm } from "@/components/account/auth-forms"
import { getT, withLocale } from "@/lib/i18n/server"

export const generateMetadata = withLocale((): Metadata => {
  const t = getT()
  return {
    title: t.account.registerTitle,
    robots: { index: false, follow: false },
  }
})

export default withLocale(async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const t = getT()
  const { next } = await searchParams
  return (
    <AuthCard title={t.account.registerTitle}>
      <RegisterForm next={next ?? "/account"} />
    </AuthCard>
  )
})
