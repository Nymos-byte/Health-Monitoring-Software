import { metricDefinitions, getMetricRange } from '../data/mockData';
import { getVitalStatus, getStatusColor } from '../utils/helpers';
import {
  metricIcons,
  crewLabels,
  crewStatusLabel,
  formatMetricValue,
  getStatusOutline,
} from '../utils/metrics';

// Large, glanceable reading for the crew display (live or as recorded at the end of an activity)
export default function CrewVitalTile({ metricKey, vitals, sectionId, context, blinking = false }) {
  const def = metricDefinitions[metricKey];
  const Icon = metricIcons[metricKey];
  const status = getVitalStatus(metricKey, vitals[metricKey], sectionId, context);
  const color = getStatusColor(status);
  const range = getMetricRange(metricKey, sectionId, context);
  const outline = getStatusOutline(status, blinking);

  return (
    <div className={`p-4 rounded-2xl bg-space-800/80 border-2 ${outline.className}`} style={outline.style}>
      <div className="flex items-center gap-2 text-gray-300 mb-2">
        <Icon size={18} className="shrink-0" />
        <span className="text-base truncate">{crewLabels[metricKey]}</span>
      </div>
      <div className="flex items-baseline flex-wrap gap-x-1.5">
        <span className="text-4xl font-bold font-mono tracking-tight leading-none" style={{ color }}>
          {formatMetricValue(metricKey, vitals)}
        </span>
        <span className="text-gray-400">{def.unit}</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-1 text-sm">
        <span className="font-semibold" style={{ color }}>{crewStatusLabel[status]}</span>
        {range && (
          <span className="text-gray-500 font-mono text-right text-xs">
            {range.min}–{range.max}
            {range.adjustedFor && (
              <span className="block text-[11px] text-vital-cyan">{range.adjustedFor} activity</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
