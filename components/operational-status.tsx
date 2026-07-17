import { OfflineStatus } from './offline-status';
import { OperationalStatusPills } from './operational-status-pills';
import Link from 'next/link';

/**
 * Single shared operational-status surface. Compact (shell chrome) shows one
 * connectivity line with the capability pills and diagnostics folded behind a
 * disclosure, so the chrome costs a single row; live stale/fallback warnings
 * stay visible. Full (in-page status sections) keeps connectivity and pills
 * on separate, always-visible lines.
 */
export function OperationalStatus({
  variant = 'full',
  showConnectivity = true,
  className = '',
  showBoundary = false,
}: {
  variant?: 'compact' | 'full';
  showConnectivity?: boolean;
  className?: string;
  showBoundary?: boolean;
}) {
  if (variant === 'compact') {
    return (
      <div className={className}>
        <OfflineStatus compact>
          <OperationalStatusPills compact className="gap-1.5" />
          {showBoundary ? (
            <p className="mt-2 text-[0.7rem] font-semibold text-[var(--warning-fg)]">
              Beslutningsstøtte, ikke et offisielt kommandosystem. Data lagres bare lokalt; ikke legg inn persondata.{' '}
              <Link href="/begrensninger" className="inline-flex min-h-11 items-center font-black underline underline-offset-2">Les grensene</Link>
            </p>
          ) : null}
        </OfflineStatus>
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {showConnectivity ? <OfflineStatus /> : null}
      <OperationalStatusPills className="justify-between gap-1" />
    </div>
  );
}
