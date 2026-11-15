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
    <div className={`p-5 rounded-2xl bg-space-800/80 border-2 ${outline.className}`} style={outline.style}>
      <div className="flex items-center gap-2 text-gray-300 mb-3">
        <Icon size={20} />
        <span className="text-base">{crewLabels[metricKey]}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-bold font-mono tracking-tight" style={{ color }}>
          {formatMetricValue(metricKey, vitals)}
        </span>
        <span className="text-gray-400">{def.unit}</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-semibold" style={{ color }}>{crewStatusLabel[status]}</span>
        {range && (
          <span className="text-gray-500 font-mono text-right">
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
