import type { WaterSupplyPlanObjects } from '@/lib/maps/water-supply-plan';
import type { SearchSectorPlanObjects } from '@/lib/maps/search-sector-plan';

/**
 * Advisory derivation for the "Kart som rådgir — aldri bestemmer" tools
 * (redesign board, section 08). Pure, offline, schematic-only: turns a plan
 * the user has drawn into a *rådgivende forslag* — a recommendation with a
 * one-line rationale, the assumptions it rests on, and an honest confidence
 * note. Never a command; manual override is always an equal path.
 *
 * Confidence is deliberately conservative: schematic coordinates are not a
 * loaded map package, so the highest these helpers ever return is "medium".
 */

export type AdvisoryConfidence = 'low' | 'medium' | 'high';
export type AdvisorySourceBasis = 'map-data' | 'assisted' | 'sourced';

export type DerivedAdvisory = {
  suggestion: string;
  why: string;
  assumptions: string[];
  confidence: AdvisoryConfidence;
  confidenceNote: string;
  sourceBasis: AdvisorySourceBasis;
  sourceNote?: string;
};

/**
 * Schematic hose length (0–100 grid) beyond which pressure loss on a long lay
 * makes a relay / series pump worth recommending. Kept intentionally cautious
 * — the advisory prompts the user to verify, it does not size the supply.
 */
export const RELAY_HOSE_LENGTH_THRESHOLD = 30;

export function deriveWaterSupplyAdvisory(plan: WaterSupplyPlanObjects): DerivedAdvisory {
  const hoseLength = plan.summary.hoseLengthSchematicUnits;
  const longLay = hoseLength >= RELAY_HOSE_LENGTH_THRESHOLD;

  return {
    suggestion: longLay
      ? 'Vurder relé eller seriekjøring midtveis'
      : 'Enkelt utlegg kan være tilstrekkelig',
    why: longLay
      ? `Slangeveien er ${hoseLength} skjematiske enheter — et langt utlegg gir trykktap. Relé/seriepumpe midtveis holder trykket fram til leveringspunkt.`
      : `Slangeveien er ${hoseLength} skjematiske enheter — kort nok til at trykktapet trolig er håndterbart med ett pumpetrinn.`,
    assumptions: [
      `slangevei ${hoseLength} enh.`,
      `${plan.summary.markerCount} markører`,
      'høyde ukjent',
    ],
    confidence: 'medium',
    confidenceNote:
      'Avstand er fra dine skjematiske markeringer; sugehøyde, høydestigning og kapasitet er ikke beregnet — bekreft på stedet.',
    sourceBasis: 'assisted',
    sourceNote: 'Kilde: utlegg fra pumpe · teoretisk, ikke fasit. Leder/fagressurs beslutter.',
  };
}

export function deriveSearchSectorAdvisory(plan: SearchSectorPlanObjects): DerivedAdvisory {
  const area = plan.summary.areaSchematicUnits;

  return {
    suggestion: 'Prioriter teigen mot lavpunkt og ledelinjer',
    why: `Teigen dekker ${area} skjematiske enheter. Savnede beveger seg ofte mot lavpunkt, vassdrag og ledelinjer — sjekk drenering og kanter først.`,
    assumptions: [
      `areal ${area} enh.`,
      `${plan.summary.boundaryPointCount} grensepunkt`,
      'atferd: generell',
    ],
    confidence: 'low',
    confidenceNote:
      'Basert kun på teiggrensen du tegnet — ingen terreng- eller atferdsdata er regnet inn. Innsatsleder beslutter.',
    sourceBasis: 'sourced',
    sourceNote: 'Kilde: savnetatferd-statistikk · teoretisk, ikke fasit.',
  };
}
