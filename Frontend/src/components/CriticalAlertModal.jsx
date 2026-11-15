import { useEffect } from 'react';
import { Siren } from 'lucide-react';
import { metricDefinitions, getMetricRange } from '../data/mockData';
import { crewLabels, formatMetricValue, getCrewAdvice } from '../utils/metrics';

// Blocking emergency dialog: it can only be dismissed with the acknowledge button
export default function CriticalAlertModal({ readings, audience, onAcknowledge }) {
  const open = readings.length > 0;

  // The page behind must not scroll while the dialog is open
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="critical-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overscroll-contain"
    >
      {/* Header and button stay put; with many alerts only the list scrolls */}
      <div className="blink-critical w-full max-w-xl max-h-[calc(100dvh-2rem)] flex flex-col rounded-2xl border-2 border-vital-red bg-space-900 p-6 gap-5">
        <div className="flex items-center gap-4 shrink-0">
          <Siren size={44} className="text-vital-red shrink-0" />
          <div>
            <h2 id="critical-title" className="text-2xl font-bold text-vital-red">
              Critical reading — immediate attention
            </h2>
            <p className="text-gray-300">
              {audience === 'crew'
                ? 'Stop your current task and follow the instruction below.'
                : 'Review the situation and contact the crew member now.'}
            </p>
          </div>
        </div>

        {readings.length > 1 && (
          <p className="-mt-2 text-sm text-vital-red font-medium shrink-0">
            {readings.length} critical readings · scroll to see all
          </p>
        )}

        <ul className="space-y-3 min-h-0 overflow-y-auto overscroll-contain pr-1">
          {readings.map(({ id, member, section, metricKeys, rule, vitals, context }) => (
            <li key={id} className="p-4 rounded-xl bg-vital-red/10 border border-vital-red/40">
              {audience === 'ground' && (
                <p className="text-sm text-gray-400 mb-1">
                  {member.avatar} {member.name} · {section.name}
                </p>
              )}
              {rule ? (
                <>
                  <p className="text-xl font-bold text-white">{rule.label}</p>
                  <p className="text-sm text-gray-400 font-mono">
                    {metricKeys
                      .map((key) => `${crewLabels[key]} ${formatMetricValue(key, vitals)} ${metricDefinitions[key].unit}`)
                      .join(' · ')}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Several readings out of range at the same time
                  </p>
                </>
              ) : (
                <SingleReading metricKey={metricKeys[0]} section={section} vitals={vitals} context={context} />
              )}
              <p className="mt-2 text-gray-100">
                {audience === 'ground' && <span className="text-gray-400">Crew instruction: </span>}
                {rule ? rule.advice : getCrewAdvice(metricKeys[0], vitals[metricKeys[0]], section.id, context)}
              </p>
            </li>
          ))}
        </ul>

        <button
          onClick={() => onAcknowledge(readings.map((r) => r.id))}
          className="w-full shrink-0 py-4 rounded-xl text-lg font-bold transition-colors bg-vital-red text-on-accent hover:bg-vital-red/85 cursor-pointer"
        >
          {readings.length > 1 ? `Acknowledge all ${readings.length} and view vital signs` : 'Acknowledge and view vital signs'}
        </button>
      </div>
    </div>
  );
}

function SingleReading({ metricKey, section, vitals, context }) {
  const def = metricDefinitions[metricKey];
  const range = getMetricRange(metricKey, section.id, context);
  const tooHigh = vitals[metricKey] >= range.criticalHigh;
  return (
    <>
      <p className="text-xl font-bold text-white">
        {crewLabels[metricKey]}{' '}
        <span className="font-mono text-vital-red">
          {formatMetricValue(metricKey, vitals)} {def.unit}
        </span>
      </p>
      <p className="text-sm text-gray-400 font-mono">
        Critical limit: {tooHigh ? `≥ ${range.criticalHigh}` : `≤ ${range.criticalLow}`} {def.unit}
        {range.adjustedFor && ` (adjusted for ${range.adjustedFor.toLowerCase()} activity)`}
      </p>
    </>
  );
}
