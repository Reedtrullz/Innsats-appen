# Source governance Batch A owner-review packet

Generated: 2026-06-06T14:32:13Z

## Scope

This packet starts Task 10 for Batch A of the source-governance remediation queue. It is intentionally decision-focused and privacy-safe: it lists source IDs, titles, governance statuses, reference labels/slugs, and required owner decisions only. It does **not** include raw source bodies, local source-extract paths, credentials, private evidence values, or incident/person data.

Batch A contains the cross-cutting operational sources with the highest app impact.

- Sources: 21
- Referenced labels/slugs: 277
- Current strict-gate result: 55 referenced blockers, 0 public body blockers.
- Current disposition for every Batch A row: blocked until a real source-owner decision is recorded.

## Non-negotiable rules

- Do not mark a source approved because the app builds or because it exists in the local knowledge bank.
- Do not approve by changing generated JSON directly; generated source docs come from Obsidian source-extract frontmatter via `npm run import:obsidian`.
- If a source is approved for pilot but not for public publication, it still cannot satisfy the current strict public-pilot gate. Either secure public approval, replace references with approved-public sources, or remove the pilot/public content that depends on it.
- Removing a `sourceIds` entry is only valid when the dependent claim/card/checklist item is also removed or rewritten so it no longer relies on that source.
- Keep raw source bodies and private approval evidence out of repo docs and public generated artifacts. Record only sanitized owner/date/disposition fields here.

## Decision fields required per source

For each source owner decision, capture the following sanitized fields:

| Field | Allowed values / notes |
| --- | --- |
| `source_status` | `verified`, `unverified`, `historical`, `draft`, `expired` |
| `pilot_review_status` | `approved-for-pilot`, `rejected-for-pilot`, `not-reviewed` |
| `publication_status` | `approved-public`, `internal-only`, `needs-permission` |
| `owner` | role/team handle only; no personal/private contact info in public docs |
| `reviewer` | role/team handle only |
| `verified_at` | `YYYY-MM-DD` |
| `review_after` or `expires_at` | `YYYY-MM-DD`; required for high-risk/temporary approvals |
| `review_notes` | sanitized note such as `approved for public pilot by source owner on [date]`; no raw source text/private details |

## Batch A summary table

