import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { Markdown } from "@/components/ui/markdown"
import { REVALIDATE_SECONDS } from "@/lib/config"
import { getPage } from "@/lib/medusa/content"

export const revalidate = REVALIDATE_SECONDS

export function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) {
    return {}
  }
  return {
    title: page.seo.meta_title || page.title,
    description: page.seo.meta_description ?? undefined,
    alternates: { canonical: page.seo.canonical_url || `/${page.slug}` },
    openGraph: page.seo.og_image_url ? { images: [page.seo.og_image_url] } : undefined,
    // A draft seen through a preview link must never be indexed.
    robots: page.is_preview ? { index: false, follow: false } : undefined,
  }
}

/** A content page written in the admin: about, contact, policies, academy. */
export default async function ContentPage({ params }: Props) {
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
}
