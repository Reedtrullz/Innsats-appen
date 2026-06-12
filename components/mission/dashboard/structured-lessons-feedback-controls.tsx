'use client';

import { useState } from 'react';
import type { MissionContext } from '@/lib/mission/schemas';
import { findSensitiveOperationalTextInValue, sensitiveTextFieldError } from '@/lib/privacy/sensitive-text';
import { ContextNotice } from '../context-notice';
import type { MissionUpdate } from './dashboard-types';

const STRUCTURED_FEEDBACK_FIELD_LABELS: Record<string, string> = {
  'lessonsLearned.summary': 'Erfaringsoppsummering',
  'lessonsLearned.whatWorked': 'Hva fungerte',
  'lessonsLearned.improvements': 'Forbedringer',
  'lessonsLearned.followUp': 'Oppfølging',
  'feedback.leadership': 'Tilbakemelding ledelse',
  'feedback.equipment': 'Tilbakemelding utstyr',
  'feedback.procedures': 'Tilbakemelding prosedyrer',
  'feedback.training': 'Tilbakemelding trening',
  'feedback.safety': 'Tilbakemelding sikkerhet',
  'feedback.communications': 'Tilbakemelding kommunikasjon',
};

export function StructuredLessonsFeedbackControls({ mission, onMissionChange, onArchive }: { mission: MissionContext; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>; onArchive: (missionId: string) => Promise<void> }) {
  const [lessons, setLessons] = useState(() => ({
    summary: mission.lessonsLearned?.summary ?? '',
    whatWorked: mission.lessonsLearned?.whatWorked ?? '',
    improvements: mission.lessonsLearned?.improvements ?? '',
    followUp: mission.lessonsLearned?.followUp ?? '',
  }));
  const [feedback, setFeedback] = useState(() => ({
    leadership: mission.feedback?.leadership ?? '',
    equipment: mission.feedback?.equipment ?? '',
    procedures: mission.feedback?.procedures ?? '',
    training: mission.feedback?.training ?? '',
    safety: mission.feedback?.safety ?? '',
    communications: mission.feedback?.communications ?? '',
  }));
  const [message, setMessage] = useState('');
  const [privacyError, setPrivacyError] = useState('');
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  async function saveStructuredFeedback() {
    const now = new Date().toISOString();
    const nextLessons = {
      summary: lessons.summary.trim(),
      whatWorked: lessons.whatWorked.trim(),
      improvements: lessons.improvements.trim(),
      followUp: lessons.followUp.trim(),
    };
    const nextFeedback = {
      leadership: feedback.leadership.trim(),
      equipment: feedback.equipment.trim(),
      procedures: feedback.procedures.trim(),
      training: feedback.training.trim(),
      safety: feedback.safety.trim(),
      communications: feedback.communications.trim(),
    };
    const sensitive = findSensitiveOperationalTextInValue({ lessonsLearned: nextLessons, feedback: nextFeedback }, '');
    if (sensitive) {
      const fieldLabel = STRUCTURED_FEEDBACK_FIELD_LABELS[sensitive.context] ?? 'Erfaringer';
      setPrivacyError(`${fieldLabel}: ${sensitiveTextFieldError(sensitive.kind)}`);
      setMessage('');
      return false;
    }
    setPrivacyError('');
    await onMissionChange(mission.id, (current) => ({
      ...current,
      updatedAt: now,
      lessonsLearned: nextLessons,
      feedback: nextFeedback,
    }));
    setMessage('Erfaringer og tilbakemelding er lagret lokalt.');
    return true;
  }

  async function saveStructuredFeedbackAndArchive() {
    setConfirmingArchive(false);
    if (await saveStructuredFeedback()) await onArchive(mission.id);
  }

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Lokal læring</p>
        <h3 className="text-xl font-black">Erfaringer og strukturert tilbakemelding</h3>
        <ContextNotice variant="privacy" className="mt-1">Kun lokal erfaringslogg. Ikke offisielt arkiv eller innsending. Ikke legg inn navn, ID, pasient-/helseopplysninger, sensitive private lokasjoner eller skjermet operativ informasjon.</ContextNotice>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-bold">Erfaringsoppsummering<textarea value={lessons.summary} onChange={(event) => setLessons((current) => ({ ...current, summary: event.target.value }))} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 p-3" placeholder="Kort, sanitert lokal oppsummering" /></label>
        <label className="block text-sm font-bold">Hva fungerte<textarea value={lessons.whatWorked} onChange={(event) => setLessons((current) => ({ ...current, whatWorked: event.target.value }))} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="block text-sm font-bold">Forbedringer<textarea value={lessons.improvements} onChange={(event) => setLessons((current) => ({ ...current, improvements: event.target.value }))} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="block text-sm font-bold">Oppfølging<textarea value={lessons.followUp} onChange={(event) => setLessons((current) => ({ ...current, followUp: event.target.value }))} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 p-3" /></label>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm font-bold">Tilbakemelding ledelse<textarea value={feedback.leadership} onChange={(event) => setFeedback((current) => ({ ...current, leadership: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="block text-sm font-bold">Tilbakemelding utstyr<textarea value={feedback.equipment} onChange={(event) => setFeedback((current) => ({ ...current, equipment: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="block text-sm font-bold">Tilbakemelding prosedyrer<textarea value={feedback.procedures} onChange={(event) => setFeedback((current) => ({ ...current, procedures: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="block text-sm font-bold">Tilbakemelding trening<textarea value={feedback.training} onChange={(event) => setFeedback((current) => ({ ...current, training: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="block text-sm font-bold">Tilbakemelding sikkerhet<textarea value={feedback.safety} onChange={(event) => setFeedback((current) => ({ ...current, safety: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="block text-sm font-bold">Tilbakemelding kommunikasjon<textarea value={feedback.communications} onChange={(event) => setFeedback((current) => ({ ...current, communications: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" /></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void saveStructuredFeedback()} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lagre erfaringer og tilbakemelding</button>
        <button type="button" onClick={() => setConfirmingArchive(true)} className="min-h-11 rounded-xl border border-emerald-700 bg-emerald-50 px-4 font-bold text-emerald-950">Fullfør og arkiver lokalt</button>
      </div>
      {confirmingArchive ? (
        <div role="alertdialog" aria-label="Bekreft arkivering" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
          <p className="text-sm font-bold">Arkivere «{mission.title}»? Oppdraget lagres og flyttes ut av aktiv liste. Du finner det igjen via arkivsøket i oppdragslisten.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => void saveStructuredFeedbackAndArchive()} className="min-h-11 rounded-xl bg-emerald-800 px-4 font-bold text-white">Bekreft arkivering</button>
            <button type="button" onClick={() => setConfirmingArchive(false)} className="min-h-11 rounded-xl bg-white px-4 font-bold text-emerald-950 ring-1 ring-emerald-200">Avbryt</button>
          </div>
        </div>
      ) : null}
      {privacyError ? <p role="alert" aria-label="erfaringer personvern" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-900">{privacyError}</p> : null}
      {message ? <p className="text-sm font-semibold text-emerald-800">{message}</p> : null}
    </section>
  );
}
