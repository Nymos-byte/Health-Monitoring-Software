import { useState } from 'react';
import { Siren } from 'lucide-react';
import { metricDefinitions, getMetricRange } from '../data/mockData';
import { crewLabels, formatMetricValue, getCrewAdvice } from '../utils/metrics';

// Blocking emergency dialog: it cannot be dismissed until the viewer confirms they are aware
export default function CriticalAlertModal({ readings, audience, onAcknowledge }) {
  const [confirmed, setConfirmed] = useState(false);
  if (!readings.length) return null;

  const handleAcknowledge = () => {
    onAcknowledge(readings.map((r) => r.id));
    setConfirmed(false);
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="critical-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="blink-critical w-full max-w-xl rounded-2xl border-2 border-vital-red bg-space-900 p-6 space-y-5">
        <div className="flex items-center gap-4">
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

        <ul className="space-y-3">
          {readings.map(({ id, member, section, metricKey, vitals, context }) => {
            const def = metricDefinitions[metricKey];
            const range = getMetricRange(metricKey, section.id, context);
            const tooHigh = vitals[metricKey] >= range.criticalHigh;
            return (
              <li key={id} className="p-4 rounded-xl bg-vital-red/10 border border-vital-red/40">
                {audience === 'ground' && (
                  <p className="text-sm text-gray-400 mb-1">
                    {member.avatar} {member.name} · {section.name}
                  </p>
                )}
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
                <p className="mt-2 text-gray-100">
                  {audience === 'ground' && <span className="text-gray-400">Crew instruction: </span>}
                  {getCrewAdvice(metricKey, vitals[metricKey], section.id, context)}
                </p>
              </li>
            );
          })}
        </ul>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 w-5 h-5 accent-vital-red cursor-pointer"
          />
          <span className="text-gray-200">
            I have reviewed this situation and I am attending to the emergency.
          </span>
        </label>

        <button
          onClick={handleAcknowledge}
          disabled={!confirmed}
          className="w-full py-4 rounded-xl text-lg font-bold transition-colors bg-vital-red text-white enabled:hover:bg-red-500 enabled:cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Acknowledge and view vital signs
        </button>
      </div>
    </div>
  );
}
