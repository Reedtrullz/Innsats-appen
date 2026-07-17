import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('mission dashboard architecture guards', () => {
  it('keeps MissionContextPanel focused on orchestration', () => {
    const source = read('components/mission-context-panel.tsx');
    const dashboardImports = source
      .split('\n')
      .filter((line) => line.includes('./mission/dashboard/'));

    expect(dashboardImports).toEqual([
      "import { MissionCommandDashboard } from './mission/dashboard/mission-command-dashboard';",
    ]);
  });

  it('keeps command dashboard free of export review UI implementations', () => {
    const source = read('components/mission/dashboard/mission-command-dashboard.tsx');

    expect(source).not.toMatch(/function\s+ExportReview|function\s+EquipmentExportReview/);
    expect(source).not.toContain('Vis forhåndsvisning');
    expect(source).not.toContain('textareaId');
    expect(source).not.toContain('bg-emerald-50');
  });

  it('hydrates the role lens through a stable external-store snapshot', () => {
    const source = read('lib/role/role-context.tsx');

    expect(source).toContain('useSyncExternalStore');
    expect(source).toContain('localProfileSnapshot');
    expect(source).not.toContain('useState<LocalProfileRole>');
  });

  it('uses shared export review and context notice primitives for mission export flows', () => {
    const exportFlowFiles = [
      'components/forms/five-point-order-form.tsx',
      'components/forms/comms-plan-form.tsx',
      'components/mission/after-action-report-controls.tsx',
      'components/mission/field-log-controls.tsx',
      'components/mission/local-mission-controls.tsx',
      'components/mission/mission-folder-export-controls.tsx',
      'components/mission/ruh-welfare-controls.tsx',
      'components/mission/dashboard/equipment-readiness-export-controls.tsx',
    ];

    for (const file of exportFlowFiles) {
      const source = read(file);
      expect(source, file).toContain('ExportReview');
    }

    const noticeFlowFiles = [
      'components/forms/five-point-order-form.tsx',
      'components/forms/comms-plan-form.tsx',
      'components/mission/after-action-report-controls.tsx',
      'components/mission/field-log-controls.tsx',
      'components/mission/local-mission-controls.tsx',
      'components/mission/mission-folder-export-controls.tsx',
      'components/mission/ruh-welfare-controls.tsx',
      'components/mission/dashboard/equipment-readiness-export-controls.tsx',
      'components/mission/dashboard/structured-lessons-feedback-controls.tsx',
    ];

    for (const file of noticeFlowFiles) {
      const source = read(file);
      expect(source, file).toContain('ContextNotice');
    }
  });
});
