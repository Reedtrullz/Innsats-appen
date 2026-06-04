import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { LocalPrivacyProfilePanel } from '@/components/local-privacy-profile-panel';
import {
  LOCAL_PROFILE_STORAGE_KEY,
  LOCAL_RETENTION_STORAGE_KEY,
  appendLocalAuditEntry,
  createPinLock,
  readLocalAuditLog,
  saveLocalProfile,
} from '@/lib/privacy/local-profile';

afterEach(() => {
  localStorage.clear();
});

it('saves optional local profile and describes role selection as separate from auth', async () => {
  const user = userEvent.setup();
  render(<LocalPrivacyProfilePanel />);

  expect(await screen.findByText(/Rollevalg er separat fra konto, innlogging og autentisering/i)).toBeInTheDocument();
  expect(screen.getByText(/Ingen konto, ingen innlogging, ingen autentisering/i)).toBeInTheDocument();

  await user.click(screen.getByLabelText(/Slå på valgfri lokal profil/i));
  await user.type(screen.getByLabelText(/Visningsetikett/i), ' <Lokal> Operatør ');
  await user.type(screen.getByLabelText(/Kallesignal/i), ' ALFA-1 ');
  await user.selectOptions(screen.getByRole('combobox', { name: /Lokal rolle/i }), 'lagforer');
  await user.click(screen.getByRole('button', { name: /Lagre lokal profil/i }));

  await waitFor(() => expect(localStorage.getItem(LOCAL_PROFILE_STORAGE_KEY)).toContain('ALFA-1'));
  const stored = JSON.parse(localStorage.getItem(LOCAL_PROFILE_STORAGE_KEY) ?? '{}');
  expect(stored).toMatchObject({ profileEnabled: true, displayName: 'Lokal Operatør', callsign: 'ALFA-1', preferredRole: 'lagforer' });
  expect(JSON.stringify(stored)).not.toMatch(/auth|account|login/i);
});

it('sets and verifies local PIN without storing raw PIN', async () => {
  const user = userEvent.setup();
  render(<LocalPrivacyProfilePanel />);

  await user.type(screen.getByLabelText(/Ny lokal PIN/i), '1234');
  await user.click(screen.getByRole('button', { name: /Sett lokal PIN/i }));

  await waitFor(() => expect(screen.getByTestId('local-profile-message')).toHaveTextContent(/salt og hash/i));
  const stored = localStorage.getItem(LOCAL_PROFILE_STORAGE_KEY) ?? '';
  expect(stored).toContain('PBKDF2-SHA-256');
  expect(stored).not.toContain('1234');

  await user.type(screen.getByLabelText(/Verifiser PIN lokalt/i), '1234');
  await user.click(screen.getByRole('button', { name: /^Verifiser PIN$/i }));
  await waitFor(() => expect(screen.getByTestId('local-profile-message')).toHaveTextContent(/PIN verifisert lokalt/i));
});

it('requires PIN verification before revealing or editing a locked local profile', async () => {
  const lock = await createPinLock('1234', { iterations: 1_000, now: '2026-06-04T10:00:00.000Z' });
  saveLocalProfile({ profileEnabled: true, displayName: 'Skjult operatør', callsign: 'SECRET-1', preferredRole: 'lagforer', pinLock: lock }, undefined, '2026-06-04T10:01:00.000Z');

  const user = userEvent.setup();
  render(<LocalPrivacyProfilePanel />);

  expect(screen.getByTestId('local-profile-status')).toHaveTextContent(/låst med PIN/i);
  expect(screen.queryByDisplayValue('SECRET-1')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Lagre lokal profil/i })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Slett lokal profil/i })).toBeDisabled();

  await user.type(screen.getByLabelText(/Verifiser PIN lokalt/i), '1234');
  await user.click(screen.getByRole('button', { name: /^Verifiser PIN$/i }));

  await waitFor(() => expect(screen.getByTestId('local-profile-message')).toHaveTextContent(/PIN verifisert lokalt/i));
  expect(screen.getByDisplayValue('SECRET-1')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Lagre lokal profil/i })).toBeEnabled();
  expect(screen.getByRole('button', { name: /Slett lokal profil/i })).toBeEnabled();
});

