import { StatusPill } from './ui/operational-primitives';

const defaultPills = [
  { label: 'Offline-klar', compactLabel: 'Offline', tone: 'success' },
  { label: 'Lagres lokalt', compactLabel: 'Lokalt', tone: 'sky' },
  { label: 'Kildebelagt', compactLabel: 'Kilde', tone: 'slate' },
  { label: 'Ikke offisielt kommandosystem', compactLabel: 'Ikke kommando', tone: 'warning' },
] as const;

export function OperationalStatusPills({ compact = false, className = '', limit }: { compact?: boolean; className?: string; limit?: number }) {
  const pills = defaultPills.slice(0, limit ?? defaultPills.length);

  return (
    <ul aria-label="Operativ status" className={`flex flex-wrap gap-2 ${className}`}>
      {pills.map((pill) => (
        <li key={pill.label}>
          <StatusPill label={compact ? pill.compactLabel : pill.label} tone={pill.tone} compact={compact} />
        </li>
      ))}
    </ul>
  );
}
