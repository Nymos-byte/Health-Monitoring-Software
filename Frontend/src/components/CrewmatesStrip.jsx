import { getStatusColor, getMemberStatus, getVitalStatus } from '../utils/helpers';
import { crewStatusLabel, formatMetricValue, getStatusOutline } from '../utils/metrics';
import { metricDefinitions, getVitalContext, getEnvironment } from '../data/mockData';

// Readings worth a glance for a crewmate: pulse and oxygen, plus suit pressure on a spacewalk
function glanceMetrics(member) {
  return member.task.eva
    ? ['heart_rate_bpm', 'spo2_pct', 'suit_pressure_psia']
    : ['heart_rate_bpm', 'spo2_pct'];
}

// The rest of the mission crew: where they are, what they do and their key readings
export default function CrewmatesStrip({ member, crewData }) {
  const crewmates = Object.values(crewData).filter(
    (m) => m.missionId === member.missionId && m.id !== member.id
  );
  if (!crewmates.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm uppercase tracking-wider text-gray-500">Your crew</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {crewmates.map((m) => {
          const status = getMemberStatus(m);
          const color = getStatusColor(status);
          const vitals = m.data.currentVitals;
          const context = getVitalContext(m, vitals);
          const outline = getStatusOutline(status, false);

          return (
            <div
              key={m.id}
              className={`p-4 rounded-2xl bg-space-800/80 border-2 ${outline.className}`}
              style={outline.style}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-semibold text-white">{m.name}</span>
                <span className="font-semibold" style={{ color }}>{crewStatusLabel[status]}</span>
              </div>
              <p className="text-sm text-gray-400">
                {m.task.name}
                {m.env !== member.env && ` · ${getEnvironment(m.env).shortName}`}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {glanceMetrics(m).map((key) => {
                  const s = getVitalStatus(key, vitals[key], m.env, context);
                  return (
                    <span key={key} className="flex items-baseline gap-1.5">
                      <span className="text-xs text-gray-500">{metricDefinitions[key].label.split(' (')[0]}</span>
                      <span
                        className="text-2xl font-bold font-mono"
                        style={{ color: s === 'nominal' ? '#f3f4f6' : getStatusColor(s) }}
                      >
                        {formatMetricValue(key, vitals)}
                      </span>
                      <span className="text-xs text-gray-500">{metricDefinitions[key].unit}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
