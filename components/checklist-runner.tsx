'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { OperationalChecklist } from '@/lib/content/schemas';
import { getChecklistRun, saveChecklistRun } from '@/lib/mission/local-store';
import { equipmentStatusLabels, equipmentStatuses } from '@/lib/mission/equipment-readiness';
import type { EquipmentStatus } from '@/lib/mission/schemas';
import { detectSensitiveOperationalText, sensitiveTextFieldError } from '@/lib/privacy/sensitive-text';
import { formatSourceList } from '@/lib/content/source-titles';
import { useRole } from '@/lib/role/role-context';
import { roleGroupMeetsMinimum } from '@/lib/role/role-groups';

export function ChecklistRunner({ checklist, missionId, sourceTitleById, onRunSaved }: { checklist: OperationalChecklist; missionId: string; sourceTitleById?: Record<string, string>; onRunSaved?: () => void }) {
  const runId = `${missionId}:${checklist.slug}`;
  return <ChecklistRunnerState key={runId} checklist={checklist} missionId={missionId} runId={runId} sourceTitleById={sourceTitleById} onRunSaved={onRunSaved} />;
}

function ChecklistRunnerState({ checklist, missionId, runId, sourceTitleById, onRunSaved }: { checklist: OperationalChecklist; missionId: string; runId: string; sourceTitleById?: Record<string, string>; onRunSaved?: () => void }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [notesByItemId, setNotesByItemId] = useState<Record<string, string>>({});
  const [equipmentStatusByItemId, setEquipmentStatusByItemId] = useState<Record<string, EquipmentStatus>>({});
  const [hydrated, setHydrated] = useState(false);
  const [notePrivacyError, setNotePrivacyError] = useState<{ itemId: string; message: string } | null>(null);
  const checkedRef = useRef<Set<string>>(new Set());
  const notesByItemIdRef = useRef<Record<string, string>>({});
  const persistedNotesByItemIdRef = useRef<Record<string, string>>({});
  const equipmentStatusByItemIdRef = useRef<Record<string, EquipmentStatus>>({});
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const { roleGroup } = useRole();
  // Role lens (rollelinse): planning/decision steps tagged for a higher role are
  // locked for lower roles here too, so the Arbeid tab can't bypass the runbook
  // lock. Gated on `hydrated` so SSR and the first client render (which use the
  // default role) match — locks appear only after the stored role loads.
  const isLocked = (item: OperationalChecklist['items'][number]) =>
    hydrated && Boolean(item.minRoleGroup) && !roleGroupMeetsMinimum(roleGroup, item.minRoleGroup!);
  const sourceIds = useMemo(() => [...new Set([...(checklist.sourceIds ?? []), ...checklist.items.flatMap((item) => item.sourceIds ?? [])])], [checklist]);
  const isEquipmentChecklist = checklist.slug.startsWith('mbk-') || (checklist.equipmentRequired ?? []).length > 0;
  // Locked steps are excluded from the active role's counts (same mission, role depth).
  const requiredItems = useMemo(() => checklist.items.filter((item) => item.required), [checklist]);
  const requiredActionable = requiredItems.filter((item) => !isLocked(item));
  const requiredDone = requiredActionable.filter((item) => checked.has(item.id)).length;
  const actionableItems = checklist.items.filter((item) => !isLocked(item));
  const actionableChecked = actionableItems.filter((item) => checked.has(item.id)).length;
  const progress = actionableItems.length > 0 ? Math.round((actionableChecked / actionableItems.length) * 100) : 0;

  useEffect(() => {
    let cancelled = false;
    getChecklistRun(runId).then((run) => {
      if (cancelled) return;
      const nextChecked = new Set(run?.checkedItemIds ?? []);
      const nextNotesByItemId = run?.notesByItemId ?? {};
      const nextEquipmentStatusByItemId = run?.equipmentStatusByItemId ?? {};
      checkedRef.current = nextChecked;
      notesByItemIdRef.current = nextNotesByItemId;
      persistedNotesByItemIdRef.current = nextNotesByItemId;
      equipmentStatusByItemIdRef.current = nextEquipmentStatusByItemId;
      setChecked(nextChecked);
      setNotesByItemId(nextNotesByItemId);
      setEquipmentStatusByItemId(nextEquipmentStatusByItemId);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  function persist(nextChecked: Set<string>, nextNotesByItemId: Record<string, string>, nextEquipmentStatusByItemId: Record<string, EquipmentStatus>) {
    const snapshot = {
      id: runId,
      missionId,
      templateSlug: checklist.slug,
      checkedItemIds: [...nextChecked],
      notesByItemId: nextNotesByItemId,
      equipmentStatusByItemId: nextEquipmentStatusByItemId,
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    };
    const write = writeQueueRef.current.catch(() => undefined).then(async () => {
      await saveChecklistRun(snapshot);
      onRunSaved?.();
    });
    writeQueueRef.current = write;
    return write;
  }

  async function toggle(itemId: string) {
    const item = checklist.items.find((candidate) => candidate.id === itemId);
    if (item && isLocked(item)) return; // role-locked steps are not actionable
    const next = new Set(checkedRef.current);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    checkedRef.current = next;
    setChecked(next);
    await persist(next, persistedNotesByItemIdRef.current, equipmentStatusByItemIdRef.current);
  }

  function updateNote(itemId: string, note: string) {
    setNotePrivacyError(null);
    const nextNotesByItemId = { ...notesByItemIdRef.current, [itemId]: note };
    notesByItemIdRef.current = nextNotesByItemId;
    setNotesByItemId(nextNotesByItemId);
  }

  function restorePersistedNotes() {
    notesByItemIdRef.current = persistedNotesByItemIdRef.current;
    setNotesByItemId(persistedNotesByItemIdRef.current);
  }

  async function persistNoteOnBlur(itemId: string, note: string) {
    const normalized = note.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    const match = normalized ? detectSensitiveOperationalText(normalized) : null;
    if (match) {
      // The unsafe draft is deliberately discarded (not kept in state/DOM);
      // the error names the category so the user knows what to rewrite.
      setNotePrivacyError({ itemId, message: `Notatet ble ikke lagret: ${sensitiveTextFieldError(match.kind)} Teksten ble fjernet av personvernhensyn.` });
      restorePersistedNotes();
      return;
    }
    const safeNote = normalized ? note : '';
    setNotePrivacyError(null);
    const nextPersistedNotesByItemId = safeNote
      ? persistedNotesByItemIdRef.current[itemId] === safeNote
        ? persistedNotesByItemIdRef.current
        : { ...persistedNotesByItemIdRef.current, [itemId]: safeNote }
      : Object.fromEntries(Object.entries(persistedNotesByItemIdRef.current).filter(([nextItemId]) => nextItemId !== itemId));
    const nextDraftNotesByItemId = safeNote
      ? notesByItemIdRef.current[itemId] === safeNote
        ? notesByItemIdRef.current
        : { ...notesByItemIdRef.current, [itemId]: safeNote }
      : Object.fromEntries(Object.entries(notesByItemIdRef.current).filter(([nextItemId]) => nextItemId !== itemId));
    persistedNotesByItemIdRef.current = nextPersistedNotesByItemId;
    notesByItemIdRef.current = nextDraftNotesByItemId;
    setNotesByItemId(nextDraftNotesByItemId);
    await persist(checkedRef.current, nextPersistedNotesByItemId, equipmentStatusByItemIdRef.current);
  }

  async function updateEquipmentStatus(itemId: string, status: EquipmentStatus) {
    const nextEquipmentStatusByItemId = { ...equipmentStatusByItemIdRef.current, [itemId]: status };
    equipmentStatusByItemIdRef.current = nextEquipmentStatusByItemId;
    setEquipmentStatusByItemId(nextEquipmentStatusByItemId);
    await persist(checkedRef.current, persistedNotesByItemIdRef.current, nextEquipmentStatusByItemId);
  }

  return (
    <section className="rounded-2xl bg-[var(--surface)] p-4 shadow-sm ring-1 ring-[var(--border)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--accent-fg)]">Aktiv sjekkliste</p>
          <h2 className="text-xl font-black text-[var(--text-primary)]">{checklist.title}</h2>
        </div>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-black text-[var(--text-secondary)]">{actionableChecked}/{actionableItems.length} fullført</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]" aria-hidden="true">
        <div className="h-full rounded-full bg-[#34d399]" style={{ width: `${progress}%` }} />
      </div>
      {requiredActionable.length > 0 ? <p className="mt-2 text-sm font-semibold text-[var(--text-secondary)]">Påkrevd: {requiredDone}/{requiredActionable.length} kontrollert</p> : null}
      {!hydrated ? <p className="mt-2 text-sm font-semibold text-[var(--text-muted)]">Laster lokal sjekklistestatus før redigering.</p> : null}
      {checklist.warning ? <p className="mt-2 text-sm font-semibold text-[var(--warning-fg)]">{checklist.warning}</p> : null}
      <ul className="mt-3 space-y-3">
        {checklist.items.map((item) => {
          const locked = isLocked(item);
          return (
          <li key={item.id} className={`rounded-2xl border p-3 ${locked ? 'border-dashed border-[var(--border)] bg-[var(--surface)] opacity-80' : item.required ? 'border-[#fbbf24]/30 bg-[var(--warning-surface)]' : 'border-[var(--border)] bg-[var(--surface-muted)]'}`}>
            {locked ? (
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-sm text-[var(--text-muted)]">🔒</span>
                <span className="flex-1 text-sm font-semibold text-[var(--text-muted)]">{item.label}</span>
              </div>
            ) : (
            <label className="flex min-h-11 items-center gap-3 font-semibold text-[var(--text-primary)]">
              <input type="checkbox" checked={checked.has(item.id)} disabled={!hydrated} onChange={() => void toggle(item.id)} className="h-5 w-5" />
              <span>
                {item.label}
                {item.required ? <span className="ml-2 rounded-full bg-[var(--warning-surface)] px-2 py-0.5 text-xs font-black text-[var(--warning-fg)]">Påkrevd</span> : null}
              </span>
            </label>
            )}
            {locked ? (
              <p className="mt-1 pl-6 font-mono text-[0.6rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                {item.roleNote ?? (item.minRoleGroup === 'leder' ? 'Vises for leder' : 'Vises for lagfører og leder')}
              </p>
            ) : null}
            {!locked ? (
            <>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Kilder: {formatSourceList(item.sourceIds, sourceTitleById)}</p>
            {/* Note/status one tap away so the checkbox list stays scannable (P3-2);
                the privacy error lives outside the details so it can never hide. */}
            <details className="mt-2">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-xs font-bold text-[var(--accent-fg)]">Legg til notat / status</summary>
              {isEquipmentChecklist ? (
                <label className="mt-2 block text-xs font-bold text-[var(--text-secondary)]">
                  Materiellstatus for {item.label}
                  <select
                    value={equipmentStatusByItemId[item.id] ?? 'ready'}
                    disabled={!hydrated}
                    onChange={(event) => void updateEquipmentStatus(item.id, event.currentTarget.value as EquipmentStatus)}
                    className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--text-primary)]"
                  >
                    {equipmentStatuses.map((status) => <option key={status} value={status}>{equipmentStatusLabels[status]}</option>)}
                  </select>
                </label>
              ) : null}
              <label className="mt-2 block text-xs font-bold text-[var(--text-secondary)]">
                Lokal note for {item.label}
                <textarea
                  value={notesByItemId[item.id] ?? ''}
                  disabled={!hydrated}
                  onChange={(event) => updateNote(item.id, event.currentTarget.value)}
                  onBlur={(event) => void persistNoteOnBlur(item.id, event.currentTarget.value)}
                  className="mt-1 min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-sm font-medium text-[var(--text-primary)]"
                  placeholder="Kun lokale, ikke-sensitive notater. Ikke persondata."
                />
              </label>
            </details>
            {notePrivacyError?.itemId === item.id ? (
              <p role="alert" className="mt-2 rounded-xl border border-[#f87171]/30 bg-[var(--critical-surface)] p-2 text-sm font-semibold text-[var(--critical-fg)]">{notePrivacyError.message}</p>
            ) : null}
            </>
            ) : null}
          </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-[var(--text-muted)]">Sjekklistekilder: {formatSourceList(sourceIds, sourceTitleById)}</p>
    </section>
  );
}
