import { useState } from 'react';
import { AlertTriangle, Info, AlertOctagon, Check } from 'lucide-react';
import { formatTimestamp } from '../utils/helpers';
import { SECTIONS } from '../data/mockData';

const severityConfig = {
  critical: { icon: AlertOctagon, color: 'text-vital-red', border: 'border-l-vital-red' },
  warning: { icon: AlertTriangle, color: 'text-vital-orange', border: 'border-l-vital-orange' },
  info: { icon: Info, color: 'text-vital-cyan', border: 'border-l-vital-cyan' },
};
const severityOrder = { critical: 0, warning: 1, info: 2 };

export default function AlertsPanel({ alerts, selectedSection, onAcknowledge }) {
  const [scope, setScope] = useState('phase');

  const visible = alerts
    .filter((a) => scope === 'all' || a.section === selectedSection)
    .sort((a, b) => {
      if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
      if (severityOrder[a.severity] !== severityOrder[b.severity])
        return severityOrder[a.severity] - severityOrder[b.severity];
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  const openCount = visible.filter((a) => !a.acknowledged).length;

  return (
    <div className="bg-space-800/80 border border-space-600 rounded-xl p-3">
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Alerts
          {openCount > 0 && <span className="ml-2 text-vital-red">{openCount} open</span>}
        </h3>
        <div className="flex text-[11px] bg-space-900/80 rounded-md p-0.5">
          {[
            ['phase', 'This phase'],
            ['all', 'All'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setScope(id)}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                scope === id ? 'bg-space-600 text-white' : 'text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 && (
        <p className="text-xs text-gray-500 px-1 py-3">No alerts for this phase.</p>
      )}

      <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
        {visible.map((alert) => {
          const config = severityConfig[alert.severity];
          const Icon = config.icon;
          const phase = SECTIONS.find((s) => s.id === alert.section);

          return (
            <div
              key={alert.id}
              className={`flex gap-2.5 p-2.5 rounded-lg bg-space-900/50 border-l-2 ${config.border} ${
                alert.acknowledged ? 'opacity-40' : ''
              }`}
            >
              <Icon size={15} className={`${config.color} mt-0.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-200 leading-snug">{alert.message}</p>
                <p className="text-[10px] text-gray-500 mt-1">
                  {alert.astronaut} · {formatTimestamp(alert.timestamp)}
                  {scope === 'all' && phase && ` · ${phase.shortName}`}
                </p>
              </div>
              {!alert.acknowledged && (
                <button
                  onClick={() => onAcknowledge(alert.id)}
                  className="shrink-0 self-start p-1 rounded-md hover:bg-space-600 transition-colors cursor-pointer"
                  title="Acknowledge alert"
                >
                  <Check size={14} className="text-gray-400" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
