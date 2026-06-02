export const sensitiveFieldNames = [
  'privateTilfluktsromLocations',
  'patientName',
  'patientId',
  'personnummer',
  'nationalId',
  'teamTracking',
  'liveTracking',
  'upstream',
  'url',
] as const;

export function containsSensitiveStructuredKey(value: unknown): string[] {
  const found = new Set<string>();
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if ((sensitiveFieldNames as readonly string[]).includes(key)) found.add(key);
      walk(child);
    }
  };
  walk(value);
  return [...found];
}
