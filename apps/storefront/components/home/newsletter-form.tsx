"use client"

import { Button } from "@/components/ui/button"
import { FormMessage, inputClass } from "@/components/ui/field"
import { t } from "@/lib/i18n"
import { subscribeToNewsletter, type NewsletterState } from "@/lib/medusa/newsletter"
import { useFormAction } from "@/components/ui/use-form-action"

const initial: NewsletterState = { status: "idle" }

export function NewsletterForm({ source = "home" }: { source?: string }) {
  const { state, action, onSubmit, pending } = useFormAction(subscribeToNewsletter, initial)

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>
  }

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="source" value={source} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="newsletter-email" className="sr-only">
            {t.newsletter.emailLabel}
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            dir="ltr"
            required
            autoComplete="email"
            placeholder={t.newsletter.placeholder}
            className={`${inputClass} text-start`}
          />
        </div>
        <Button type="submit" size="lg" disabled={pending} className="sm:h-12">
          {t.newsletter.submit}
        </Button>
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-mist-300">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-1 size-4 shrink-0 accent-[var(--color-paper)]"
        />
        <span>{t.newsletter.consent}</span>
      </label>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
    </form>
  )
}
