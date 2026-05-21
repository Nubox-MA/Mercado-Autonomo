import CatalogDeepLinkLoader from '@/components/CatalogDeepLinkLoader'

type PageProps = {
  params: { slug: string; categorySlug: string }
}

export default function LojaCategoriaCatalogPage({ params }: PageProps) {
  return (
    <CatalogDeepLinkLoader storeSlug={params.slug} categorySlug={params.categorySlug} />
  )
}
