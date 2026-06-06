# Dependency advisory snapshot

Date: 2026-06-06

## Current audit result

`npm audit --audit-level=high` exits 0 and remains the release-blocking high/critical gate.

`npm audit --audit-level=moderate` exits 1 and currently reports GHSA-qx2v-qp2m-jg93 through Next/PostCSS with no fix available:

- Package: `postcss <8.5.10`
- Severity: moderate
- Advisory: `GHSA-qx2v-qp2m-jg93`
- Path: `next` -> bundled `postcss`; also surfaced through `@next/third-parties`
- npm output: `No fix available`

## Release handling

Keep `npm audit --audit-level=high` / `npm run audit:ci` as the release gate for high/critical vulnerabilities.

Keep this moderate advisory visible as a tracked release caveat and revisit when Next publishes a patched dependency tree. Do not hide the advisory by weakening audit commands; do not claim the moderate gate is clean until `npm audit --audit-level=moderate` exits 0.
