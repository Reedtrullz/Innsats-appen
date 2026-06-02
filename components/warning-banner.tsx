export function WarningBanner({ children }: { children: React.ReactNode }) {
  return (
    <div role="note" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950">
      {children}
    </div>
  );
}
