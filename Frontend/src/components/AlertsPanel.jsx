import { AlertTriangle, Info, AlertOctagon, Check } from 'lucide-react';
import { formatTimestamp } from '../utils/helpers';

const severityConfig = {
  critical: {
    icon: AlertOctagon,
    bg: 'bg-vital-red/10 border-vital-red/30',
    iconColor: 'text-vital-red',
    label: 'CRITICAL',
    labelColor: 'text-vital-red',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-vital-yellow/10 border-vital-yellow/30',
    iconColor: 'text-vital-yellow',
    label: 'WARNING',
    labelColor: 'text-vital-yellow',
  },
  info: {
    icon: Info,
    bg: 'bg-vital-cyan/10 border-vital-cyan/30',
    iconColor: 'text-vital-cyan',
    label: 'INFO',
    labelColor: 'text-vital-cyan',
  },
};

export default function AlertsPanel({
  alerts,
  selectedSection = 'space_station',
  onAcknowledge,
}) {
  // Prioritize alerts belonging to the currently active section, then sort by severity and timestamp
  const sortedAlerts = [...alerts].sort((a, b) => {
    const aInSec = a.section === selectedSection ? 0 : 1;
    const bInSec = b.section === selectedSection ? 0 : 1;
    if (aInSec !== bInSec) return aInSec - bInSec;

    const severityOrder = { critical: 0, warning: 1, info: 2 };
    if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
    if (severityOrder[a.severity] !== severityOrder[b.severity])
      return severityOrder[a.severity] - severityOrder[b.severity];
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="bg-space-800/80 backdrop-blur border border-space-600 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle size={16} className="text-vital-yellow" />
          Mission Alerts
        </h3>
        {unacknowledgedCount > 0 && (
          <span className="px-2 py-0.5 bg-vital-red/20 text-vital-red text-xs font-mono rounded-full">
            {unacknowledgedCount} active
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {sortedAlerts.map((alert) => {
          const config = severityConfig[alert.severity];
          const Icon = config.icon;
          const isCurrentSection = alert.section === selectedSection;

          return (
            <div
              key={alert.id}
              className={`
                p-3 rounded-lg border transition-all duration-300
                ${config.bg}
                ${alert.acknowledged ? 'opacity-50' : ''}
                ${alert.severity === 'critical' && !alert.acknowledged ? 'pulse-critical' : ''}
                ${isCurrentSection ? 'ring-1 ring-nasa-blue/50' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                <Icon size={18} className={`${config.iconColor} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-mono font-bold ${config.labelColor} tracking-wider`}
                    >
                      {config.label}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-space-900/70 text-gray-400">
                      {alert.section}
                    </span>
                    <span className="text-[10px] text-gray-500">•</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {formatTimestamp(alert.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{alert.message}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{alert.astronaut}</p>
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="shrink-0 p-1.5 rounded-lg bg-space-700/50 hover:bg-space-600 border border-space-500 transition-colors cursor-pointer"
                    title="Acknowledge alert"
                  >
                    <Check size={14} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
