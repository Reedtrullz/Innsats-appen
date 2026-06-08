'use client';

export function PanelHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-sky-700">{eyebrow}</p>
      <h2 id={id} className="text-2xl font-black text-slate-950">{title}</h2>
    </div>
  );
}
