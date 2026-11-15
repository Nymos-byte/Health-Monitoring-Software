import {
  Activity,
  Thermometer,
  Wind,
  Radiation,
  Brain,
  Droplets,
  Moon,
  Zap,
  Compass,
  Bone,
  Sun,
  Heart,
  Gauge,
} from 'lucide-react';
import { getVitalStatus, getStatusColor } from '../utils/helpers';
import { SECTIONS, metricDefinitions, getMetricRange } from '../data/mockData';

const metricIcons = {
  heart_rate_bpm: Activity,
  systolic_bp_mmhg: Activity,
  spo2_pct: Droplets,
  body_temp_c: Thermometer,
  sleep_hours_prev_night: Moon,
  activity_level: Zap,
  flight_phase: Compass,
  hip_t_score: Bone,
  vitamin_d_ng_ml: Sun,
  lv_mass_g: Heart,
  pvt_reaction_time_ms: Brain,
  suit_pressure_psia: Gauge,
  suit_co2_ppm: Wind,
  cumulative_radiation_mgy: Radiation,
};

export default function VitalCards({ vitals, selectedSection = 'space_station' }) {
  const activeSec = SECTIONS.find((s) => s.id === selectedSection) || SECTIONS[0];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {activeSec.metrics.map((key) => {
        const def = metricDefinitions[key];
        if (!def) return null;

        const Icon = metricIcons[key] || Activity;
        const value = vitals?.[key];
        const status = getVitalStatus(key, value, selectedSection);
        const color = getStatusColor(status);
        const range = getMetricRange(key, selectedSection);

        let displayValue = '—';
        if (value !== undefined && value !== null) {
          if (def.isCategorical) {
            displayValue = String(value).replace(/_/g, ' ');
          } else if (def.secondary && vitals?.[def.secondary] !== undefined) {
            displayValue = `${Math.round(value)}/${Math.round(vitals[def.secondary])}`;
          } else if (typeof value === 'number') {
            displayValue = value.toFixed(def.decimals ?? 0);
          } else {
            displayValue = String(value);
          }
        }

        return (
          <div
            key={key}
            className="relative bg-space-800/80 backdrop-blur border border-space-600 rounded-xl p-4 hover:border-nasa-blue/50 transition-all duration-300 group"
          >
            {/* Status Indicator */}
            <div
              className="absolute top-3 right-3 w-2 h-2 rounded-full"
              style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
            />

            <div className="flex items-center gap-2 mb-2 pr-4">
              <Icon
                size={16}
                style={{ color }}
                className="opacity-70 group-hover:opacity-100 transition-opacity shrink-0"
              />
              <span className="text-xs text-gray-400 uppercase tracking-wider truncate">
                {def.label}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span
                className={`${
                  def.isCategorical ? 'text-lg' : 'text-2xl'
                } font-bold font-mono tracking-tight transition-colors duration-500`}
                style={{ color }}
              >
                {displayValue}
              </span>
              {!def.isCategorical && <span className="text-xs text-gray-500">{def.unit}</span>}
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-gray-500 border-t border-space-700/80 pt-1.5">
              <span className="truncate">{def.secondary ? 'sys / dia' : key}</span>
              {range && (
                <span className="text-gray-400 shrink-0">
                  {range.min}–{range.max}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
