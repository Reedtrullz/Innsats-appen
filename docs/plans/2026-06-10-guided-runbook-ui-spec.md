# Guided runbook UI — design spec

Status: proposal (not scheduled). Owner: TBD. Supersedes nothing; complements `docs/ui-operational-command-surface.md`.

## Context and goal

A live UI/UX review found the app reads as heavy and cluttered: four stacked chrome bars before content, flat hierarchy, repeated trust/status messaging, and entry-point grids that don't answer "what do I do now?". This spec describes one redesign direction — the **guided runbook** — chosen because it has the highest payoff under stress and for less-experienced personnel, and because it mostly re-presents content the app already has rather than requiring new content.

Core idea: every phase and every active mission is an **ordered list of advisory steps**. The home surfaces the current incomplete steps as a prioritized queue; opening a step shows source-backed guidance with a "gjort · neste" action that advances the queue. Order is a recommendation, never a gate.

## Principles

- **Advisory, not directive.** The app is explicitly not a command system. The runbook presents *anbefalt rekkefølge*; every step is skippable and reorderable, nothing blocks. Copy and affordances must never imply authority.
- **Offline-first.** No new network dependency. Step content and progress are local (IndexedDB), exactly like today's checklist runs.
- **Source-trust stays visible.** Each step that derives from a source carries the existing source-status dot (verified / caution), reusing `sourceFreshness`.
- **Glove- and stress-first.** Single-column, large targets, high contrast, one decision per screen where possible. This replaces the separate "Feltmodus" with a contrast/scale toggle rather than a parallel app.
- **Escape hatch always present.** Search and "hopp til" let experienced users jump straight to a tool, so the runbook is a default path, not a cage.

## Data model — steps map to existing content

No new content type is required. A "step" is derived from existing curated data:

| Step source | Maps from | Step body shows |
| --- | --- | --- |
| Checklist item | `OperationalChecklist.items[]` (`lib/content/schemas.ts`) | item `label`, linked `sourceIds`, required flag |
| Action card | `ActionCard` (`tiltakskort`) | `steps`, `warning`, `doNot`, `authority`, linked sources |
| Order/comms tool | `5-punktsordre` / `sambandsplan` flows | existing guided sub-flow (already step-like) |

A `RunbookStep` view model (new, derived at render time — not persisted):

```ts
type RunbookStep = {
  id: string;            // stable: `${checklistSlug}:${itemId}` or `card:${slug}`
  title: string;
  detail?: string;       // item context / card step list
  sourceIds: string[];
  required: boolean;
  status: 'done' | 'now' | 'upcoming' | 'skipped';
};
```

- **Queue / order:** reuse `matchingChecklist(checklists, mission)` (`components/mission-context-panel.tsx`) to pick the active checklist for the mission's scenario+phase, then map its `items` to steps in array order. Required items first.
- **Progress:** reuse the existing `ChecklistRun` (`checkedItemIds`) and `saveChecklistRun`/`listChecklistRuns` (`lib/mission/local-store.ts`). `done` = id in `checkedItemIds`; `now` = first non-done required item; `skipped` = a new optional `skippedItemIds` set on `ChecklistRun` (additive, backward-compatible).
- **No active mission:** the home queue falls back to the current phase page's checklist (`/for|/under|/etter`) so the runbook still works pre-mission.

## Screens and states

Reuse the mission dashboard's existing `Nå / Arbeid / Eksport` tabs; the runbook lives under **Nå**.

1. **Home — "Nå" queue.** Active-mission strip (title · phase · Åpne), then `Neste steg` list: the `now` step highlighted (2px info border) with a play affordance, next 2–3 `upcoming` steps numbered. Below: `Hopp til` chips (Kritisk · Søk · Kart). Bottom nav: Nå · Søk · Oppdrag · Mer.
2. **Step detail.** Header `Steg N av M` + back. Title, source chip (status dot + "Kilde: … · verifisert/uverifisert"), the guided body (ordered sub-items or card steps), and any `warning` as an amber note. Bottom action row (in-flow, not fixed): primary `Gjort · neste`, secondary `Hopp over`.
3. **Phase as runbook.** Segmented `Før/Under/Etter` + progress (`2 / 6`) + bar. Ordered list with three visual states: `done` (check, strikethrough, dimmed), `now` (highlighted dot), `upcoming` (number).
4. **Search — escape hatch.** Reachable input near top, phase/type filter chips, dense result rows (type icon + title + source-status dot + chevron). Tapping a result opens it directly, bypassing the queue.

Required edge states (must be designed, not just the happy path):
- **All complete:** queue shows a calm "Alle anbefalte steg er gjort" with a link to phase change or after-action, not an empty list.
- **No checklist for scenario:** explicit "Ingen scenariospesifikk runbook — bruk søk og tiltakskort" (the empty state added in commit `f08248e`), never an unrelated fallback.
- **No active mission:** phase-level runbook + "Start oppdrag".
- **Skipped step:** visually distinct from done; re-openable.

## Copy rules (Norwegian, advisory)

- Section label: `Neste steg` / `Anbefalt rekkefølge` — never `Påkrevd rekkefølge` or imperative command phrasing implying authority.
- Step actions: `Gjort · neste`, `Hopp over`, `Åpne`. Avoid `Fullfør`/`Lås` framing that implies an official process.
- Keep the single local/boundary marker (`Lokalt · ikke offisielt kommandosystem`) from the consolidated status surface; do not reintroduce per-step disclaimers.
- Each source-derived step keeps the existing caution line where the source carries one (deduped, per `f08248e`).

## Reused vs. new

Reused: `matchingChecklist`, `ChecklistRun` + `saveChecklistRun`/`listChecklistRuns`, `ChecklistRunner` logic, `sourceFreshness`/source-status dot, `OperationalStatus` shell surface, mission `Nå/Arbeid/Eksport` tabs, action-card rendering.

New: a `RunbookStep` builder (`lib/mission/runbook.ts`), a `RunbookQueue` + `RunbookStepView` component pair, an optional `skippedItemIds` field on `ChecklistRun` (additive migration), and a feature flag.

## Phased implementation (behind a flag)

Gate the whole direction behind a flag (a `localProfile` setting toggle or an env-gated `/na` route) so it can be A/B'd against the current UI without risk.

1. **Step builder + tests.** `lib/mission/runbook.ts` mapping checklist/card → `RunbookStep[]` with status derivation; unit tests for ordering, done/now/skipped, and the empty/all-done states. No UI yet.
2. **Step detail view.** Render one step from existing content + `Gjort · neste` writing to `ChecklistRun`. Wire into the existing checklist run flow.
3. **"Nå" queue** on the mission dashboard Nå tab, behind the flag.
4. **Phase runbook** for `/for|/under|/etter`.
5. **Polish + states**, then flip the flag for pilot evaluation.

## Risks and open questions

- **Authority creep:** the ordered presentation must stay advisory; needs review of copy + the "skip/reorder" behavior before pilot.
- **Experienced-user speed:** validate the escape hatch is fast enough (search prominence, jump-to-tool).
- **Skip semantics:** confirm `skippedItemIds` is the right persistence vs. just leaving items unchecked.
- **Scope of step content:** action cards have richer bodies than checklist items — decide whether a card step embeds the full card or links to it.

## Out of scope

- New checklist/source content beyond what exists (separate content task).
- Replacing the export/after-action flows (they already work; the runbook links into them).
- Backend sync of progress (remains local-only per MVP boundaries).
