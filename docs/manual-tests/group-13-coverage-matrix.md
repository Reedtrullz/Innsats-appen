# Group 13 manual and real-device coverage matrix

| Task | Script | Automated overlap | Required manual/physical evidence | Status boundary |
| --- | --- | --- | --- | --- |
| Task 377 | `task-377-flom-pumpe.md` | Search/card/offline E2E supports cache confidence | Manual flom/pumpe scenario pass/fail with screenshots | Manual scenario required |
| Task 378 | `task-378-sar-ettersokning.md` | Search/card/map E2E supports navigation confidence | Manual SAR/ettersøkning flow and local-only map notes | Manual scenario required |
| Task 379 | `task-379-cbrne.md` | Content and offline E2E supports card/module access | Manual CBRNE warning/stop-criteria review | Manual scenario required |
| Task 380 | `task-380-radiac-nedfall.md` | Content/offline E2E supports RADIAC routes | Manual RADIAC/nedfall checklist and warning review | Manual scenario required |
| Task 381 | `task-381-alvorlig-ulykke-psykologisk-forstehjelp.md` | Search/card E2E supports route access | Manual serious-accident/psychological first aid flow | Manual scenario required |
| Task 382 | `task-382-etter-innsats-mbk.md` | MBK/unit/export tests support correctness | Manual after-action MBK flow | Manual scenario required |
| Task 383 | `task-383-offline-use.md` | Offline Playwright covers service worker/cache/fallback | Manual offline smoke on target device/browser | Manual device evidence recommended |
| Task 384 | `task-384-rain-gloves-darkness-stress.md` | Field-mode/touch-target tests support design | Wet/glove/dark/stress observation notes | Requires field-condition run |
| Task 385 | `task-385-iphone-safari-real-device.md` | None equivalent | iPhone Safari screenshots/log | Requires physical iPhone or real-device lab |
| Task 386 | `task-386-android-chrome-real-device.md` | Chromium mobile proxy only | Android Chrome screenshots/log | Requires physical Android or real-device lab |
| Task 387 | `task-387-install-to-home-screen.md` | Manifest/service-worker tests assert start_url `/` and standalone display | OS-level install and standalone launch evidence for `/` home command surface with links to `/hurtigkort`, `/sok`, `/oppdrag`, `/data-pa-enheten` | Requires physical device |
| Task 388 | `task-388-low-connectivity.md` | Playwright offline tests support cache behavior | Weak network/cellular/captive-portal style evidence | Requires physical/network lab |
| Task 389 | `task-389-update-after-offline.md` | SW update unit/E2E supports update prompt | Two-build offline-then-update run evidence | Requires physical device or staged deployment |

Task 376 is automated import/export roundtrip coverage in `tests/e2e/local-data-import-export-roundtrip.spec.ts`; it is not the browser compatibility matrix. Supplemental browser coverage lives in `browser-compatibility-smoke-matrix.md`.

Physical-device tasks cannot be completed by Chromium emulation alone. Any final pass for tasks 385-389 requires physical device or real-device cloud-lab evidence.
