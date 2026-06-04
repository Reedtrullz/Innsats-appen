const defaultPills = [
  { label: 'Offline-klar', compactLabel: 'Offline', className: 'bg-emerald-100 text-emerald-950' },
  { label: 'Lagres lokalt', compactLabel: 'Lokalt', className: 'bg-sky-100 text-sky-950' },
  { label: 'Kildebelagt', compactLabel: 'Kilde', className: 'bg-slate-100 text-slate-800' },
  { label: 'Ikke offisielt kommandosystem', compactLabel: 'Ikke kommando', className: 'bg-amber-100 text-amber-950' },
] as const;

export function OperationalStatusPills({ compact = false, className = '', limit }: { compact?: boolean; className?: string; limit?: number }) {
  const pills = defaultPills.slice(0, limit ?? defaultPills.length);

  return (
    <ul aria-label="Operativ status" className={`flex flex-wrap gap-2 ${className}`}>
      {pills.map((pill) => (
        <li key={pill.label} className={`rounded-full px-3 py-1 text-xs font-black ${pill.className}`}>
          {compact ? pill.compactLabel : pill.label}
        </li>
      ))}
    </ul>
  );
}
