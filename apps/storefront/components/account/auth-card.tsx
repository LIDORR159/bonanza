import type { ReactNode } from "react"

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-xl border border-ink-600 bg-ink-850 p-7 sm:p-9">
      <h1 className="mb-6 text-3xl">{title}</h1>
      {children}
    </div>
  )
}
