import { getStatusColor, getStatusLabel } from '../utils/helpers';

export default function CrewRoster({ crewData, selectedId, selectedSection, blinking, onSelect }) {
  const members = Object.values(crewData);

  return (
    <div className="bg-space-800/80 border border-space-600 rounded-xl p-3">
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1 mb-2">Crew</h3>
      <div className="space-y-1.5">
        {members.map((member) => {
          const isActive = member.id === selectedId;
          const secData = member.sections?.[selectedSection];
          const status = secData?.status || 'nominal';
          const color = getStatusColor(status);
          const cv = secData?.currentVitals || {};
          const hasUnacknowledgedCritical = [...blinking].some((k) =>
            k.startsWith(`${member.id}:${selectedSection}:`)
          );

          return (
            <button
              key={member.id}
              onClick={() => onSelect(member.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                isActive
                  ? 'bg-nasa-blue/20 border-nasa-blue'
                  : 'border-transparent hover:bg-space-700/60'
              } ${hasUnacknowledgedCritical ? 'blink-critical' : ''}`}
            >
              <span className="text-2xl">{member.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{member.name}</div>
                <div className="text-[11px] text-gray-500 font-mono">
                  HR {cv.heart_rate_bpm ?? '—'} · SpO₂ {cv.spo2_pct ?? '—'}
                </div>
              </div>
              <span
                className="text-[10px] font-mono uppercase tracking-wider shrink-0"
                style={{ color }}
              >
                {getStatusLabel(status)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
