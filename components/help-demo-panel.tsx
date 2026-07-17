'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { saveSelectedActiveMissionId } from '@/lib/mission/active-mission-selection';
import { deleteMission, getMission, saveChecklistRun, saveMission } from '@/lib/mission/local-store';
import type { MissionContext } from '@/lib/mission/schemas';
import {
  createMissionMapDrawing,
  createMissionMapMarker,
  readMissionMapState,
  writeMissionMapState,
} from '@/lib/maps/operations-map';
import { OperationalIcon } from './ui/operational-icons';

const DEMO_MISSION_ID = 'demo-innsats-flom-ovelse-v1';
const DEMO_CHECKLIST_ID = `${DEMO_MISSION_ID}:fig-under-innsats`;

const demoSteps = [
  {
    title: 'Åpne oppdragstavlen',
    body: 'Følg oppdragsflyten fra neste handling til sjekkliste, hurtiglogg, verktøy og avslutning.',
    href: '/oppdrag',
    cta: 'Åpne demooppdrag',
  },
  {
    title: 'Finn tiltak med søk',
    body: 'Søk etter flom og se at treff kommer før filtre.',
    href: '/sok?q=flom',
    cta: 'Søk etter flom',
  },
  {
    title: 'Bruk kart og feltlogg',
    body: 'Se demo-markører, legg til ny markør og opprett feltlogg fra kart.',
    href: '/kart',
    cta: 'Åpne kart',
  },
  {
    title: 'Test hurtigkort',
    body: 'Åpne et kildebelagt kort og øv på å lese tiltak raskt.',
    href: '/kort/sambandsplan-start',
    cta: 'Åpne samband',
  },
  {
    title: 'Bygg eksport',
    body: 'Gå til ordre, samband, oppdragsmappe og etterrapport på samme demooppdrag.',
    href: '/oppdrag#5-punktsordre',
    cta: 'Øv eksport',
  },
  {
    title: 'Sjekk offline og enhet',
    body: 'Bruk release-sjekken og data på enheten før ekte feltbruk.',
    href: '/release',
    cta: 'Åpne sjekk',
  },
] as const;

