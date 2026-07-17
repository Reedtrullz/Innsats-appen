import { notFound } from 'next/navigation';
import { getActionCards, getSourceDocuments, getTrainingPaths } from '@/lib/content/load-content';
import { TrainingPathDetail } from '@/components/training-path-detail';

export const revalidate = 3600;

export function generateStaticParams() {
  return getTrainingPaths().map((path) => ({ slug: path.slug }));
}

export default async function TrainingPathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const paths = getTrainingPaths();
  const path = paths.find((item) => item.slug === slug);
  if (!path) notFound();
  const cards = getActionCards();
  const sources = getSourceDocuments();
  return <TrainingPathDetail path={path} cards={cards} sources={sources} />;
}
