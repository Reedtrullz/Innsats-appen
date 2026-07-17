import Link from 'next/link';

const primaryTools = [
  { href: '#map-marker-tool', label: 'Markør' },
  { href: '#map-quick-log-tool', label: 'Hurtiglogg' },
  { href: '#map-drawing-tool', label: 'Sektor' },
  { href: '#map-layer-tool', label: 'Lag' },
] as const;

export type SpecialistMapTool = 'water' | 'radiac' | 'search' | 'mre';

const specialistTools: Array<{ id: SpecialistMapTool; label: string }> = [
  { id: 'water', label: 'Pumpe' },
  { id: 'radiac', label: 'RADIAC' },
  { id: 'search', label: 'Søketeig' },
  { id: 'mre', label: 'MRE' },
] as const;

export function MapToolSheet({ packageStatus, selectedSpecialistTool, onSelectSpecialistTool }: {
  packageStatus: string;
  selectedSpecialistTool: SpecialistMapTool | null;
  onSelectSpecialistTool: (tool: SpecialistMapTool) => void;
}) {
  return (
    <section className="sticky bottom-20 z-20 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xl" aria-label="Kartverktøy">
      <nav aria-label="Kartverktøy" className="grid grid-cols-4 gap-1">
        {primaryTools.map((tool) => (
          <a key={tool.href} href={tool.href} className="inline-flex min-h-12 items-center justify-center rounded-xl px-2 text-center text-xs font-black text-[var(--text-primary)] hover:bg-[var(--surface-muted)]">{tool.label}</a>
        ))}
      </nav>
      <details className="mt-2 border-t border-[var(--border)] pt-2">
        <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-black text-[var(--text-primary)]">Spesialistverktøy og kartdata</summary>
        <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
          {specialistTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              aria-pressed={selectedSpecialistTool === tool.id}
              onClick={() => onSelectSpecialistTool(tool.id)}
              className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-2 text-xs font-black ${selectedSpecialistTool === tool.id ? 'border-[#082F49] bg-[#082F49] text-white' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]'}`}
            >
              {tool.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs font-semibold text-[var(--text-muted)]">Kartpakke: {packageStatus}</p>
        <Link href="/data-pa-enheten" className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-[#082F49] px-4 text-sm font-black text-white">Administrer kartdata</Link>
      </details>
    </section>
  );
}
