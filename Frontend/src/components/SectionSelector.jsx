import { Globe, Shield, Satellite, Rocket, Database } from 'lucide-react';
import { SECTIONS } from '../data/mockData';

const sectionIcons = {
  earth_preflight: Globe,
  eva_vehicle: Shield,
  space_station: Satellite,
  spacecraft: Rocket,
};

export default function SectionSelector({ selectedSection, onSelectSection }) {
  const activeSec = SECTIONS.find((s) => s.id === selectedSection) || SECTIONS[0];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SECTIONS.map((sec) => {
          const isActive = sec.id === selectedSection;
          const Icon = sectionIcons[sec.id] || Satellite;

          return (
            <button
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`
                flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-all duration-300 cursor-pointer
                ${
                  isActive
                    ? 'bg-nasa-blue/25 border-nasa-blue shadow-lg shadow-nasa-blue/15'
                    : 'bg-space-800/60 border-space-600 hover:border-space-500 hover:bg-space-700/50'
                }
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-nasa-blue text-white'
                      : 'bg-space-700 text-gray-400'
                  }`}
                >
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">{sec.name}</span>
                  </div>
                  <div className="text-[11px] font-mono text-vital-cyan/90 truncate">
                    {sec.code}
                  </div>
                  <div className="text-[11px] text-gray-400 truncate">{sec.subtitle}</div>
                </div>
              </div>

              <div className="ml-2 flex flex-col items-end shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${
                    isActive
                      ? 'bg-vital-cyan/20 text-vital-cyan border border-vital-cyan/40'
                      : 'bg-space-900/60 text-gray-400 border border-space-600'
                  }`}
                >
                  {sec.metrics.length} metrics
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Section Banner with Dataset Info */}
      <div className="bg-space-800/50 border border-space-600/80 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-xs text-gray-300 leading-relaxed">{activeSec.description}</p>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400 shrink-0 bg-space-900/70 px-2.5 py-1 rounded-md border border-space-600">
          <Database size={12} className="text-vital-cyan" />
          <span>{activeSec.datasetRef}</span>
        </div>
      </div>
    </div>
  );
}
