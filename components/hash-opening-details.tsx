'use client';

import { useEffect, useState, type ReactNode } from 'react';

export function HashOpeningDetails({
  targetIds,
  summary,
  children,
  className = '',
}: {
  targetIds: string[];
  summary: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function openForHash() {
      const targetId = decodeURIComponent(window.location.hash.slice(1));
      if (!targetIds.includes(targetId)) return;
      setOpen(true);
      window.requestAnimationFrame(() => {
        const target = document.getElementById(targetId);
        if (typeof target?.scrollIntoView === 'function') target.scrollIntoView({ block: 'start' });
      });
    }
    openForHash();
    window.addEventListener('hashchange', openForHash);
    return () => window.removeEventListener('hashchange', openForHash);
  }, [targetIds]);

  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className={className}>
      {summary}
      {children}
    </details>
  );
}
