import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { Markdown } from "@/components/ui/markdown"
import { getPage } from "@/lib/medusa/content"
import { alternates, withLocale } from "@/lib/i18n/server"

// Next.js reads this export without running the file, so it has to be a
// literal. Keep it equal to REVALIDATE_SECONDS in lib/config.ts.
export const revalidate = 300

export function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

export const generateMetadata = withLocale(async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) {
    return {}
  }
  return {
    title: page.seo.meta_title || page.title,
    description: page.seo.meta_description ?? undefined,
    // A canonical address typed in the admin wins over the page's own.
    alternates: page.seo.canonical_url
      ? { canonical: page.seo.canonical_url }
      : alternates(`/${page.slug}`),
    openGraph: page.seo.og_image_url ? { images: [page.seo.og_image_url] } : undefined,
    // A draft seen through a preview link must never be indexed.
    robots: page.is_preview ? { index: false, follow: false } : undefined,
  }
})

/** A content page written in the admin: about, contact, policies, academy. */
export default withLocale(async function ContentPage({ params }: Props) {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) {
    notFound()
  }
  return (
    <article className="container-site max-w-3xl pb-8 pt-8 lg:pt-10">
      <Breadcrumbs items={[{ name: page.title, path: `/${page.slug}` }]} />
      <h1 className="mb-8 text-4xl sm:text-5xl">{page.title}</h1>
      <Markdown>{page.body}</Markdown>
    </article>
  )
})
