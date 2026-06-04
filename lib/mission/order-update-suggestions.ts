import { FIELD_LOG_CATEGORY_LABELS } from './field-log';
import type { FieldLogEntry } from './schemas';

export function buildOrderUpdateSuggestions(entries: FieldLogEntry[], limit = 5): string[] {
  return entries
    .filter((entry) => entry.criticalObservation || entry.mustBeForwarded)
    .slice(-limit)
    .map((entry) => {
      const map = entry.mapReference ? ` Kart: ${entry.mapReference.label} ${entry.mapReference.point.x},${entry.mapReference.point.y}.` : '';
      return `[${entry.timestamp}] ${FIELD_LOG_CATEGORY_LABELS[entry.category]}: ${entry.text}.${map} Vurder å oppdatere ordre manuelt hvis innsatsleder/lagleder beslutter det.`;
    });
}
