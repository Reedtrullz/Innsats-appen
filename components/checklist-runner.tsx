'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { OperationalChecklist } from '@/lib/content/schemas';
import { getChecklistRun, saveChecklistRun } from '@/lib/mission/local-store';

export function ChecklistRunner({ checklist, missionId }: { checklist: OperationalChecklist; missionId: string }) {
  const runId = `${missionId}:${checklist.slug}`;
  return <ChecklistRunnerState key={runId} checklist={checklist} missionId={missionId} runId={runId} />;
}

function ChecklistRunnerState({ checklist, missionId, runId }: { checklist: OperationalChecklist; missionId: string; runId: string }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [notesByItemId, setNotesByItemId] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const checkedRef = useRef<Set<string>>(new Set());
  const notesByItemIdRef = useRef<Record<string, string>>({});
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const sourceIds = useMemo(() => [...new Set([...(checklist.sourceIds ?? []), ...checklist.items.flatMap((item) => item.sourceIds ?? [])])], [checklist]);
  const requiredItems = useMemo(() => checklist.items.filter((item) => item.required), [checklist]);
  const requiredDone = requiredItems.filter((item) => checked.has(item.id)).length;
  const progress = checklist.items.length > 0 ? Math.round((checked.size / checklist.items.length) * 100) : 0;

  useEffect(() => {
    let cancelled = false;
    getChecklistRun(runId).then((run) => {
      if (cancelled) return;
      const nextChecked = run ? new Set(run.checkedItemIds) : new Set<string>();
      const nextNotesByItemId = run?.notesByItemId ?? {};
      checkedRef.current = nextChecked;
      notesByItemIdRef.current = nextNotesByItemId;
      setChecked(nextChecked);
      setNotesByItemId(nextNotesByItemId);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  function persist(nextChecked: Set<string>, nextNotesByItemId: Record<string, string>) {
    const snapshot = {
      id: runId,
      missionId,
      templateSlug: checklist.slug,
      checkedItemIds: [...nextChecked],
      notesByItemId: nextNotesByItemId,
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    };
    const write = writeQueueRef.current.catch(() => undefined).then(async () => {
      await saveChecklistRun(snapshot);
    });
    writeQueueRef.current = write;
    return write;
  }

  async function toggle(itemId: string) {
    const next = new Set(checkedRef.current);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    checkedRef.current = next;
    setChecked(next);
    await persist(next, notesByItemIdRef.current);
  }

  function updateNote(itemId: string, note: string) {
    const nextNotesByItemId = { ...notesByItemIdRef.current, [itemId]: note };
    notesByItemIdRef.current = nextNotesByItemId;
    setNotesByItemId(nextNotesByItemId);
  }

  async function persistNoteOnBlur(itemId: string, note: string) {
    const nextNotesByItemId = notesByItemIdRef.current[itemId] === note ? notesByItemIdRef.current : { ...notesByItemIdRef.current, [itemId]: note };
    notesByItemIdRef.current = nextNotesByItemId;
    setNotesByItemId(nextNotesByItemId);
    await persist(checkedRef.current, nextNotesByItemId);
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Aktiv sjekkliste</p>
          <h2 className="text-xl font-black">{checklist.title}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{checked.size}/{checklist.items.length} fullført</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress}%` }} />
      </div>
      {requiredItems.length > 0 ? <p className="mt-2 text-sm font-semibold text-slate-700">Påkrevd: {requiredDone}/{requiredItems.length} kontrollert</p> : null}
      {!hydrated ? <p className="mt-2 text-sm font-semibold text-slate-600">Laster lokal sjekklistestatus før redigering.</p> : null}
      {checklist.warning ? <p className="mt-2 text-sm font-semibold text-amber-900">{checklist.warning}</p> : null}
      <ul className="mt-3 space-y-3">
        {checklist.items.map((item) => (
          <li key={item.id} className={`rounded-2xl border p-3 ${item.required ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200'}`}>
            <label className="flex min-h-11 items-center gap-3 font-semibold">
              <input type="checkbox" checked={checked.has(item.id)} disabled={!hydrated} onChange={() => void toggle(item.id)} className="h-5 w-5" />
              <span>
                {item.label}
                {item.required ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-950">Påkrevd</span> : null}
              </span>
            </label>
            <p className="mt-1 text-xs text-slate-500">Kilder: {(item.sourceIds ?? []).join(', ')}</p>
            <label className="mt-2 block text-xs font-bold text-slate-700">
              Lokal note for {item.label}
              <textarea
                value={notesByItemId[item.id] ?? ''}
                disabled={!hydrated}
                onChange={(event) => updateNote(item.id, event.currentTarget.value)}
                onBlur={(event) => void persistNoteOnBlur(item.id, event.currentTarget.value)}
                className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 bg-white p-2 text-sm font-medium text-slate-900"
                placeholder="Kun lokale, ikke-sensitive notater. Ikke persondata."
              />
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">Sjekklistekilder: {sourceIds.join(', ')}</p>
    </section>
  );
}
