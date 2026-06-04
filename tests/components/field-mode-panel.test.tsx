import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FieldModePanel } from '@/components/field-mode-panel';
import { FIELD_MODE_STORAGE_KEY, readFieldFeedbackEntries, serializeFieldModeSettings } from '@/lib/field-mode/field-mode';
import { clearLocalMissionData, saveMission } from '@/lib/mission/local-store';

afterEach(async () => {
  localStorage.clear();
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  await clearLocalMissionData();
});

describe('FieldModePanel', () => {
  it('renders feltmodus toggles, quick actions and persistent offline status copy', async () => {
    render(<FieldModePanel />);

    expect(screen.getByRole('heading', { name: /Feltmodus for hansker/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Slå på feltmodus/i)).not.toBeChecked();
    await userEvent.click(screen.getByLabelText(/Slå på feltmodus/i));
    await userEvent.click(screen.getByLabelText(/Hanskemodus/i));
    await userEvent.click(screen.getByRole('radio', { name: /NattMørk/i }));

    expect(JSON.parse(localStorage.getItem(FIELD_MODE_STORAGE_KEY) ?? '{}')).toMatchObject({ enabled: true, gloveMode: true, theme: 'night' });
    expect(screen.getByRole('region', { name: /Offline status/i })).toHaveTextContent(/Online|Offline/i);

    const quickActions = within(screen.getByRole('region', { name: /Én trykkflate/i }));
    expect(quickActions.getByRole('link', { name: 'Kart' })).toHaveAttribute('href', '/kart');
    expect(quickActions.getByRole('link', { name: 'Opprett note' })).toHaveAttribute('href', '/oppdrag#feltlogg');
    expect(quickActions.getByRole('link', { name: 'Aktivt oppdrag' })).toHaveAttribute('href', '/oppdrag');
    expect(quickActions.getByRole('link', { name: 'Kjør sjekkliste' })).toHaveAttribute('href', '/oppdrag#sjekkliste');
    expect(quickActions.getByRole('link', { name: '5-punktsordre' })).toHaveAttribute('href', '/oppdrag#5-punktsordre');
    expect(quickActions.getByRole('link', { name: 'Sambandsplan' })).toHaveAttribute('href', '/oppdrag#sambandsplan');
    expect(quickActions.getByRole('link', { name: 'Eksporter status' })).toHaveAttribute('href', '/oppdrag#statusrapport');
    expect(quickActions.getByRole('link', { name: 'Søk' })).toHaveAttribute('href', '/sok#stress-search');
  });

  it('loads persisted field settings after mount without making first render depend on localStorage', async () => {
    localStorage.setItem(FIELD_MODE_STORAGE_KEY, serializeFieldModeSettings({ enabled: true, gloveMode: true, theme: 'reduced-blue', outdoorReadabilityReviewed: true }));

    render(<FieldModePanel />);

    await waitFor(() => expect(screen.getByLabelText(/Slå på feltmodus/i)).toBeChecked());
    expect(screen.getByLabelText(/Hanskemodus/i)).toBeChecked();
    expect(screen.getByRole('radio', { name: /Redusert blått lys/i })).toBeChecked();
    expect(screen.getByLabelText(/Utendørs lesbarhet er vurdert/i)).toBeChecked();
  });

  it('shows a stress-friendly empty state and then an active mission shortcut', async () => {
    const { unmount } = render(<FieldModePanel />);
    expect(await screen.findByText(/Ingen aktiv lokal oppdragstavle/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Opprett lokalt oppdrag/i })).toHaveAttribute('href', '/oppdrag/ny');
    unmount();

    await saveMission({
      id: 'field-active-mission',
      title: 'Feltøvelse natt',
      createdAt: '2026-06-04T09:00:00.000Z',
      updatedAt: '2026-06-04T09:30:00.000Z',
      phase: 'under',
      role: 'mannskap',
      scenario: 'generelt',
      locationText: 'Lokalt område',
      externalSignals: [],
      activeChecklistIds: [],
      notes: '',
      tasks: [],
      statusLog: [],
      resourceRequests: [],
      contentVersion: 'test-v1',
      schemaVersion: 1,
    } as any);

    render(<FieldModePanel />);
    expect(await screen.findByText(/Feltøvelse natt/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Gå til aktivt oppdrag/i })).toHaveAttribute('href', '/oppdrag');
  });

  it('warns that voice input is optional, browser-dependent and fallback-only', async () => {
    render(<FieldModePanel />);
    await screen.findByText(/Ingen aktiv lokal oppdragstavle/i);

    expect(screen.getByRole('heading', { name: /Web Speech API vurdering/i })).toBeInTheDocument();
    expect(screen.getByText(/Diktering kan feiltolke/i)).toBeInTheDocument();
    expect(screen.getByText(/laster ikke opp opptak/i)).toBeInTheDocument();
    expect(screen.getByText(/Fallback: skriv manuelt/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByTestId('speech-support-status')).toHaveTextContent(/ikke tilgjengelig|mulig/i));
    expect(screen.getByRole('button', { name: /Prøv valgfri diktering/i })).toBeDisabled();
    expect(screen.getByLabelText(/Lokal notatkladd/i)).toBeInTheDocument();
  });

  it('handles Web Speech start failures without getting stuck listening', async () => {
    class ThrowingSpeechRecognition {
      lang = '';
      interimResults = false;
      maxAlternatives = 1;
      onresult = null;
      onerror = null;
      onend = null;
      start = vi.fn(() => { throw new Error('permission denied'); });
      stop = vi.fn();
    }
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = ThrowingSpeechRecognition;
    const user = userEvent.setup();

    render(<FieldModePanel />);

    await waitFor(() => expect(screen.getByTestId('speech-support-status')).toHaveTextContent(/mulig/i));
    await user.click(screen.getByLabelText(/Jeg forstår at diktering er valgfritt/i));
    await user.click(screen.getByRole('button', { name: /Prøv valgfri diktering/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/startet ikke diktering/i);
    expect(screen.getByRole('button', { name: /Prøv valgfri diktering/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Stopp diktering/i })).toBeDisabled();
  });

  it('captures field testing feedback locally with sanitization and no backend claim', async () => {
    render(<FieldModePanel />);

    expect(screen.getAllByText(/ingen backend/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ingen lokale feltfeedback-notater ennå/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Hva fungerte/i), 'Store knapper fungerte. Kontakt test@example.com eller 99999999');
    await userEvent.type(screen.getByLabelText(/Blokkere/i), 'Små lenker med hansker');
    await userEvent.type(screen.getByLabelText(/Forslag til endring/i), 'Mer kontrast');
    await userEvent.click(screen.getByLabelText(/anonymisert og uten persondata/i));
    await userEvent.click(screen.getByRole('button', { name: /Lagre lokal feedback/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/lagret lokalt/i);
    const entries = readFieldFeedbackEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].observations).toContain('[fjernet e-post]');
    expect(entries[0].observations).toContain('[fjernet telefon]');
    expect(screen.getByText(/Lokale feedback-notater \(1\)/i)).toBeInTheDocument();
  });
});