it('reacts to stored PIN changes before allowing stale profile edits', async () => {
  const user = userEvent.setup();
  render(<LocalPrivacyProfilePanel />);

  await user.click(screen.getByLabelText(/Slå på valgfri lokal profil/i));
  await user.type(screen.getByLabelText(/Kallesignal/i), 'OPEN');
  await user.click(screen.getByRole('button', { name: /Lagre lokal profil/i }));
  await waitFor(() => expect(screen.getByTestId('local-profile-status')).toHaveTextContent(/OPEN/i));

  const lock = await createPinLock('1234', { iterations: 1_000, now: '2026-06-04T10:00:00.000Z' });
  await act(async () => {
    saveLocalProfile({ profileEnabled: true, displayName: 'Annen fane', callsign: 'LOCKED-TAB', preferredRole: 'lagforer', pinLock: lock }, undefined, '2026-06-04T10:01:00.000Z');
  });

  await waitFor(() => expect(screen.getByTestId('local-profile-status')).toHaveTextContent(/låst med PIN/i));
  expect(screen.queryByDisplayValue('LOCKED-TAB')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Lagre lokal profil/i })).toBeDisabled();
});

it('treats malformed stored PIN data as a failed local verification instead of crashing', async () => {
  localStorage.setItem(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify({
    schemaVersion: 1,
    profileEnabled: true,
    callsign: 'BROKEN-PIN',
    preferredRole: 'lagforer',
    updatedAt: '2026-06-04T10:00:00.000Z',
    pinLock: { algorithm: 'PBKDF2-SHA-256', saltBase64: 'not-base64!!', hashBase64: 'not-base64!!', iterations: 1000, keyLengthBits: 256, createdAt: '2026-06-04T10:00:00.000Z' },
  }));
  const user = userEvent.setup();
  render(<LocalPrivacyProfilePanel />);

  await user.type(screen.getByLabelText(/Verifiser PIN lokalt/i), '1234');
  await user.click(screen.getByRole('button', { name: /^Verifiser PIN$/i }));

  await waitFor(() => expect(screen.getByTestId('local-profile-message')).toHaveTextContent(/PIN stemmer ikke/i));
  expect(screen.getByRole('button', { name: /Slett lokal profil/i })).toBeDisabled();
});

it('shows privacy-gated features and stores only sanitized competence expiry reminders', async () => {
  const user = userEvent.setup();
  render(<LocalPrivacyProfilePanel />);

  expect(await screen.findByText(/Biometrisk opplåsing/i)).toBeInTheDocument();
  for (const text of ['Kompetanse-/sertifiseringsregister', 'Personlig utstyr utlevert/status', 'Lokal tilgjengelighetsstatus', 'Kalender for øvelser/kurs', 'Flere lokale profiler']) {
    expect(screen.getByText(text)).toBeInTheDocument();
  }
  expect(screen.getAllByText(/dataregistrering er deaktivert/i).length).toBeGreaterThanOrEqual(5);

  await user.type(screen.getByLabelText(/Sanitert etikett/i), 'Førstehjelp <sertifikat 123>');
  await user.type(screen.getByLabelText(/Utløpsdato/i), '2026-12-31');
  await user.click(screen.getByRole('button', { name: /Lagre lokal påminnelse/i }));

  expect(await screen.findByText(/Førstehjelp sertifikat 123/i)).toBeInTheDocument();
  expect(screen.getByText(/ikke sertifikat-ID, personnavn/i)).toBeInTheDocument();
});

