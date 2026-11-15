import { getStatusColor, getStatusLabel, getMemberStatus } from '../utils/helpers';
import { getEnvironment, MISSION_PHASES } from '../data/mockData';

// Whole crew grouped by mission, with where each astronaut is and what they are doing now
export default function CrewRoster({ crewData, missions, selectedId, blinking, onSelect }) {
  const members = Object.values(crewData);

  return (
    <div className="bg-space-800/80 border border-space-600 rounded-xl p-3 space-y-3">
      {Object.values(missions).map((mission) => (
        <div key={mission.id}>
          <h3 className="flex items-baseline justify-between px-1 mb-1.5 text-xs font-medium uppercase tracking-wider">
            <span className="text-gray-400">{mission.name}</span>
            <span className="text-[10px] text-gray-500 normal-case tracking-normal">
              {MISSION_PHASES[mission.phase].label}
            </span>
          </h3>
          <div className="space-y-1">
            {members
              .filter((m) => m.missionId === mission.id)
              .map((member) => {
                const isActive = member.id === selectedId;
                const status = getMemberStatus(member);
                const cv = member.data.currentVitals;
                const hasUnacknowledgedCritical = [...blinking].some((k) =>
                  k.startsWith(`${member.id}:`)
                );

                return (
                  <button
                    key={member.id}
                    onClick={() => onSelect(member.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-nasa-blue/20 border-nasa-blue'
                        : 'border-transparent hover:bg-space-700/60'
                    } ${hasUnacknowledgedCritical ? 'blink-critical' : ''}`}
                  >
                    <span className="text-2xl">{member.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{member.name}</div>
                      <div className="text-[11px] text-gray-400 truncate">
                        {getEnvironment(member.env).shortName} · {member.task.name}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        HR {cv.heart_rate_bpm ?? '—'} · SpO₂ {cv.spo2_pct ?? '—'}
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-mono uppercase tracking-wider shrink-0"
                      style={{ color: getStatusColor(status) }}
                    >
                      {getStatusLabel(status)}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
