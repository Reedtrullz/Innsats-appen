# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# design-system
- Use navy #082F49 primary, sky blue #0369A1 accent, teal #059669 success, amber #F59E0B warning, red #DC2626 critical, slate text/surfaces, and mostly white/light-gray surfaces with dark navy operational headers. Confidence: 0.85
- Use clean tactical Scandinavian style: rounded cards, high spacing consistency, strong typography, mobile-first layout. Confidence: 0.80

# workflow
- When doing UI polish passes, do not add new features—reorganize and restyle existing components only. Confidence: 0.85
- After any implementation pass, run: npm run typecheck, npm run lint, npm run test, npm run build. Confidence: 0.90

# oppdrag
- Reorder the Oppdrag/mission dashboard hierarchy to: MissionCommandHeader → Next recommended action → MissionQuickActionsGrid → Kritisk nå / Anbefalte tiltak → Progress/signals → Checklist → Advanced/documentation tools. Confidence: 0.85
- Use Nå / Arbeid / Eksport segmented mode control in the mission dashboard, defaulting to Nå which shows only immediate operational context. Confidence: 0.80
- Hash navigation targets (#sjekkliste, #etterrapport, etc.) must switch to the correct mode, open parent details if collapsed, then scroll the target into view. Confidence: 0.75

# ui-components
- Use inline SVG icons for navigation and actions; do not add a heavy icon library dependency. Confidence: 0.75
- Export outputs must use a shared ExportReview pattern: compact success/review card, copy button, raw preview in a collapsed disclosure. Confidence: 0.75
- Use a shared ContextNotice component for repeated local/privacy/export/not-official warning copy; keep blocking validation errors as role="alert". Confidence: 0.70

# accessibility
- Maintain minimum 44px touch targets, semantic landmarks, keyboard navigation, visible focus states, and strong color contrast; do not rely on color alone for critical status. Confidence: 0.80

# privacy
- Preserve MVP constraints: no login, no central incident database, no patient/persondata, no official command-system integration, all mission data stays local in the browser. Confidence: 0.85

