import { useState } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceArea,
} from 'recharts';
import { metricDefinitions, getMetricRange } from '../data/mockData';
import { getVitalStatus, getStatusColor, resolveColor } from '../utils/helpers';

function summarize(vitals, key, sectionId, context) {
  const values = vitals.map((v) => v[key]).filter((v) => typeof v === 'number');
  if (!values.length) return null;
  const outOfRange = values.filter((v) => getVitalStatus(key, v, sectionId, context) !== 'nominal').length;
  return {
    last: values[values.length - 1],
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    outOfRangePct: Math.round((outOfRange / values.length) * 100),
  };
}

export default function HistoryPanel({ vitals, metrics, defaultMetric, selectedSection, context }) {
  const [picked, setPicked] = useState(defaultMetric);
  // Fall back when the phase changes and the previous metric is not part of it
  const active = metrics.includes(picked) ? picked : defaultMetric;
  const def = metricDefinitions[active];
  const range = getMetricRange(active, selectedSection, context);
  const color = resolveColor(def.color);
  const grid = resolveColor('var(--color-space-700)');
  const axis = resolveColor('var(--color-space-600)');
  const tick = resolveColor('var(--color-gray-500)');
  const normalBand = resolveColor('var(--color-vital-green)');
  const from = vitals[0]?.time;
  const to = vitals[vitals.length - 1]?.time;

  return (
    <div className="space-y-4">
      <div className="bg-space-800/80 border border-space-600 rounded-xl p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h3 className="text-sm font-medium text-gray-200">{def.chartLabel}</h3>
          <span className="text-[11px] font-mono text-gray-500">
            {from} → {to} · {vitals.length} samples · shaded band = normal range
          </span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={vitals} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="history_grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis
              dataKey="time"
              tick={{ fill: tick, fontSize: 10 }}
              axisLine={{ stroke: axis }}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis
              tick={{ fill: tick, fontSize: 10 }}
              axisLine={{ stroke: axis }}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-space-800)',
                border: '1px solid var(--color-space-500)',
                color: 'var(--color-white)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(v) => [`${v} ${def.unit}`, def.label]}
            />
            {range && (
              <ReferenceArea y1={range.min} y2={range.max} fill={normalBand} fillOpacity={0.08} />
            )}
            <Area
              type="monotone"
              dataKey={active}
              stroke={color}
              strokeWidth={2}
              fill="url(#history_grad)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary per metric; clicking a row plots it above */}
      <div className="bg-space-800/80 border border-space-600 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-space-600">
              <th className="text-left font-medium px-4 py-2.5">Metric</th>
              <th className="text-right font-medium px-3 py-2.5">Current</th>
              <th className="text-right font-medium px-3 py-2.5">Min</th>
              <th className="text-right font-medium px-3 py-2.5">Avg</th>
              <th className="text-right font-medium px-3 py-2.5">Max</th>
              <th className="text-right font-medium px-4 py-2.5">Out of range</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {metrics.map((key) => {
              const d = metricDefinitions[key];
              const s = summarize(vitals, key, selectedSection, context);
              if (!s) return null;
              const fmt = (v) => v.toFixed(d.decimals ?? 0);
              const statusColor = getStatusColor(getVitalStatus(key, s.last, selectedSection, context));

              return (
                <tr
                  key={key}
                  onClick={() => setPicked(key)}
                  className={`border-b border-space-700/60 last:border-0 cursor-pointer transition-colors ${
                    key === active ? 'bg-nasa-blue/15' : 'hover:bg-space-700/40'
                  }`}
                >
                  <td className="px-4 py-2 font-sans text-gray-200">
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: d.color }} />
                    {d.label} <span className="text-gray-500 text-xs">{d.unit}</span>
                  </td>
                  <td className="px-3 py-2 text-right" style={{ color: statusColor }}>{fmt(s.last)}</td>
                  <td className="px-3 py-2 text-right text-gray-400">{fmt(s.min)}</td>
                  <td className="px-3 py-2 text-right text-gray-400">{fmt(s.avg)}</td>
                  <td className="px-3 py-2 text-right text-gray-400">{fmt(s.max)}</td>
                  <td className={`px-4 py-2 text-right ${s.outOfRangePct > 0 ? 'text-vital-orange' : 'text-gray-500'}`}>
                    {s.outOfRangePct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
