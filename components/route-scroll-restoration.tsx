'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function RouteScrollRestoration({ currentPath }: { currentPath?: string }) {
  const pathname = usePathname();
  const activePath = currentPath ?? pathname;

  useEffect(() => {
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    const frame = window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('main h1');
      if (!heading) return;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activePath]);

  return null;
}