| # | Source ID | Title | Current blocker | Refs | Required first decision |
| ---: | --- | --- | --- | ---: | --- |
| 1 | `src-sjekkliste-fig-og-figp` | SRC - Sjekkliste FIG og FIGP | status=unverified; pilot=not-reviewed; publication=needs-permission | 71 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 2 | `src-tiltakskort-etter-innsats` | SRC - Tiltakskort etter innsats | status=unverified; pilot=not-reviewed; publication=needs-permission | 35 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 3 | `src-kommunikasjons-og-sambandsdiagram` | SRC - Kommunikasjons og sambandsdiagram | status=unverified; pilot=not-reviewed; publication=needs-permission | 33 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 4 | `src-tiltakskort-for-innsats` | SRC - Tiltakskort før innsats | status=unverified; pilot=not-reviewed; publication=needs-permission | 26 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 5 | `src-operativt-konsept-for-sivilforsvaret` | SRC - Operativt konsept for Sivilforsvaret | status=unverified; pilot=not-reviewed; publication=needs-permission | 25 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 6 | `src-5-punktsordre` | SRC - 5-punktsordre | status=unverified; pilot=not-reviewed; publication=needs-permission | 19 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 7 | `src-renhold-etter-branninnsats` | SRC - Renhold etter branninnsats | status=unverified; pilot=not-reviewed; publication=needs-permission | 16 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 8 | `src-eksempler-pa-utlegg-fra-pumpe` | SRC - Eksempler på utlegg fra pumpe | status=unverified; pilot=not-reviewed; publication=needs-permission | 11 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 9 | `src-psykososial-oppfolging-og-kollegastotte` | SRC - Psykososial oppfølging og kollegastøtte | status=unverified; pilot=not-reviewed; publication=needs-permission | 10 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 10 | `src-tiltakskort-under-innsats` | SRC - Tiltakskort under innsats | status=unverified; pilot=not-reviewed; publication=needs-permission | 7 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 11 | `src-vedlegg-c-operative-forhold` | SRC - Vedlegg C operative forhold | status=unverified; pilot=not-reviewed; publication=needs-permission | 6 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 12 | `src-tiltakskort-psykologisk-forstehjelp` | SRC - Tiltakskort psykologisk førstehjelp | status=unverified; pilot=not-reviewed; publication=needs-permission | 4 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 13 | `src-enhetlig-ledelsessystem-els` | SRC - Enhetlig ledelsessystem ELS | status=unverified; pilot=not-reviewed; publication=needs-permission | 3 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 14 | `src-tiltakskort-04-alvorlig-ulykke-dod-og-mental-forstehjelp` | SRC - Tiltakskort 04 Alvorlig ulykke død og mental førstehjelp | status=unverified; pilot=not-reviewed; publication=needs-permission | 3 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 15 | `src-samleplass-skadde` | SRC - Samleplass skadde | status=unverified; pilot=not-reviewed; publication=needs-permission | 2 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 16 | `src-grunnsats-personlig-utrustning-april-2026` | SRC - Grunnsats personlig utrustning april 2026 | status=unverified; pilot=not-reviewed; publication=needs-permission | 1 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 17 | `src-laeringsportal-plis-tjenestepliktige` | SRC - Læringsportal PLIS tjenestepliktige | status=unverified; pilot=not-reviewed; publication=needs-permission | 1 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 18 | `src-tiltakskort-02-bistandsanmodning-og-oppdragsanalyse` | SRC - Tiltakskort 02 Bistandsanmodning og oppdragsanalyse | status=unverified; pilot=not-reviewed; publication=needs-permission | 1 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 19 | `src-tiltakskort-03-innsats` | SRC - Tiltakskort 03 Innsats | status=unverified; pilot=not-reviewed; publication=needs-permission | 1 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 20 | `src-tiltakskort-alvorlig-ulykke-eller-dod-eget-personell` | SRC - Tiltakskort alvorlig ulykke eller død eget personell | status=unverified; pilot=not-reviewed; publication=needs-permission | 1 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |
| 21 | `src-vedlegg-a-styrende-dokumenter` | SRC - Vedlegg A styrende dokumenter | status=unverified; pilot=not-reviewed; publication=needs-permission | 1 | Approve public pilot, replace dependencies, or remove/rewrite dependent content. |

## Per-source owner review worksheets

