'use client';

export function PanelHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div>
      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--accent-fg)]">{eyebrow}</p>
      <h2 id={id} className="text-2xl font-black text-[var(--text-primary)]">{title}</h2>
    </div>
  );
}