function isoAt(offsetMinutes: number) {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

function buildDemoMission(contentVersion: string): MissionContext {
  const createdAt = isoAt(-45);
  const updatedAt = isoAt(0);
  return {
    id: DEMO_MISSION_ID,
    title: 'DEMO: Flom ved idrettshall',
    createdAt,
    updatedAt,
    phase: 'under',
    role: 'lagforer',
    scenario: 'flom',
    locationText: 'Øvingsområde nord',
    municipality: 'Demo kommune',
    externalSignals: [],
    externalSignalHistory: [],
    activeChecklistIds: ['fig-under-innsats'],
    notes: 'Trygg demo med øvingsdata. Bruk denne til å teste flyter uten persondata.',
    tasks: [
      {
        id: 'demo-task-moteplass',
        title: 'Etabler møteplass',
        status: 'in-progress',
        createdAt,
        updatedAt,
        notes: 'Marker møteplass på skjematisk kart.',
      },
      {
        id: 'demo-task-pumpepunkt',
        title: 'Sjekk pumpepunkt',
        status: 'not-started',
        createdAt,
        updatedAt,
        notes: 'Bruk kart og feltlogg for øving.',
      },
      {
        id: 'demo-task-samband',
        title: 'Oppdater samband',
        status: 'needs-assistance',
        createdAt,
        updatedAt,
        notes: 'Øv på sambandsplan og 5-punktsordre.',
      },
    ],
    statusLog: [
      { id: 'demo-status-posisjon', message: 'på posisjon', createdAt: isoAt(-25), note: 'Demo-lag er ved oppmøtested.' },
      { id: 'demo-status-assistanse', message: 'trenger assistanse', createdAt: isoAt(-10), note: 'Behov for ekstra lys ved pumpepunkt.' },
    ],
    resourceRequests: [
      {
        id: 'demo-resource-lys',
        kind: 'equipment',
        status: 'in-progress',
        createdAt: isoAt(-15),
        quantity: '2 lyssett',
        note: 'Til pumpepunkt og møteplass.',
      },
    ],
    fieldLogEntries: [
      {
        id: 'demo-log-vannstand',
        timestamp: isoAt(-18),
        category: 'observasjon',
        text: 'Vannstand øker ved lavpunkt. Følg med på pumpepunkt.',
        linkedMissionId: DEMO_MISSION_ID,
        mapReference: {
          source: 'map-marker',
          objectId: 'demo-marker-fare',
          label: 'Lavpunkt nord',
          point: { x: 34, y: 42 },
        },
        criticalObservation: true,
        mustBeForwarded: false,
      },
      {
        id: 'demo-log-samband',
        timestamp: isoAt(-8),
        category: 'samband',
        text: 'Samband testet mot demo-lag. Noter egen lokal rutine i øving.',
        linkedMissionId: DEMO_MISSION_ID,
        criticalObservation: false,
        mustBeForwarded: true,
      },
    ],
    ruhReports: [
      {
        id: 'demo-ruh-glatt',
        timestamp: isoAt(-12),
        category: 'hms',
        whatHappened: 'Glatt dekke ved øvingspunkt.',
        immediateMeasure: 'Marker fare og bruk alternativ ganglinje.',
        risk: 'middels',
        followUpNeeded: true,
        linkedMissionId: DEMO_MISSION_ID,
      },
    ],
    welfareChecks: [
      {
        id: 'demo-welfare-1',
        timestamp: isoAt(-6),
        physicalLoad: 'moderat',
        mentalLoad: 'lav',
        needsRest: false,
        needsRelief: false,
        reminders: { water: true, food: false, warmth: true, rest: false, dryClothing: true },
        note: 'Demo: sjekk pauser før neste øvingssteg.',
      },
    ],
    lessonsLearned: {
      summary: 'Demo for å lære flytene.',
      whatWorked: 'Oppdrag, kart og logg henger sammen.',
      improvements: 'Øv på eksport før ekte innsats.',
      followUp: 'Slett demoen når øving er ferdig.',
    },
    feedback: {
      leadership: 'Test 5-punktsordre.',
      equipment: 'Test ressursbehov.',
      procedures: 'Test sjekkliste.',
      training: 'Gjenta flyten offline.',
      safety: 'Ikke legg inn persondata.',
      communications: 'Test sambandsplan.',
    },
    contentVersion,
    schemaVersion: 1,
  };
}

function seedDemoMapObjects() {
  const current = readMissionMapState();
  const withoutDemo = {
    markers: current.markers.filter((marker) => marker.missionId !== DEMO_MISSION_ID),
    drawings: current.drawings.filter((drawing) => drawing.missionId !== DEMO_MISSION_ID),
  };
  const markerTime = new Date();
  const markers = [
    createMissionMapMarker({ kind: 'hazard', missionId: DEMO_MISSION_ID, label: 'Lavpunkt nord', x: 34, y: 42, note: 'Demo farepunkt uten ekte posisjon.' }, markerTime),
    createMissionMapMarker({ kind: 'meeting-point', missionId: DEMO_MISSION_ID, label: 'Møteplass demo', x: 58, y: 64, note: 'Samlepunkt for øving.' }, markerTime),
    createMissionMapMarker({ kind: 'pump-location', missionId: DEMO_MISSION_ID, label: 'Pumpepunkt demo', x: 48, y: 50, note: 'Øvingspunkt for ressursbehov.' }, markerTime),
  ];
  const drawings = [
    createMissionMapDrawing({ kind: 'sector', missionId: DEMO_MISSION_ID, label: 'Sektor demo', coordinates: '25,35 62,35 68,70 30,75', note: 'Skjematisk øvingssektor.' }, markerTime),
  ];
  writeMissionMapState({
    markers: [...withoutDemo.markers, ...markers],
    drawings: [...withoutDemo.drawings, ...drawings],
  });
}

export function HelpDemoPanel({ contentVersion }: { contentVersion: string }) {
  const [demoReady, setDemoReady] = useState(false);
  const [status, setStatus] = useState('Demo ikke startet.');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    getMission(DEMO_MISSION_ID)
      .then((mission) => {
        if (!mounted) return;
        setDemoReady(Boolean(mission));
        if (mission) setStatus('Demohendelse finnes allerede på denne enheten.');
      })
      .catch(() => {
        if (mounted) setStatus('Kunne ikke lese lokal demo-status.');
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function startDemo() {
    setBusy(true);
    setStatus('Klargjør demo lokalt...');
    try {
      const mission = await saveMission(buildDemoMission(contentVersion));
      await saveChecklistRun({
        id: DEMO_CHECKLIST_ID,
        missionId: mission.id,
        templateSlug: 'fig-under-innsats',
        checkedItemIds: ['ankomst-og-egen-sikkerhet', 'kontakt-innsatsleder'],
        notesByItemId: {
          'ressurs-og-utstyr-revurdert': 'Demo: vurder utstyr før neste øvingssteg.',
        },
        equipmentStatusByItemId: {
          'ressurs-og-utstyr-revurdert': 'ready',
        },
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });
      seedDemoMapObjects();
      saveSelectedActiveMissionId(mission.id);
      setDemoReady(true);
      setStatus('Demohendelse er klar og valgt som aktivt oppdrag.');
    } catch {
      setStatus('Kunne ikke opprette demo lokalt. Sjekk at nettleseren tillater lokal lagring.');
    } finally {
      setBusy(false);
    }
  }

  async function removeDemo() {
    setBusy(true);
    setStatus('Fjerner demo...');
    try {
      await deleteMission(DEMO_MISSION_ID);
      setDemoReady(false);
      setStatus('Demohendelse er fjernet fra lokal lagring.');
    } catch {
      setStatus('Kunne ikke fjerne demo akkurat nå.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="demo" className="space-y-4 rounded-3xl border border-sky-200 bg-sky-50 p-5 text-sky-950" aria-labelledby="demo-heading">
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-sky-800">Full øvingsdemo</p>
        <h2 id="demo-heading" className="mt-1 text-2xl font-black">Demohendelse: flom ved idrettshall</h2>
        <p className="mt-2 text-sm font-semibold leading-6">
          Start en trygg lokal demo med oppdrag, sjekkliste, logg, kartmarkører, sektor, RUH, velferdssjekk og eksportgrunnlag. Alt er øvingsdata på denne enheten.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p role="status" className="text-sm font-black text-slate-900">{status}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void startDemo()}
              disabled={busy}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#082F49] px-4 text-sm font-black text-white disabled:cursor-wait disabled:bg-slate-500"
            >
              <OperationalIcon name="spark" className="h-4 w-4" />
              {demoReady ? 'Start demo på nytt' : 'Start demo'}
            </button>
            {demoReady ? (
              <button
                type="button"
                onClick={() => void removeDemo()}
                disabled={busy}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-950 disabled:cursor-wait"
              >
                Fjern demo
              </button>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-600">
          Demoen erstatter bare demooppdraget med samme ID. Den sletter ikke andre oppdrag.
        </p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-2" aria-label="Demo steg">
        {demoSteps.map((step, index) => (
          <li key={step.href} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Steg {index + 1}</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">{step.title}</h3>
            <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">{step.body}</p>
            <Link href={step.href} className="mt-3 inline-flex min-h-11 w-full items-center justify-between rounded-xl bg-slate-950 px-4 text-sm font-black text-white">
              {step.cta}
              <OperationalIcon name="chevron" className="h-4 w-4" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
