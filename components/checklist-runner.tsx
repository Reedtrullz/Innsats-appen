'use client';

import { useEffect, useMemo, useState } from 'react';
import type { OperationalChecklist } from '@/lib/content/schemas';
import { getChecklistRun, saveChecklistRun } from '@/lib/mission/local-store';

export function ChecklistRunner({ checklist, missionId }: { checklist: OperationalChecklist; missionId: string }) {
  const runId = `${missionId}:${checklist.slug}`;
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [notesByItemId] = useState<Record<string, string>>({});
  const sourceIds = useMemo(() => [...new Set([...checklist.sourceIds, ...checklist.items.flatMap((item) => item.sourceIds)])], [checklist]);

  useEffect(() => {
    getChecklistRun(runId).then((run) => {
      if (run) setChecked(new Set(run.checkedItemIds));
    });
  }, [runId]);

  async function toggle(itemId: string) {
    const next = new Set(checked);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    setChecked(next);
    await saveChecklistRun({
      id: runId,
      missionId,
      templateSlug: checklist.slug,
      checkedItemIds: [...next],
      notesByItemId,
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    });
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <h2 className="text-xl font-black">{checklist.title}</h2>
      {checklist.warning ? <p className="mt-2 text-sm font-semibold text-amber-900">{checklist.warning}</p> : null}
      <ul className="mt-3 space-y-3">
        {checklist.items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-slate-200 p-3">
            <label className="flex min-h-11 items-center gap-3 font-semibold">
              <input type="checkbox" checked={checked.has(item.id)} onChange={() => void toggle(item.id)} />
              {item.label}{item.required ? ' (påkrevd)' : ''}
            </label>
            <p className="mt-1 text-xs text-slate-500">Kilder: {item.sourceIds.join(', ')}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">Sjekklistekilder: {sourceIds.join(', ')}</p>
    </section>
  );
}
