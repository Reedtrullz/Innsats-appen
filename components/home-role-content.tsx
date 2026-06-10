'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { OperationalStatus } from '@/components/operational-status';
import { QuickActionButton, SectionCard } from '@/components/ui/operational-primitives';
import { OperationalIcon } from '@/components/ui/operational-icons';
import { useRole } from '@/lib/role/role-context';
import { ROLE_GROUP_CANONICAL_ROLE, ROLE_GROUP_LABELS, type RoleGroup } from '@/lib/role/role-groups';
import type { LocalProfileRole } from '@/lib/privacy/local-profile';

const phaseLinks = [
  { label: 'Før innsats', href: '/for', description: 'Avklar risiko, kilder og første tiltak før oppstart.' },
  { label: 'Under innsats', href: '/under', description: 'Finn operative sjekker og tiltak mens situasjonen pågår.' },
  { label: 'Etter innsats', href: '/etter', description: 'Støtt debrief, oppfølging og læring etter hendelsen.' },
] as const;

const defaultCriticalLinks = [
  { label: 'Alvorlig ulykke / død', description: 'Sikring, varsling og ivaretakelse', href: '/kort/alvorlig-ulykke-dod-eget-personell', icon: 'alert', tone: 'critical' },
  { label: 'Psykologisk førstehjelp', description: 'Akutt støtte og oppfølging', href: '/kort/psykologisk-forstehjelp-sekvens', icon: 'shield', tone: 'sky' },
  { label: 'Samband / ordre', description: 'Mal for 5-punktsordre og samband', href: '/kort/sambandsplan-start', icon: 'radio', tone: 'warning' },
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
      <Link className={`${cls} bg-white text-[#082F49] hover:bg-sky-50 focus-visible:outline-[#082F49]`} href={button.href}>
        <span>
          <span className="block text-base">{button.label}</span>
          <span className="mt-1 block text-xs font-semibold text-slate-600">{button.sublabel}</span>
        </span>
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700">
          <OperationalIcon name="alert" className="h-5 w-5" />
        </span>
      </Link>
    );
  }
  const iconBg = button.tone === 'slate' ? 'border border-slate-200 bg-white text-[#082F49]' : 'bg-sky-50 text-sky-800';
  return (
    <Link className={`${cls} bg-white text-[#082F49] hover:bg-sky-50 focus-visible:outline-[#082F49]`} href={button.href}>
      <span>
        <span className="block text-base">{button.label}</span>
        <span className="mt-1 block text-xs font-semibold text-slate-600">{button.sublabel}</span>
      </span>
      <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <OperationalIcon name={button.icon} className="h-5 w-5" />
      </span>
    </Link>
  );
}

