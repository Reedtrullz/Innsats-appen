'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_FIELD_MODE_SETTINGS,
  FIELD_MODE_STORAGE_EVENT,
  FIELD_SCROLLING_RECOMMENDATIONS,
  FIELD_TESTING_PROCESS,
  FIELD_MODE_THEMES,
  GLOVE_TOUCH_TARGET_PX,
  MIN_TOUCH_TARGET_PX,
  QUICK_ACTIONS,
  VOICE_INPUT_EVALUATION,
  appendFieldFeedbackEntry,
  createFieldFeedbackEntry,
  hasWebSpeechRecognitionSupport,
  readFieldFeedbackEntries,
  readFieldModeSettings,
  writeFieldModeSettings,
  type FieldFeedbackEntry,
  type FieldModeSettings,
  type FieldModeTheme,
} from '@/lib/field-mode/field-mode';
import { readSelectedActiveMissionId, selectActiveMission } from '@/lib/mission/active-mission-selection';
import { listMissions } from '@/lib/mission/local-store';
import type { MissionContext } from '@/lib/mission/schemas';

type SpeechRecognitionResultLike = {
  readonly transcript: string;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop?: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function detachAndStopRecognition(recognition: SpeechRecognitionLike | null) {
  if (!recognition) return;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  try {
    recognition.stop?.();
  } catch {
    // Browser speech implementations may throw if already stopped.
  }
}

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function randomId(prefix: string) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function targetClass(gloveMode: boolean) {
  return gloveMode ? 'min-h-16 px-5 text-lg' : 'min-h-12 px-4 text-base';
}

function themePreviewClass(theme: FieldModeTheme) {
  if (theme === 'night') return 'border-slate-700 bg-slate-950 text-slate-100';
  if (theme === 'reduced-blue') return 'border-amber-400 bg-amber-50 text-stone-950';
  return 'border-sky-200 bg-white text-slate-950';
}

function subscribeOnlineStatus(setOnline: (online: boolean) => void) {
  if (typeof window === 'undefined') return () => undefined;
  const update = () => setOnline(navigator.onLine);
  update();
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  return () => {
    window.removeEventListener('online', update);
    window.removeEventListener('offline', update);
  };
}

function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  useEffect(() => subscribeOnlineStatus(setOnline), []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Offline status">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-sky-700">Alltid synlig offline-indikator</p>
          <h2 className="text-2xl font-black">{online ? 'Online nå' : 'Offline / frakoblet nå'}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-700">App-skallet viser også status persistent. Offline betyr at lokalt cachet innhold kan brukes, men fersk ekstern kontekst kan være stale.</p>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-black ${online ? 'bg-emerald-100 text-emerald-950' : 'bg-amber-100 text-amber-950'}`}>{online ? 'ONLINE' : 'OFFLINE'}</span>
      </div>
    </section>
  );
}

