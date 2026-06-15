import { notFound } from 'next/navigation';
import { ActionCardDetail } from '@/components/action-card-detail';
import { getActionCards, getImageMetadata, getReferenceVideos, getSourceDocuments } from '@/lib/content/load-content';

export const revalidate = 3600;

export function generateStaticParams() {
  return getActionCards().map((card) => ({ slug: card.slug }));
}

export default async function CardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = getActionCards().find((item) => item.slug === slug);
  if (!card) notFound();
  const images = getImageMetadata()
    .filter((image) => image.approvedForPublication && image.usedByCardSlugs.includes(slug))
    .sort((a, b) => a.id.localeCompare(b.id, 'nb'));
  return <ActionCardDetail card={card} sources={getSourceDocuments()} images={images} referenceVideos={getReferenceVideos()} />;
}
