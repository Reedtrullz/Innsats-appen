import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DecisionSupportNotice } from '@/components/decision-support-notice';

describe('DecisionSupportNotice', () => {
  it('renders full variant with local-only notice and future egress caveat', () => {
    const { container } = render(<DecisionSupportNotice />);
    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByText(/Data lagres bare lokalt i denne nettleseren/)).toBeInTheDocument();
    expect(screen.getByText(/Ekstern kontekst/)).toBeInTheDocument();
    expect(screen.getByText(/MET\/Kartverket\/NVE/)).toBeInTheDocument();
    expect(screen.getByText(/post-MVP/)).toBeInTheDocument();
    expect(screen.getByText(/Ingen data sendes ut av appen i MVP/)).toBeInTheDocument();
  });

  it('renders compact variant with local-only notice and future egress caveat', () => {
    const { container } = render(<DecisionSupportNotice compact />);
    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByText(/Data lagres bare lokalt/)).toBeInTheDocument();
    expect(screen.getByText(/Ekstern kontekst/)).toBeInTheDocument();
    expect(screen.getByText(/MET\/Kartverket\/NVE/)).toBeInTheDocument();
    expect(screen.getByText(/post-MVP/)).toBeInTheDocument();
  });

  it('retains pill-link navigation to limitation pages', () => {
    render(<DecisionSupportNotice />);
    expect(screen.getByRole('link', { name: /Grenser/ })).toHaveAttribute('href', '/begrensninger');
    expect(screen.getByRole('link', { name: /Kjente begrensninger/ })).toHaveAttribute('href', '/kjente-begrensninger');
    expect(screen.getByRole('link', { name: /Data på enheten/ })).toHaveAttribute('href', '/data-pa-enheten');
  });
});
