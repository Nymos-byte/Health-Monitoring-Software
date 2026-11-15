import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  crewMembers,
  metricDefinitions,
  getVitalContext,
  buildAssignment,
  makeSessionRecord,
  generateInitialRecords,
  MISSIONS,
} from '../data/mockData';
import { getScenario, scenarioTargets, MANUAL_SCENARIO } from '../data/scenarios';
import { canAssignTask, getNextPhase, taskForPhase } from '../utils/missions';

const TELEMETRY_TICK_MS = 3000;
const HISTORY_LENGTH = 50;
// Share of the gap to the target closed on every tick: steady when nominal, a quick but visible
// ramp (about 15 s) when a situation starts
const SETTLE = 0.2;
const RAMP = 0.3;
// Small sample-to-sample sensor noise, in each reading's own unit
const NOISE = {
  heart_rate_bpm: 1,
  systolic_bp_mmhg: 1,
  diastolic_bp_mmhg: 0.6,
  spo2_pct: 0.1,
  body_temp_c: 0.02,
  sleep_hours_prev_night: 0,
  hip_t_score: 0,
  vitamin_d_ng_ml: 0,
  lv_mass_g: 0,
  pvt_reaction_time_ms: 2,
  suit_pressure_psia: 0.005,
  suit_co2_ppm: 20,
};
// Dose builds up slowly away from Earth's surface
const RADIATION_PER_TICK = 0.01;
const ON_EARTH = ['earth_preflight', 'earth_postflight'];

// Where every reading is heading: the astronaut's baseline, unless a situation overrides it
function targetsFor(member, cv) {
  const { scenario } = member;
  if (!scenario) return member.data.baseline;
  const overrides =
    scenario.id === MANUAL_SCENARIO.id
      ? scenario.values
      : scenarioTargets(getScenario(scenario.id), member, getVitalContext(member, cv));
  return { ...member.data.baseline, ...overrides };
}

function roundTo(key, value) {
  const f = 10 ** (metricDefinitions[key]?.decimals ?? 1);
  return Math.round(value * f) / f;
}

// Next onboard sample: each reading drifts back toward its target with a little sensor noise
function nextVitals(member, cv, rate) {
  const targets = targetsFor(member, cv);
  const next = { ...cv };
  Object.entries(targets).forEach(([key, target]) => {
    if (typeof cv[key] !== 'number') return;
    const value = cv[key] + (target - cv[key]) * rate + randomDelta(NOISE[key] ?? 0);
    next[key] = roundTo(key, value);
  });
  if (typeof next.spo2_pct === 'number') next.spo2_pct = Math.min(100, next.spo2_pct);
  // Cumulative dose never goes down
  if (typeof cv.cumulative_radiation_mgy === 'number') {
    next.cumulative_radiation_mgy = Math.max(cv.cumulative_radiation_mgy, next.cumulative_radiation_mgy);
  }
  return next;
}

function withVitals(member, cv, sample) {
  const vitals = sample ? [...member.data.vitals, sample].slice(-HISTORY_LENGTH) : member.data.vitals;
  return { ...member, data: { ...member.data, currentVitals: cv, vitals } };
}

// Starts or ends a situation. A new one takes a first step at once so the demo reacts right away;
// when it ends, accumulated dose stays where it got to.
function applyScenario(member, scenario) {
  const cv = member.data.currentVitals;
  const baseline = { ...member.data.baseline };
  if (!scenario && typeof cv.cumulative_radiation_mgy === 'number') {
    baseline.cumulative_radiation_mgy = Math.max(baseline.cumulative_radiation_mgy, cv.cumulative_radiation_mgy);
  }
  const updated = { ...member, scenario, data: { ...member.data, baseline } };
  const step = scenario?.id === MANUAL_SCENARIO.id ? 1 : 0.5;
  const moved = nextVitals(updated, cv, scenario ? step : RAMP);
  return withVitals(updated, { ...moved, event: scenario ? getScenario(scenario.id).event : 'Normal' });
}

