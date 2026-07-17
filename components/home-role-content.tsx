'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { FieldModeQuickToggle } from '@/components/field-mode-quick-toggle';
import { QuickActionButton, SectionCard } from '@/components/ui/operational-primitives';
import { OperationalIcon } from '@/components/ui/operational-icons';
import { useRole } from '@/lib/role/role-context';
import { ROLE_GROUP_CANONICAL_ROLE, ROLE_GROUP_LABELS, type RoleGroup } from '@/lib/role/role-groups';
import type { LocalProfileRole } from '@/lib/privacy/local-profile';
import type { MissionContext } from '@/lib/mission/schemas';

const phaseLinks = [
  { label: 'Før innsats', href: '/for', description: 'Avklar risiko, kilder og første tiltak før oppstart.' },
  { label: 'Under innsats', href: '/under', description: 'Finn operative sjekker og tiltak mens situasjonen pågår.' },
  { label: 'Etter innsats', href: '/etter', description: 'Støtt debrief, oppfølging og læring etter hendelsen.' },
] as const;

const defaultCriticalLinks = [
  { label: 'Alvorlig ulykke / død', description: 'Sikring, varsling og ivaretakelse', href: '/kort/alvorlig-ulykke-dod-eget-personell', icon: 'alert', tone: 'critical' },
  { label: 'Psykologisk førstehjelp', description: 'Akutt støtte og oppfølging', href: '/kort/psykologisk-forstehjelp-sekvens', icon: 'shield', tone: 'sky' },
  { label: 'Samband / ordre', description: 'Mal for 5-punktsordre og samband', href: '/oppdrag#5-punktsordre', icon: 'radio', tone: 'warning' },
  { label: 'Søk i kildebelagte tiltak', description: 'Søk i alle tiltak og kilder', href: '/sok', icon: 'search', tone: 'slate' },
] as const;

const heroButtonBase = 'group flex min-h-20 items-center justify-between gap-4 px-5 py-4 text-left font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white';
const heroButtonLarge = 'group flex min-h-[4rem] items-center justify-between gap-4 px-5 py-4 text-left font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white';

interface HeroButton {
  label: string;
  sublabel: string;
  href: string;
  icon: 'chevron' | 'search' | 'alert' | 'shield' | 'radio';
  tone: 'primary' | 'white' | 'critical' | 'slate';
}

function HeroButtonComponent({ button, large }: { button: HeroButton; large?: boolean }) {
  const cls = large ? heroButtonLarge : heroButtonBase;
  if (button.tone === 'primary') {
    return (
      <Link className={`${cls} bg-[#082F49] hover:bg-sky-950`} href={button.href}>
        <span>
          <span className="block text-base">{button.label}</span>
          <span className="mt-1 block text-xs font-semibold text-sky-100">{button.sublabel}</span>
        </span>
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#082F49]">
          <OperationalIcon name={button.icon} className="h-5 w-5" />
        </span>
      </Link>
    );
  }
  if (button.tone === 'critical') {
    return (
      <Link className={`${cls} bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:outline-[#38bdf8]`} href={button.href}>
        <span>
          <span className="block text-base">{button.label}</span>
          <span className="mt-1 block text-xs font-semibold text-[var(--text-muted)]">{button.sublabel}</span>
        </span>
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--critical-surface)] text-[var(--critical-fg)]">
          <OperationalIcon name="alert" className="h-5 w-5" />
        </span>
      </Link>
    );
  }
  const iconBg = button.tone === 'slate' ? 'border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-primary)]' : 'bg-[var(--info-surface)] text-[var(--info-fg)]';
  return (
    <Link className={`${cls} bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:outline-[#38bdf8]`} href={button.href}>
      <span>
        <span className="block text-base">{button.label}</span>
        <span className="mt-1 block text-xs font-semibold text-[var(--text-muted)]">{button.sublabel}</span>
      </span>
      <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <OperationalIcon name={button.icon} className="h-5 w-5" />
      </span>
    </Link>
  );
}

function HeroButtons({ activeMission }: { activeMission?: MissionContext | null }) {
  const buttons: HeroButton[] = [
    activeMission
      ? { label: 'Fortsett oppdrag', sublabel: activeMission.title, href: '/oppdrag', icon: 'chevron', tone: 'primary' }
      : { label: 'Start oppdrag', sublabel: 'Opprett lokal oppdragstavle.', href: '/oppdrag/ny', icon: 'chevron', tone: 'primary' },
    { label: 'Finn tiltak', sublabel: 'Søk etter det du må gjøre.', href: '/sok?intent=action', icon: 'search', tone: 'slate' },
  ];

  return (
    <div className="grid gap-px bg-white/10 sm:grid-cols-2" data-primary-actions="home">
      {buttons.map((button) => (
        <HeroButtonComponent key={`${button.href}-${button.label}`} button={button} large />
      ))}
    </div>
  );
}

const roleLensOptions: RoleGroup[] = ['leder', 'lagforer', 'mannskap', 'ikke-valgt'];

