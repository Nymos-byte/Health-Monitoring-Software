import { User, Calendar, Globe, Activity, Compass, ShieldAlert } from 'lucide-react';
import {
  getStatusColor,
  getStatusLabel,
  calculateSectionHealthScore,
} from '../utils/helpers';
import { SECTIONS } from '../data/mockData';

export default function AstronautProfile({ member, selectedSection = 'space_station' }) {
  if (!member) return null;

  const secData = member.sections?.[selectedSection];
  const currentVitals = secData?.currentVitals || {};
  const status = secData?.status || member.status || 'nominal';
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);
  const activeSec = SECTIONS.find((s) => s.id === selectedSection) || SECTIONS[0];

  const missionDay =
    member.missionDays?.[selectedSection] !== undefined
      ? member.missionDays[selectedSection]
      : 127;

  const healthScore = calculateSectionHealthScore(currentVitals, selectedSection);

  return (
    <div className="bg-space-800/80 backdrop-blur border border-space-600 rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
        <div className="flex items-start gap-4">
          <div className="text-5xl">{member.avatar}</div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white">{member.name}</h2>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-space-900 border border-space-600 rounded text-vital-cyan">
                {member.astronautId}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-nasa-blue/20 border border-nasa-blue/40 rounded text-gray-200">
                {activeSec.name} ({activeSec.code})
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">{member.role}</p>

            <div className="flex flex-wrap gap-2.5 mt-3">
              <InfoBadge icon={User} text={`Age: ${member.age} yrs`} />
              <InfoBadge icon={Globe} text={member.nationality} />
              <InfoBadge
                icon={Calendar}
                text={missionDay < 0 ? `Pre-Flight Day ${missionDay}` : `Mission Day ${missionDay}`}
              />
              {currentVitals.activity_level && (
                <InfoBadge icon={Activity} text={`Activity: ${currentVitals.activity_level}`} />
              )}
              {currentVitals.flight_phase && (
                <InfoBadge icon={Compass} text={`Phase: ${currentVitals.flight_phase}`} />
              )}
              {currentVitals.event && (
                <InfoBadge
                  icon={ShieldAlert}
                  text={`Event: ${currentVitals.event.replace(/_/g, ' ')}`}
                  highlight={currentVitals.event !== 'Normal'}
                />
              )}
            </div>
          </div>
        </div>

        {/* Health Score Gauge */}
        <div className="text-center self-end sm:self-center shrink-0">
          <div className="relative w-20 h-20 mx-auto">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#1a2332"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={statusColor}
                strokeWidth="3"
                strokeDasharray={`${healthScore}, 100`}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 6px ${statusColor})` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold font-mono text-white">{healthScore}</span>
              <span className="text-[8px] text-gray-500 uppercase">Health</span>
            </div>
          </div>
          <div className="mt-1 flex items-center justify-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
            />
            <span
              className="text-[10px] font-mono uppercase tracking-wider"
              style={{ color: statusColor }}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBadge({ icon: Icon, text, highlight = false }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
        highlight
          ? 'bg-vital-yellow/10 border-vital-yellow/40 text-vital-yellow'
          : 'bg-space-900/50 border-space-700 text-gray-400'
      }`}
    >
      <Icon size={12} className={highlight ? 'text-vital-yellow' : 'text-gray-500'} />
      <span className="text-xs">{text}</span>
    </div>
  );
}
