'use client';

import { useState, type FormEvent } from 'react';
import { FIELD_LOG_CATEGORY_OPTIONS } from '@/lib/mission/field-log';
import type { FieldLogCategory, FieldLogEntry, MissionContext } from '@/lib/mission/schemas';
import { findSensitiveOperationalTextInValue, isOverridableSensitiveTextKind, sensitiveTextFieldError, sensitiveTextFieldWarning } from '@/lib/privacy/sensitive-text';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';

export type MissionUpdate = (mission: MissionContext) => MissionContext;

export type QuickFieldLogComposerProps = {
  mission: MissionContext;
  onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>;
  defaultCategory?: FieldLogCategory;
  sourceLabel: string;
  className?: string;
  criticalObservationAriaLabel?: string;
  mustBeForwardedAriaLabel?: string;
};

export function QuickFieldLogComposer({
  mission,
  onMissionChange,
  defaultCategory = 'observasjon',
  sourceLabel,
  className = '',
  criticalObservationAriaLabel,
  mustBeForwardedAriaLabel,
}: QuickFieldLogComposerProps) {
  const [category, setCategory] = useState<FieldLogCategory>(defaultCategory);
  const [text, setText] = useState('');
  const [criticalObservation, setCriticalObservation] = useState(false);
  const [mustBeForwarded, setMustBeForwarded] = useState(false);
  const [error, setError] = useState('');
  const [overridableWarning, setOverridableWarning] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState('');
  const selectedCategoryHelp = FIELD_LOG_CATEGORY_OPTIONS.find((option) => option.value === category)?.helpText;

  async function addQuickFieldLogEntry(event: FormEvent<HTMLFormElement>, overrideConfirmed = false) {
    event.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText) {
      setError('Hurtiglogg tekst må fylles ut før lagring.');
      return;
    }

    const now = new Date().toISOString();
    const entry: FieldLogEntry = {
      id: crypto.randomUUID(),
      timestamp: now,
      category,
      text: trimmedText,
      linkedMissionId: mission.id,
      locationText: sourceLabel,
      criticalObservation,
      mustBeForwarded,
    };

    const sensitive = findSensitiveOperationalTextInValue({ text: entry.text, locationText: entry.locationText }, 'quickFieldLog');
    if (sensitive) {
      // Structured identifiers stay hard-blocked; fuzzy heuristics warn and
      // allow an explicit, audited "save anyway" so a false positive never
      // strands a field user mid-incident. Local save only — exports keep
      // their own guards.
      if (!isOverridableSensitiveTextKind(sensitive.kind)) {
        setOverridableWarning(null);
        setError(`Hurtiglogg: ${sensitiveTextFieldError(sensitive.kind)}`);
        return;
      }
      if (!overrideConfirmed) {
        setError('');
        setOverridableWarning(`Hurtiglogg: ${sensitiveTextFieldWarning(sensitive.kind)}`);
        return;
      }
      appendLocalAuditEntry('privacy-override', { context: 'quickFieldLog', kind: sensitive.kind });
    }

    setOverridableWarning(null);
    await onMissionChange(mission.id, (current) => ({
      ...current,
      updatedAt: now,
      fieldLogEntries: [...(current.fieldLogEntries ?? []), entry],
    }));

    setText('');
    setCriticalObservation(false);
    setMustBeForwarded(false);
    setCategory(defaultCategory);
    setError('');
    setSavedMessage('Hurtiglogg lagret lokalt.');
  }

  return (
    <form onSubmit={(event) => void addQuickFieldLogEntry(event)} className={`space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${className}`.trim()}>
      {/* keep the override prompt scoped to the exact text it was shown for */}
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Hurtiglogg · {sourceLabel}</p>
        <p className="mt-1 text-sm font-semibold text-slate-700">Legg til en kort, strukturert lokal feltlogg uten persondata eller pasientdata.</p>
      </div>

      <label className="block text-sm font-bold">
        Hurtiglogg kategori
        <select
          name="quickFieldLogCategory"
          value={category}
          onChange={(event) => setCategory(event.target.value as FieldLogCategory)}
          className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3"
        >
          {FIELD_LOG_CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      <label className="block text-sm font-bold">
        Hurtiglogg tekst
        <textarea
          name="quickFieldLogText"
          required
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setOverridableWarning(null);
            setSavedMessage('');
          }}
          className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 p-3"
          placeholder="Kort observasjon. Ikke persondata, pasientdata eller skjermet operativ informasjon."
        />
      </label>

      {selectedCategoryHelp ? <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">{selectedCategoryHelp}</p> : null}
      {error ? <p role="alert" aria-label="hurtiglogg personvern" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-900">{error}</p> : null}
      {savedMessage ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-950">{savedMessage}</p> : null}
      {overridableWarning ? (
        <div role="alert" aria-label="hurtiglogg personvernadvarsel" className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-bold text-amber-950">{overridableWarning}</p>
          <button
            type="button"
            onClick={(event) => void addQuickFieldLogEntry(event as unknown as FormEvent<HTMLFormElement>, true)}
            className="min-h-11 w-full rounded-xl border border-amber-400 bg-white px-4 text-sm font-black text-amber-950 sm:w-auto"
          >
            Lagre likevel – teksten inneholder ikke persondata
          </button>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold">
          <input aria-label={criticalObservationAriaLabel} checked={criticalObservation} onChange={(event) => setCriticalObservation(event.target.checked)} name="criticalObservation" type="checkbox" className="h-5 w-5" />
          Kritisk observasjon
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold">
          <input aria-label={mustBeForwardedAriaLabel} checked={mustBeForwarded} onChange={(event) => setMustBeForwarded(event.target.checked)} name="mustBeForwarded" type="checkbox" className="h-5 w-5" />
          Må videresendes
        </label>
      </div>

      <button type="submit" className="min-h-11 w-full rounded-xl bg-slate-950 px-4 font-bold text-white sm:w-auto">Lagre hurtiglogg</button>
    </form>
  );
}