### 1. `src-sjekkliste-fig-og-figp` — SRC - Sjekkliste FIG og FIGP

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 71.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:fig-etterinnsats-klargjoring`
- `card:fig-for-innsats`
- `card:posisjonsrapport-kart-kompass-gps`
- `card:kjoretoy-transportberedskap`
- `card:kontaminert-utstyr-handtering`
- `checklist:fig-for-innsats`
- `checklist:fig-for-innsats:item:kontakt-beredskapsvakt`
- `checklist:fig-for-innsats:item:fremmoteliste`
- `checklist:fig-for-innsats:item:personell-skikkethet-sikkerhet-helse`
- `checklist:fig-for-innsats:item:personlig-utstyr`
- `checklist:fig-for-innsats:item:fellesutstyr`
- `checklist:fig-for-innsats:item:kjoretoy-klar`
- `checklist:fig-for-innsats:item:drivstoff-beredskap`
- `checklist:fig-for-innsats:item:logg-startet`
- `checklist:fig-for-innsats:item:klar-til-distrikt`
- `checklist:for-utrykning-samlet`
- `checklist:for-utrykning-samlet:item:kontakt-og-mottak`
- `checklist:for-utrykning-samlet:item:personell-og-sikkerhet`
- `checklist:for-utrykning-samlet:item:utstyr-kjoretoy-drivstoff`
- `checklist:personlig-utstyr-for-utrykning`
- `checklist:personlig-utstyr-for-utrykning:item:bekledning`
- `checklist:personlig-utstyr-for-utrykning:item:hjelm-og-verneutstyr`
- `checklist:personlig-utstyr-for-utrykning:item:personlig-samband-og-lys`
- `checklist:personlig-utstyr-for-utrykning:item:mangler-notert-lokalt`
- `checklist:lagsutstyr-for-utrykning`
- `checklist:lagsutstyr-for-utrykning:item:fellesutstyr-komplett`
- `checklist:lagsutstyr-for-utrykning:item:kjoretoy-og-lasting`
- `checklist:lagsutstyr-for-utrykning:item:mangler-notert-lokalt`
- `checklist:fig-under-innsats`
- `checklist:fig-under-innsats:item:ressurs-og-utstyr-revurdert`
- `checklist:fig-under-innsats:item:kontinuerlig-personellkontroll`
- `checklist:fig-under-innsats:item:mat-vann-hvile`
- `checklist:fig-under-innsats:item:avlosning-planlagt`
- `checklist:fig-etter-innsats`
- `checklist:fig-etter-innsats:item:personellkontroll-etter`
- `checklist:fig-etter-innsats:item:skade-eller-personellskade-eskalering`
- `checklist:fig-etter-innsats:item:teknisk-gjennomgang`
- `checklist:fig-etter-innsats:item:utstyr-retur`
- `checklist:fig-etter-innsats:item:mbk-materiellberedskap-vurdert`
- `checklist:fig-etter-innsats:item:skriftlig-rapport-paminnelse`
- `checklist:fig-etter-innsats:item:tap-skade-melding-paminnelse`
- `checklist:mbk-kjoretoy`
- `checklist:mbk-kjoretoy:item:status-kontrollert`
- `checklist:mbk-kjoretoy:item:mangler-skade-forbruk-notert-lokalt`
- `checklist:mbk-kjoretoy:item:klarstatus-rapportert`
- `checklist:mbk-brann-slange:item:mangler-skade-forbruk-notert-lokalt`
- `checklist:mbk-telt`
- `checklist:mbk-telt:item:status-kontrollert`
- `checklist:mbk-telt:item:mangler-skade-forbruk-notert-lokalt`
- `checklist:mbk-telt:item:klarstatus-rapportert`
- `checklist:mbk-varmeapparat`
- `checklist:mbk-varmeapparat:item:status-kontrollert`
- `checklist:mbk-varmeapparat:item:mangler-skade-forbruk-notert-lokalt`
- `checklist:mbk-varmeapparat:item:klarstatus-rapportert`
- `checklist:mbk-pumpe:item:mangler-skade-forbruk-notert-lokalt`
- `checklist:mbk-aggregat`
- `checklist:mbk-aggregat:item:status-kontrollert`
- `checklist:mbk-aggregat:item:mangler-skade-forbruk-notert-lokalt`
- `checklist:mbk-aggregat:item:klarstatus-rapportert`
- `checklist:mbk-belysning`
- `checklist:mbk-belysning:item:status-kontrollert`
- `checklist:mbk-belysning:item:mangler-skade-forbruk-notert-lokalt`
- `checklist:mbk-belysning:item:klarstatus-rapportert`
- `checklist:mbk-samband`
- `checklist:mbk-samband:item:status-kontrollert`
- `checklist:mbk-samband:item:mangler-skade-forbruk-notert-lokalt`
- `checklist:mbk-personlig-utstyr`
- `checklist:mbk-personlig-utstyr:item:status-kontrollert`
- `checklist:mbk-personlig-utstyr:item:mangler-skade-forbruk-notert-lokalt`
- `checklist:mbk-personlig-utstyr:item:klarstatus-rapportert`
- `training:lett-lastebil-forer`

### 2. `src-tiltakskort-etter-innsats` — SRC - Tiltakskort etter innsats

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 35.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:fig-etterinnsats-klargjoring`
- `checklist:fig-etter-innsats`
- `checklist:fig-etter-innsats:item:personellkontroll-etter`
- `checklist:fig-etter-innsats:item:skade-eller-personellskade-eskalering`
- `checklist:fig-etter-innsats:item:defuse-emosjonell-gjennomgang`
- `checklist:fig-etter-innsats:item:efok-oppfolging-vurdert`
- `checklist:fig-etter-innsats:item:teknisk-gjennomgang`
- `checklist:fig-etter-innsats:item:vask`
- `checklist:fig-etter-innsats:item:mbk-materiellberedskap-vurdert`
- `checklist:fig-etter-innsats:item:skriftlig-rapport-paminnelse`
- `checklist:fig-etter-innsats:item:oppmote-reisegrunnlag-komplett`
- `checklist:fig-etter-innsats:item:tap-skade-melding-paminnelse`
- `checklist:fig-etter-innsats:item:dimittering-avklart-distrikt`
- `checklist:mbk-kjoretoy`
- `checklist:mbk-kjoretoy:item:status-kontrollert`
- `checklist:mbk-kjoretoy:item:mangler-skade-forbruk-notert-lokalt`
- `checklist:mbk-kjoretoy:item:vask-service-karantene-vurdert`
- `checklist:mbk-brann-slange`
- `checklist:mbk-brann-slange:item:status-kontrollert`
- `checklist:mbk-brann-slange:item:vask-service-karantene-vurdert`
- `checklist:mbk-brann-slange:item:klarstatus-rapportert`
- `checklist:mbk-telt:item:vask-service-karantene-vurdert`
- `checklist:mbk-varmeapparat`
- `checklist:mbk-varmeapparat:item:vask-service-karantene-vurdert`
- `checklist:mbk-pumpe`
- `checklist:mbk-pumpe:item:status-kontrollert`
- `checklist:mbk-pumpe:item:vask-service-karantene-vurdert`
- `checklist:mbk-pumpe:item:klarstatus-rapportert`
- `checklist:mbk-aggregat`
- `checklist:mbk-aggregat:item:vask-service-karantene-vurdert`
- `checklist:mbk-belysning`
- `checklist:mbk-belysning:item:vask-service-karantene-vurdert`
- `checklist:mbk-personlig-utstyr`
- `checklist:mbk-personlig-utstyr:item:status-kontrollert`
- `checklist:mbk-personlig-utstyr:item:vask-service-karantene-vurdert`

