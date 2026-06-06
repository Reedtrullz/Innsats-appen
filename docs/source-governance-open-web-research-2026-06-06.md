# Source governance open-web research — 2026-06-06

## Scope

Task 10 follow-up after source-owner review was blocked. The user authorized open-web research as sufficient evidence: if the exact document, or the information inside the source document, can be found on the open web, the source may be approved or replaced.

This packet is privacy-safe. It records only source IDs, titles, public URLs, dispositions, and sanitized notes. It does not include raw local source bodies, private file paths, credentials, person data, or private approval evidence.

## Method

- Searched the open web with emphasis on official/authoritative public sources: `sivilforsvaret.no`, `dsb.no`, `dsa.no`, `helsedirektoratet.no`, `lovdata.no`, and `regjeringen.no`.
- Verified primary URLs with HTTP HEAD/GET checks; the primary URLs used below returned HTTP 200 during this pass.
- Classified each blocker as:
  - `exact-public-doc`: exact public document, exact public section, or exact public course/public page found.
  - `strong-public-replacement`: not the same standalone file title, but official public sources cover the same operational/training information strongly enough for the current app claim.
  - `public-replacement-approved`: narrower/partial public replacement accepted under the user's instruction; keep the app wording constrained to the public claim and re-check on future content expansion.
  - `not-approved-dereferenced`: exact/public replacement was not strong enough; the source was removed from referenced pilot/public content.

## Result summary

- Original strict blockers: 55 referenced sources.
- Approved from open-web evidence: 53 currently referenced sources.
- Not approved / dereferenced: 2 sources.
  - `src-tiltakskort-01-vaktbytte`: no exact or strong public source found; removed from the only referenced curated source list.
  - `src-mobile-forsterkningsenheter-mfe`: public MFE replacement evidence was found, but the local source body triggered the sensitive contact-reference detector during validation; curated references were moved to public MFE10/tactical sources and this source remains internal-only/rejected-for-pilot.
- Code fix made while applying this: the Obsidian importer now reads `source_status` before generic `status`, because source-extract notes use `status: source` for note classification and `source_status` for governance status.

## Key public evidence groups

