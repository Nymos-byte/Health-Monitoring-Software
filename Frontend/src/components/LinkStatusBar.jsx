import { SatelliteDish, WifiOff, Container, RefreshCw } from 'lucide-react';

const SYNC_NOTICE_MS = 8000;

function formatElapsed(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

// Downlink state for the selected phase: live, or out of contact with data held onboard
export default function LinkStatusBar({ link, now, buffered, forced, onToggleLinkLoss }) {
  const live = link.status === 'aos';
  const recentSync = live && link.lastSync && now - link.lastSync.at < SYNC_NOTICE_MS;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 rounded-xl border text-sm ${
        live ? 'bg-space-800/60 border-space-600' : 'bg-vital-orange/10 border-vital-orange/50'
      }`}
    >
      {live ? (
        <span className="flex items-center gap-2 text-vital-green font-medium">
          <SatelliteDish size={16} />
          Live downlink
        </span>
      ) : (
        <span className="flex items-center gap-2 text-vital-orange font-medium">
          <WifiOff size={16} />
          No signal for {formatElapsed(now - link.since)}
        </span>
      )}

      {live ? (
        <span className="text-gray-400">
          {link.profile.route} · {link.profile.bandwidth} bandwidth · delay {link.profile.delayLabel}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-gray-300">
          <Container size={15} className="text-vital-orange" />
          {buffered} samples stored onboard, sent when the link returns · showing last received data
        </span>
      )}

      {recentSync && (
        <span className="flex items-center gap-1.5 text-vital-cyan">
          <RefreshCw size={14} />
          Synced {link.lastSync.count} buffered samples
        </span>
      )}

      {/* Demo only: hold this phase's link down */}
      <button
        onClick={onToggleLinkLoss}
        className={`ml-auto px-2.5 py-1 text-xs rounded-md border whitespace-nowrap cursor-pointer ${
          forced ? 'border-vital-orange text-vital-orange' : 'border-space-600 text-gray-500 hover:text-white'
        }`}
      >
        {forced ? 'Restore link' : 'Simulate link loss'}
      </button>
    </div>
  );
}
