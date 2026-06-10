import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DECISION_SUPPORT_NOTICE_ACK_KEY, DecisionSupportNotice } from '@/components/decision-support-notice';

describe('DecisionSupportNotice', () => {
  it('renders first-run local-only boundaries in field language', () => {
    render(<DecisionSupportNotice />);

    expect(screen.getByText(/Data lagres bare lokalt i denne nettleseren/i)).toBeInTheDocument();
    expect(screen.getByText(/Offentlig kontekst fra MET, Kartverket eller NVE/i)).toBeInTheDocument();
    expect(screen.getByText(/Oppdragsnotater, logger og privat tekst forblir på enheten/i)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/post-MVP|MVP|backend sync|service worker/i);
  });

  it('acknowledges the compact notice locally and keeps a persistent boundary link', async () => {
    render(<DecisionSupportNotice compact />);

    await userEvent.click(screen.getByRole('button', { name: /Forstått/i }));

    await waitFor(() => expect(localStorage.getItem(DECISION_SUPPORT_NOTICE_ACK_KEY)).toBe('true'));
    expect(screen.getByText(/Grenser og lokal lagring/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Åpne grenser/i })).toHaveAttribute('href', '/begrensninger');
    expect(screen.queryByRole('button', { name: /Forstått/i })).not.toBeInTheDocument();
  });

  it('retains navigation to limitation pages', () => {
    render(<DecisionSupportNotice />);

    expect(screen.getByRole('link', { name: /Grenser/ })).toHaveAttribute('href', '/begrensninger');
    expect(screen.getByRole('link', { name: /Kjente begrensninger/ })).toHaveAttribute('href', '/kjente-begrensninger');
    expect(screen.getByRole('link', { name: /Data på enheten/ })).toHaveAttribute('href', '/data-pa-enheten');
  });
});