### 3. `src-kommunikasjons-og-sambandsdiagram` — SRC - Kommunikasjons og sambandsdiagram

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 33.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:sambandsplan-start`
- `checklist:tilfluktsrom-teknisk-status:item:samband`
- `checklist:fig-for-innsats`
- `checklist:fig-for-innsats:item:fellesutstyr`
- `checklist:fig-for-innsats:item:ordre-tilbakelesing`
- `checklist:fig-for-innsats:item:klar-til-distrikt`
- `checklist:for-utrykning-samlet`
- `checklist:for-utrykning-samlet:item:ordre-logg-og-klar`
- `checklist:personlig-utstyr-for-utrykning:item:personlig-samband-og-lys`
- `checklist:lagsutstyr-for-utrykning`
- `checklist:lagsutstyr-for-utrykning:item:samband-testet`
- `checklist:fig-under-innsats`
- `checklist:fig-under-innsats:item:ankomst-og-egen-sikkerhet`
- `checklist:fig-under-innsats:item:kontakt-innsatsleder`
- `checklist:fig-under-innsats:item:overtakelse-fra-annen-enhet`
- `checklist:fig-under-innsats:item:anmod-ekstra-ressurser`
- `checklist:fig-under-innsats:item:lopende-dialog-innsatsleder`
- `checklist:fig-under-innsats:item:overlevering-avmarsj`
- `checklist:sambandsjekk`
- `checklist:sambandsjekk:item:primaer-kanal-talegruppe-kontrollert`
- `checklist:sambandsjekk:item:fallback-kanal-kontaktmetode-kontrollert`
- `checklist:sambandsjekk:item:kallesignal-avklart`
- `checklist:sambandsjekk:item:il-ko-kontakt-avklart`
- `checklist:sambandsjekk:item:distrikt-beredskapsvakt-kontakt-avklart`
- `checklist:sambandsjekk:item:innsjekkingsintervall-avklart`
- `checklist:sambandsjekk:item:lost-comms-prosedyre-avklart`
- `checklist:sambandsjekk:item:batteri-lading-kontrollert`
- `checklist:mbk-samband`
- `checklist:mbk-samband:item:status-kontrollert`
- `checklist:mbk-samband:item:mangler-skade-forbruk-notert-lokalt`
- `checklist:mbk-samband:item:vask-service-karantene-vurdert`
- `checklist:mbk-samband:item:klarstatus-rapportert`
- `glossary:samband`

### 4. `src-tiltakskort-for-innsats` — SRC - Tiltakskort før innsats

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 26.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:fig-for-innsats`
- `card:kjoretoy-transportberedskap`
- `checklist:fig-for-innsats`
- `checklist:fig-for-innsats:item:kontakt-beredskapsvakt`
- `checklist:fig-for-innsats:item:personell-skikkethet-sikkerhet-helse`
- `checklist:fig-for-innsats:item:vaer-og-farevurdering`
- `checklist:fig-for-innsats:item:forelopig-plan`
- `checklist:for-utrykning-samlet`
- `checklist:for-utrykning-samlet:item:kontakt-og-mottak`
- `checklist:for-utrykning-samlet:item:personell-og-sikkerhet`
- `checklist:for-utrykning-samlet:item:vaer-farer-og-plan`
- `checklist:fig-under-innsats`
- `checklist:fig-under-innsats:item:ankomst-og-egen-sikkerhet`
- `checklist:fig-under-innsats:item:oppmarsjomrade-plassering`
- `checklist:fig-under-innsats:item:kontakt-innsatsleder`
- `checklist:fig-under-innsats:item:overtakelse-fra-annen-enhet`
- `checklist:fig-under-innsats:item:ressurs-og-utstyr-revurdert`
- `checklist:fig-under-innsats:item:anmod-ekstra-ressurser`
- `checklist:fig-under-innsats:item:kontinuerlig-personellkontroll`
- `checklist:fig-under-innsats:item:kontinuerlig-risikovurdering`
- `checklist:fig-under-innsats:item:lopende-dialog-innsatsleder`
- `checklist:fig-under-innsats:item:ny-analyse-ved-endring`
- `checklist:fig-under-innsats:item:mat-vann-hvile`
- `checklist:fig-under-innsats:item:avlosning-planlagt`
- `checklist:fig-under-innsats:item:psykososial-efok-trigger`
- `checklist:fig-under-innsats:item:overlevering-avmarsj`