function QuickActions({ gloveMode }: { gloveMode: boolean }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200" aria-labelledby="field-quick-actions">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-sky-700">Hurtighandlinger</p>
          <h2 id="field-quick-actions" className="text-2xl font-black">Én trykkflate til operativt arbeid</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">min {MIN_TOUCH_TARGET_PX}x{MIN_TOUCH_TARGET_PX} px</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.id} href={action.href} aria-label={action.label} className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black text-slate-950 shadow-sm ${targetClass(gloveMode)}`}>
            <span className="block">{action.label}</span>
            <span className="mt-1 block text-sm font-semibold text-slate-600">{action.helpText}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ActiveMissionPanel() {
  const [mission, setMission] = useState<MissionContext | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    listMissions()
      .then((missions) => {
        if (active) setMission(selectActiveMission(missions, readSelectedActiveMissionId()));
      })
      .catch(() => {
        if (active) setMission(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200" aria-labelledby="active-mission-shortcut">
      <p className="text-sm font-black uppercase tracking-wide text-sky-700">Aktivt oppdrag</p>
      <h2 id="active-mission-shortcut" className="text-2xl font-black">Snarvei på hovedflater</h2>
      {mission === undefined ? (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-4">
          <h3 className="font-black">Ser etter aktivt lokalt oppdrag…</h3>
          <p className="mt-1 text-sm font-semibold text-slate-700">Oppdrag lastes fra lokal IndexedDB i denne nettleseren.</p>
        </div>
      ) : mission ? (
        <div className="mt-3 rounded-2xl bg-sky-50 p-4 text-sky-950">
          <p className="text-lg font-black">{mission.title}</p>
          <p className="mt-1 text-sm font-semibold">{mission.locationText || 'Ingen lokasjon registrert'} · sist endret lokalt {new Date(mission.updatedAt).toLocaleString('nb-NO')}</p>
          <Link href="/oppdrag" className="mt-3 inline-flex min-h-12 items-center rounded-xl bg-sky-900 px-5 font-bold text-white">Gå til aktivt oppdrag</Link>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-4">
          <h3 className="font-black">Ingen aktiv lokal oppdragstavle</h3>
          <p className="mt-1 text-sm font-semibold text-slate-700">Start rolig: opprett ett lokalt oppdrag, så vises snarveien her og i app-skallet. Ikke legg inn persondata.</p>
          <Link href="/oppdrag/ny" className="mt-3 inline-flex min-h-12 items-center rounded-xl bg-slate-950 px-5 font-bold text-white">Opprett lokalt oppdrag</Link>
        </div>
      )}
    </section>
  );
}

function VoiceInputEvaluation() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [dictationConsent, setDictationConsent] = useState(false);
  const [dictationText, setDictationText] = useState('');
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setSupported(hasWebSpeechRecognitionSupport()), 0);
    return () => window.clearTimeout(handle);
  }, []);

  useEffect(() => () => {
    detachAndStopRecognition(recognitionRef.current);
    recognitionRef.current = null;
  }, []);

  function startDictation() {
    if (typeof window === 'undefined') return;
    const speechWindow = window as SpeechRecognitionWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setMessage('Web Speech API er ikke tilgjengelig i denne nettleseren. Bruk tekstfeltet som fallback.');
      return;
    }
    if (!dictationConsent) {
      setMessage('Les og bekreft nøyaktighets-/personvernadvarselen før valgfri diktering.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'nb-NO';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) setDictationText((current) => `${current}${current ? ' ' : ''}${transcript}`);
    };
    recognition.onerror = () => {
      setMessage('Diktering feilet eller ble stoppet. Skriv notatet manuelt som fallback.');
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
      setMessage('Lytter lokalt via nettleserens Web Speech API. Kontroller teksten før bruk.');
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setMessage('Nettleseren startet ikke diktering. Bruk tekstfeltet som fallback.');
    }
  }

  function stopDictation() {
    detachAndStopRecognition(recognitionRef.current);
    recognitionRef.current = null;
    setListening(false);
    setMessage('Diktering stoppet. Kontroller eventuell tekst før bruk.');
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200" aria-labelledby="voice-evaluation">
      <p className="text-sm font-black uppercase tracking-wide text-sky-700">Valgfri diktering</p>
      <h2 id="voice-evaluation" className="text-2xl font-black">Web Speech API vurdering</h2>
      <div className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
        <p>{VOICE_INPUT_EVALUATION.browserSupportSummary}</p>
        <p className="rounded-xl bg-amber-50 p-3 text-amber-950">{VOICE_INPUT_EVALUATION.accuracyWarning}</p>
        <p className="rounded-xl bg-red-50 p-3 text-red-950">{VOICE_INPUT_EVALUATION.privacyWarning}</p>
        <p>{VOICE_INPUT_EVALUATION.fallback}</p>
        <p data-testid="speech-support-status" className="font-black">Støtte i denne nettleseren: {supported === null ? 'sjekker' : supported ? 'mulig' : 'ikke tilgjengelig'}</p>
      </div>
      <label className="mt-3 flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold">
        <input type="checkbox" checked={dictationConsent} onChange={(event) => setDictationConsent(event.target.checked)} className="h-5 w-5" />
        Jeg forstår at diktering er valgfritt, kan være unøyaktig, og ikke skal brukes til persondata eller sensitiv informasjon.
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={startDictation} disabled={!supported || listening} className="min-h-12 rounded-xl bg-slate-950 px-5 font-bold text-white disabled:opacity-50">{listening ? 'Lytter…' : 'Prøv valgfri diktering'}</button>
        <button type="button" onClick={stopDictation} disabled={!listening} className="min-h-12 rounded-xl border border-slate-300 px-5 font-bold text-slate-900 disabled:opacity-50">Stopp diktering</button>
        <span className="inline-flex min-h-12 items-center rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700">Fallback: skriv manuelt</span>
      </div>
      {message ? <p className="mt-2 text-sm font-semibold text-slate-700" role="status">{message}</p> : null}
      <label className="mt-3 block text-sm font-bold">
        Lokal notatkladd / fallback
        <textarea value={dictationText} onChange={(event) => setDictationText(event.target.value)} className="mt-1 min-h-28 w-full rounded-xl border border-slate-300 p-3" placeholder="Skriv eller dikter kort, anonymisert notat. Ikke persondata." />
      </label>
    </section>
  );
}

