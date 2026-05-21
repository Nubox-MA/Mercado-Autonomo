import CatalogDeepLinkLoader from '@/components/CatalogDeepLinkLoader'

type PageProps = {
  params: { slug: string }
}

export default function LojaCatalogPage({ params }: PageProps) {
  return <CatalogDeepLinkLoader storeSlug={params.slug} />
}
