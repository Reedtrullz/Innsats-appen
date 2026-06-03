# DPIA / personvernkonsekvensvurdering checklist

Use this checklist before any feature processes personal data, patient data, precise person-linked location, live tracking, user accounts, backend storage or synchronization. MVP features should normally answer "not applicable" because they must not collect persondata.

## Screening

- What personal data or patient data is collected, inferred, displayed, exported or stored?
- Who are the data subjects, and are vulnerable people involved?
- Is the data necessary for the stated operational purpose, or can the feature use anonymous/local-only alternatives?
- Does the feature introduce auth, sync, push, live tracking, backend storage or external processors?

## Assessment

- Define legal basis, purpose limitation and data minimization.
- Define retention, reset, deletion, export and access rights.
- Assess confidentiality, integrity and availability risks, including device loss and accidental disclosure through exports.
- Describe safeguards: access control, encryption, logging, review routines, user warnings and incident response.
- Confirm that no private/skjermede tilfluktsrom data is compiled into public static/generated content.

## Approval

Do not ship until the DPIA conclusion, residual risk owner, security architecture references and operational governance decision are documented.