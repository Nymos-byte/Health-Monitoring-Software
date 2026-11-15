import { SECTIONS, metricDefinitions } from '../data/mockData';
import { getStatusColor, calculateSectionHealthScore } from '../utils/helpers';
import { formatMetricValue } from '../utils/metrics';

// Crew × phase overview of the whole mission, plus the selected astronaut's journey
export default function MissionPhases({
  crewData,
  selectedId,
  selectedSection,
  onSelectSection,
  onSelectAstronaut,
}) {
  const members = Object.values(crewData);
  const member = crewData[selectedId];

  return (
    <div className="space-y-4">
      <div className="bg-space-800/80 border border-space-600 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-space-600">
              <th className="text-left font-medium px-4 py-2.5">Crew</th>
              {SECTIONS.map((s, i) => (
                <th key={s.id} className="text-center font-medium px-3 py-2.5">
                  {i + 1}. {s.shortName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-space-700/60 last:border-0">
                <td className={`px-4 py-2 ${m.id === selectedId ? 'text-white' : 'text-gray-400'}`}>
                  {m.avatar} {m.name}
                </td>
                {SECTIONS.map((s) => {
                  const sec = m.sections[s.id];
                  const color = getStatusColor(sec.status);
                  const isCurrent = m.id === selectedId && s.id === selectedSection;
                  return (
                    <td key={s.id} className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => {
                          onSelectAstronaut(m.id);
                          onSelectSection(s.id);
                        }}
                        className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-md font-mono cursor-pointer transition-colors ${
                          isCurrent ? 'bg-nasa-blue/25 ring-1 ring-nasa-blue' : 'hover:bg-space-700/60'
                        }`}
                        title="Open this astronaut and phase"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span style={{ color }}>
                          {calculateSectionHealthScore(sec.currentVitals, s.id, m.age)}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-2 text-[11px] text-gray-500 border-t border-space-700/60">
          Health score per phase (0–100). Click a cell to open that astronaut and phase.
        </p>
      </div>

      {member && (
        <div>
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            {member.name} — journey
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {SECTIONS.map((s, i) => {
              const sec = member.sections[s.id];
              const color = getStatusColor(sec.status);
              const day = member.missionDays[s.id];
              return (
                <div
                  key={s.id}
                  className="bg-space-800/80 border rounded-xl p-3"
                  style={{ borderColor: s.id === selectedSection ? '#0b3d91' : '#243044' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">
                      {i + 1}. {s.name}
                    </span>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  </div>
                  <p className="text-[11px] text-gray-500 font-mono mb-2">
                    {day < 0 ? `Pre-flight day ${day}` : `Mission day ${day}`}
                  </p>
                  <dl className="space-y-1 text-xs">
                    {s.primaryMetrics.map((key) => (
                      <div key={key} className="flex justify-between">
                        <dt className="text-gray-400">{metricDefinitions[key].label}</dt>
                        <dd className="font-mono text-gray-200">
                          {formatMetricValue(key, sec.currentVitals)}{' '}
                          <span className="text-gray-500">{metricDefinitions[key].unit}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
