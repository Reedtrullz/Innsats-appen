'use client';

import { useSyncExternalStore } from 'react';
import type { OperationalChecklist } from '@/lib/content/schemas';
import {
  personalPrepSnapshot,
  sanitizePersonalPrepState,
  subscribePersonalPrep,
  togglePersonalPrepItem,
} from '@/lib/personlig/personal-prep-store';

/**
 * "Pakk sekken" — a mission-independent checkable list backed by the personal
 * prep store. Calm tempo (board Personlig modus): just check items off, see
 * "n/total pakket". No notes, no equipment status, no persondata — preparation,
 * not an operational record.
 */
export function PersonalPrepChecklist({
  checklist,
  sourceTitleById = {},
}: {
  checklist: OperationalChecklist;
  sourceTitleById?: Record<string, string>;
}) {
  // The snapshot IS the serialized prep state (slug -> checked ids), not storage.
  const snapshot = useSyncExternalStore(subscribePersonalPrep, personalPrepSnapshot, () => '{}');
  let state: Record<string, string[]> = {};
  try {
    state = sanitizePersonalPrepState(JSON.parse(snapshot || '{}'));
  } catch {
    state = {};
  }
  const checked = new Set(state[checklist.slug] ?? []);
  const items = checklist.items ?? [];
  const packed = items.filter((item) => checked.has(item.id)).length;
  const pct = items.length > 0 ? Math.round((packed / items.length) * 100) : 0;

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="pakk-sekken-heading">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[#34d399]">🎒 Pakk sekken</p>
          <h2 id="pakk-sekken-heading" className="text-2xl font-black text-[var(--text-primary)]">{checklist.title}</h2>
        </div>
        <span className="shrink-0 font-mono text-sm font-bold text-[var(--text-secondary)]">{packed}/{items.length} pakket</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--border)]" aria-hidden="true">
        <div className="h-full rounded-full bg-[#34d399] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 font-mono text-[0.68rem] text-[var(--text-muted)]">Tjenestens utstyrskrav — ingen hast. Lagres bare lokalt, ingen persondata.</p>

      <ul className="mt-4 space-y-2">
        {items.map((item) => {
          const isChecked = checked.has(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={isChecked}
                onClick={() => togglePersonalPrepItem(checklist.slug, item.id)}
                className={`flex w-full min-h-14 items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                  isChecked
                    ? 'border-[#34d399]/40 bg-[var(--success-surface)]'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[#34d399]/40'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm font-black ${
                    isChecked ? 'border-[#34d399] bg-[#34d399] text-[#04141f]' : 'border-[var(--border-strong)] text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold leading-5 ${isChecked ? 'text-[var(--success-fg)]' : 'text-[var(--text-primary)]'}`}>
                    {item.label}
                  </span>
                  {(item.sourceIds ?? []).length > 0 ? (
                    <span className="mt-1 block font-mono text-[0.6rem] text-[var(--text-muted)]">
                      Kilde: {(item.sourceIds ?? []).map((id) => sourceTitleById[id] ?? id.replace(/^src-/, '')).join(', ')}
                    </span>
                  ) : null}
                </span>
                {item.required ? (
                  <span className="shrink-0 rounded-full bg-[var(--surface-muted)] px-2 py-0.5 font-mono text-[0.6rem] font-semibold text-[var(--text-muted)]">Påkrevd</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
