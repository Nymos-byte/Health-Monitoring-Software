import { Globe, Shield, Satellite, Rocket } from 'lucide-react';
import { SECTIONS } from '../data/mockData';
import { getStatusColor } from '../utils/helpers';

const sectionIcons = {
  earth_preflight: Globe,
  eva_vehicle: Shield,
  space_station: Satellite,
  spacecraft: Rocket,
};

const statusRank = { nominal: 0, caution: 1, critical: 2 };

export default function PhaseTabs({ crewData, alerts, blinking, selectedSection, onSelectSection }) {
  const activeSec = SECTIONS.find((s) => s.id === selectedSection) || SECTIONS[0];
  const members = Object.values(crewData);

  return (
    <div className="flex flex-col xl:flex-row xl:items-center gap-3 justify-between">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 xl:flex">
        {SECTIONS.map((sec) => {
          const isActive = sec.id === selectedSection;
          const Icon = sectionIcons[sec.id] || Satellite;
          // Worst crew status in this phase, so problems are visible without opening it
          const worst = members.reduce((acc, m) => {
            const s = m.sections?.[sec.id]?.status || 'nominal';
            return statusRank[s] > statusRank[acc] ? s : acc;
          }, 'nominal');
          const openAlerts = alerts.filter((a) => a.section === sec.id && !a.acknowledged).length;
          const hasUnacknowledgedCritical = [...blinking].some((k) => k.split(':')[1] === sec.id);

          return (
            <button
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm transition-colors cursor-pointer ${
                isActive
                  ? 'bg-nasa-blue/25 border-nasa-blue text-white'
                  : 'bg-space-800/60 border-space-600 text-gray-400 hover:text-white hover:border-space-500'
              }`}
            >
              <Icon size={16} />
              <span className="font-medium">{sec.name}</span>
              <span
                className={`w-2 h-2 rounded-full ml-auto ${hasUnacknowledgedCritical ? 'animate-ping' : ''}`}
                style={{ backgroundColor: getStatusColor(worst) }}
              />
              {openAlerts > 0 && (
                <span className="px-1.5 text-[10px] font-mono rounded-full bg-vital-red/20 text-vital-red">
                  {openAlerts}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="text-xs text-gray-400 font-mono xl:text-right">
        <div>{activeSec.location}</div>
        <div className="text-gray-500">{activeSec.missionDayLabel}</div>
      </div>
    </div>
  );
}
