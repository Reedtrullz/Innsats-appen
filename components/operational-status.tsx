import { OfflineStatus } from './offline-status';
import { OperationalStatusPills } from './operational-status-pills';

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
}: {
  variant?: 'compact' | 'full';
  showConnectivity?: boolean;
  className?: string;
}) {
  if (variant === 'compact') {
    return (
      <div className={className}>
        <OfflineStatus compact>
          <OperationalStatusPills compact className="gap-1.5" />
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
