'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { roleLabels, roles } from '@/lib/content/taxonomy';
import {
  BIOMETRIC_UNLOCK_EVALUATION,
  LOCAL_PROFILE_STORAGE_KEY,
  PRIVACY_GATED_LOCAL_PROFILE_FEATURES,
  addCompetenceReminder,
  appendLocalAuditEntry,
  createPinLock,
  deleteCompetenceReminder,
  deleteLocalProfile,
  exportLocalAuditLog,
  readCompetenceReminders,
  readLocalAuditLog,
  readLocalProfile,
  readRetentionSettings,
  resetLocalAuditLog,
  resetRetentionSettings,
  saveLocalProfile,
  saveRetentionSettings,
  subscribeLocalProfile,
  verifyPin,
  type CompetenceExpiryReminder,
  type LocalAuditEntry,
  type LocalProfile,
  type LocalProfileRole,
  type RetentionSettings,
} from '@/lib/privacy/local-profile';

function emptyProfile(): LocalProfile {
  return {
    schemaVersion: 1,
    profileEnabled: false,
    displayName: '',
    callsign: '',
    preferredRole: 'ikke-valgt',
    updatedAt: new Date().toISOString(),
  };
}

function formatDate(value: string) {
  if (!value) return 'Ikke satt';
  return new Intl.DateTimeFormat('nb-NO', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

function auditTypeLabel(type: LocalAuditEntry['type']) {
  if (type === 'order-created') return 'Ordre/opprettelse';
  if (type === 'status-changed') return 'Statusendring';
  if (type === 'export-created') return 'Eksport';
  return 'Lokal reset/sletting';
}

export function LocalPrivacyProfilePanel() {
  const [profile, setProfile] = useState<LocalProfile>(() => readLocalProfile() ?? emptyProfile());
  const [verifiedPinHash, setVerifiedPinHash] = useState<string | null>(null);
  const [retention, setRetention] = useState<RetentionSettings>(() => readRetentionSettings());
  const [reminders, setReminders] = useState<CompetenceExpiryReminder[]>(() => readCompetenceReminders());
  const [auditEntries, setAuditEntries] = useState<LocalAuditEntry[]>(() => readLocalAuditLog());
  const [message, setMessage] = useState('Profil er valgfri og lagres bare lokalt i denne nettleseren.');
  const [pin, setPin] = useState('');
  const [verifyPinValue, setVerifyPinValue] = useState('');
  const [auditExport, setAuditExport] = useState('');
  const pinInputRef = useRef<HTMLInputElement>(null);
  const verifyPinInputRef = useRef<HTMLInputElement>(null);

  const profileLocked = Boolean(profile.pinLock && verifiedPinHash !== profile.pinLock.hashBase64);

  const profileStatus = useMemo(() => {
    if (profileLocked) return 'Lokal profil er låst med PIN-friksjon.';
    if (!profile.profileEnabled) return 'Lokal profil er av.';
    return `Lokal profil er på${profile.callsign ? ` for ${profile.callsign}` : ''}.`;
  }, [profile, profileLocked]);

  const refreshLocalState = useCallback(() => {
    const nextProfile = readLocalProfile() ?? emptyProfile();
    setProfile(nextProfile);
    setVerifiedPinHash((currentHash) => (nextProfile.pinLock && currentHash === nextProfile.pinLock.hashBase64 ? currentHash : null));
    setRetention(readRetentionSettings());
    setReminders(readCompetenceReminders());
    setAuditEntries(readLocalAuditLog());
  }, []);

  useEffect(() => subscribeLocalProfile(refreshLocalState), [refreshLocalState]);

  function blockIfStoredProfileLocked(messageText: string): boolean {
    const currentProfile = readLocalProfile() ?? emptyProfile();
    const lockedNow = Boolean(currentProfile.pinLock && verifiedPinHash !== currentProfile.pinLock.hashBase64);
    if (!lockedNow) return false;
    setProfile(currentProfile);
    setVerifiedPinHash(null);
    setMessage(messageText);
    return true;
  }

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileLocked || blockIfStoredProfileLocked('Lås opp lokal profil med PIN før du endrer profilfelt.')) {
      setMessage('Lås opp lokal profil med PIN før du endrer profilfelt.');
      return;
    }
    const form = new FormData(event.currentTarget);
    const next = saveLocalProfile({
      ...profile,
      profileEnabled: form.get('profileEnabled') === 'on',
      displayName: String(form.get('displayName') ?? ''),
      callsign: String(form.get('callsign') ?? ''),
      preferredRole: String(form.get('preferredRole') ?? 'ikke-valgt') as LocalProfileRole,
    });
    setProfile(next);
    setVerifiedPinHash(next.pinLock ? next.pinLock.hashBase64 : null);
    setMessage('Lokal profil lagret. Dette oppretter ikke konto, innlogging eller backend-synk.');
  }

  async function setupPin() {
    try {
      if (profileLocked || blockIfStoredProfileLocked('Eksisterende lokal PIN-lås må verifiseres før den kan erstattes.')) {
        setMessage('Eksisterende lokal PIN-lås må verifiseres før den kan erstattes.');
        return;
      }
      const pinValue = pinInputRef.current?.value ?? pin;
      const lock = await createPinLock(pinValue);
      const next = saveLocalProfile({ ...profile, pinLock: lock, profileEnabled: true });
      setProfile(next);
      setVerifiedPinHash(lock.hashBase64);
      setPin('');
      if (pinInputRef.current) pinInputRef.current.value = '';
      setMessage('PIN-lås lagret som salt og hash. Dette er bare lokal personvernfriksjon, ikke sterk autentisering.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunne ikke lage lokal PIN-lås.');
    }
  }

  async function verifyLocalPin() {
    const currentProfile = readLocalProfile() ?? profile;
    if (!currentProfile.pinLock) {
      setMessage('Ingen lokal PIN-lås er satt.');
      return;
    }
    const value = verifyPinInputRef.current?.value ?? verifyPinValue;
    let ok = false;
    try {
      ok = await verifyPin(value, currentProfile.pinLock);
    } catch {
      ok = false;
    }
    setProfile(currentProfile);
    setVerifiedPinHash(ok ? currentProfile.pinLock.hashBase64 : null);
    setVerifyPinValue('');
    if (verifyPinInputRef.current) verifyPinInputRef.current.value = '';
    setMessage(ok ? 'PIN verifisert lokalt i denne nettleseren.' : 'PIN stemmer ikke.');
  }

  function removePin() {
    if (profileLocked || blockIfStoredProfileLocked('Lås opp lokal profil med PIN før du fjerner PIN-låsen.')) {
      setMessage('Lås opp lokal profil med PIN før du fjerner PIN-låsen.');
      return;
    }
    const { pinLock: _pinLock, ...withoutPin } = profile;
    const next = saveLocalProfile(withoutPin);
    setProfile(next);
    setVerifiedPinHash(null);
    setMessage('Lokal PIN-lås er fjernet.');
  }

  function saveReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileLocked || blockIfStoredProfileLocked('Lås opp lokal profil med PIN før du endrer lokale kompetansepåminnelser.')) {
      setMessage('Lås opp lokal profil med PIN før du endrer lokale kompetansepåminnelser.');
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const next = addCompetenceReminder({ label: String(form.get('reminderLabel') ?? ''), expiresOn: String(form.get('expiresOn') ?? '') });
    setReminders(next);
    formElement.reset();
    setMessage('Sanitert lokal kompetansepåminnelse lagret. Ikke legg inn sertifikat-ID, navn eller arbeidsgiverdata.');
  }

  function removeReminder(id: string) {
    if (profileLocked || blockIfStoredProfileLocked('Lås opp lokal profil med PIN før du sletter lokale kompetansepåminnelser.')) {
      setMessage('Lås opp lokal profil med PIN før du sletter lokale kompetansepåminnelser.');
      return;
    }
    setReminders(deleteCompetenceReminder(id));
    setMessage('Lokal kompetansepåminnelse slettet.');
  }

  function deleteProfile() {
    if (profileLocked || blockIfStoredProfileLocked('Lås opp lokal profil med PIN før du sletter profil og PIN-data.')) {
      setMessage('Lås opp lokal profil med PIN før du sletter profil og PIN-data.');
      return;
    }
    appendLocalAuditEntry('local-reset', { resetScope: 'profile-delete' });
    deleteLocalProfile();
    refreshLocalState();
    setMessage('Lokal profil, PIN-lås, fremtidig kryptert profilpayload og lokale kompetansepåminnelser er slettet fra denne nettleseren.');
  }

  function saveRetention(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = saveRetentionSettings({
      missionRetentionDays: Number(form.get('missionRetentionDays')),
      archiveRetentionDays: Number(form.get('archiveRetentionDays')),
      profileRetentionDays: Number(form.get('profileRetentionDays')),
      auditRetentionDays: Number(form.get('auditRetentionDays')),
    });
    setRetention(next);
    setMessage('Retention-innstillinger lagret lokalt. Appen sletter ikke automatisk uten eksplisitt brukerhandling.');
  }

  function resetRetention() {
    const next = resetRetentionSettings();
    setRetention(next);
    setMessage('Retention-innstillinger er tilbakestilt til trygge standardverdier. Ingen data ble slettet automatisk.');
  }

  function createAuditExport() {
    const currentEntries = readLocalAuditLog();
    appendLocalAuditEntry('export-created', { exportKind: 'audit-log', count: currentEntries.length + 1 });
    const exported = exportLocalAuditLog();
    setAuditExport(exported);
    setAuditEntries(readLocalAuditLog());
    setMessage('Sanitert auditlogg eksportert lokalt. Kontroller innhold før deling.');
  }

  function resetAudit() {
    resetLocalAuditLog();
    appendLocalAuditEntry('local-reset', { resetScope: 'audit-log' });
    setAuditExport('');
    setAuditEntries(readLocalAuditLog());
    setMessage('Auditlogg er nullstilt lokalt, med én ny reset-hendelse.');
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Personvern</p>
        <h1 className="text-3xl font-black">Lokal profil og personvern</h1>
        <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">
          Valgfri lokal profil for denne nettleseren. Ingen konto, ingen innlogging, ingen autentisering, ingen backend sync og ingen offisiell kommandosystem-kobling. Ikke legg inn persondata, pasientdata, private/skjermede lokasjoner eller skjermet operativ informasjon.
        </p>
        <p data-testid="local-profile-status" className="mt-2 text-sm font-bold text-slate-700">{profileStatus}</p>
        <p data-testid="local-profile-message" className="mt-1 text-sm font-semibold text-sky-900">{message}</p>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div>
          <h2 className="text-xl font-black">Valgfri lokal profil</h2>
          <p className="mt-1 text-sm font-semibold text-slate-700">Lagrer bare sanitert visningsetikett, kallesignal og foretrukket lokal rolle i localStorage-nøkkelen {LOCAL_PROFILE_STORAGE_KEY}. Rollevalg er separat fra konto, innlogging og autentisering.</p>
        </div>
        <form key={`profile-${profileLocked ? 'locked' : profile.updatedAt}`} onSubmit={saveProfile} className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold sm:col-span-2">
            <input name="profileEnabled" type="checkbox" defaultChecked={!profileLocked && profile.profileEnabled} disabled={profileLocked} className="h-5 w-5" />
            Slå på valgfri lokal profil
          </label>
          <label className="block text-sm font-bold">
            Visningsetikett (valgfri)
            <input name="displayName" defaultValue={profileLocked ? '' : profile.displayName} disabled={profileLocked} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="F.eks. lokal operatør" />
          </label>
          <label className="block text-sm font-bold">
            Kallesignal (valgfritt)
            <input name="callsign" defaultValue={profileLocked ? '' : profile.callsign} disabled={profileLocked} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="Sanitert etikett, ikke navn/ID" />
          </label>
          <label className="block text-sm font-bold sm:col-span-2">
            Lokal rolle (ikke konto/auth)
            <select name="preferredRole" defaultValue={profileLocked ? 'ikke-valgt' : profile.preferredRole} disabled={profileLocked} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">
              <option value="ikke-valgt">Ikke valgt</option>
              {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
            </select>
          </label>
          <button type="submit" disabled={profileLocked} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white disabled:opacity-50 sm:col-span-2">Lagre lokal profil</button>
        </form>
        {profileLocked ? <p className="rounded-xl bg-amber-50 p-3 text-sm font-black text-amber-950">Lokal profil er skjult og skrivebeskyttet til PIN er verifisert i denne nettleseren.</p> : null}
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div>
          <h2 className="text-xl font-black">Lokal PIN-lås</h2>
          <p className="mt-1 text-sm font-semibold text-amber-900">PIN er bare lokal personvernfriksjon i nettleseren, ikke sterk autentisering og ikke konto/login. Rå PIN lagres aldri; bare salt, PBKDF2/SHA-256-hash og iterasjonstall lagres lokalt.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold">
            Ny lokal PIN
            <input ref={pinInputRef} type="password" value={pin} onChange={(event) => setPin(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" autoComplete="new-password" />
          </label>
          <label className="block text-sm font-bold">
            Verifiser PIN lokalt
            <input ref={verifyPinInputRef} type="password" value={verifyPinValue} onChange={(event) => setVerifyPinValue(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" autoComplete="current-password" />
          </label>
          <button type="button" onClick={() => void setupPin()} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Sett lokal PIN</button>
          <button type="button" onClick={() => void verifyLocalPin()} className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold text-slate-900">Verifiser PIN</button>
          {profile.pinLock ? <button type="button" onClick={removePin} className="min-h-11 rounded-xl border border-red-300 bg-red-50 px-4 font-bold text-red-900 sm:col-span-2">Fjern lokal PIN-lås</button> : null}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-black">Biometri og sensitive profilfunksjoner</h2>
        <article className="rounded-xl border border-slate-200 p-3">
          <h3 className="font-black">{BIOMETRIC_UNLOCK_EVALUATION.title}: utsatt</h3>
          <p className="mt-1 text-sm font-semibold text-slate-700">{BIOMETRIC_UNLOCK_EVALUATION.summary}</p>
          <p className="mt-1 text-sm font-semibold text-amber-900">{BIOMETRIC_UNLOCK_EVALUATION.guardrail}</p>
        </article>
        <div className="grid gap-3 md:grid-cols-2">
          {PRIVACY_GATED_LOCAL_PROFILE_FEATURES.map((feature) => (
            <article key={feature.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
              <p className="text-xs font-black uppercase tracking-wide">Krever personverngjennomgang</p>
              <h3 className="font-black">{feature.title}</h3>
              <p className="mt-1 text-sm font-semibold">{feature.reason}</p>
              <p className="mt-1 text-xs font-black">Status: {feature.status}; dataregistrering er deaktivert.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div>
          <h2 className="text-xl font-black">Sanitert kompetanseutløp-påminnelse</h2>
          <p className="mt-1 text-sm font-semibold text-amber-900">Dette er ikke et kompetanse-/sertifiseringsregister. Lagre bare generisk etikett og dato, ikke sertifikat-ID, personnavn, fødselsdato, arbeidsgiver eller private notater. Følg retention-innstillingene og slett eksplisitt når påminnelsen ikke trengs.</p>
        </div>
        <form onSubmit={saveReminder} className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-bold sm:col-span-2">
            Sanitert etikett
            <input name="reminderLabel" required disabled={profileLocked} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="F.eks. Førstehjelpskurs" />
          </label>
          <label className="block text-sm font-bold">
            Utløpsdato
            <input name="expiresOn" type="date" required disabled={profileLocked} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" />
          </label>
          <button type="submit" disabled={profileLocked} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white disabled:opacity-50 sm:col-span-3">Lagre lokal påminnelse</button>
        </form>
        {profileLocked ? <p className="rounded-xl bg-amber-50 p-3 text-sm font-black text-amber-950">Lokale kompetansepåminnelser er skjult til PIN er verifisert.</p> : reminders.length > 0 ? (
          <ul className="space-y-2">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                <span><strong>{reminder.label}</strong> — utløper {formatDate(reminder.expiresOn)}</span>
                <button type="button" onClick={() => removeReminder(reminder.id)} className="min-h-10 rounded-xl border border-red-300 bg-red-50 px-3 font-bold text-red-900">Slett</button>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">Ingen lokale påminnelser.</p>}
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-black">Retention-innstillinger</h2>
        <p className="text-sm font-semibold text-amber-900">Lokale retention-verdier er kun innstillinger. Appen skal ikke slette misjons-, arkiv-, profil- eller auditdata automatisk uten eksplisitt brukerhandling og tydelig UI-test.</p>
        <form key={`retention-${retention.updatedAt}`} onSubmit={saveRetention} className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold">Aktive oppdrag (dager)<input name="missionRetentionDays" type="number" min="1" max="3650" defaultValue={retention.missionRetentionDays} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
          <label className="block text-sm font-bold">Arkiv (dager)<input name="archiveRetentionDays" type="number" min="1" max="3650" defaultValue={retention.archiveRetentionDays} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
          <label className="block text-sm font-bold">Profil (dager)<input name="profileRetentionDays" type="number" min="1" max="3650" defaultValue={retention.profileRetentionDays} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
          <label className="block text-sm font-bold">Auditlogg (dager)<input name="auditRetentionDays" type="number" min="1" max="3650" defaultValue={retention.auditRetentionDays} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
          <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lagre retention</button>
          <button type="button" onClick={resetRetention} className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold text-slate-900">Tilbakestill retention</button>
        </form>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div>
          <h2 className="text-xl font-black">Lokal auditlogg</h2>
          <p className="mt-1 text-sm font-semibold text-slate-700">Sanitert lokal logg for ordreopprettelse, statusendring, eksport og reset/sletting. Ikke offisiell logg og ikke innsending.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={createAuditExport} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Eksporter auditlogg</button>
          <button type="button" onClick={resetAudit} className="min-h-11 rounded-xl border border-red-300 bg-red-50 px-4 font-bold text-red-900">Nullstill auditlogg</button>
        </div>
        {auditEntries.length > 0 ? (
          <ol className="space-y-2">
            {auditEntries.slice().reverse().map((entry) => (
              <li key={entry.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                <strong>{auditTypeLabel(entry.type)}</strong> <span className="text-slate-600">{new Date(entry.createdAt).toLocaleString('nb-NO')}</span>
                <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-100 p-2 text-xs">{JSON.stringify(entry.details, null, 2)}</pre>
              </li>
            ))}
          </ol>
        ) : <p className="rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">Ingen audit-hendelser ennå.</p>}
        {auditExport ? (
          <label className="block text-sm font-bold">
            Sanitert audit eksport
            <textarea readOnly value={auditExport} className="mt-1 min-h-64 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
          </label>
        ) : null}
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-950">
        <h2 className="text-xl font-black">Slett lokal profil</h2>
        <p className="mt-1 text-sm font-semibold">Sletter profil, PIN-hash/salt, fremtidig kryptert profilpayload og lokale kompetansepåminnelser fra denne nettleseren. Misjonsdata og auditlogg håndteres separat.</p>
        <button type="button" onClick={deleteProfile} disabled={profileLocked} className="mt-3 min-h-11 rounded-xl bg-red-900 px-4 font-bold text-white disabled:opacity-50">Slett lokal profil</button>
      </section>
    </div>
  );
}
