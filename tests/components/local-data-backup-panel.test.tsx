import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { LocalDataBackupPanel } from '@/components/local-data-backup-panel';
import { buildLocalDataExport, serializeLocalDataExport } from '@/lib/local-data/local-data';

afterEach(() => {
  localStorage.clear();
});

it('shows quota fallback and generates an explicit local-only JSON backup', async () => {
  const user = userEvent.setup();
  const buildExport = vi.fn(async () => buildLocalDataExport({ now: '2026-06-04T12:00:00.000Z' }));
  render(<LocalDataBackupPanel buildExport={buildExport} estimateQuota={async () => { throw new Error('quota unavailable'); }} />);

  await waitFor(() => expect(screen.getByTestId('local-data-quota')).toHaveTextContent(/Lagringskvote er ukjent/i));
  expect(screen.getByText(/lokal oppdrags-\/sjekklistetilstand og allowlistede appinnstillinger/i)).toBeInTheDocument();
  expect(screen.getByText(/Lokale profilfelt, kallesignal, kompetansepåminnelser og PIN-hash\/salt eksporteres ikke/i)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Lag lokal JSON-backup/i }));

  await waitFor(() => expect(buildExport).toHaveBeenCalledTimes(1));
  const backup = screen.getByLabelText(/^Lokal JSON backup$/i) as HTMLTextAreaElement;
  expect(backup.value).toContain('beredskapsboka-local-data-export');
  expect(backup.value).toContain('"schemaVersion": 1');
  expect(screen.getByTestId('local-data-backup-message')).toHaveTextContent(/schema v1/i);
});

it('requires local-only confirmation before importing JSON and reports counts', async () => {
  const user = userEvent.setup();
  const importJson = serializeLocalDataExport(buildLocalDataExport({ now: '2026-06-04T12:00:00.000Z' }));
  const applyImport = vi.fn(async () => ({ localStorageKeys: 2, missions: 1, checklistRuns: 3 }));
  render(<LocalDataBackupPanel applyImport={applyImport} estimateQuota={async () => ({ level: 'ok', formatted: '1.0 MB brukt av 10 MB (10 %).', message: 'Lokal lagringsbruk ser ok ut for MVP-data.' })} />);

  fireEvent.change(screen.getByLabelText(/Importer lokal JSON backup/i), { target: { value: importJson } });
  expect(screen.getByRole('button', { name: /Importer JSON lokalt/i })).toBeDisabled();

  await user.click(screen.getByRole('button', { name: /Sjekk schema/i }));
  expect(screen.getByTestId('local-data-backup-message')).toHaveTextContent(/Import klar: schema v1/i);

  await user.click(screen.getByLabelText(/Jeg bekrefter at importen er en manuell lokal JSON-fil/i));
  expect(screen.getByRole('button', { name: /Importer JSON lokalt/i })).toBeDisabled();
  await user.click(screen.getByLabelText(/Jeg forstår at importen erstatter eksisterende lokale appdata/i));
  await user.click(screen.getByRole('button', { name: /Importer JSON lokalt/i }));

  await waitFor(() => expect(applyImport).toHaveBeenCalledWith(importJson, true, true));
  expect(screen.getByTestId('local-data-backup-message')).toHaveTextContent(/Import fullført lokalt: 1 oppdrag, 3 sjekklistekjøringer og 2 allowlistede/i);
});
