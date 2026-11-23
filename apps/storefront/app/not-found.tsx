import Link from "next/link"
import { t } from "@/lib/i18n"

/** Catches addresses that match no route at all. */
export default function GlobalNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 p-6 text-center">
      <h1 className="text-4xl">{t.errors.notFoundTitle}</h1>
      <p className="text-mist-300">{t.errors.notFoundBody}</p>
      <Link
        href="/"
        className="rounded-md bg-paper px-6 py-3 font-semibold text-ink-950 hover:bg-white"
      >
        {t.errors.backHome}
      </Link>
    </main>
  )
}