function FieldFeedbackCapture() {
  const [entries, setEntries] = useState<FieldFeedbackEntry[]>([]);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => setEntries(readFieldFeedbackEntries()), 0);
    return () => window.clearTimeout(handle);
  }, []);

  function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const noPersonData = form.get('noPersonData') === 'on';
    if (!noPersonData) {
      setSavedMessage('Bekreft at tilbakemeldingen er anonymisert og uten persondata før lokal lagring.');
      return;
    }
    const entry = createFieldFeedbackEntry({
      conditions: form.get('conditions'),
      observations: form.get('observations'),
      blockers: form.get('blockers'),
      suggestedChange: form.get('suggestedChange'),
    }, new Date(), randomId('field-feedback'));
    setEntries(appendFieldFeedbackEntry(entry));
    setSavedMessage('Tilbakemelding lagret lokalt i denne nettleseren. Ingen backend eller innsending.');
    formElement.reset();
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200" aria-labelledby="field-feedback">
      <p className="text-sm font-black uppercase tracking-wide text-sky-700">Feltprøving</p>
      <h2 id="field-feedback" className="text-2xl font-black">Lokal feedback-prosess med mannskaper</h2>
      <p className="mt-2 text-sm font-semibold text-amber-900">{FIELD_TESTING_PROCESS.localOnlyScope} Ikke samle navn, ID, pasientdata, private lokasjoner eller skjermet operativ informasjon.</p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm font-semibold text-slate-700">
        {FIELD_TESTING_PROCESS.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <form onSubmit={submitFeedback} className="mt-4 grid gap-3">
        <label className="block text-sm font-bold">Testforhold<select name="conditions" className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3"><option>Regn/våte hender</option><option>Hansker</option><option>Natt / lite lys</option><option>Utendørs dagslys</option><option>Offline</option></select></label>
        <label className="block text-sm font-bold">Hva fungerte / hva ble observert<textarea name="observations" required className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 p-3" placeholder="Anonym UX-observasjon uten persondata" /></label>
        <label className="block text-sm font-bold">Blokkere eller feiltrykk<textarea name="blockers" className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" placeholder="Kort, anonymisert" /></label>
        <label className="block text-sm font-bold">Forslag til endring<textarea name="suggestedChange" className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" placeholder="Hva bør gjøres enklere?" /></label>
        <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold"><input name="noPersonData" type="checkbox" className="h-5 w-5" />Tilbakemeldingen er anonymisert og uten persondata/sensitive opplysninger</label>
        <button type="submit" className="min-h-12 rounded-xl bg-slate-950 px-5 font-bold text-white">Lagre lokal feedback</button>
      </form>
      {savedMessage ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-950" role="status">{savedMessage}</p> : null}
      <div className="mt-4 rounded-xl border border-slate-200 p-3">
        <h3 className="font-black">Lokale feedback-notater ({entries.length})</h3>
        {entries.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {entries.slice().reverse().map((entry) => (
              <li key={entry.id} className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                <p className="font-black text-slate-950">{entry.conditions}</p>
                <p>{entry.observations}</p>
                {entry.blockers ? <p>Blokkere: {entry.blockers}</p> : null}
                {entry.suggestedChange ? <p>Forslag: {entry.suggestedChange}</p> : null}
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">Ingen lokale feltfeedback-notater ennå. Kjør en kort test, noter anonymt, og triager senere.</p>}
      </div>
    </section>
  );
}

export function FieldModePanel() {
  const [settings, setSettings] = useState<FieldModeSettings>(DEFAULT_FIELD_MODE_SETTINGS);

  useEffect(() => {
    const loadStoredSettings = () => setSettings(readFieldModeSettings());
    const handle = window.setTimeout(loadStoredSettings, 0);
    const onFieldModeChange = () => loadStoredSettings();
    window.addEventListener('storage', onFieldModeChange);
    window.addEventListener(FIELD_MODE_STORAGE_EVENT, onFieldModeChange);
    return () => {
      window.clearTimeout(handle);
      window.removeEventListener('storage', onFieldModeChange);
      window.removeEventListener(FIELD_MODE_STORAGE_EVENT, onFieldModeChange);
    };
  }, []);

  function updateSettings(update: Partial<FieldModeSettings>) {
    const next = writeFieldModeSettings({ ...settings, ...update });
    setSettings(next);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(FIELD_MODE_STORAGE_EVENT));
  }

  const previewClass = useMemo(() => themePreviewClass(settings.theme), [settings.theme]);
  const buttonClass = targetClass(settings.gloveMode);

  return (
    <div className="space-y-5">
      <section className={`rounded-3xl border p-5 shadow-sm ${previewClass}`} aria-labelledby="field-mode-heading">
        <p className="text-sm font-black uppercase tracking-wide">Feltmodus</p>
        <h1 id="field-mode-heading" className="text-3xl font-black">Feltmodus for hansker, natt, ute og offline</h1>
        <p className="mt-2 text-sm font-semibold opacity-90">Dedikert lokal/offline UX-flate. Ingen backend, synk, persondata, pasientdata eller offisiell kommando-systemfunksjon.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className={`flex items-center gap-3 rounded-2xl border border-current/20 p-3 font-bold ${buttonClass}`}>
            <input type="checkbox" checked={settings.enabled} onChange={(event) => updateSettings({ enabled: event.target.checked })} className="h-6 w-6" />
            Slå på feltmodus
          </label>
          <label className={`flex items-center gap-3 rounded-2xl border border-current/20 p-3 font-bold ${buttonClass}`}>
            <input type="checkbox" checked={settings.gloveMode} onChange={(event) => updateSettings({ gloveMode: event.target.checked })} className="h-6 w-6" />
            Hanskemodus / ekstra store knapper
          </label>
        </div>
        <fieldset className="mt-4 rounded-2xl border border-current/20 p-3">
          <legend className="px-1 text-sm font-black">Lysmodus</legend>
          <div className="mt-2 grid gap-2">
            {FIELD_MODE_THEMES.map((theme) => (
              <label key={theme.value} className={`flex items-start gap-3 rounded-xl border border-current/20 p-3 ${buttonClass}`}>
                <input type="radio" name="fieldTheme" value={theme.value} checked={settings.theme === theme.value} onChange={() => updateSettings({ theme: theme.value })} className="mt-1 h-5 w-5" />
                <span><span className="block font-black">{theme.label}</span><span className="block text-sm font-semibold opacity-80">{theme.description}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <OfflineIndicator />
      <ActiveMissionPanel />
      <QuickActions gloveMode={settings.gloveMode} />

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200" aria-labelledby="outdoor-review">
        <p className="text-sm font-black uppercase tracking-wide text-sky-700">Utendørs lesbarhet og scroll</p>
        <h2 id="outdoor-review" className="text-2xl font-black">Review for regn, sol og hansker</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-slate-100 p-3">
            <h3 className="font-black">Touch target</h3>
            <p className="mt-1 text-sm font-semibold text-slate-700">Nye feltmodus-handlinger bruker minst {MIN_TOUCH_TARGET_PX}x{MIN_TOUCH_TARGET_PX} px. Hanskemodus øker viktige knapper til ca. {GLOVE_TOUCH_TARGET_PX}px høyde.</p>
          </div>
          <div className="rounded-xl bg-slate-100 p-3">
            <h3 className="font-black">Scrolling i regn</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm font-semibold text-slate-700">
              {FIELD_SCROLLING_RECOMMENDATIONS.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
        <label className="mt-3 flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold">
          <input type="checkbox" checked={settings.outdoorReadabilityReviewed} onChange={(event) => updateSettings({ outdoorReadabilityReviewed: event.target.checked })} className="h-5 w-5" />
          Utendørs lesbarhet er vurdert for denne enheten/øvelsen
        </label>
      </section>

      <VoiceInputEvaluation />
      <FieldFeedbackCapture />
    </div>
  );
}
