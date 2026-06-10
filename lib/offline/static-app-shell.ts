export const APP_SHELL_ROUTES = [
  '/',
  '/hurtigkort',
  '/sok',
  '/for',
  '/under',
  '/etter',
  '/hjelp',
  '/kilder',
  '/kildegjennomgang',
  '/faq',
  '/begrensninger',
  '/kjente-begrensninger',
  '/data-pa-enheten',
  '/personvern',
  '/datakilder',
  '/endringer',
  '/nytt',
  '/ma-leses',
  '/oppdrag',
  '/oppdrag/ny',
  '/mer',
  '/laering',
  '/kart',
  '/feltmodus',
  '/moduler/cbrn',
  '/moduler/mfe',
  '/moduler/radiac',
  '/moduler/tilfluktsrom',
  '/offline',
  '/release',
] as const;

export const GENERATED_CONTENT_ROUTES = [
  '/generated-content/manifest.json',
  '/generated-content/action-cards.json',
  '/generated-content/checklists.json',
  '/generated-content/training-paths.json',
  '/generated-content/protection-measures.json',
  '/generated-content/glossary.json',
  '/generated-content/faq.json',
  '/generated-content/equipment-taxonomy.json',
  '/generated-content/export-templates.json',
  '/generated-content/image-metadata.json',
  '/generated-content/local-overlays.json',
  '/generated-content/changelog.json',
  '/generated-content/must-read.json',
  '/generated-content/source-documents.json',
  '/generated-content/search-index.json',
  '/generated-content/workplans.json',
  '/generated-content/content-coverage-report.json',
] as const;

export const GENERATED_ROUTE_DISCOVERY_ENDPOINTS = [
  '/generated-content/action-cards.json',
  '/generated-content/source-documents.json',
  '/generated-content/training-paths.json',
  '/generated-content/image-metadata.json',
] as const;

export const STATIC_APP_SHELL_ROUTES = [
  ...APP_SHELL_ROUTES,
  ...GENERATED_CONTENT_ROUTES,
] as const;

export type AppShellRoute = (typeof APP_SHELL_ROUTES)[number];
export type GeneratedContentRoute = (typeof GENERATED_CONTENT_ROUTES)[number];
export type StaticAppShellRoute = (typeof STATIC_APP_SHELL_ROUTES)[number];
export type GeneratedRouteDiscoveryEndpoint = (typeof GENERATED_ROUTE_DISCOVERY_ENDPOINTS)[number];
