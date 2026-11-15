import { useState } from 'react';
import { FlaskConical, PenLine, Square } from 'lucide-react';
import { metricDefinitions } from '../data/mockData';
import { scenariosFor, getScenario, MANUAL_SCENARIO } from '../data/scenarios';

// Demo only: lets the audience see how Vital-X reacts to risk. A situation (or typed readings)
// runs on the astronaut's device, so it reaches ground the same way real telemetry would.
export default function DemoControls({ member, onboard, metrics, onSetScenario, onSetManualReadings }) {
  const active = onboard.scenario;
  const activeScenario = active && getScenario(active.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [initial, setInitial] = useState({});

  const startEditing = () => {
    const cv = onboard.data.currentVitals;
    const current = Object.fromEntries(metrics.map((k) => [k, String(cv[k] ?? '')]));
    setDraft(current);
    setInitial(current);
    setEditing(true);
  };

  // Only the readings the user changed are held; the rest keep following the astronaut
  const values = Object.fromEntries(
    Object.entries(draft)
      .filter(([k, v]) => v !== initial[k] && v.trim() !== '' && Number.isFinite(Number(v)))
      .map(([k, v]) => [k, Number(v)])
  );
  const applyManual = (e) => {
    e.preventDefault();
    onSetManualReadings(member.id, values);
    setEditing(false);
  };

  return (
    <section className="rounded-xl border border-dashed border-space-600 bg-space-800/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <FlaskConical size={16} className="text-vital-cyan" />
        <h3 className="text-sm font-medium text-white">Risk simulation</h3>
        <span className="text-xs text-gray-500">Demo controls · runs on {member.name.split(' ').pop()}'s device</span>
        {active && (
          <button
            onClick={() => onSetScenario(member.id, null)}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-vital-red text-vital-red cursor-pointer"
          >
            <Square size={12} />
            End {activeScenario.label.toLowerCase()}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {scenariosFor(member).map((s) => (
          <button
            key={s.id}
            onClick={() => onSetScenario(member.id, active?.id === s.id ? null : s.id)}
            className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer ${
              active?.id === s.id
                ? 'border-vital-red bg-vital-red/10 text-vital-red'
                : 'border-space-600 text-gray-300 hover:text-white hover:border-gray-400'
            }`}
          >
            {s.label}
          </button>
        ))}
        <button
          onClick={editing ? () => setEditing(false) : startEditing}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border cursor-pointer ${
            editing || active?.id === MANUAL_SCENARIO.id
              ? 'border-vital-cyan text-vital-cyan'
              : 'border-space-600 text-gray-300 hover:text-white hover:border-gray-400'
          }`}
        >
          <PenLine size={12} />
          Enter readings
        </button>
      </div>

      {editing && (
        <form onSubmit={applyManual} className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {metrics.map((key) => {
              const def = metricDefinitions[key];
              return (
                <label key={key} className="flex flex-col gap-1 text-xs text-gray-400">
                  <span className="truncate">
                    {key === 'systolic_bp_mmhg' ? 'Systolic BP' : def.label} {def.unit && <span className="text-gray-500">({def.unit})</span>}
                  </span>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={draft[key] ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                    className="px-2 py-1.5 rounded-md bg-space-900 border border-space-600 text-sm text-white focus:outline-none focus:border-vital-cyan"
                  />
                </label>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!Object.keys(values).length}
              className="px-3 py-1.5 text-xs rounded-lg bg-vital-cyan/20 border border-vital-cyan text-vital-cyan cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply readings
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-space-600 text-gray-400 cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Change the readings you want to test. They are held on the device until you end them, then
            return to the astronaut's baseline.
          </p>
        </form>
      )}
    </section>
  );
}
