'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  DEFAULT_FIELD_MODE_SETTINGS,
  FIELD_MODE_STORAGE_EVENT,
  GLOVE_TOUCH_TARGET_PX,
  MIN_TOUCH_TARGET_PX,
  readFieldModeSettings,
  type FieldModeSettings,
} from '@/lib/field-mode/field-mode';
import { readSelectedActiveMissionId, selectActiveMission } from '@/lib/mission/active-mission-selection';
import { listMissions } from '@/lib/mission/local-store';
import type { MissionContext } from '@/lib/mission/schemas';
import { OperationalIcon } from './ui/operational-icons';

export function FieldModeRuntime() {
  const [settings, setSettings] = useState<FieldModeSettings>(DEFAULT_FIELD_MODE_SETTINGS);

  useEffect(() => {
    const apply = () => {
      const next = readFieldModeSettings();
      setSettings(next);
      document.documentElement.dataset.fieldMode = next.enabled ? 'on' : 'off';
      document.documentElement.dataset.fieldGloveMode = next.gloveMode ? 'on' : 'off';
      document.documentElement.dataset.fieldTheme = next.theme;
    };
    apply();
    window.addEventListener('storage', apply);
    window.addEventListener(FIELD_MODE_STORAGE_EVENT, apply);
    return () => {
      window.removeEventListener('storage', apply);
      window.removeEventListener(FIELD_MODE_STORAGE_EVENT, apply);
    };
  }, []);

  if (!settings.enabled) return null;

  return (
    <style>{`
      html[data-field-mode="on"] { color-scheme: ${settings.theme === 'day' ? 'light' : 'dark'}; }
      html[data-field-mode="on"] body { overscroll-behavior-y: contain; -webkit-tap-highlight-color: transparent; }
      html[data-field-mode="on"] a,
      html[data-field-mode="on"] button,
      html[data-field-mode="on"] input,
      html[data-field-mode="on"] select,
      html[data-field-mode="on"] textarea,
      html[data-field-mode="on"] [role="button"] {
        min-height: ${settings.gloveMode ? GLOVE_TOUCH_TARGET_PX : MIN_TOUCH_TARGET_PX}px;
        min-width: ${settings.gloveMode ? GLOVE_TOUCH_TARGET_PX : MIN_TOUCH_TARGET_PX}px;
        touch-action: manipulation;
      }
      html[data-field-mode="on"] input[type="checkbox"],
      html[data-field-mode="on"] input[type="radio"] {
        width: ${settings.gloveMode ? GLOVE_TOUCH_TARGET_PX : MIN_TOUCH_TARGET_PX}px;
        height: ${settings.gloveMode ? GLOVE_TOUCH_TARGET_PX : MIN_TOUCH_TARGET_PX}px;
        flex: 0 0 ${settings.gloveMode ? GLOVE_TOUCH_TARGET_PX : MIN_TOUCH_TARGET_PX}px;
      }
      html[data-field-mode="on"][data-field-theme="night"] body { background: #020617; }
      html[data-field-mode="on"][data-field-theme="night"] body > div,
      html[data-field-mode="on"][data-field-theme="night"] main,
      html[data-field-mode="on"][data-field-theme="night"] header,
      html[data-field-mode="on"][data-field-theme="night"] nav {
        background: #020617 !important;
        border-color: #334155 !important;
        color: #e2e8f0 !important;
      }
      html[data-field-mode="on"][data-field-theme="night"] main [class*="bg-white"],
      html[data-field-mode="on"][data-field-theme="night"] main [class*="bg-slate-50"],
      html[data-field-mode="on"][data-field-theme="night"] main [class*="bg-slate-100"] {
        background: #0f172a !important;
        border-color: #334155 !important;
        color: #e2e8f0 !important;
      }
      html[data-field-mode="on"][data-field-theme="night"] main [class*="text-slate-"],
      html[data-field-mode="on"][data-field-theme="night"] main [class*="text-sky-"],
      html[data-field-mode="on"][data-field-theme="night"] main [class*="text-amber-"] { color: #e2e8f0 !important; }
      html[data-field-mode="on"][data-field-theme="night"] main input,
      html[data-field-mode="on"][data-field-theme="night"] main select,
      html[data-field-mode="on"][data-field-theme="night"] main textarea {
        background: #020617 !important;
        border-color: #475569 !important;
        color: #f8fafc !important;
      }
      html[data-field-mode="on"][data-field-theme="night"] header a,
      html[data-field-mode="on"][data-field-theme="night"] nav a { color: #e2e8f0; }
      html[data-field-mode="on"][data-field-theme="reduced-blue"] body { background: #2b1608; filter: sepia(0.18) saturate(0.85); }
    `}</style>
  );
}

export function ActiveMissionShortcut() {
  const [mission, setMission] = useState<MissionContext | null>(null);
  const pathname = usePathname() ?? '';

  useEffect(() => {
    let active = true;
    listMissions()
      .then((missions) => {
        if (active) setMission(selectActiveMission(missions, readSelectedActiveMissionId()));
      })
      .catch(() => {
        if (active) setMission(null);
      });
    return () => {
      active = false;
    };
  }, []);

  // Redundant on the mission dashboard it links into and on home, where
  // HomeActiveMission renders a richer card.
  const suppressed = pathname === '/' || pathname === '/oppdrag' || pathname.startsWith('/oppdrag/');
  if (!mission || suppressed) return null;

  return (
    <div className="border-b border-[#38bdf8]/30 bg-[var(--surface-elevated)] px-3 py-2" aria-label="Aktivt oppdrag">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
          <OperationalIcon name="briefcase" className="h-4 w-4 shrink-0 text-[#38bdf8]" />
          <span className="truncate">Aktivt lokalt oppdrag klart</span>
        </span>
        <Link href="/oppdrag" className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-[#38bdf8] px-3 font-mono text-xs font-bold text-[#04141f]">Åpne</Link>
      </div>
    </div>
  );
}