function HomeRoleLens() {
  const { roleGroup, setPreferredRole } = useRole();

  function selectRoleLens(group: RoleGroup) {
    setPreferredRole((ROLE_GROUP_CANONICAL_ROLE[group] ?? 'ikke-valgt') as LocalProfileRole);
  }

  return (
    <fieldset role="radiogroup" className="rounded-2xl bg-white/10 p-2 ring-1 ring-white/15" aria-label="Rollevisning">
      <legend className="sr-only">Rollevisning</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {roleLensOptions.map((group) => (
          <label
            key={group}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-3 py-2 text-center text-xs font-bold ring-1 ${roleGroup === group ? 'bg-white text-[#082F49] ring-white' : 'bg-white/5 text-white ring-white/15 hover:bg-white/15'}`}
          >
            <input
              type="radio"
              name="home-role-lens"
              value={group}
              checked={roleGroup === group}
              onChange={() => selectRoleLens(group)}
              className="sr-only"
            />
            {ROLE_GROUP_LABELS[group]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CriticalNowSection({ roleGroup }: { roleGroup: RoleGroup }) {
  const links = useMemo(() => {
    switch (roleGroup) {
      case 'leder':
        return [
          { label: 'Alvorlig ulykke / død', description: 'Sikring, varsling og ivaretakelse', href: '/kort/alvorlig-ulykke-dod-eget-personell', icon: 'alert', tone: 'critical' },
          { label: 'Psykologisk førstehjelp', description: 'Akutt støtte og oppfølging', href: '/kort/psykologisk-forstehjelp-sekvens', icon: 'shield', tone: 'sky' },
          { label: 'Stab / koordinering', description: 'Ledelse, kommando og kontroll', href: '/kort/ledelse-kommando-kontroll', icon: 'radio', tone: 'slate' },
          { label: 'Søk i kildebelagte tiltak', description: 'Søk i alle tiltak og kilder', href: '/sok', icon: 'search', tone: 'slate' },
        ] as const;
      case 'lagforer':
        return defaultCriticalLinks;
      case 'mannskap':
        return [
          { label: 'Alvorlig ulykke / død', description: 'Sikring, varsling og ivaretakelse', href: '/kort/alvorlig-ulykke-dod-eget-personell', icon: 'alert', tone: 'critical' },
          { label: 'Psykologisk førstehjelp', description: 'Akutt støtte og oppfølging', href: '/kort/psykologisk-forstehjelp-sekvens', icon: 'shield', tone: 'sky' },
          { label: 'Samband / ordre', description: 'Mal for 5-punktsordre og samband', href: '/oppdrag#5-punktsordre', icon: 'radio', tone: 'warning' },
          { label: 'Søk i kildebelagte tiltak', description: 'Søk i alle tiltak og kilder', href: '/sok', icon: 'search', tone: 'slate' },
        ] as const;
      default:
        return defaultCriticalLinks;
    }
  }, [roleGroup]);

  return (
    <SectionCard labelledBy="critical-shortcuts-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="critical-shortcuts-heading" className="text-xl font-black tracking-tight">Snarveier</h2>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <QuickActionButton key={link.href} href={link.href} label={link.label} description={link.description} icon={link.icon} tone={link.tone} />
        ))}
      </div>
    </SectionCard>
  );
}

export function HomeRoleContent({ activeMission = null }: { activeMission?: MissionContext | null }) {
  const { roleGroup } = useRole();

  const heroTitle = roleGroup === 'leder'
    ? 'Lederoversikt'
    : roleGroup === 'mannskap'
      ? 'Enkel tilgang'
      : 'Hva trenger du nå?';
  const heroSubtitle = roleGroup === 'mannskap'
    ? 'Enkel tilgang til tiltak og søk.'
    : 'Lokal, kildebelagt beslutningsstøtte.';

  return (
    <div>
      <section className="overflow-hidden rounded-[1.35rem] bg-[#082F49] text-white shadow-sm">
        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="mt-1 text-3xl font-black tracking-tight">Beredskapsboka</h1>
              <p className="mt-1 text-sm font-semibold leading-6 text-sky-100">{heroSubtitle}</p>
            </div>
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <OperationalIcon name="shield" className="h-7 w-7 text-sky-100" />
            </span>
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight">{heroTitle}</h2>
            {activeMission ? <p className="mt-1 text-sm font-bold text-sky-100">Aktivt: {activeMission.title}</p> : null}
          </div>
        </div>
        <HeroButtons activeMission={activeMission} />
        <div className="border-t border-white/10 p-3">
          <HomeRoleLens />
        </div>
      </section>

      <FieldModeQuickToggle />

      <div className="mt-5">
        <CriticalNowSection roleGroup={roleGroup} />
      </div>

      {roleGroup === 'lagforer' ? (
        <div className="mt-4">
          <SectionCard labelledBy="sector-heading">
            <h2 id="sector-heading" className="text-xl font-black tracking-tight text-[var(--text-primary)]">Sektor/teig</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--text-muted)]">Sektorverktøy for avgrensning, søk og kartlegging.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <QuickActionButton href="/kort/soketeig-sektor" label="Søkesektor og teig" description="Avgrensning, søk og kartlegging" icon="search" tone="sky" />
              <QuickActionButton href="/kart" label="Kart" description="Offline-kart og orientering" icon="shield" tone="slate" />
            </div>
          </SectionCard>
        </div>
      ) : null}

      <details className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <summary className="min-h-11 cursor-pointer list-none text-base font-black text-[var(--text-primary)]">Faser og kilder</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {phaseLinks.map((link) => (
            <Link
              key={link.href}
              aria-label={link.label}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm font-bold text-[var(--text-primary)] transition hover:border-[#38bdf8]/40 hover:bg-[var(--info-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#38bdf8]"
              href={link.href}
            >
              <span className="block text-base font-black">{link.label}</span>
              <span className="mt-1 block text-sm font-semibold text-[var(--text-muted)]">{link.description}</span>
            </Link>
          ))}
          <Link className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-base font-black text-[var(--text-primary)] transition hover:border-[#38bdf8]/40 hover:bg-[var(--info-surface)]" href="/kilder">Kilder</Link>
          <Link className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-base font-black text-[var(--text-primary)] transition hover:border-[#38bdf8]/40 hover:bg-[var(--info-surface)]" href="/hjelp">Hjelp og demo</Link>
        </div>
      </details>
    </div>
  );
}
