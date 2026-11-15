import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { metricDefinitions } from '../../data/mockData';
import { getVitalStatus, getStatusColor } from '../../utils/helpers';
import { crewLabels, getCrewAdvice, formatMetricValue } from '../../utils/metrics';
import CrewVitalTile from '../../components/CrewVitalTile';

// My readings: overall status, the four key readings in a 2×2 grid, then the rest as a list
export default function VitalsPage({ vitals, envId, context, primary, secondary, issues, rules, isBlinking }) {
  return (
    <div className="space-y-3">
      <StatusBanner issues={issues} rules={rules} vitals={vitals} sectionId={envId} context={context} />

      <div className="grid grid-cols-2 gap-3">
        {primary.map((key) => (
          <CrewVitalTile
            key={key}
            metricKey={key}
            vitals={vitals}
            sectionId={envId}
            context={context}
            blinking={isBlinking(key)}
          />
        ))}
      </div>

      {secondary.length > 0 && (
        <section className="rounded-2xl bg-space-800/60 border border-space-600 px-4 py-2">
          <h3 className="pt-1 pb-1 text-xs uppercase tracking-wider text-gray-500">Other readings</h3>
          {secondary.map((key) => (
            <ReadingRow
              key={key}
              metricKey={key}
              vitals={vitals}
              sectionId={envId}
              context={context}
              blinking={isBlinking(key)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatusBanner({ issues, rules, vitals, sectionId, context }) {
  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-vital-green/10 border border-vital-green/40">
        <CheckCircle2 size={30} className="text-vital-green shrink-0" />
        <div>
          <p className="text-xl font-bold text-vital-green leading-tight">All readings normal</p>
          <p className="text-sm text-gray-300">Continue your activity.</p>
        </div>
      </div>
    );
  }

  // A combined-sign emergency outranks its individual (orange) readings
  const top = rules.length ? 'critical' : issues[0].status;
  const color = getStatusColor(top);
  const Icon = top === 'critical' ? AlertOctagon : AlertTriangle;

  return (
    <div
      className={`px-4 py-3 rounded-2xl border ${top === 'critical' ? 'pulse-critical' : ''}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 50%, transparent)`,
      }}
    >
      <p className="flex items-center gap-3 text-xl font-bold mb-2" style={{ color }}>
        <Icon size={30} className="shrink-0" />
        {top === 'critical' ? 'Action required' : 'Keep an eye on'}
      </p>
      <ul className="space-y-1.5">
        {rules.map((rule) => (
          <li key={rule.id}>
            <span className="font-semibold text-vital-red">{rule.label}. </span>
            <span className="text-gray-200">{rule.advice}</span>
          </li>
        ))}
        {issues.map(({ key, status }) => (
          <li key={key}>
            <span className="font-semibold" style={{ color: getStatusColor(status) }}>
              {crewLabels[key]} {formatMetricValue(key, vitals)} {metricDefinitions[key].unit}.{' '}
            </span>
            <span className="text-gray-200">{getCrewAdvice(key, vitals[key], sectionId, context)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReadingRow({ metricKey, vitals, sectionId, context, blinking = false }) {
  const def = metricDefinitions[metricKey];
  const status = getVitalStatus(metricKey, vitals[metricKey], sectionId, context);
  const color = getStatusColor(status);

  return (
    <div className="flex items-center justify-between min-h-[48px] border-b border-space-700/70 last:border-0">
      <span className="flex items-center gap-2.5 text-base text-gray-200">
        <span
          className={`w-2.5 h-2.5 rounded-full ${blinking ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: color }}
        />
        {crewLabels[metricKey]}
      </span>
      <span className="font-mono text-lg">
        <span style={{ color: status === 'nominal' ? 'var(--color-white)' : color }}>
          {formatMetricValue(metricKey, vitals)}
        </span>
        <span className="text-gray-500 text-sm ml-1">{def.unit}</span>
      </span>
    </div>
  );
}