| Evidence group | Primary public URL | Main coverage |
| --- | --- | --- |
| Taktiske tiltak for Sivilforsvaret, 2019 | https://www.sivilforsvaret.no/siteassets/dokumenter/taktiske-tiltak-forsivilforsvaret-2019.pdf | FIG/FIGP checklists, tiltakskort før/under/etter innsats, 5-punktsordre, samband/Nødnett, pumpeutlegg, CBRNE, MRE/MFE/RAD checklists, psykologisk førstehjelp, alvorlig ulykke/død eget personell, samleplass skadde. |
| Renhold etter branninnsats | https://www.sivilforsvaret.no/siteassets/dokumenter/rutine-renhold-innsatsuniform---endelig.pdf | Public routine for cleaning Sivilforsvaret innsatsuniform/kjeledress after fire response. |
| Veileder om enhetlig ledelsessystem (ELS) | https://www.dsb.no/siteassets/rapporter-og-publikasjoner/veileder/veileder-om-enhetlig-ledelsessystem-els.pdf | ELS, OBBO, innsatsledelse, command/signal, five-point order concepts. |
| Bistand fra Sivilforsvaret | https://www.sivilforsvaret.no/dette-er-sivilforsvaret/bistand-fra-sivilforsvaret/ | Public assistance-request flow, beredskapsvakt contact path, and mission-analysis context. |
| Bruk av Sivilforsvarets tjenestepliktige i fredstid | https://www.sivilforsvaret.no/siteassets/dokumenter/bruk_av_tjenestepliktige_i_sivilforsvaret_i_fredstid.pdf | Governance for use of service-duty personnel, assistance, legal thresholds, and public note that Operativt konsept is available internally via Kanalen. |
| Sivilforsvarets personlige bekledning og utrustning | https://www.sivilforsvaret.no/mannskap-i-sivilforsvaret/personlig-utrustning/ | Public page linking current personal-equipment grunnsats documents. |
| Læringsportal PLIS — Tjenestepliktige | https://content.clicklearn.dk/public/5096c1c4-b5b3-4a28-ae85-9f66be3fb0f0/L%C3%A6ringsportal-PLIS-Tjenestepliktige.1044/L%C3%A6ringsportal-PLIS-Tjenestepliktige.htm | Exact public PLIS learning portal content. |
| Helsedirektoratet psychosocial crisis guidance | https://www.helsedirektoratet.no/veiledere/psykososiale-tiltak-ved-kriser-ulykker-og-katastrofer | Authoritative public replacement for psychosocial follow-up and psychological first-aid claims. |
| Sivilbeskyttelsesloven | https://lovdata.no/dokument/NL/lov/2010-06-25-45 | Governing law for Sivilforsvaret and civil protection. |
| Sivilforsvarsforskriften | https://lovdata.no/dokument/SF/forskrift/2022-02-14-253 | Governing regulation for service, operations, equipment, and assistance. |
| Veileder til sivilforsvarsforskriften | https://www.dsb.no/siteassets/rapporter-og-publikasjoner/veileder/veileder-til-sivilforsvarsforskriften/ | DSB guidance for the regulation, including assistance request process. |
| Sikkerhetsbestemmelser for Sivilforsvaret | https://www.sivilforsvaret.no/siteassets/dokumenter/sikkerhetsbestemmelser-for-sivilforsvaret.pdf | Public safety rules for training, exercises and operations. |
| Konseptutredning Sivilforsvaret | https://www.regjeringen.no/contentassets/69aa5a82b6a446ed91b81efb0003ebbf/konseptutredning_sivilforsvaret.pdf | Public strategy/structure replacement for operational concept and MFE/organization references. |
| DSA atomberedskap / måleberedskap pages | https://www.dsa.no/atomberedskap/hva-gjor-vi-pa-dsa | DSA role, Radnett, Sivilforsvarets radiac patrols, national measurement preparedness. |
| DSA atom preparedness in Norway | https://www.dsa.no/atomberedskap/atomberedskap-i-norge | Kriseutvalget, DSA role, national nuclear preparedness organization. |
| DSA protective actions | https://www.dsa.no/atomberedskap/hva-kan-jeg-gjore | Public protection advice for atom incidents/radioactive fallout. |
| Helsedirektoratet iodine-tablet guidance | https://www.helsedirektoratet.no/tema/legemidler/jodtabletter-til-kommunene | Public iodine tablet preparedness and authority-guidance source. |
| DSA radiation concepts | https://www.dsa.no/om-straling-og-radioaktivitet/straledoser | Public dose/radiation concept definitions. |
| Official Sivilforsvaret course catalog | https://www.sivilforsvaret.no/kurs-og-opplaring/sivilforsvarskurs/ | Public catalog for course-list replacements and current course pages. |
| FIG10 course plan | https://www.sivilforsvaret.no/siteassets/kursplaner/kursplan-fig-10.pdf | Exact public course plan. |
| FIG20 course plan | https://www.sivilforsvaret.no/siteassets/kursplaner/kursplan-fig-20.pdf | Exact public course plan. |
| FIG30 course plan | https://www.sivilforsvaret.no/siteassets/kursplaner/kursplan-fig-30.pdf | Exact public course plan. |
| FIG31 course plan | https://www.sivilforsvaret.no/siteassets/kursplaner/kursplan-fig-31.pdf | Exact public course plan. |
| RAD10 course plan | https://www.sivilforsvaret.no/siteassets/kursplaner/kursplan-grunnopplaring-rad-10.pdf | Exact public course plan and public replacement for several RADIAC claims. |
| RAD30 course page | https://www.sivilforsvaret.no/kurs-og-opplaring/sivilforsvarskurs/opplaring-av-lagforer-i-radiac-maletjeneste-rad-30/ | Exact public course page. |
| MRE10 course plan | https://www.sivilforsvaret.no/siteassets/kursplaner/kursplan-grunnopplaring-mre-10.pdf | Exact public course plan and public MRE/CBRN replacement. |
| MRE30 course plan | https://www.sivilforsvaret.no/siteassets/kursplaner/kursplan-opparing-av-lagforer-og-mre-leder-mre-30-2.pdf | Exact public course plan. |
| MFE10 public course page | https://www.sivilforsvaret.no/kurs-og-opplaring/sivilforsvarskurs/opplaring-av-mannskap-i-mobile-forsterkningsenheter-mfe-10/ | Public MFE training/capability replacement. |
| SPS41 CBRN/E course plan | https://www.sivilforsvaret.no/siteassets/kursplaner/kursplan-samvirke-pa-forurenset-skadested-cbrne-sps-41.pdf | Exact public course plan. |
| ATV instructor course plan | https://www.sivilforsvaret.no/siteassets/kursplaner/kursplan_atv_instruktor.pdf | Public ATV replacement where legacy source said ATB. |
| Boat-driver instructor course plan | https://www.sivilforsvaret.no/siteassets/kursplaner/kursplan-for-opplaring-av-instruktor-som-skal-foresta-opplaring-av-forer-av-bat.pdf | Public boat-driver training replacement. |
| CBRNE person-injury guideline | https://www.helsedirektoratet.no/retningslinjer/handtering-av-cbrne-hendelser-med-personskade/CBRNE-hendelser%20med%20personskade%20%E2%80%93%20Nasjonal%20faglig%20retningslinje.pdf | Authoritative RN/CBRNE life-saving and patient-safety replacement. |

