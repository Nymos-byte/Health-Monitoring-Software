import { useState, useEffect, useCallback, useRef } from 'react';
import {
  crewMembers,
  getMetricRange,
  getVitalContext,
  buildAssignment,
} from '../data/mockData';

const TELEMETRY_TICK_MS = 3000;
const HISTORY_LENGTH = 50;

// Simulated emergency: heart rate held above its (task-adjusted) critical limit until cleared
function emergencyHeartRate(member, vitals) {
  const range = getMetricRange('heart_rate_bpm', member.env, getVitalContext(member, vitals));
  return range.criticalHigh + 5 + Math.round(Math.random() * 4);
}

function normalHeartRate(member, vitals) {
  const range = getMetricRange('heart_rate_bpm', member.env, getVitalContext(member, vitals));
  return Math.round((range.min + range.max) / 2);
}

// Next onboard sample for one astronaut doing their current task
function nextVitals(member, emergency) {
  const cv = { ...member.data.currentVitals };
  const hrMin = member.task.eva ? 68 : 48;

  cv.heart_rate_bpm = emergency
    ? emergencyHeartRate(member, cv)
    : Math.round(clamp(cv.heart_rate_bpm + randomDelta(2), hrMin, 175));
  cv.systolic_bp_mmhg = Math.round(clamp(cv.systolic_bp_mmhg + randomDelta(2), 88, 165));
  cv.diastolic_bp_mmhg = Math.round(clamp(cv.diastolic_bp_mmhg + randomDelta(1), 55, 105));
  cv.spo2_pct = clamp(Math.round((cv.spo2_pct + randomDelta(0.2)) * 10) / 10, 89.5, 100.0);
  cv.body_temp_c = clamp(Math.round((cv.body_temp_c + randomDelta(0.05)) * 10) / 10, 35.6, 38.6);
  cv.sleep_hours_prev_night = clamp(
    Math.round((cv.sleep_hours_prev_night + randomDelta(0.05)) * 10) / 10,
    3.5,
    9.8
  );
  cv.hip_t_score = clamp(Math.round((cv.hip_t_score + randomDelta(0.01)) * 100) / 100, -2.6, 0.8);
  cv.vitamin_d_ng_ml = clamp(Math.round((cv.vitamin_d_ng_ml + randomDelta(0.3)) * 10) / 10, 25.0, 95.0);
  cv.lv_mass_g = clamp(Math.round((cv.lv_mass_g + randomDelta(0.4)) * 10) / 10, 145.0, 220.0);
  cv.pvt_reaction_time_ms = Math.round(clamp(cv.pvt_reaction_time_ms + randomDelta(4), 190, 430));
  cv.cumulative_radiation_mgy = clamp(
    Math.round((cv.cumulative_radiation_mgy + Math.max(0, randomDelta(0.04))) * 10) / 10,
    0.0,
    450.0
  );
  if (member.task.eva) {
    cv.suit_pressure_psia = clamp(
      Math.round((cv.suit_pressure_psia + randomDelta(0.02)) * 100) / 100,
      3.95,
      4.55
    );
    cv.suit_co2_ppm = Math.round(clamp(cv.suit_co2_ppm + randomDelta(45), 600, 6200));
  }
  return cv;
}

function withVitals(member, cv, sample) {
  const vitals = sample ? [...member.data.vitals, sample].slice(-HISTORY_LENGTH) : member.data.vitals;
  return { ...member, data: { ...member.data, currentVitals: cv, vitals } };
}

// Simulates real-time telemetry for every astronaut in their assigned task.
// Each astronaut has exactly one task; reassigning regenerates their data for the new context.
export function useRealtimeVitals(initialCrewData) {
  const [crewData, setCrewData] = useState(initialCrewData);
  const [emergencies, setEmergencies] = useState(() => new Set());
  const emergenciesRef = useRef(emergencies);

  const toggleEmergency = useCallback((astronautId) => {
    const next = new Set(emergenciesRef.current);
    const active = !next.has(astronautId);
    if (active) next.add(astronautId);
    else next.delete(astronautId);
    emergenciesRef.current = next;
    setEmergencies(next);

    // Apply immediately instead of waiting for the next telemetry tick
    setCrewData((prev) => {
      const member = prev[astronautId];
      const cv = member.data.currentVitals;
      const heartRate = active ? emergencyHeartRate(member, cv) : normalHeartRate(member, cv);
      return { ...prev, [astronautId]: withVitals(member, { ...cv, heart_rate_bpm: heartRate }) };
    });
  }, []);

  const assignTask = useCallback((astronautId, taskId) => {
    const next = new Set(emergenciesRef.current);
    next.delete(astronautId);
    emergenciesRef.current = next;
    setEmergencies(next);

    setCrewData((prev) => {
      const index = crewMembers.findIndex((m) => m.id === astronautId);
      return { ...prev, [astronautId]: buildAssignment(crewMembers[index], taskId, index) };
    });
  }, []);

  const updateVitals = useCallback(() => {
    setCrewData((prev) => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      return Object.fromEntries(
        Object.entries(prev).map(([id, member]) => {
          const cv = nextVitals(member, emergenciesRef.current.has(id));
          const sample = { ...cv, time, timestamp: now.getTime() };
          return [id, withVitals(member, cv, sample)];
        })
      );
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(updateVitals, TELEMETRY_TICK_MS);
    return () => clearInterval(interval);
  }, [updateVitals]);

  return { crewData, emergencies, toggleEmergency, assignTask };
}

function randomDelta(magnitude) {
  return (Math.random() - 0.5) * 2 * magnitude;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, Math.round(val * 100) / 100));
}
