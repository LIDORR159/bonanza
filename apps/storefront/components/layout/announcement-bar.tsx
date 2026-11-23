import type { StoreBanner } from "@bonanza/types"
import Link from "next/link"

/** The thin strip above the header, fed by the `announcement` banner placement. */
export function AnnouncementBar({ banner }: { banner: StoreBanner | undefined }) {
  if (!banner) {
    return null
  }
  const text = (
    <>
      <span className="font-semibold">{banner.title}</span>
      {banner.subtitle && <span className="text-ink-700"> · {banner.subtitle}</span>}
    </>
  )
  return (
    <div className="bg-paper text-ink-950">
      <p className="container-site py-2 text-center text-[0.8rem] leading-snug">
        {banner.target_url ? (
          <Link href={banner.target_url} className="underline-offset-4 hover:underline">
            {text}
          </Link>
        ) : (
          text
        )}
      </p>
    </div>
  )
}
