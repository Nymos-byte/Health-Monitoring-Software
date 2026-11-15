import { getVitalStatus, getStatusColor } from '../utils/helpers';
import { metricDefinitions, getMetricRange } from '../data/mockData';
import { metricIcons, formatMetricValue, criticalKey, getStatusOutline } from '../utils/metrics';

export default function VitalCards({
  title,
  metrics,
  vitals,
  astronautId,
  selectedSection,
  context,
  blinking,
  size = 'md',
}) {
  if (!metrics.length) return null;
  const large = size === 'lg';

  return (
    <div>
      {title && (
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{title}</h3>
      )}
      <div
        className={`grid gap-3 ${
          large ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5'
        }`}
      >
        {metrics.map((key) => {
          const def = metricDefinitions[key];
          const Icon = metricIcons[key];
          const status = getVitalStatus(key, vitals?.[key], selectedSection, context);
          const color = getStatusColor(status);
          const range = getMetricRange(key, selectedSection, context);
          const outline = getStatusOutline(
            status,
            blinking.has(criticalKey(astronautId, selectedSection, key))
          );

          return (
            <div
              key={key}
              className={`bg-space-800/80 border-2 rounded-xl ${large ? 'p-4' : 'p-3'} ${outline.className}`}
              style={outline.style}
            >
              <div className="flex items-center gap-2 mb-1.5 text-gray-400">
                <Icon size={large ? 16 : 14} className="shrink-0" />
                <span className="text-xs uppercase tracking-wider truncate">{def.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`${large ? 'text-3xl' : 'text-xl'} font-bold font-mono`}
                  style={{ color: status === 'nominal' ? 'var(--color-white)' : color }}
                >
                  {formatMetricValue(key, vitals)}
                </span>
                <span className="text-xs text-gray-500">{def.unit}</span>
              </div>
              {range && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                  range {range.min}–{range.max}
                  {range.adjustedFor && (
                    <span className="text-vital-cyan">· {range.adjustedFor.toLowerCase()} activity</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
