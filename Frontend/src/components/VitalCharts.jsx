import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';
import { SECTIONS, metricDefinitions, getMetricRange } from '../data/mockData';

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-space-800 border border-space-500 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-gray-400 mb-1">Time: {label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-mono font-bold" style={{ color: entry.color }}>
          {entry.value} {unit || ''}
        </p>
      ))}
    </div>
  );
}

export default function VitalCharts({ vitals, selectedSection = 'space_station' }) {
  const activeSec = SECTIONS.find((s) => s.id === selectedSection) || SECTIONS[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {activeSec.chartMetrics.map((key) => {
        const def = metricDefinitions[key];
        if (!def) return null;

        const range = getMetricRange(key, selectedSection);
        const color = def.color || '#00e5ff';
        const gradientId = `grad_${selectedSection}_${key}`;

        return (
          <div
            key={key}
            className="bg-space-800/80 backdrop-blur border border-space-600 rounded-xl p-4 hover:border-space-500 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {def.chartLabel}
              </h3>
              <span className="text-[10px] font-mono text-gray-500">{key}</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={vitals} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={{ stroke: '#243044' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={{ stroke: '#243044' }}
                  tickLine={false}
                  domain={key === 'spo2_pct' ? [89, 100] : ['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip unit={def.unit} />} />
                {range && (
                  <>
                    <ReferenceLine
                      y={range.max}
                      stroke="#ffd700"
                      strokeDasharray="5 5"
                      strokeOpacity={0.4}
                    />
                    <ReferenceLine
                      y={range.min}
                      stroke="#ffd700"
                      strokeDasharray="5 5"
                      strokeOpacity={0.4}
                    />
                  </>
                )}
                <Area
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{ r: 4, stroke: color, strokeWidth: 2, fill: '#0a0e1a' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