// Simulates real-time telemetry for every astronaut in their assigned task.
// Each astronaut has exactly one task, limited by their mission's phase; reassigning stores the
// finished session as a record and regenerates their data for the new context.
export function useRealtimeVitals(initialCrewData) {
  const [crewData, setCrewData] = useState(initialCrewData);
  const crewRef = useRef(initialCrewData);
  const [records, setRecords] = useState(generateInitialRecords);
  const recordsRef = useRef(records);
  const [missions, setMissions] = useState(() => Object.fromEntries(MISSIONS.map((m) => [m.id, m])));
  const missionsRef = useRef(missions);

  useEffect(() => {
    crewRef.current = crewData;
  }, [crewData]);

  // Demo control: start a situation for one astronaut (null ends it)
  const setScenario = useCallback((astronautId, scenarioId) => {
    setCrewData((prev) => ({
      ...prev,
      [astronautId]: applyScenario(prev[astronautId], scenarioId ? { id: scenarioId } : null),
    }));
  }, []);

  // Demo control: hold typed readings ({ metric: value }) until cleared with null
  const setManualReadings = useCallback((astronautId, values) => {
    setCrewData((prev) => ({
      ...prev,
      [astronautId]: applyScenario(prev[astronautId], values ? { id: MANUAL_SCENARIO.id, values } : null),
    }));
  }, []);

  // Shortcut used by the crew devices: a cardiac emergency, or end whatever is running
  const toggleEmergency = useCallback(
    (astronautId) => setScenario(astronautId, crewRef.current[astronautId].scenario ? null : 'cardiac'),
    [setScenario]
  );

  const emergencies = useMemo(
    () => new Set(Object.values(crewData).filter((m) => m.scenario).map((m) => m.id)),
    [crewData]
  );

  const assignTask = useCallback((astronautId, taskId) => {
    const current = crewRef.current[astronautId];
    if (
      current.taskId === taskId ||
      !canAssignTask(recordsRef.current, missionsRef.current, current, taskId)
    ) {
      return false;
    }

    // The session that ends now stays on record until the task is done again
    const finished = makeSessionRecord(current);
    recordsRef.current = { ...recordsRef.current, [finished.key]: finished };
    setRecords(recordsRef.current);

    setCrewData((prev) => {
      const index = crewMembers.findIndex((m) => m.id === astronautId);
      const assigned = buildAssignment(crewMembers[index], taskId, index);
      // Keep the crew's announced next task unless that is the one starting now
      const planned = prev[astronautId].plannedTaskId;
      return {
        ...prev,
        [astronautId]: planned && planned !== taskId ? { ...assigned, plannedTaskId: planned } : assigned,
      };
    });
    return true;
  }, []);

  // The astronaut tells ground what they will do next (null clears it). It travels with their
  // telemetry, so ground sees it when the downlink delivers it.
  const planTask = useCallback((astronautId, taskId) => {
    const member = crewRef.current[astronautId];
    if (taskId && !canAssignTask(recordsRef.current, missionsRef.current, member, taskId)) return false;
    setCrewData((prev) => ({ ...prev, [astronautId]: { ...prev[astronautId], plannedTaskId: taskId } }));
    return true;
  }, []);

  // The whole crew moves to the mission's next phase together, each with a task that fits it
  const advancePhase = useCallback(
    (missionId) => {
      const mission = missionsRef.current[missionId];
      const phase = getNextPhase(mission);
      if (!phase) return null;

      missionsRef.current = { ...missionsRef.current, [missionId]: { ...mission, phase } };
      setMissions(missionsRef.current);
      // Returns the task each crew member received, by astronaut id
      const assigned = {};
      Object.values(crewRef.current)
        .filter((m) => m.missionId === missionId)
        .forEach((member) => {
          const taskId = taskForPhase(recordsRef.current, missionsRef.current, member);
          if (taskId && assignTask(member.id, taskId)) assigned[member.id] = taskId;
        });
      return assigned;
    },
    [assignTask]
  );

  const updateVitals = useCallback(() => {
    setCrewData((prev) => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      return Object.fromEntries(
        Object.entries(prev).map(([id, member]) => {
          const baseline = { ...member.data.baseline };
          if (typeof baseline.cumulative_radiation_mgy === 'number' && !ON_EARTH.includes(member.env)) {
            baseline.cumulative_radiation_mgy += RADIATION_PER_TICK;
          }
          const current = { ...member, data: { ...member.data, baseline } };
          const cv = nextVitals(current, member.data.currentVitals, member.scenario ? RAMP : SETTLE);
          const sample = { ...cv, time, timestamp: now.getTime() };
          return [id, withVitals(current, cv, sample)];
        })
      );
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(updateVitals, TELEMETRY_TICK_MS);
    return () => clearInterval(interval);
  }, [updateVitals]);

  return {
    crewData,
    records,
    missions,
    emergencies,
    toggleEmergency,
    setScenario,
    setManualReadings,
    assignTask,
    planTask,
    advancePhase,
  };
}

function randomDelta(magnitude) {
  return (Math.random() - 0.5) * 2 * magnitude;
}
