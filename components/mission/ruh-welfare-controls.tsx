'use client';

import { useState } from 'react';
import { MAN_DOWN_POST_MVP_NOTE, MEDIA_ATTACHMENT_SAFETY_NOTES } from '@/lib/mission/media-safety';
import { RUH_CATEGORY_OPTIONS, RUH_LOCAL_ONLY_WARNING, RUH_PATIENT_DATA_WARNING, RUH_RISK_OPTIONS, WELFARE_LOAD_OPTIONS, WELFARE_NON_MEDICAL_WARNING, exportRuhJson, exportRuhMarkdown, exportWelfareJson, exportWelfareMarkdown, summarizeWelfareCheck } from '@/lib/mission/ruh-welfare';
import type { MissionContext, RuhCategory, RuhRisk, WelfareLoad } from '@/lib/mission/schemas';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';
import { assertNoSensitiveOperationalTextInValue } from '@/lib/privacy/sensitive-text';

type MissionUpdate = (mission: MissionContext) => MissionContext;

function operationalPrivacyErrorMessage(context: string) {
  return `${context}: Lokal tekst ble stoppet fordi den kan inneholde persondata, pasientdata, skjermet informasjon eller private lokasjoner. Bruk ordinære systemer for slike opplysninger.`;
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function toDatetimeLocalValue(value: Date) {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function datetimeLocalToIso(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function RuhWelfareControls({ mission, onMissionChange }: { mission: MissionContext; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void> }) {
  const [ruhCategory, setRuhCategory] = useState<RuhCategory>('hms');
  const [ruhRisk, setRuhRisk] = useState<RuhRisk>('lav');
  const [physicalLoad, setPhysicalLoad] = useState<WelfareLoad>('lav');
  const [mentalLoad, setMentalLoad] = useState<WelfareLoad>('lav');
  const [ruhMarkdown, setRuhMarkdown] = useState('');
  const [ruhJson, setRuhJson] = useState('');
  const [welfareMarkdown, setWelfareMarkdown] = useState('');
  const [welfareJson, setWelfareJson] = useState('');
  const [ruhPrivacyError, setRuhPrivacyError] = useState('');
  const [welfarePrivacyError, setWelfarePrivacyError] = useState('');
  const ruhReports = mission.ruhReports ?? [];
  const welfareChecks = mission.welfareChecks ?? [];

  async function addRuhReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const whatHappened = String(form.get('ruhWhatHappened') ?? '').trim();
    const immediateMeasure = String(form.get('ruhImmediateMeasure') ?? '').trim();
    if (!whatHappened || !immediateMeasure) return;
    const now = new Date().toISOString();
    const timestampInput = String(form.get('ruhTimestamp') ?? '').trim();
    const report = {
      id: crypto.randomUUID(),
      timestamp: timestampInput ? datetimeLocalToIso(timestampInput) : now,
      category: String(form.get('ruhCategory') ?? 'hms') as RuhCategory,
      whatHappened,
      immediateMeasure,
      risk: String(form.get('ruhRisk') ?? 'lav') as RuhRisk,
      followUpNeeded: form.get('ruhFollowUpNeeded') === 'on',
      linkedMissionId: mission.id,
    };
    try {
      assertNoSensitiveOperationalTextInValue({ whatHappened: report.whatHappened, immediateMeasure: report.immediateMeasure }, 'ruh');
    } catch {
      setRuhPrivacyError(operationalPrivacyErrorMessage('RUH'));
      return;
    }
    setRuhPrivacyError('');
    await onMissionChange(mission.id, (current) => ({
      ...current,
      updatedAt: now,
      ruhReports: [...(current.ruhReports ?? []), report],
    }));
    formElement.reset();
    const timestampField = formElement.elements.namedItem('ruhTimestamp') as HTMLInputElement | null;
    if (timestampField) timestampField.value = toDatetimeLocalValue(new Date());
    setRuhCategory('hms');
    setRuhRisk('lav');
  }

  async function addWelfareCheck(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const now = new Date().toISOString();
    const check = {
      id: crypto.randomUUID(),
      timestamp: now,
      physicalLoad: String(form.get('physicalLoad') ?? 'lav') as WelfareLoad,
      mentalLoad: String(form.get('mentalLoad') ?? 'lav') as WelfareLoad,
      needsRest: form.get('needsRest') === 'on',
      needsRelief: form.get('needsRelief') === 'on',
      reminders: {
        water: form.get('reminderWater') === 'on',
        food: form.get('reminderFood') === 'on',
        warmth: form.get('reminderWarmth') === 'on',
        rest: form.get('reminderRest') === 'on',
        dryClothing: form.get('reminderDryClothing') === 'on',
      },
      note: String(form.get('welfareNote') ?? '').trim() || undefined,
    };
    try {
      assertNoSensitiveOperationalTextInValue({ note: check.note }, 'welfare');
    } catch {
      setWelfarePrivacyError(operationalPrivacyErrorMessage('Velferd'));
      return;
    }
    setWelfarePrivacyError('');
    await onMissionChange(mission.id, (current) => ({
      ...current,
      updatedAt: now,
      welfareChecks: [...(current.welfareChecks ?? []), check],
    }));
    formElement.reset();
    setPhysicalLoad('lav');
    setMentalLoad('lav');
  }

  function generateRuhMarkdown() {
    setRuhMarkdown(exportRuhMarkdown({ mission, reports: ruhReports }));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'ruh-markdown', count: ruhReports.length });
  }

  function generateRuhJson() {
    setRuhJson(exportRuhJson({ mission, reports: ruhReports }));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'ruh-json', count: ruhReports.length });
  }

  function generateWelfareMarkdown() {
    setWelfareMarkdown(exportWelfareMarkdown({ mission, checks: welfareChecks }));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'welfare-markdown', count: welfareChecks.length });
  }

  function generateWelfareJson() {
    setWelfareJson(exportWelfareJson({ mission, checks: welfareChecks }));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'welfare-json', count: welfareChecks.length });
  }

  return (
    <section id="ruh-velferd" className="scroll-mt-24 space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Forenklet RUH og belastning</p>
        <h3 className="text-xl font-black">RUH og velferd</h3>
        <p className="mt-1 text-sm font-semibold text-amber-900">{RUH_LOCAL_ONLY_WARNING} {RUH_PATIENT_DATA_WARNING}</p>
        <p className="mt-1 text-sm font-semibold text-amber-900">{WELFARE_NON_MEDICAL_WARNING}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <form onSubmit={(event) => void addRuhReport(event)} className="grid gap-3 rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Forenklet RUH</h4>
          <label className="block text-sm font-bold">RUH tidspunkt<input name="ruhTimestamp" type="datetime-local" defaultValue={toDatetimeLocalValue(new Date())} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
          <label className="block text-sm font-bold">RUH kategori<select name="ruhCategory" value={ruhCategory} onChange={(event) => setRuhCategory(event.target.value as RuhCategory)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">{RUH_CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block text-sm font-bold">Hva skjedde<textarea name="ruhWhatHappened" required className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" placeholder="Kort avvik/nestenulykke uten navn, ID, pasientdata eller persondata" /></label>
          <label className="block text-sm font-bold">Umiddelbart tiltak<textarea name="ruhImmediateMeasure" required className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" placeholder="Hva ble gjort med en gang" /></label>
          {ruhPrivacyError ? <p role="alert" aria-label="ruh personvern" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-900">{ruhPrivacyError}</p> : null}
          <label className="block text-sm font-bold">RUH risiko<select name="ruhRisk" value={ruhRisk} onChange={(event) => setRuhRisk(event.target.value as RuhRisk)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">{RUH_RISK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold"><input name="ruhFollowUpNeeded" type="checkbox" className="h-5 w-5" />RUH trenger videre tiltak</label>
          <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Legg til RUH</button>
        </form>

        <form onSubmit={(event) => void addWelfareCheck(event)} className="grid gap-3 rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Belastning og velferd</h4>
          <label className="block text-sm font-bold">Fysisk belastning<select name="physicalLoad" value={physicalLoad} onChange={(event) => setPhysicalLoad(event.target.value as WelfareLoad)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">{WELFARE_LOAD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block text-sm font-bold">Mental belastning<select name="mentalLoad" value={mentalLoad} onChange={(event) => setMentalLoad(event.target.value as WelfareLoad)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">{WELFARE_LOAD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold"><input name="needsRest" type="checkbox" className="h-5 w-5" />Trenger hvile</label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold"><input name="needsRelief" type="checkbox" className="h-5 w-5" />Trenger avløsning</label>
          </div>
          <fieldset className="rounded-xl border border-slate-200 p-3">
            <legend className="px-1 text-sm font-black">Velferdspåminnelser</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm font-bold"><input name="reminderWater" type="checkbox" className="h-5 w-5" />Vann påminnelse</label>
              <label className="flex items-center gap-2 text-sm font-bold"><input name="reminderFood" type="checkbox" className="h-5 w-5" />Mat påminnelse</label>
              <label className="flex items-center gap-2 text-sm font-bold"><input name="reminderWarmth" type="checkbox" className="h-5 w-5" />Varme påminnelse</label>
              <label className="flex items-center gap-2 text-sm font-bold"><input name="reminderRest" type="checkbox" className="h-5 w-5" />Hvile påminnelse</label>
              <label className="flex items-center gap-2 text-sm font-bold"><input name="reminderDryClothing" type="checkbox" className="h-5 w-5" />Tørt tøy påminnelse</label>
            </div>
          </fieldset>
          <label className="block text-sm font-bold">Velferdsnotat<textarea name="welfareNote" className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" placeholder="Kort ikke-medisinsk notat" /></label>
          {welfarePrivacyError ? <p role="alert" aria-label="velferd personvern" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-900">{welfarePrivacyError}</p> : null}
          <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lagre velferdssjekk</button>
        </form>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Siste RUH</h4>
          {ruhReports.length > 0 ? <ol className="mt-2 space-y-2">{ruhReports.slice(-3).map((report) => <li key={report.id} className="rounded-xl bg-slate-50 p-3 text-sm font-semibold"><span className="font-black">{formatUpdatedAt(report.timestamp)}</span> — {report.whatHappened}</li>)}</ol> : <p className="mt-2 text-sm font-semibold text-slate-600">Ingen lokale RUH registrert.</p>}
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Siste velferdssjekker</h4>
          {welfareChecks.length > 0 ? <ol className="mt-2 space-y-2">{welfareChecks.slice(-3).map((check) => <li key={check.id} className="rounded-xl bg-slate-50 p-3 text-sm font-semibold"><span className="font-black">{formatUpdatedAt(check.timestamp)}</span> — {summarizeWelfareCheck(check)}{check.note ? <span className="block">{check.note}</span> : null}</li>)}</ol> : <p className="mt-2 text-sm font-semibold text-slate-600">Ingen velferdssjekker registrert.</p>}
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
        <h4 className="font-black">RUH/velferd eksport</h4>
        <p className="mt-1 text-sm font-semibold">Eksport er lokal forhåndsvisning. Kontroller innhold og fjern persondata før deling.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={generateRuhMarkdown} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag RUH Markdown</button>
          <button type="button" onClick={generateRuhJson} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag RUH JSON</button>
          <button type="button" onClick={generateWelfareMarkdown} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag velferd Markdown</button>
          <button type="button" onClick={generateWelfareJson} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag velferd JSON</button>
        </div>
      </div>
      {ruhMarkdown ? <label htmlFor="ruh-markdown" className="block text-sm font-bold">RUH Markdown<textarea id="ruh-markdown" readOnly value={ruhMarkdown} className="mt-1 min-h-52 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" /></label> : null}
      {ruhJson ? <label htmlFor="ruh-json" className="block text-sm font-bold">RUH JSON<textarea id="ruh-json" readOnly value={ruhJson} className="mt-1 min-h-52 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" /></label> : null}
      {welfareMarkdown ? <label htmlFor="welfare-markdown" className="block text-sm font-bold">Velferd Markdown<textarea id="welfare-markdown" readOnly value={welfareMarkdown} className="mt-1 min-h-52 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" /></label> : null}
      {welfareJson ? <label htmlFor="welfare-json" className="block text-sm font-bold">Velferd JSON<textarea id="welfare-json" readOnly value={welfareJson} className="mt-1 min-h-52 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" /></label> : null}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800">
        <h4 className="font-black text-slate-950">Media og man-down: ikke aktivert i MVP</h4>
        <p className="mt-1">Foto/video-vedlegg er utsatt i MVP. {MEDIA_ATTACHMENT_SAFETY_NOTES.photo.summary}</p>
        <p className="mt-1">Før eventuell media-støtte må EXIF/GPS-metadata fjernes, lagringsstørrelse varsles, og eksport kreve eksplisitt personvernadvarsel uten pasientdata eller persondata.</p>
        <p className="mt-1">Video-vedlegg har samme utsatte MVP-status og gir høyere risiko for persondata, pasientdata, lydopptak og stor lokal lagringsstørrelse.</p>
        <p className="mt-1">{MAN_DOWN_POST_MVP_NOTE}</p>
      </div>
    </section>
  );
}
