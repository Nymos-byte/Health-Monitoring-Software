import { getMetricRange } from './mockData';

// Demo situations that can be triggered for one astronaut. Each one follows an event of the
// training data (data/simulated, column `event`) and moves the readings that event affects.
// `to` says where a reading heads: past its critical limit, or into the caution band.
// `eva` limits a situation to spacewalks (true) or to everything else (false).
export const SCENARIOS = [
  {
    id: 'cardiac',
    label: 'Cardiac emergency',
    event: 'Demo',
    effects: [{ metric: 'heart_rate_bpm', to: 'criticalHigh' }],
  },
  {
    id: 'dehydration',
    label: 'Dehydration',
    event: 'Dehydration',
    eva: false,
    effects: [
      { metric: 'heart_rate_bpm', to: 'high' },
      { metric: 'systolic_bp_mmhg', to: 'criticalLow' },
      { metric: 'body_temp_c', to: 'high' },
    ],
  },
  {
    id: 'infection',
    label: 'Infection / fever',
    event: 'Infection',
    eva: false,
    effects: [
      { metric: 'body_temp_c', to: 'criticalHigh' },
      { metric: 'heart_rate_bpm', to: 'high' },
    ],
  },
  {
    id: 'sleep',
    label: 'Sleep deprivation',
    event: 'Sleep_Deprivation',
    eva: false,
    effects: [
      { metric: 'sleep_hours_prev_night', to: 'criticalLow' },
      { metric: 'pvt_reaction_time_ms', to: 'criticalHigh' },
    ],
  },
  {
    id: 'hypoxia',
    label: 'Habitat hypoxia',
    event: 'Habitat_Hypoxia',
    eva: false,
    effects: [
      { metric: 'spo2_pct', to: 'criticalLow' },
      { metric: 'heart_rate_bpm', to: 'high' },
    ],
  },
  {
    id: 'orthostatic',
    label: 'Orthostatic intolerance',
    event: 'Severe_Orthostatic_Intolerance',
    eva: false,
    effects: [
      { metric: 'systolic_bp_mmhg', to: 'criticalLow' },
      { metric: 'heart_rate_bpm', to: 'criticalHigh' },
    ],
  },
  {
    id: 'solar',
    label: 'Solar particle event',
    event: 'Solar_Particle_Event',
    spaceOnly: true,
    effects: [{ metric: 'cumulative_radiation_mgy', to: 'criticalHigh' }],
  },
  {
    id: 'co2',
    label: 'Suit CO₂ failure',
    event: 'CO2_Failure',
    eva: true,
    effects: [
      { metric: 'suit_co2_ppm', to: 'criticalHigh' },
      { metric: 'heart_rate_bpm', to: 'high' },
    ],
  },
  {
    id: 'leak',
    label: 'Suit pressure leak',
    event: 'Suit_Pressure_Leak',
    eva: true,
    effects: [
      { metric: 'suit_pressure_psia', to: 'criticalLow' },
      { metric: 'spo2_pct', to: 'low' },
    ],
  },
  {
    id: 'overexertion',
    label: 'Overexertion',
    event: 'Overexertion',
    eva: true,
    effects: [
      { metric: 'heart_rate_bpm', to: 'criticalHigh' },
      { metric: 'body_temp_c', to: 'high' },
    ],
  },
  {
    id: 'eva_hypoxia',
    label: 'Mild hypoxia',
    event: 'Mild_Hypoxia',
    eva: true,
    effects: [
      { metric: 'spo2_pct', to: 'criticalLow' },
      { metric: 'heart_rate_bpm', to: 'high' },
    ],
  },
];

// Manual entry from the demo controls: the typed readings are held until cleared
export const MANUAL_SCENARIO = { id: 'manual', label: 'Manual readings', event: 'Manual', effects: [] };

const EARTH = ['earth_preflight', 'earth_postflight'];

export function getScenario(id) {
  return id === MANUAL_SCENARIO.id ? MANUAL_SCENARIO : SCENARIOS.find((s) => s.id === id);
}

// Situations that make sense for what the astronaut is doing now
export function scenariosFor(member) {
  const eva = Boolean(member.task.eva);
  return SCENARIOS.filter(
    (s) => (s.eva === undefined || s.eva === eva) && !(s.spaceOnly && EARTH.includes(member.env))
  );
}

// Where each affected reading settles while the situation lasts
export function scenarioTargets(scenario, member, context) {
  return Object.fromEntries(
    scenario.effects.map(({ metric, to }) => {
      const r = getMetricRange(metric, member.env, context);
      const value = {
        criticalHigh: r.criticalHigh + (r.criticalHigh - r.max) * 0.25,
        criticalLow: r.criticalLow - (r.min - r.criticalLow) * 0.25,
        high: (r.max + r.criticalHigh) / 2,
        low: (r.min + r.criticalLow) / 2,
      }[to];
      return [metric, value];
    })
  );
}