function HeroButtons({ roleGroup }: { roleGroup: RoleGroup }) {
  const large = roleGroup === 'mannskap';

  const buttons = useMemo<HeroButton[]>(() => {
    switch (roleGroup) {
      case 'leder':
        return [
          { label: 'Fortsett/start oppdrag', sublabel: 'Oppdrag, sjekkliste og logg.', href: '/oppdrag', icon: 'chevron', tone: 'primary' },
          { label: 'Samband / ordre', sublabel: 'Mal for 5-punktsordre og samband.', href: '/kort/sambandsplan-start', icon: 'radio', tone: 'white' },
          { label: 'Søk', sublabel: 'Kort, moduler og kilder.', href: '/sok', icon: 'search', tone: 'slate' },
        ];
      case 'lagforer':
        return [
          { label: 'Fortsett/start oppdrag', sublabel: 'Oppdrag, sjekkliste og logg.', href: '/oppdrag', icon: 'chevron', tone: 'primary' },
          { label: 'Søk', sublabel: 'Kort, moduler og kilder.', href: '/sok', icon: 'search', tone: 'slate' },
          { label: 'Finn kritisk tiltak', sublabel: 'Gå rett til første tiltak.', href: '/kort/alvorlig-ulykke-dod-eget-personell', icon: 'alert', tone: 'critical' },
        ];
      case 'mannskap':
        return [
          { label: 'Hurtigkort', sublabel: 'Første tiltak og enkel tilgang.', href: '/hurtigkort', icon: 'shield', tone: 'primary' },
          { label: 'Søk', sublabel: 'Kort, moduler og kilder.', href: '/sok', icon: 'search', tone: 'slate' },
        ];
      default:
        return [
          { label: 'Fortsett/start oppdrag', sublabel: 'Oppdrag, sjekkliste og logg.', href: '/oppdrag', icon: 'chevron', tone: 'primary' },
          { label: 'Finn kritisk tiltak', sublabel: 'Gå rett til første tiltak.', href: '/kort/alvorlig-ulykke-dod-eget-personell', icon: 'alert', tone: 'critical' },
          { label: 'Søk', sublabel: 'Kort, moduler og kilder.', href: '/sok', icon: 'search', tone: 'slate' },
        ];
    }
  }, [roleGroup]);

  const gridCols = buttons.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3';

  return (
    <div className={`grid gap-px bg-white/10 ${gridCols}`} data-primary-actions="home">
      {buttons.map((button) => (
        <HeroButtonComponent key={button.href} button={button} large={large} />
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
      <div className="grid gap-2 sm:grid-cols-4">
        {roleLensOptions.map((group) => (
          <label
            key={group}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-3 py-2 text-center text-xs font-black ring-1 ${roleGroup === group ? 'bg-white text-[#082F49] ring-white' : 'bg-white/5 text-white ring-white/15 hover:bg-white/15'}`}
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
          { label: 'Samband / ordre', description: 'Mal for 5-punktsordre og samband', href: '/kort/sambandsplan-start', icon: 'radio', tone: 'warning' },
          { label: 'Søk i kildebelagte tiltak', description: 'Søk i alle tiltak og kilder', href: '/sok', icon: 'search', tone: 'slate' },
        ] as const;
      default:
        return defaultCriticalLinks;
    }
  }, [roleGroup]);

  return (
    <SectionCard className="bg-white" labelledBy="critical-shortcuts-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="critical-shortcuts-heading" className="text-xl font-black tracking-tight">Kritisk nå</h2>
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

export function HomeRoleContent() {
  const { roleGroup } = useRole();

  const statusPillsAbove = roleGroup === 'leder';
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
      {statusPillsAbove ? (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <OperationalStatus showConnectivity={false} />
        </div>
      ) : null}

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
          </div>
          <HomeRoleLens />
        </div>
        <HeroButtons roleGroup={roleGroup} />
      </section>

      {!statusPillsAbove ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <OperationalStatus showConnectivity={false} />
        </div>
      ) : null}

      <div className="mt-5">
        <CriticalNowSection roleGroup={roleGroup} />
      </div>

      {roleGroup === 'lagforer' ? (
        <div className="mt-4">
          <SectionCard className="bg-white" labelledBy="sector-heading">
            <h2 id="sector-heading" className="text-xl font-black tracking-tight">Sektor/teig</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">Sektorverktøy for avgrensning, søk og kartlegging.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <QuickActionButton href="/kort/soketeig-sektor" label="Søkesektor og teig" description="Avgrensning, søk og kartlegging" icon="search" tone="sky" />
              <QuickActionButton href="/kart" label="Kart" description="Offline-kart og orientering" icon="shield" tone="slate" />
            </div>
          </SectionCard>
        </div>
      ) : null}

      <details className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="min-h-11 cursor-pointer list-none text-base font-black text-slate-950">Faser og kilder</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {phaseLinks.map((link) => (
            <Link
              key={link.href}
              aria-label={link.label}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 transition hover:border-sky-200 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49]"
              href={link.href}
            >
              <span className="block text-base font-black">{link.label}</span>
              <span className="mt-1 block text-sm font-semibold text-slate-600">{link.description}</span>
            </Link>
          ))}
          <Link className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-base font-black text-slate-900" href="/kilder">Kilder</Link>
          <Link className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-base font-black text-slate-900" href="/hjelp">Hjelp og demo</Link>
        </div>
      </details>
    </div>
  );
}
