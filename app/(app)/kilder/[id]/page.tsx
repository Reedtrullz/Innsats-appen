import { notFound } from 'next/navigation';
import { SourceDocumentView } from '@/components/source-badge';
import { getActionCards, getSourceDocuments } from '@/lib/content/load-content';
import { linkedCardsForSource } from '@/lib/content/source-navigation';

export const revalidate = 3600;

export function generateStaticParams() {
  return getSourceDocuments().map((source) => ({ id: source.id }));
}

export default async function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = getSourceDocuments().find((item) => item.id === id);
  if (!source) notFound();
  return <SourceDocumentView source={source} linkedCards={linkedCardsForSource(source, getActionCards())} />;
}