### 5. `src-operativt-konsept-for-sivilforsvaret` — SRC - Operativt konsept for Sivilforsvaret

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 25.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:tilfluktsrom-klargjoring`
- `card:oppdragsanalyse`
- `card:ledelse-kommando-kontroll`
- `card:presse-og-mediahandtering`
- `card:etikk-og-rollegrenser`
- `card:evakueringsstotte`
- `card:tilfluktsrom-offentlig-beredskap`
- `card:rute-og-evakueringsvei`
- `checklist:tilfluktsrom-teknisk-status`
- `checklist:tilfluktsrom-teknisk-status:item:ansvar`
- `checklist:tilfluktsrom-teknisk-status:item:ventilasjon`
- `checklist:tilfluktsrom-teknisk-status:item:nodstrom`
- `checklist:mbk-telt`
- `checklist:mbk-telt:item:status-kontrollert`
- `checklist:mbk-varmeapparat`
- `checklist:mbk-varmeapparat:item:status-kontrollert`
- `checklist:mbk-aggregat`
- `checklist:mbk-aggregat:item:status-kontrollert`
- `checklist:mbk-belysning`
- `checklist:mbk-belysning:item:status-kontrollert`
- `protection:offentlig-tilfluktsrom`
- `protection:sivil-beskyttelse-generelt`
- `glossary:KO`
- `glossary:pumpe`
- `glossary:tilfluktsrom`

### 6. `src-5-punktsordre` — SRC - 5-punktsordre

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 19.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:fem-punktsordre`
- `checklist:fig-for-innsats`
- `checklist:fig-for-innsats:item:forelopig-plan`
- `checklist:fig-for-innsats:item:ordre-tilbakelesing`
- `checklist:fig-for-innsats:item:logg-startet`
- `checklist:for-utrykning-samlet`
- `checklist:for-utrykning-samlet:item:vaer-farer-og-plan`
- `checklist:for-utrykning-samlet:item:ordre-logg-og-klar`
- `checklist:fig-under-innsats`
- `checklist:fig-under-innsats:item:oppmarsjomrade-plassering`
- `checklist:fig-under-innsats:item:overtakelse-fra-annen-enhet`
- `checklist:fig-under-innsats:item:kontinuerlig-risikovurdering`
- `checklist:fig-under-innsats:item:ny-analyse-ved-endring`
- `checklist:fig-under-innsats:item:overlevering-avmarsj`
- `glossary:samband`
- `glossary:samleplass`
- `glossary:ordre`
- `glossary:KO`
- `glossary:innsatsleder`

