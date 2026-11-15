import {
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  Radiation,
  Sun,
  ShieldCheck,
} from 'lucide-react';
import { sectionEnvironmentData } from '../data/mockData';

const iconList = [Thermometer, Droplets, Wind, Gauge, Wind, Sun];

export default function EnvironmentPanel({ selectedSection = 'space_station' }) {
  const env = sectionEnvironmentData[selectedSection] || sectionEnvironmentData.space_station;
  const pct = Math.min(100, (env.radiation.current / env.radiation.limit) * 100);

  return (
    <div className="bg-space-800/80 backdrop-blur border border-space-600 rounded-xl p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Radiation size={16} className="text-vital-purple" />
          {env.title}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {env.metrics.map(({ label, value, color }, idx) => {
            const Icon = iconList[idx % iconList.length];
            return (
              <div
                key={label}
                className="flex items-center gap-2.5 p-2 rounded-lg bg-space-900/50 border border-space-700/60"
              >
                <Icon size={15} style={{ color }} className="shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider truncate">
                    {label}
                  </div>
                  <div className="text-xs font-mono font-bold text-white truncate">{value}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Radiation Exposure Summary */}
        <div className="mt-3 p-3 rounded-lg bg-space-900/50 border border-vital-purple/20">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
            {env.radiation.label}
          </div>
          <div className="flex items-end gap-2">
            <span className="text-lg font-mono font-bold text-vital-purple">
              {env.radiation.current}
            </span>
            <span className="text-xs text-gray-500 mb-0.5">
              / {env.radiation.limit} {env.radiation.unit} limit
            </span>
          </div>
          <div className="mt-2 h-2 bg-space-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #b388ff, #ff9100)',
              }}
            />
          </div>
        </div>
      </div>

      {/* NASA Health Indicators & Countermeasures from dataset_space_health_indicators_nasa.csv */}
      {env.nasaIndicators && env.nasaIndicators.length > 0 && (
        <div className="border-t border-space-600 pt-3">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-vital-cyan" />
            NASA HRP Clinical Countermeasures
          </h4>
          <div className="space-y-2">
            {env.nasaIndicators.map((ind) => (
              <div
                key={ind.metric}
                className="p-2.5 rounded-lg bg-space-900/60 border border-space-700 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white">{ind.metric}</span>
                  <span className="text-[10px] font-mono text-vital-yellow px-1.5 py-0.5 bg-vital-yellow/10 rounded">
                    {ind.hazard}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">{ind.rationale}</p>
                <p className="text-[11px] text-vital-cyan font-mono">
                  Rx: {ind.countermeasure}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
