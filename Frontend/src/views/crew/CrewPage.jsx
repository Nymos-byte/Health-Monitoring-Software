import { getStatusColor, getMemberStatus, getVitalStatus } from '../../utils/helpers';
import { crewStatusLabel, crewLabels, formatMetricValue, getStatusOutline } from '../../utils/metrics';
import { metricDefinitions, getVitalContext, getEnvironment } from '../../data/mockData';

// Readings worth a glance for a crewmate: pulse and oxygen, plus suit pressure on a spacewalk
function glanceMetrics(member) {
  return member.task.eva
    ? ['heart_rate_bpm', 'spo2_pct', 'suit_pressure_psia']
    : ['heart_rate_bpm', 'spo2_pct', 'body_temp_c'];
}

// My mission crew, one card each, worst status first
export default function CrewPage({ member, crewData }) {
  const rank = { critical: 0, caution: 1, nominal: 2 };
  const crewmates = Object.values(crewData)
    .filter((m) => m.missionId === member.missionId && m.id !== member.id)
    .map((m) => ({ m, status: getMemberStatus(m) }))
    .sort((a, b) => rank[a.status] - rank[b.status]);

  if (!crewmates.length) {
    return <p className="text-gray-400 text-lg py-8 text-center">No other crew on this mission.</p>;
  }

  return (
    <div className="space-y-3">
      {crewmates.map(({ m, status }) => {
        const color = getStatusColor(status);
        const vitals = m.data.currentVitals;
        const context = getVitalContext(m, vitals);
        const outline = getStatusOutline(status, false);

        return (
          <section
            key={m.id}
            className={`p-4 rounded-2xl bg-space-800/80 border-2 ${outline.className}`}
            style={outline.style}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xl font-semibold text-white leading-tight">{m.name}</p>
                <p className="text-gray-400">
                  {m.task.name}
                  {m.env !== member.env && ` · ${getEnvironment(m.env).shortName}`}
                </p>
              </div>
              <span className="shrink-0 text-lg font-bold" style={{ color }}>
                {crewStatusLabel[status]}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {glanceMetrics(m).map((key) => {
                const s = getVitalStatus(key, vitals[key], m.env, context);
                return (
                  <div key={key} className="rounded-xl bg-space-900/60 px-2 py-2 text-center">
                    <p className="text-xs text-gray-400 truncate">{crewLabels[key]}</p>
                    <p
                      className="text-2xl font-bold font-mono leading-tight"
                      style={{ color: s === 'nominal' ? 'var(--color-white)' : getStatusColor(s) }}
                    >
                      {formatMetricValue(key, vitals)}
                    </p>
                    <p className="text-xs text-gray-500">{metricDefinitions[key].unit}</p>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