it('deletes local profile while leaving a sanitized deletion audit event', async () => {
  const user = userEvent.setup();
  render(<LocalPrivacyProfilePanel />);

  await user.click(screen.getByLabelText(/Slå på valgfri lokal profil/i));
  await user.type(screen.getByLabelText(/Kallesignal/i), 'BRAVO');
  await user.click(screen.getByRole('button', { name: /Lagre lokal profil/i }));
  await waitFor(() => expect(localStorage.getItem(LOCAL_PROFILE_STORAGE_KEY)).toContain('BRAVO'));

  await user.click(screen.getByRole('button', { name: /Slett lokal profil/i }));

  await waitFor(() => expect(localStorage.getItem(LOCAL_PROFILE_STORAGE_KEY)).toBeNull());
  expect(screen.getByTestId('local-profile-message')).toHaveTextContent(/profil.*slettet/i);
  expect(readLocalAuditLog().some((entry) => entry.type === 'local-reset' && entry.details.resetScope === 'profile-delete')).toBe(true);
});

it('exports and resets sanitized local audit log', async () => {
  appendLocalAuditEntry('order-created', { missionId: 'mission-a', orderType: 'local-mission', title: 'hemmelig tittel' }, '2026-06-04T10:00:00.000Z');
  const user = userEvent.setup();
  render(<LocalPrivacyProfilePanel />);

  expect(await screen.findByText(/Ordre\/opprettelse/i)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Eksporter auditlogg/i }));

  const exportText = await screen.findByLabelText(/Sanitert audit eksport/i) as HTMLTextAreaElement;
  expect(exportText.value).toContain('order-created');
  expect(exportText.value).toContain('export-created');
  expect(exportText.value).not.toMatch(/hemmelig tittel|title/i);

  await user.click(screen.getByRole('button', { name: /Nullstill auditlogg/i }));
  await waitFor(() => expect(readLocalAuditLog()).toHaveLength(1));
  expect(readLocalAuditLog()[0]).toMatchObject({ type: 'local-reset', details: { resetScope: 'audit-log' } });
});

it('saves retention settings without silent deletion', async () => {
  const user = userEvent.setup();
  render(<LocalPrivacyProfilePanel />);

  expect(await screen.findByText(/skal ikke slette.*automatisk/i)).toBeInTheDocument();
  await user.clear(screen.getByLabelText(/Aktive oppdrag/i));
  await user.type(screen.getByLabelText(/Aktive oppdrag/i), '14');
  await user.clear(screen.getByLabelText(/Arkiv/i));
  await user.type(screen.getByLabelText(/Arkiv/i), '90');
  await user.clear(screen.getByLabelText(/Profil \(dager\)/i));
  await user.type(screen.getByLabelText(/Profil \(dager\)/i), '120');
  await user.clear(screen.getByLabelText(/Auditlogg/i));
  await user.type(screen.getByLabelText(/Auditlogg/i), '45');
  await user.click(screen.getByRole('button', { name: /Lagre retention/i }));

  await waitFor(() => expect(localStorage.getItem(LOCAL_RETENTION_STORAGE_KEY)).toContain('"missionRetentionDays":14'));
  expect(screen.getByTestId('local-profile-message')).toHaveTextContent(/sletter ikke automatisk/i);

  await user.click(screen.getByRole('button', { name: /Tilbakestill retention/i }));
  await waitFor(() => expect(localStorage.getItem(LOCAL_RETENTION_STORAGE_KEY)).toBeNull());
  expect(screen.getByLabelText(/Aktive oppdrag/i)).toHaveValue(30);
  expect(screen.getByLabelText(/Arkiv/i)).toHaveValue(180);
  expect(screen.getByLabelText(/Profil \(dager\)/i)).toHaveValue(365);
  expect(screen.getByLabelText(/Auditlogg/i)).toHaveValue(90);
  expect(screen.getByTestId('local-profile-message')).toHaveTextContent(/Ingen data ble slettet automatisk/i);
});
