# Manual test scripts

These scripts cover Group 13 manual, field-condition and real-device testing for Beredskapsboka/Innsats.

## Safe test data

Use safe test data only: no persondata, no patientdata, no names, no phone numbers, no IDs, no private/skjermede locations, no real Nødnett group lists, no sensitive samband tables and no official operational plans. Use generic locations such as `Trondheim sentrum`, `Testområde A` or `Øvingsområde offentlig`.

## Required run metadata

Every run records build SHA, visible content version/offline cache version, URL, device model, OS/browser version, network condition, orientation, execution environment and date. Use role/team alias or device-lab run ID only — no tester names, initials, emails or phone numbers. If a physical device or real-device cloud lab is used, state that explicitly.

## Evidence and privacy

Collect screenshots or video only when they contain sanitized data. Store result logs using `result-log-template.md`. Do not upload or share logs that include operationally sensitive information.

## Real-device boundary

Chromium emulation and Playwright tests are useful automated proxies, but browser compatibility rows beyond Chromium, iPhone Safari, Android Chrome, Add to Home Screen, rain/gloves/darkness/stress, low-connectivity and update-after-offline behavior require named browser/device or real-device lab evidence before they can be called passed.