## Disposition table

| Source ID | Disposition | Primary evidence |
| --- | --- | --- |
| `src-sjekkliste-fig-og-figp` | exact-public-doc | Taktiske tiltak for Sivilforsvaret |
| `src-tiltakskort-etter-innsats` | exact-public-doc | Taktiske tiltak for Sivilforsvaret |
| `src-kommunikasjons-og-sambandsdiagram` | public-replacement-approved | Taktiske tiltak for Sivilforsvaret / ELS |
| `src-tiltakskort-for-innsats` | exact-public-doc | Taktiske tiltak for Sivilforsvaret |
| `src-operativt-konsept-for-sivilforsvaret` | public-replacement-approved | Konseptutredning Sivilforsvaret / public tactical and ELS material |
| `src-5-punktsordre` | strong-public-replacement | ELS guide and Taktiske tiltak |
| `src-renhold-etter-branninnsats` | exact-public-doc | Sivilforsvaret renhold routine |
| `src-eksempler-pa-utlegg-fra-pumpe` | exact-public-doc | Taktiske tiltak for Sivilforsvaret |
| `src-psykososial-oppfolging-og-kollegastotte` | public-replacement-approved | Helsedirektoratet psychosocial crisis guidance |
| `src-tiltakskort-under-innsats` | exact-public-doc | Taktiske tiltak for Sivilforsvaret |
| `src-vedlegg-c-operative-forhold` | public-replacement-approved | Taktiske tiltak / ELS / safety rules |
| `src-tiltakskort-psykologisk-forstehjelp` | exact-public-doc | Taktiske tiltak plus Helsedirektoratet guidance |
| `src-enhetlig-ledelsessystem-els` | exact-public-doc | DSB ELS guide |
| `src-tiltakskort-04-alvorlig-ulykke-dod-og-mental-forstehjelp` | strong-public-replacement | Taktiske tiltak plus psychological first-aid guidance |
| `src-samleplass-skadde` | exact-public-doc | Taktiske tiltak for Sivilforsvaret |
| `src-grunnsats-personlig-utrustning-april-2026` | exact-public-doc | Sivilforsvaret personal-equipment page/current grunnsats |
| `src-laeringsportal-plis-tjenestepliktige` | exact-public-doc | Public ClickLearn PLIS portal |
| `src-tiltakskort-02-bistandsanmodning-og-oppdragsanalyse` | strong-public-replacement | Bistand fra Sivilforsvaret / sivilforsvarsforskrift guidance |
| `src-tiltakskort-03-innsats` | strong-public-replacement | Taktiske tiltak for Sivilforsvaret |
| `src-tiltakskort-alvorlig-ulykke-eller-dod-eget-personell` | exact-public-doc | Taktiske tiltak for Sivilforsvaret |
| `src-vedlegg-a-styrende-dokumenter` | strong-public-replacement | Lovdata law/regulation and DSB guidance |
| `src-bestemmelse-radiacmaletjeneste-del-i` | strong-public-replacement | RAD10 course plan and DSA measurement preparedness |
| `src-veileder-for-sivilforsvarets-renseenheter-cbrn` | public-replacement-approved | MRE10/MRE30 course plans and SPS41 public material |
| `src-mobile-forsterkningsenheter-mfe` | not-approved-dereferenced | MFE10 public course page and Konseptutredning found as replacements, but the local source body is internal-only because validation detected contact-reference text. |
| `src-veileder-radiacmaletjeneste-del-ii` | public-replacement-approved | DSA measurement preparedness / RAD10 public course material |
| `src-tiltakskort-cbrne` | exact-public-doc | Taktiske tiltak for Sivilforsvaret |
| `src-atomberedskap-i-norge-og-sivilforsvarets-rolle` | strong-public-replacement | DSA atomberedskap pages |
| `src-jodtabletter-i-sivilforsvaret` | public-replacement-approved | Helsedirektoratet/DSA iodine guidance |
| `src-samvirke-pa-forurenset-skadested-cbrne-sps41` | exact-public-doc | SPS41 CBRN/E course plan |
| `src-sjekkliste-mobil-renseenhet-mre` | exact-public-doc | Taktiske tiltak for Sivilforsvaret |
| `src-tiltakskort-05-stotte-av-mfe` | public-replacement-approved | MFE10 public course page / MFE public capability material |
| `src-den-nasjonale-maleberedskapen` | strong-public-replacement | DSA measurement preparedness pages |
| `src-grunnopplaering-mfe-10-mannskap` | strong-public-replacement | MFE10 public course page |
| `src-grunnopplaering-rad-10-mannskap` | exact-public-doc | RAD10 course plan |
| `src-opplaering-lagforer-og-leder-mre30` | exact-public-doc | MRE30 course plan |
| `src-opplaering-lagforer-radiac-rad30` | exact-public-doc | RAD30 public course page |
| `src-opplaering-mannskap-mre10` | exact-public-doc | MRE10 course plan |
| `src-sentrale-stralebegreper` | strong-public-replacement | DSA radiation concept pages |
| `src-sjekkliste-mobil-forsterkningsenhet-mfe` | exact-public-doc | Taktiske tiltak for Sivilforsvaret |
| `src-sjekkliste-radiaclag-rad` | exact-public-doc | Taktiske tiltak for Sivilforsvaret |
| `src-slik-gjor-vi-ved-radioaktivt-nedfall` | strong-public-replacement | DSA protective-actions guidance |
| `src-tiltakskort-06-oppsettende-mfe-distrikt` | public-replacement-approved | MFE10 public course page / MFE public capability material |
| `src-kursplan-grunnkurs-fig10` | exact-public-doc | FIG10 course plan |
| `src-vedlegg-b-kurs-i-sivilforsvaret` | strong-public-replacement | Sivilforsvaret course catalog and linked public course pages |
| `src-livreddende-tiltak-ved-rn-hendelse` | strong-public-replacement | National CBRNE person-injury guideline / SPS41 public course plan |
| `src-opplaering-bruker-av-sikringsutstyr` | public-replacement-approved | Sikkerhetsbestemmelser for Sivilforsvaret |
| `src-opplaering-forer-av-atb` | public-replacement-approved | Public ATV instructor course plan; treat ATB as legacy/typo alias only for this app claim |
| `src-opplaering-forer-av-bat` | strong-public-replacement | Public boat-driver instructor course plan |
| `src-opplaering-lagforer-fig-figp-fig20` | exact-public-doc | FIG20 course plan |
| `src-opplaering-leder-fig-figp-fig30` | exact-public-doc | FIG30 course plan |
| `src-opplaering-materiellansvarlig-fig` | public-replacement-approved | Sivilforsvaret course catalog / FIG course references to MAF50 |
| `src-opplaeringsplan-for-beredskapsvakt` | public-replacement-approved | Bistand fra Sivilforsvaret / LIA32 public course page |
| `src-oving-og-lokal-opplaering-i-sivilforsvaret` | public-replacement-approved | Sikkerhetsbestemmelser / public training-governance material |
| `src-tiltakskort-01-vaktbytte` | not-approved-dereferenced | No exact or strong public source found. Removed from `glossary:beredskapsvakt` references instead of approving. |
| `src-videregaende-kurs-ledere-og-nestledere-fig31` | exact-public-doc | FIG31 course plan |

## Caveats and next governance rule

The sources classified as `public-replacement-approved` are acceptable for the current public-pilot gate only because the app's dependent claims are narrow and public-facing. If future work expands those cards/checklists with details that are not present in the cited public evidence, the source must be re-reviewed or the new claim must be backed by a new public/owner-approved source.
