import { notFound } from 'next/navigation';
import { ActionCardDetail } from '@/components/action-card-detail';
import { getActionCards, getSourceDocuments } from '@/lib/content/load-content';

export function generateStaticParams() {
  return getActionCards().map((card) => ({ slug: card.slug }));
}

export default async function CardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = getActionCards().find((item) => item.slug === slug);
  if (!card) notFound();
  return <ActionCardDetail card={card} sources={getSourceDocuments()} />;
}
