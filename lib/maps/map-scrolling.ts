export function scrollMapElementIntoView(id: string) {
  if (typeof document === 'undefined') return;

  const target = document.getElementById(id);
  if (typeof target?.scrollIntoView !== 'function') return;

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
