"use client"

import Link from "next/link"
import { useActionState } from "react"
import { Button, ButtonLink } from "@/components/ui/button"
import { Field, FormMessage } from "@/components/ui/field"
import { t } from "@/lib/i18n"
import {
  login,
  register,
  requestPasswordReset,
  resetPassword,
  type FormState,
} from "@/lib/medusa/customer"

const idle: FormState = { status: "idle" }
const linkClass = "font-semibold text-paper underline underline-offset-4"

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, idle)
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label={t.account.email} name="email" type="email" ltr required autoComplete="email" />
      <Field
        label={t.account.password}
        name="password"
        type="password"
        ltr
        required
        autoComplete="current-password"
      />
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? t.account.signingIn : t.account.signIn}
      </Button>
      <p className="flex flex-wrap justify-between gap-2 pt-2 text-sm text-mist-300">
        <Link href="/account/forgot-password" className="underline underline-offset-4 hover:text-paper">
          {t.account.forgotPassword}
        </Link>
        <span>
          {t.account.noAccount}{" "}
          <Link href={`/account/register?next=${encodeURIComponent(next)}`} className={linkClass}>
            {t.account.register}
          </Link>
        </span>
      </p>
    </form>
  )
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(register, idle)
  const errors = state.fieldErrors ?? {}
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t.checkout.firstName}
          name="first_name"
          required
          autoComplete="given-name"
          error={errors.first_name}
        />
        <Field
          label={t.checkout.lastName}
          name="last_name"
          required
          autoComplete="family-name"
          error={errors.last_name}
        />
      </div>
      <Field
        label={t.account.email}
        name="email"
        type="email"
        ltr
        required
        autoComplete="email"
        error={errors.email}
      />
      <Field
        label={t.checkout.phone}
        name="phone"
        type="tel"
        ltr
        autoComplete="tel"
        hint={t.checkout.phoneHint}
        error={errors.phone}
      />
      <Field
        label={t.account.password}
        name="password"
        type="password"
        ltr
        required
        minLength={8}
        autoComplete="new-password"
        hint={t.account.passwordHint}
        error={errors.password}
      />
      {state.status === "error" && state.message && (
        <FormMessage tone="error">{state.message}</FormMessage>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? t.account.registering : t.account.register}
      </Button>
      <p className="pt-2 text-sm text-mist-300">
        {t.account.haveAccount}{" "}
        <Link href={`/account/login?next=${encodeURIComponent(next)}`} className={linkClass}>
          {t.account.signIn}
        </Link>
      </p>
    </form>
  )
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, idle)
  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <p className="text-mist-300">{t.account.forgotIntro}</p>
      <Field
        label={t.account.email}
        name="email"
        type="email"
        ltr
        required
        autoComplete="email"
        error={state.fieldErrors?.email}
      />
      {state.status === "error" && state.message && (
        <FormMessage tone="error">{state.message}</FormMessage>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {t.account.sendResetLink}
      </Button>
    </form>
  )
}

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(resetPassword, idle)
  const errors = state.fieldErrors ?? {}
  if (state.status === "success") {
    return (
      <div className="space-y-5">
        <FormMessage tone="success">{state.message}</FormMessage>
        <ButtonLink href="/account/login" size="lg" className="w-full">
          {t.account.signIn}
        </ButtonLink>
      </div>
    )
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />
      <Field
        label={t.account.newPassword}
        name="password"
        type="password"
        ltr
        required
        minLength={8}
        autoComplete="new-password"
        hint={t.account.passwordHint}
        error={errors.password}
      />
      <Field
        label={t.account.confirmPassword}
        name="confirm_password"
        type="password"
        ltr
        required
        autoComplete="new-password"
        error={errors.confirm_password}
      />
      {state.status === "error" && state.message && (
        <FormMessage tone="error">{state.message}</FormMessage>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {t.account.resetSubmit}
      </Button>
    </form>
  )
}