### 7. `src-renhold-etter-branninnsats` — SRC - Renhold etter branninnsats

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 16.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:kontaminert-utstyr-handtering`
- `checklist:mbk-kjoretoy`
- `checklist:mbk-kjoretoy:item:vask-service-karantene-vurdert`
- `checklist:mbk-brann-slange`
- `checklist:mbk-brann-slange:item:vask-service-karantene-vurdert`
- `checklist:mbk-telt`
- `checklist:mbk-telt:item:vask-service-karantene-vurdert`
- `checklist:mbk-varmeapparat:item:vask-service-karantene-vurdert`
- `checklist:mbk-pumpe`
- `checklist:mbk-pumpe:item:vask-service-karantene-vurdert`
- `checklist:mbk-aggregat:item:vask-service-karantene-vurdert`
- `checklist:mbk-belysning:item:vask-service-karantene-vurdert`
- `checklist:mbk-samband`
- `checklist:mbk-samband:item:vask-service-karantene-vurdert`
- `checklist:mbk-personlig-utstyr`
- `checklist:mbk-personlig-utstyr:item:vask-service-karantene-vurdert`

### 8. `src-eksempler-pa-utlegg-fra-pumpe` — SRC - Eksempler på utlegg fra pumpe

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 11.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:flom-pumpe-start`
- `card:brann-vannforsyning-slange`
- `card:flom-pumpe-vannforsyning`
- `card:pumpe-stromfare`
- `checklist:mbk-brann-slange`
- `checklist:mbk-brann-slange:item:status-kontrollert`
- `checklist:mbk-brann-slange:item:mangler-skade-forbruk-notert-lokalt`
- `checklist:mbk-pumpe`
- `checklist:mbk-pumpe:item:status-kontrollert`
- `checklist:mbk-pumpe:item:mangler-skade-forbruk-notert-lokalt`
- `glossary:pumpe`

### 9. `src-psykososial-oppfolging-og-kollegastotte` — SRC - Psykososial oppfølging og kollegastøtte

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 10.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:psykososial-forstehjelp`
- `card:psykologisk-forstehjelp-sekvens`
- `card:psykososial-ikke-tvungen-debrief`
- `checklist:fig-under-innsats`
- `checklist:fig-under-innsats:item:psykososial-efok-trigger`
- `checklist:fig-etter-innsats`
- `checklist:fig-etter-innsats:item:defuse-emosjonell-gjennomgang`
- `checklist:fig-etter-innsats:item:efok-oppfolging-vurdert`
- `checklist:fig-etter-innsats:item:oppfolging`
- `glossary:psykososial`

### 10. `src-tiltakskort-under-innsats` — SRC - Tiltakskort under innsats

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 7.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:skogbrann-startkort`
- `card:brann-vannforsyning-slange`
- `card:sok-og-redning-startkort`
- `card:flom-pumpe-vannforsyning`
- `card:skred-sikkerhet-samvirke`
- `card:pumpe-stromfare`
- `card:kontaminert-utstyr-handtering`

