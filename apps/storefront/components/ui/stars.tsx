import { StarIcon } from "./icons"

/**
 * A row of five stars filled up to `rating`, read out as one image. The filled
 * row is clipped from the left, so 4.6 shows a part-filled fifth star.
 */
export function Stars({
  rating,
  label,
  className = "size-4",
}: {
  rating: number
  label: string
  className?: string
}) {
  const percent = Math.max(0, Math.min(5, rating)) * 20
  const row = (tone: string) =>
    [0, 1, 2, 3, 4].map((index) => (
      <StarIcon key={index} className={`${className} shrink-0 ${tone}`} />
    ))
  return (
    <span role="img" aria-label={label} dir="ltr" className="relative inline-flex">
      <span className="flex gap-0.5">{row("text-ink-500")}</span>
      <span
        className="absolute inset-y-0 left-0 flex gap-0.5 overflow-hidden"
        style={{ width: `${percent}%` }}
      >
        {row("text-star")}
      </span>
    </span>
  )
}
