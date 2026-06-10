import { OfflineStatus } from './offline-status';
import { OperationalStatusPills } from './operational-status-pills';

/**
 * Single shared operational-status surface: live connectivity/freshness on one
 * line and the capability pills on the next. Used for the global shell chrome
 * (compact) and the in-page status sections (full). Replaces the previous
 * split between a connectivity banner and separately-rendered capability pills,
 * which read contradictorily ("Offline" pill next to "Online" text).
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
  const compact = variant === 'compact';
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {showConnectivity ? <OfflineStatus compact={compact} /> : null}
      <OperationalStatusPills compact={compact} className={compact ? 'gap-1.5' : 'justify-between gap-1'} />
    </div>
  );
}
