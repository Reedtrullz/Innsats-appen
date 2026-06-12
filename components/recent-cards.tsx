'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type { ActionCard } from '@/lib/content/schemas';
import { RECENT_CARDS_EVENT, RECENT_CARDS_STORAGE_KEY, parseRecentCardSlugs, recordRecentCard } from '@/lib/content/recent-cards';
import { TiltakCardRow } from './tiltak-card';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(RECENT_CARDS_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(RECENT_CARDS_EVENT, callback);
  };
}

function snapshot() {
  try {
    return localStorage.getItem(RECENT_CARDS_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Records that a card was opened; rendered by the card detail page. */
export function RecordCardVisit({ slug }: { slug: string }) {
  useEffect(() => {
    recordRecentCard(slug);
  }, [slug]);
  return null;
}

/**
 * "Sist brukt" row for /hurtigkort: under stress the card you need is very
 * often the card you used last. Renders nothing until there is history.
 */
export function RecentCardsRow({ cards }: { cards: ActionCard[] }) {
  const serialized = useSyncExternalStore(subscribe, snapshot, () => '');
  const slugs = parseRecentCardSlugs(serialized || null);
  const cardBySlug = new Map(cards.map((card) => [card.slug, card]));
  const recentCards = slugs.map((slug) => cardBySlug.get(slug)).filter((card): card is ActionCard => Boolean(card)).slice(0, 3);
  if (recentCards.length === 0) return null;

  return (
    <section className="space-y-3" aria-labelledby="hurtigkort-recent-heading">
      <h2 id="hurtigkort-recent-heading" className="text-xl font-black text-slate-950">Sist brukt</h2>
      <div className="space-y-2">
        {recentCards.map((card) => <TiltakCardRow key={card.slug} card={card} />)}
      </div>
    </section>
  );
}
