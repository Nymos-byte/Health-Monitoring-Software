import { WifiOff } from 'lucide-react';
import { SECTIONS } from '../data/mockData';
import { getStatusColor, getMemberStatus } from '../utils/helpers';
import { environmentIcons } from '../utils/metrics';

const statusRank = { nominal: 0, caution: 1, critical: 2 };

// The five mission environments, with how many astronauts work in each right now
export default function PhaseTabs({
  crewData,
  alerts,
  blinking,
  links,
  selectedSection,
  onSelectSection,
}) {
  const activeSec = SECTIONS.find((s) => s.id === selectedSection) || SECTIONS[0];
  const members = Object.values(crewData);

  return (
    <div className="flex flex-col 2xl:flex-row 2xl:items-center gap-3 justify-between">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {SECTIONS.map((sec) => {
          const isActive = sec.id === selectedSection;
          const Icon = environmentIcons[sec.id];
          const here = members.filter((m) => m.env === sec.id);
          // Worst status of the crew working here, so problems are visible without opening it
          const worst = here.reduce((acc, m) => {
            const s = getMemberStatus(m);
            return statusRank[s] > statusRank[acc] ? s : acc;
          }, 'nominal');
          const openAlerts = alerts.filter((a) => a.section === sec.id && !a.acknowledged).length;
          const hasUnacknowledgedCritical = [...blinking].some((k) => k.split(':')[1] === sec.id);

          return (
            <button
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm text-left transition-colors cursor-pointer ${
                isActive
                  ? 'bg-nasa-blue/25 border-nasa-blue text-white'
                  : 'bg-space-800/60 border-space-600 text-gray-400 hover:text-white hover:border-space-500'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="min-w-0">
                <span className="block font-medium truncate">{sec.name}</span>
                <span className="block text-[11px] text-gray-500">
                  {here.length ? `${here.length} crew` : 'No crew'}
                </span>
              </span>
              <span className="ml-auto flex items-center gap-1.5 shrink-0">
                {links[sec.id].status !== 'aos' && (
                  <WifiOff size={14} className="text-vital-orange" aria-label="No signal" />
                )}
                {here.length > 0 && (
                  <span
                    className={`w-2 h-2 rounded-full ${hasUnacknowledgedCritical ? 'animate-ping' : ''}`}
                    style={{ backgroundColor: getStatusColor(worst) }}
                  />
                )}
                {openAlerts > 0 && (
                  <span className="px-1.5 text-[10px] font-mono rounded-full bg-vital-red/20 text-vital-red">
                    {openAlerts}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="text-xs text-gray-400 font-mono 2xl:text-right">
        <div>{activeSec.location}</div>
        <div className="text-gray-500">{activeSec.missionDayLabel}</div>
      </div>
    </div>
  );
}
