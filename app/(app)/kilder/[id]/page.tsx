import { notFound } from 'next/navigation';
import { SourceDocumentView } from '@/components/source-badge';
import { getSourceDocuments } from '@/lib/content/load-content';

export const revalidate = 3600;

export function generateStaticParams() {
  return getSourceDocuments().map((source) => ({ id: source.id }));
}

export default async function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = getSourceDocuments().find((item) => item.id === id);
  if (!source) notFound();
  return <SourceDocumentView source={source} />;
}
