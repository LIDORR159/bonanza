import type { Metadata } from "next"
import { AuthCard } from "@/components/account/auth-card"
import { LoginForm } from "@/components/account/auth-forms"
import { getT, withLocale } from "@/lib/i18n/server"

export const generateMetadata = withLocale((): Metadata => {
  const t = getT()
  return {
    title: t.account.loginTitle,
    robots: { index: false, follow: false },
  }
})

export default withLocale(async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const t = getT()
  const { next } = await searchParams
  return (
    <AuthCard title={t.account.loginTitle}>
      <LoginForm next={next ?? "/account"} />
    </AuthCard>
  )
})