### 11. `src-vedlegg-c-operative-forhold` — SRC - Vedlegg C operative forhold

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 6.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:sok-og-redning-startkort`
- `card:soketeig-sektor`
- `card:skred-sikkerhet-samvirke`
- `card:evakueringsstotte`
- `card:posisjonsrapport-kart-kompass-gps`
- `card:rute-og-evakueringsvei`

### 12. `src-tiltakskort-psykologisk-forstehjelp` — SRC - Tiltakskort psykologisk førstehjelp

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 4.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:psykososial-forstehjelp`
- `card:psykologisk-forstehjelp-sekvens`
- `card:psykososial-ikke-tvungen-debrief`
- `glossary:psykososial`

### 13. `src-enhetlig-ledelsessystem-els` — SRC - Enhetlig ledelsessystem ELS

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 3.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:obbo-beslutningssloyfe`
- `card:ledelse-kommando-kontroll`
- `glossary:innsatsleder`

### 14. `src-tiltakskort-04-alvorlig-ulykke-dod-og-mental-forstehjelp` — SRC - Tiltakskort 04 Alvorlig ulykke død og mental førstehjelp

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 3.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:alvorlig-ulykke-dod-eget-personell`
- `card:akutt-113-livreddende-forstehjelp`
- `glossary:skadde`

### 15. `src-samleplass-skadde` — SRC - Samleplass skadde

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 2.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:samleplass-skadde-start`
- `card:samleplass-skadde-utvidet`

### 16. `src-grunnsats-personlig-utrustning-april-2026` — SRC - Grunnsats personlig utrustning april 2026

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 1.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `checklist:personlig-utstyr-for-utrykning`

### 17. `src-laeringsportal-plis-tjenestepliktige` — SRC - Læringsportal PLIS tjenestepliktige

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 1.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `checklist:fig-for-innsats`

### 18. `src-tiltakskort-02-bistandsanmodning-og-oppdragsanalyse` — SRC - Tiltakskort 02 Bistandsanmodning og oppdragsanalyse

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 1.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:oppdragsanalyse`

### 19. `src-tiltakskort-03-innsats` — SRC - Tiltakskort 03 Innsats

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 1.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `checklist:fig-under-innsats`

### 20. `src-tiltakskort-alvorlig-ulykke-eller-dod-eget-personell` — SRC - Tiltakskort alvorlig ulykke eller død eget personell

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 1.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:alvorlig-ulykke-dod-eget-personell`

### 21. `src-vedlegg-a-styrende-dokumenter` — SRC - Vedlegg A styrende dokumenter

- Current blocker: `status=unverified`, `pilotReviewStatus=not-reviewed`, `publicationStatus=needs-permission`.
- Reference count: 1.
- Owner decision status: `pending-source-owner-decision`.
- Required outcome before this source stops blocking strict mode:
  1. `verified` + `approved-for-pilot` + `approved-public`, **or**
  2. replace every dependent reference with an approved-public source, **or**
  3. remove/rewrite every dependent card/checklist/training/glossary item so it no longer relies on this source.
- Sanitized decision note: _pending_.

Referenced labels/slugs:

- `card:ledelse-kommando-kontroll`

## Implementation checklist after owner decisions exist

1. Update the relevant Obsidian `source-extracts/SRC - ...md` frontmatter with only the sanitized decision fields above, or update curated content to replace/remove dependent references.
2. Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null
npm run build:content
npm run --silent report:source-governance:strict
```

3. Confirm blocker count decreases only for sources with real approval/replacement/removal evidence.
4. Update `docs/source-governance-remediation-queue.md` with the new sanitized disposition counts.
5. Commit the batch separately. Include generated source artifacts only if `npm run import:obsidian` changed them.

## Current Task 10 status

Task 10 is now started, but Batch A remains blocked pending real source-owner decisions. This packet is not approval evidence by itself.

