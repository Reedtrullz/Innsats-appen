'use client';

import { useMemo, useState } from 'react';
import { FIELD_LOG_CATEGORY_LABELS, sortFieldLogEntries } from '@/lib/mission/field-log';
import type { FieldLogEntry, MissionContext } from '@/lib/mission/schemas';

type LogFilter = 'all' | 'map' | 'critical' | 'forward';

const FILTER_LABELS: Record<LogFilter, string> = {
  all: 'Alle logger',
  map: 'Kartlogg',
  critical: 'Kritisk',
  forward: 'Må videresendes',
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function isActiveMissionEntry(entry: FieldLogEntry, missionId: string) {
  return !entry.linkedMissionId || entry.linkedMissionId === missionId;
}

function matchesFilter(entry: FieldLogEntry, filter: LogFilter) {
  if (filter === 'map') return Boolean(entry.mapReference);
  if (filter === 'critical') return Boolean(entry.criticalObservation || entry.mustBeForwarded);
  if (filter === 'forward') return Boolean(entry.mustBeForwarded);
  return true;
}

function filterCount(entries: FieldLogEntry[], filter: LogFilter) {
  return entries.filter((entry) => matchesFilter(entry, filter)).length;
}

export function MissionLogOverview({ mission }: { mission: MissionContext }) {
  const [activeFilter, setActiveFilter] = useState<LogFilter>('all');
  const activeMissionEntries = useMemo(
    () => sortFieldLogEntries((mission.fieldLogEntries ?? []).filter((entry) => isActiveMissionEntry(entry, mission.id))),
    [mission.fieldLogEntries, mission.id],
  );
  const visibleEntries = useMemo(
    () => activeMissionEntries.filter((entry) => matchesFilter(entry, activeFilter)),
    [activeFilter, activeMissionEntries],
  );
  const filters: LogFilter[] = ['all', 'map', 'critical', 'forward'];

  return (
    <section id="loggoversikt" aria-labelledby="mission-log-overview-heading" className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Aktivt oppdrag</p>
          <h3 id="mission-log-overview-heading" className="text-xl font-black">Loggoversikt</h3>
          <p className="mt-1 text-sm font-semibold text-amber-900">Viser bare lokale feltlogginnslag for aktivt oppdrag. Innslag eksplisitt knyttet til andre oppdrag er skjult.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{activeMissionEntries.length} lokale logger</span>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Filtrer loggoversikt">
        {filters.map((filter) => {
          const pressed = activeFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              aria-pressed={pressed}
              onClick={() => setActiveFilter(filter)}
              className={pressed
                ? 'min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white'
                : 'min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800'}
            >
              {FILTER_LABELS[filter]} <span className="font-semibold">({filterCount(activeMissionEntries, filter)})</span>
            </button>
          );
        })}
      </div>

      {visibleEntries.length > 0 ? (
        <ol className="space-y-2" aria-label="Synlige lokale feltlogginnslag">
          {visibleEntries.map((entry) => (
            <li key={entry.id} className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-slate-950">{formatTimestamp(entry.timestamp)}</span>
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-black text-sky-900">{FIELD_LOG_CATEGORY_LABELS[entry.category]}</span>
                {entry.mapReference ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-950">Kart: <span>{entry.mapReference.label}</span></span> : null}
                {entry.criticalObservation ? <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-black text-red-900">Kritisk observasjon</span> : null}
                {entry.mustBeForwarded ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-950">Må videresendes</span> : null}
              </div>
              {entry.locationText ? <p className="mt-1 font-semibold text-slate-700">Sted: {entry.locationText}</p> : null}
              <p className="mt-1 font-semibold text-slate-900">{entry.text}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">
          Ingen lokale logginnslag matcher filteret {FILTER_LABELS[activeFilter]}. Velg Alle logger eller legg inn en ny lokal feltlogg for aktivt oppdrag.
        </p>
      )}
    </section>
  );
}
