import { describe, expect, it } from 'vitest';
import type { OperationalChecklist } from '@/lib/content/schemas';
import type { ChecklistRun } from '@/lib/mission/schemas';
import { isPhaseComplete, withPhaseChange } from '@/lib/mission/phase-progress';
import { buildMission } from '../helpers/mission-fixtures';

const checklists = [
  { slug: 'brann-for', title: 'Brann før innsats', phase: 'for', roles: ['leder'], scenarios: ['brann'], sourceIds: [], items: [
    { id: 'ppe', label: 'Verneutstyr', required: true, sourceIds: [] },
    { id: 'ordre', label: 'Ordre', required: true, sourceIds: [] },
  ] },
  { slug: 'brann-under', title: 'Brann under innsats', phase: 'under', roles: ['leder'], scenarios: ['brann'], sourceIds: [], items: [
    { id: 'vann', label: 'Vann', required: true, sourceIds: [] },
    { id: 'logg', label: 'Logg', required: false, sourceIds: [] },
  ] },
  { slug: 'brann-etter', title: 'Brann etter innsats', phase: 'etter', roles: ['leder'], scenarios: ['brann'], sourceIds: [], items: [] },
] as OperationalChecklist[];

function run(templateSlug: string, checkedItemIds: string[], skippedItemIds: string[] = []): ChecklistRun {
  return { id: `r-${templateSlug}`, missionId: 'm1', templateSlug, checkedItemIds, skippedItemIds, notesByItemId: {}, equipmentStatusByItemId: {}, updatedAt: '2026-06-15T00:00:00.000Z', schemaVersion: 1 };
}

describe('isPhaseComplete', () => {
  const mission = buildMission({ id: 'm1', title: 'Brannøvelse', scenario: 'brann', phase: 'for' });

  it('is false when a phase has required steps still open', () => {
    expect(isPhaseComplete(checklists, mission, [run('brann-for', ['ppe'])], 'for')).toBe(false);
  });

  it('is true when every required step of a phase is done', () => {
    expect(isPhaseComplete(checklists, mission, [run('brann-for', ['ppe', 'ordre'])], 'for')).toBe(true);
  });

  it('treats a skipped required step as resolved', () => {
    expect(isPhaseComplete(checklists, mission, [run('brann-for', ['ppe'], ['ordre'])], 'for')).toBe(true);
  });

  it('gates each phase on its own run, not the active phase', () => {
    const runs = [run('brann-for', ['ppe', 'ordre']), run('brann-under', [])];
    expect(isPhaseComplete(checklists, mission, runs, 'for')).toBe(true);
    expect(isPhaseComplete(checklists, mission, runs, 'under')).toBe(false);
  });

  it('is false for a phase with no completable checklist (item-less)', () => {
    expect(isPhaseComplete(checklists, mission, [run('brann-etter', [])], 'etter')).toBe(false);
  });
});

describe('withPhaseChange', () => {
  const mission = buildMission({ id: 'm1', title: 'Brannøvelse', scenario: 'brann', phase: 'for' });

  it('moves the phase and logs the transition without persondata', () => {
    const next = withPhaseChange(mission, 'under');
    expect(next.phase).toBe('under');
    expect(next.fieldLogEntries).toHaveLength((mission.fieldLogEntries?.length ?? 0) + 1);
    const entry = next.fieldLogEntries.at(-1)!;
    expect(entry.category).toBe('beslutning');
    expect(entry.text).toBe('Fase: Før → Under');
    expect(entry.criticalObservation).toBe(false);
  });

  it('preserves progress arrays untouched (no reset on switch)', () => {
    const next = withPhaseChange(mission, 'etter');
    expect(next.tasks).toBe(mission.tasks);
    expect(next.statusLog).toBe(mission.statusLog);
  });

  it('is a no-op when the target phase equals the current phase', () => {
    expect(withPhaseChange(mission, 'for')).toBe(mission);
  });
});
