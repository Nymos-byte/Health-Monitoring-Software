import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { SECTIONS, metricDefinitions, getMetricRange } from '../data/mockData';

export default function CrewOverviewRadar({ crewData, selectedSection = 'space_station' }) {
  const members = Object.values(crewData);
  const activeSec = SECTIONS.find((s) => s.id === selectedSection) || SECTIONS[0];

  // Normalize active section metrics to a 0-100 scale for radar comparison
  const radarData = activeSec.chartMetrics.map((key) => {
    const def = metricDefinitions[key];
    const range = getMetricRange(key, selectedSection);
    const point = { category: def ? def.label : key };

    members.forEach((m) => {
      const val = m.sections?.[selectedSection]?.currentVitals?.[key] ?? 0;
      let normalized = 50;
      if (range) {
        const span = (range.criticalHigh ?? range.max * 1.2) - (range.criticalLow ?? range.min * 0.8);
        const low = range.criticalLow ?? range.min * 0.8;
        normalized = span > 0 ? ((val - low) / span) * 100 : 50;
      }
      point[m.name.split(' ').pop()] = Math.max(5, Math.min(100, Math.round(normalized)));
    });

    return point;
  });

  const colors = ['#00ff88', '#00e5ff', '#ff9100', '#b388ff'];

  return (
    <div className="bg-space-800/80 backdrop-blur border border-space-600 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
          Crew Health Comparison — {activeSec.name} ({activeSec.code})
        </h3>
        <span className="text-[11px] font-mono text-gray-500">
          Normalized Scale (0–100) across section metrics
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#243044" />
          <PolarAngleAxis dataKey="category" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111827',
              border: '1px solid #2d3d56',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          {members.map((m, i) => {
            const lastName = m.name.split(' ').pop();
            return (
              <Radar
                key={m.id}
                name={lastName}
                dataKey={lastName}
                stroke={colors[i]}
                fill={colors[i]}
                fillOpacity={0.12}
                strokeWidth={2}
              />
            );
          })}
        </RadarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-4 mt-2 justify-center">
        {members.map((m, i) => (
          <div key={m.id} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i] }} />
            <span className="text-xs text-gray-300">
              {m.name.split(' ').slice(-1)[0]} ({m.astronautId})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
