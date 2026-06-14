import { expect, test } from '@playwright/test';

type GeneratedWorkplan = {
  title: string;
  summary: string;
  taskCount: number;
  tasks: Array<{ status: string }>;
};

type GeneratedWorkplansSnapshot = {
  generatedAt: string;
  workplans: GeneratedWorkplan[];
};

test('release page displays generated workplans from the production artifact', async ({ page }) => {
  const artifactResponse = await page.request.get('/generated-content/workplans.json');
  expect(artifactResponse.ok()).toBe(true);
  const snapshot = (await artifactResponse.json()) as GeneratedWorkplansSnapshot;
  expect(snapshot.workplans.length).toBeGreaterThan(0);

  const workplan = snapshot.workplans.find((candidate) => candidate.taskCount > 0) ?? snapshot.workplans[0];
  expect(workplan).toBeDefined();
  const completedTasks = workplan.tasks.filter((task) => task.status === 'completed').length;

  await page.goto('/release');
  await expect(page.getByRole('heading', { name: /Genererte lokale workplan-artefakter/i })).toBeVisible();
  await expect(page.getByText(/lastet fra `\/generated-content\/workplans\.json` — ingen backend-synk/i)).toBeVisible();
  await expect(page.getByText(`Artefakt generert: ${snapshot.generatedAt}`).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: workplan.title }).first()).toBeVisible();
  await expect(page.getByText(workplan.summary).first()).toBeVisible();
  await expect(page.getByText(`${completedTasks}/${workplan.taskCount} oppgaver fullført`).first()).toBeVisible();
});
