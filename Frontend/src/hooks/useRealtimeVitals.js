import { useState, useEffect, useCallback, useRef } from 'react';
import { SECTIONS } from '../data/mockData';
import { determineSectionStatus } from '../utils/helpers';

// Hook to simulate real-time vital sign and telemetry updates across all 4 mission sections
export function useRealtimeVitals(initialCrewData) {
  const [crewData, setCrewData] = useState(initialCrewData);
  const intervalRef = useRef(null);

  const updateVitals = useCallback(() => {
    setCrewData((prev) => {
      const updated = { ...prev };
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      Object.keys(updated).forEach((id) => {
        const member = { ...updated[id], sections: { ...updated[id].sections } };

        SECTIONS.forEach((sec) => {
          const secData = { ...member.sections[sec.id] };
          const cv = { ...secData.currentVitals };

          const hrMin = sec.id === 'eva_vehicle' ? 68 : 48;
          const hrMax = sec.id === 'eva_vehicle' ? 175 : 135;

          cv.heart_rate_bpm = Math.round(clamp(cv.heart_rate_bpm + randomDelta(2), hrMin, hrMax));
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
          cv.vitamin_d_ng_ml = clamp(
            Math.round((cv.vitamin_d_ng_ml + randomDelta(0.3)) * 10) / 10,
            25.0,
            95.0
          );
          cv.lv_mass_g = clamp(Math.round((cv.lv_mass_g + randomDelta(0.4)) * 10) / 10, 145.0, 220.0);
          cv.pvt_reaction_time_ms = Math.round(
            clamp(cv.pvt_reaction_time_ms + randomDelta(4), 190, 430)
          );
          cv.suit_pressure_psia = clamp(
            Math.round((cv.suit_pressure_psia + randomDelta(0.02)) * 100) / 100,
            3.95,
            4.55
          );
          cv.suit_co2_ppm = Math.round(clamp(cv.suit_co2_ppm + randomDelta(45), 600, 6200));
          cv.cumulative_radiation_mgy = clamp(
            Math.round((cv.cumulative_radiation_mgy + Math.max(0, randomDelta(0.04))) * 10) / 10,
            0.0,
            220.0
          );

          secData.currentVitals = cv;

          const vitals = [...secData.vitals];
          vitals.push({
            time: timeStr,
            timestamp: now.getTime(),
            heart_rate_bpm: cv.heart_rate_bpm,
            systolic_bp_mmhg: cv.systolic_bp_mmhg,
            diastolic_bp_mmhg: cv.diastolic_bp_mmhg,
            spo2_pct: cv.spo2_pct,
            body_temp_c: cv.body_temp_c,
            sleep_hours_prev_night: cv.sleep_hours_prev_night,
            hip_t_score: cv.hip_t_score,
            vitamin_d_ng_ml: cv.vitamin_d_ng_ml,
            lv_mass_g: cv.lv_mass_g,
            pvt_reaction_time_ms: cv.pvt_reaction_time_ms,
            suit_pressure_psia: cv.suit_pressure_psia,
            suit_co2_ppm: cv.suit_co2_ppm,
            cumulative_radiation_mgy: cv.cumulative_radiation_mgy,
          });
          if (vitals.length > 50) vitals.shift();
          secData.vitals = vitals;

          secData.status = determineSectionStatus(cv, sec.id);
          member.sections[sec.id] = secData;
        });

        updated[id] = member;
      });

      return updated;
    });
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(updateVitals, 3000);
    return () => clearInterval(intervalRef.current);
  }, [updateVitals]);

  return crewData;
}

function randomDelta(magnitude) {
  return (Math.random() - 0.5) * 2 * magnitude;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, Math.round(val * 100) / 100));
}
