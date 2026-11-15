import {
  getStatusColor,
  getStatusLabel,
  calculateSectionHealthScore,
} from '../utils/helpers';

export default function AstronautProfile({ member, selectedSection }) {
  if (!member) return null;

  const secData = member.sections?.[selectedSection];
  const cv = secData?.currentVitals || {};
  const status = secData?.status || 'nominal';
  const statusColor = getStatusColor(status);
  const healthScore = calculateSectionHealthScore(cv, selectedSection, member.age);
  const missionDay = member.missionDays?.[selectedSection];

  const facts = [
    member.role,
    `${member.age} yrs · ${member.nationality}`,
    missionDay < 0 ? `Pre-flight day ${missionDay}` : `Mission day ${missionDay}`,
    cv.activity_level && `Activity: ${cv.activity_level}`,
    selectedSection === 'spacecraft' && cv.flight_phase && `Phase: ${cv.flight_phase}`,
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-4 bg-space-800/80 border border-space-600 rounded-xl px-5 py-4">
      <span className="text-4xl">{member.avatar}</span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-white">{member.name}</h2>
          <span className="text-[11px] font-mono text-gray-500">{member.astronautId}</span>
          {cv.event && cv.event !== 'Normal' && (
            <span className="px-2 py-0.5 text-[11px] rounded bg-vital-orange/10 border border-vital-orange/40 text-vital-orange">
              {cv.event.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-0.5">{facts.join('  ·  ')}</p>
      </div>
      <div className="text-right shrink-0">
        <div className="text-3xl font-bold font-mono" style={{ color: statusColor }}>
          {healthScore}
        </div>
        <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: statusColor }}>
          {getStatusLabel(status)} · score
        </div>
      </div>
    </div>
  );
}
