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
  Globe,
  Satellite,
  Rocket,
  Mountain,
  PlaneLanding,
} from 'lucide-react';
import {
  metricDefinitions,
  getMetricRange,
  getVitalContext,
  getEnvironment,
  getTaskMetrics,
  COMBINED_RULES,
} from '../data/mockData';
import { getVitalStatus, getStatusColor } from './helpers';

export const environmentIcons = {
  earth_preflight: Globe,
  spacecraft: Rocket,
  space_station: Satellite,
  planetary_base: Mountain,
  earth_postflight: PlaneLanding,
};

export const metricIcons = {
  heart_rate_bpm: Heart,
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

// Short, plain-language names for the in-flight crew display
export const crewLabels = {
  heart_rate_bpm: 'Heart Rate',
  systolic_bp_mmhg: 'Blood Pressure',
  spo2_pct: 'Oxygen',
  body_temp_c: 'Body Temp',
  sleep_hours_prev_night: 'Sleep',
  hip_t_score: 'Bone Density',
  vitamin_d_ng_ml: 'Vitamin D',
  lv_mass_g: 'Heart Muscle',
  pvt_reaction_time_ms: 'Reaction Time',
  suit_pressure_psia: 'Suit Pressure',
  suit_co2_ppm: 'Suit CO₂',
  cumulative_radiation_mgy: 'Radiation Dose',
};

// What the astronaut should do when a reading leaves its range
const crewAdvice = {
  heart_rate_bpm: { high: 'Slow down and rest for a few minutes.', low: 'Stay still and report how you feel.' },
  systolic_bp_mmhg: { high: 'Rest and breathe slowly.', low: 'Stay seated; check compression garment.' },
  spo2_pct: { low: 'Breathe steadily; check O₂ supply.' },
  body_temp_c: { high: 'Reduce workload; increase suit cooling.', low: 'Increase cabin or suit temperature.' },
  sleep_hours_prev_night: { low: 'Plan a rest period before demanding tasks.' },
  hip_t_score: { low: 'Keep your daily resistance exercise.' },
  vitamin_d_ng_ml: { low: 'Take your Vitamin D supplement.' },
  lv_mass_g: { low: 'Keep your aerobic exercise routine.' },
  pvt_reaction_time_ms: { high: 'Avoid critical tasks until rested.' },
  suit_pressure_psia: { low: 'Check suit seals; prepare to return.', high: 'Check suit pressure regulator.' },
  suit_co2_ppm: { high: 'Reduce workload; check CO₂ scrubber.' },
  cumulative_radiation_mgy: { high: 'Limit time outside shielded areas.' },
};

export function getVitalDirection(key, value, sectionId, context) {
  const range = getMetricRange(key, sectionId, context);
  if (!range || typeof value !== 'number') return null;
  if (value > range.max) return 'high';
  if (value < range.min) return 'low';
  return null;
}

export function getCrewAdvice(key, value, sectionId, context) {
  const direction = getVitalDirection(key, value, sectionId, context);
  if (!direction) return null;
  return crewAdvice[key]?.[direction] || 'Report this reading to Mission Control.';
}

export function formatMetricValue(key, vitals) {
  const def = metricDefinitions[key];
  const value = vitals?.[key];
  if (!def || value === undefined || value === null) return '—';
  if (def.isCategorical) return String(value).replace(/_/g, ' ');
  if (def.secondary && vitals?.[def.secondary] !== undefined) {
    return `${Math.round(value)}/${Math.round(vitals[def.secondary])}`;
  }
  if (typeof value === 'number') return value.toFixed(def.decimals ?? 0);
  return String(value);
}

export function criticalKey(astronautId, sectionId, metricKey) {
  return `${astronautId}:${sectionId}:${metricKey}`;
}

// A reading only becomes an emergency after this many consecutive critical samples
// (current reading + the latest history samples), so single spikes or sensor glitches don't alarm
export const CRITICAL_CONFIRM_SAMPLES = 3;

function isConfirmedCritical(key, current, history, sectionId, context) {
  const samples = [current, ...history.slice(-(CRITICAL_CONFIRM_SAMPLES - 1)).map((v) => v[key])];
  return (
    samples.length === CRITICAL_CONFIRM_SAMPLES &&
    samples.every((v) => getVitalStatus(key, v, sectionId, context) === 'critical')
  );
}

function outOfRangeMetrics(rule, sample, sectionId, context) {
  return rule.metrics.filter(
    (key) => getVitalStatus(key, sample[key], sectionId, context) !== 'nominal'
  );
}

function isConfirmedCombination(rule, current, history, sectionId, context) {
  const samples = [current, ...history.slice(-(CRITICAL_CONFIRM_SAMPLES - 1))];
  return (
    samples.length === CRITICAL_CONFIRM_SAMPLES &&
    samples.every((v) => outOfRangeMetrics(rule, v, sectionId, context).length >= rule.min)
  );
}

// Confirmed emergencies (single critical readings and combined rules) for each astronaut's
// current task, optionally limited to one astronaut
export function getCriticalReadings(crewData, { astronautId } = {}) {
  const readings = [];
  Object.values(crewData).forEach((member) => {
    if (astronautId && member.id !== astronautId) return;
    const env = getEnvironment(member.env);
    const metrics = getTaskMetrics(member.task);
    const { currentVitals: vitals, vitals: history } = member.data;
    const context = getVitalContext(member, vitals);
    const base = { member, section: env, vitals, context };

    metrics.forEach((key) => {
      if (metricDefinitions[key].isCategorical) return;
      if (!isConfirmedCritical(key, vitals[key], history, env.id, context)) return;
      readings.push({ ...base, id: criticalKey(member.id, env.id, key), metricKeys: [key] });
    });

    COMBINED_RULES.forEach((rule) => {
      if (!rule.metrics.every((key) => metrics.includes(key))) return;
      if (!isConfirmedCombination(rule, vitals, history, env.id, context)) return;
      readings.push({
        ...base,
        id: criticalKey(member.id, env.id, rule.id),
        metricKeys: outOfRangeMetrics(rule, vitals, env.id, context),
        rule,
      });
    });
  });
  return readings;
}

// Card outline: green when normal, orange when out of range, red when critical.
// Any reading that is part of an unacknowledged emergency blinks red.
export function getStatusOutline(status, isBlinking) {
  if (isBlinking) return { className: 'blink-critical', style: {} };
  return { className: '', style: { borderColor: getStatusColor(status) } };
}
