// Simulated crew and telemetry data calibrated with NASA HRP datasets
// Sections: earth_preflight, eva_vehicle, space_station, spacecraft

export const SECTIONS = [
  {
    id: 'earth_preflight',
    name: 'Earth Pre-Flight',
    code: 'earth_preflight',
    subtitle: 'Baseline & Readiness',
    location: 'Johnson Space Center — Pre-Flight Baseline',
    missionDayLabel: 'Pre-Flight Day -15',
    defaultFlightPhase: 'Preflight',
    datasetRef: 'dataset_earth_preflight.csv • sim_earth_preflight.csv',
    description:
      '30-day pre-flight baseline monitoring on Earth: cardiovascular baseline, bone mineral density (hip T-score), Vitamin D status, left-ventricular mass, sleep, and psychomotor vigilance.',
    metrics: [
      'heart_rate_bpm',
      'systolic_bp_mmhg',
      'spo2_pct',
      'body_temp_c',
      'sleep_hours_prev_night',
      'activity_level',
      'hip_t_score',
      'vitamin_d_ng_ml',
      'lv_mass_g',
      'pvt_reaction_time_ms',
    ],
    chartMetrics: [
      'heart_rate_bpm',
      'spo2_pct',
      'hip_t_score',
      'vitamin_d_ng_ml',
      'lv_mass_g',
      'pvt_reaction_time_ms',
    ],
  },
  {
    id: 'eva_vehicle',
    name: 'EVA Vehicle',
    code: 'eva_vehicle',
    subtitle: 'Spacewalk & Suit Telemetry',
    location: 'Extravehicular Mobility Unit (EMU) — EVA Sector',
    missionDayLabel: 'Mission Day 110 • EVA #2 (195 min)',
    defaultFlightPhase: 'EVA',
    datasetRef: 'dataset_eva_vehicle.csv • sim_eva.csv',
    description:
      'High-frequency spacewalk monitoring (every 15 min over 6.5h): metabolic exertion, suit pressure (psia), suit CO₂ buildup (ppm), thermal load, and oxygen saturation.',
    metrics: [
      'heart_rate_bpm',
      'systolic_bp_mmhg',
      'spo2_pct',
      'body_temp_c',
      'sleep_hours_prev_night',
      'activity_level',
      'suit_pressure_psia',
      'suit_co2_ppm',
      'cumulative_radiation_mgy',
    ],
    chartMetrics: [
      'heart_rate_bpm',
      'spo2_pct',
      'suit_pressure_psia',
      'suit_co2_ppm',
      'body_temp_c',
      'systolic_bp_mmhg',
    ],
  },
  {
    id: 'space_station',
    name: 'Space Station',
    code: 'space_station',
    subtitle: 'ISS Microgravity Habitat',
    location: 'ISS — Low Earth Orbit (408 km)',
    missionDayLabel: 'Mission Day 127',
    defaultFlightPhase: 'Station',
    datasetRef: 'dataset_space_station.csv • sim_station.csv',
    description:
      'Long-duration orbital station monitoring (150–210 days): microgravity bone loss (hip T-score), cardiac atrophy (LV mass), cumulative radiation dose, Vitamin D, sleep, and cognitive reaction time.',
    metrics: [
      'heart_rate_bpm',
      'systolic_bp_mmhg',
      'spo2_pct',
      'body_temp_c',
      'sleep_hours_prev_night',
      'activity_level',
      'cumulative_radiation_mgy',
      'hip_t_score',
      'lv_mass_g',
      'vitamin_d_ng_ml',
      'pvt_reaction_time_ms',
    ],
    chartMetrics: [
      'heart_rate_bpm',
      'spo2_pct',
      'cumulative_radiation_mgy',
      'hip_t_score',
      'lv_mass_g',
      'sleep_hours_prev_night',
    ],
  },
  {
    id: 'spacecraft',
    name: 'Spacecraft',
    code: 'spacecraft',
    subtitle: 'Launch, Transit & Re-Entry',
    location: 'Orion Spacecraft — Deep Space Transit',
    missionDayLabel: 'Mission Day 2 • Transit Phase',
    defaultFlightPhase: 'Transit',
    datasetRef: 'dataset_spacecraft.csv • sim_spacecraft.csv',
    description:
      'Dynamic flight phase telemetry (Launch, Transit, Docking, Orbital Maneuver, Re-entry): fluid shifts, orthostatic stress, circadian disruption, PVT reaction time, and transit radiation.',
    metrics: [
      'heart_rate_bpm',
      'systolic_bp_mmhg',
      'spo2_pct',
      'body_temp_c',
      'sleep_hours_prev_night',
      'activity_level',
      'flight_phase',
      'pvt_reaction_time_ms',
      'cumulative_radiation_mgy',
    ],
    chartMetrics: [
      'heart_rate_bpm',
      'systolic_bp_mmhg',
      'spo2_pct',
      'sleep_hours_prev_night',
      'pvt_reaction_time_ms',
      'cumulative_radiation_mgy',
    ],
  },
];

export const crewMembers = [
  {
    id: 'ast-001',
    astronautId: 'AST-01',
    name: 'Cmdr. Elena Rodríguez',
    role: 'Mission Commander',
    age: 42,
    nationality: 'Mexico',
    avatar: '👩‍🚀',
    missionDays: {
      earth_preflight: -15,
      eva_vehicle: 110,
      space_station: 127,
      spacecraft: 2,
    },
    status: 'nominal',
  },
  {
    id: 'ast-002',
    astronautId: 'AST-02',
    name: 'Dr. James Chen',
    role: 'Flight Surgeon',
    age: 38,
    nationality: 'United States',
    avatar: '👨‍🚀',
    missionDays: {
      earth_preflight: -15,
      eva_vehicle: 110,
      space_station: 127,
      spacecraft: 2,
    },
    status: 'nominal',
  },
  {
    id: 'ast-003',
    astronautId: 'AST-03',
    name: 'Eng. Yuki Tanaka',
    role: 'Flight Engineer',
    age: 35,
    nationality: 'Japan',
    avatar: '👩‍🚀',
    missionDays: {
      earth_preflight: -14,
      eva_vehicle: 89,
      space_station: 89,
      spacecraft: 2,
    },
    status: 'caution',
  },
  {
    id: 'ast-004',
    astronautId: 'AST-04',
    name: 'Dr. Oleg Petrov',
    role: 'Science Officer',
    age: 45,
    nationality: 'Russia',
    avatar: '👨‍🚀',
    missionDays: {
      earth_preflight: -18,
      eva_vehicle: 165,
      space_station: 201,
      spacecraft: 3,
    },
    status: 'nominal',
  },
];

// Metadata and thresholds for all dataset metrics across sections
export const metricDefinitions = {
  heart_rate_bpm: {
    key: 'heart_rate_bpm',
    label: 'Heart Rate',
    chartLabel: 'Heart Rate (bpm)',
    unit: 'bpm',
    decimals: 0,
    color: '#ff4444',
    ranges: {
      default: { min: 55, max: 100, criticalLow: 45, criticalHigh: 120 },
      earth_preflight: { min: 52, max: 95, criticalLow: 45, criticalHigh: 115 },
      eva_vehicle: { min: 70, max: 145, criticalLow: 55, criticalHigh: 165 },
      space_station: { min: 55, max: 100, criticalLow: 45, criticalHigh: 120 },
      spacecraft: { min: 55, max: 105, criticalLow: 45, criticalHigh: 125 },
    },
  },
  systolic_bp_mmhg: {
    key: 'systolic_bp_mmhg',
    secondary: 'diastolic_bp_mmhg',
    label: 'Blood Pressure',
    chartLabel: 'Systolic Blood Pressure (mmHg)',
    unit: 'mmHg',
    decimals: 0,
    color: '#ff9100',
    ranges: {
      default: { min: 95, max: 135, criticalLow: 85, criticalHigh: 150 },
      eva_vehicle: { min: 100, max: 150, criticalLow: 90, criticalHigh: 165 },
    },
  },
  diastolic_bp_mmhg: {
    key: 'diastolic_bp_mmhg',
    label: 'Diastolic BP',
    chartLabel: 'Diastolic Blood Pressure (mmHg)',
    unit: 'mmHg',
    decimals: 0,
    color: '#ffd700',
    ranges: {
      default: { min: 60, max: 85, criticalLow: 50, criticalHigh: 95 },
      eva_vehicle: { min: 65, max: 92, criticalLow: 55, criticalHigh: 105 },
    },
  },
  spo2_pct: {
    key: 'spo2_pct',
    label: 'SpO₂ (Oxygen)',
    chartLabel: 'Oxygen Saturation SpO₂ (%)',
    unit: '%',
    decimals: 1,
    color: '#00e5ff',
    ranges: {
      default: { min: 95.0, max: 100.0, criticalLow: 92.0, criticalHigh: 101.0 },
      eva_vehicle: { min: 94.0, max: 100.0, criticalLow: 91.0, criticalHigh: 101.0 },
    },
  },
  body_temp_c: {
    key: 'body_temp_c',
    label: 'Body Temp',
    chartLabel: 'Body Temperature (°C)',
    unit: '°C',
    decimals: 1,
    color: '#ff9100',
    ranges: {
      default: { min: 36.1, max: 37.3, criticalLow: 35.5, criticalHigh: 38.0 },
      eva_vehicle: { min: 36.4, max: 37.9, criticalLow: 35.8, criticalHigh: 38.3 },
    },
  },
  sleep_hours_prev_night: {
    key: 'sleep_hours_prev_night',
    label: 'Sleep (Prev Night)',
    chartLabel: 'Sleep Duration — Prev. Night (hrs)',
    unit: 'hrs',
    decimals: 1,
    color: '#b388ff',
    ranges: {
      default: { min: 6.0, max: 9.5, criticalLow: 4.8, criticalHigh: 11.5 },
    },
  },
  activity_level: {
    key: 'activity_level',
    label: 'Activity Level',
    chartLabel: 'Activity Level',
    unit: 'level',
    isCategorical: true,
    color: '#00ff88',
  },
  flight_phase: {
    key: 'flight_phase',
    label: 'Flight Phase',
    chartLabel: 'Flight Phase',
    unit: 'phase',
    isCategorical: true,
    color: '#00e5ff',
  },
  hip_t_score: {
    key: 'hip_t_score',
    label: 'Hip BMD T-Score',
    chartLabel: 'Hip Bone Density T-Score (SD)',
    unit: 'SD',
    decimals: 2,
    color: '#00ff88',
    ranges: {
      default: { min: -1.5, max: 1.0, criticalLow: -2.5, criticalHigh: 2.5 },
      earth_preflight: { min: -1.0, max: 1.0, criticalLow: -2.0, criticalHigh: 2.5 },
      space_station: { min: -1.8, max: 0.8, criticalLow: -2.5, criticalHigh: 2.5 },
    },
  },
  vitamin_d_ng_ml: {
    key: 'vitamin_d_ng_ml',
    label: 'Vitamin D (25-OH)',
    chartLabel: 'Vitamin D Concentration (ng/ml)',
    unit: 'ng/ml',
    decimals: 1,
    color: '#ffd700',
    ranges: {
      default: { min: 35.0, max: 90.0, criticalLow: 25.0, criticalHigh: 110.0 },
    },
  },
  lv_mass_g: {
    key: 'lv_mass_g',
    label: 'LV Mass',
    chartLabel: 'Left Ventricular Mass (g)',
    unit: 'g',
    decimals: 1,
    color: '#ff4444',
    ranges: {
      default: { min: 160.0, max: 215.0, criticalLow: 145.0, criticalHigh: 230.0 },
    },
  },
  pvt_reaction_time_ms: {
    key: 'pvt_reaction_time_ms',
    label: 'PVT Reaction',
    chartLabel: 'PVT Reaction Time (ms)',
    unit: 'ms',
    decimals: 0,
    color: '#b388ff',
    ranges: {
      default: { min: 190, max: 340, criticalLow: 140, criticalHigh: 400 },
    },
  },
  suit_pressure_psia: {
    key: 'suit_pressure_psia',
    label: 'Suit Pressure',
    chartLabel: 'EVA Suit Pressure (psia)',
    unit: 'psia',
    decimals: 2,
    color: '#00ff88',
    ranges: {
      default: { min: 4.15, max: 4.45, criticalLow: 4.0, criticalHigh: 4.65 },
    },
  },
  suit_co2_ppm: {
    key: 'suit_co2_ppm',
    label: 'Suit CO₂',
    chartLabel: 'EVA Suit CO₂ Concentration (ppm)',
    unit: 'ppm',
    decimals: 0,
    color: '#ffd700',
    ranges: {
      default: { min: 300, max: 4000, criticalLow: 100, criticalHigh: 5000 },
    },
  },
  cumulative_radiation_mgy: {
    key: 'cumulative_radiation_mgy',
    label: 'Cum. Radiation',
    chartLabel: 'Cumulative Radiation Dose (mGy)',
    unit: 'mGy',
    decimals: 1,
    color: '#b388ff',
    ranges: {
      default: { min: 0, max: 130, criticalLow: -1, criticalHigh: 200 },
      spacecraft: { min: 0, max: 45, criticalLow: -1, criticalHigh: 90 },
      eva_vehicle: { min: 0, max: 95, criticalLow: -1, criticalHigh: 145 },
      space_station: { min: 0, max: 140, criticalLow: -1, criticalHigh: 210 },
    },
  },
};

export function getMetricRange(metricKey, sectionId = 'space_station') {
  const def = metricDefinitions[metricKey];
  if (!def || !def.ranges) return null;
  return def.ranges[sectionId] || def.ranges.default;
}

// Baseline profiles per section calibrated from data/original and data/simulated
const sectionBaselines = {
  earth_preflight: {
    heart_rate_bpm: 68,
    systolic_bp_mmhg: 115,
    diastolic_bp_mmhg: 74,
    spo2_pct: 98.6,
    body_temp_c: 36.6,
    sleep_hours_prev_night: 7.5,
    activity_level: 'Light',
    flight_phase: 'Preflight',
    hip_t_score: -0.18,
    vitamin_d_ng_ml: 60.2,
    lv_mass_g: 189.5,
    pvt_reaction_time_ms: 268,
    cumulative_radiation_mgy: 0.0,
    suit_pressure_psia: 4.3,
    suit_co2_ppm: 1500,
    event: 'Normal',
  },
  eva_vehicle: {
    heart_rate_bpm: 112,
    systolic_bp_mmhg: 135,
    diastolic_bp_mmhg: 85,
    spo2_pct: 96.5,
    body_temp_c: 37.3,
    sleep_hours_prev_night: 6.2,
    activity_level: 'Moderate',
    flight_phase: 'EVA',
    hip_t_score: -0.65,
    vitamin_d_ng_ml: 56.0,
    lv_mass_g: 181.0,
    pvt_reaction_time_ms: 295,
    suit_pressure_psia: 4.29,
    suit_co2_ppm: 2450,
    cumulative_radiation_mgy: 48.5,
    event: 'Normal',
  },
  space_station: {
    heart_rate_bpm: 74,
    systolic_bp_mmhg: 121,
    diastolic_bp_mmhg: 78,
    spo2_pct: 98.1,
    body_temp_c: 36.8,
    sleep_hours_prev_night: 6.5,
    activity_level: 'Light',
    flight_phase: 'Station',
    cumulative_radiation_mgy: 42.8,
    hip_t_score: -0.78,
    lv_mass_g: 179.4,
    vitamin_d_ng_ml: 57.8,
    pvt_reaction_time_ms: 292,
    suit_pressure_psia: 4.3,
    suit_co2_ppm: 1800,
    event: 'Normal',
  },
  spacecraft: {
    heart_rate_bpm: 77,
    systolic_bp_mmhg: 122,
    diastolic_bp_mmhg: 79,
    spo2_pct: 98.3,
    body_temp_c: 36.7,
    sleep_hours_prev_night: 6.4,
    activity_level: 'Rest',
    flight_phase: 'Transit',
    pvt_reaction_time_ms: 288,
    cumulative_radiation_mgy: 14.2,
    hip_t_score: -0.22,
    vitamin_d_ng_ml: 58.5,
    lv_mass_g: 186.0,
    suit_pressure_psia: 4.3,
    suit_co2_ppm: 1600,
    event: 'Normal',
  },
};

function generateTimeSeriesForSection(sectionId, memberOffset = 0, points = 24) {
  const base = sectionBaselines[sectionId];
  const data = [];
  const now = new Date();
  const stepMs = sectionId === 'eva_vehicle' ? 15 * 60000 : 3600000;

  for (let i = points; i >= 0; i--) {
    const time = new Date(now - i * stepMs);
    const wave = Math.sin(i * 0.45 + memberOffset);
    const slowWave = Math.cos(i * 0.2 + memberOffset);

    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      timestamp: time.getTime(),
      heart_rate_bpm: Math.round(base.heart_rate_bpm + memberOffset * 2 + wave * 8 + (Math.random() - 0.5) * 5),
      systolic_bp_mmhg: Math.round(base.systolic_bp_mmhg + memberOffset * 2 + wave * 6 + (Math.random() - 0.5) * 4),
      diastolic_bp_mmhg: Math.round(base.diastolic_bp_mmhg + memberOffset + wave * 4 + (Math.random() - 0.5) * 3),
      spo2_pct: Math.min(100, Math.round((base.spo2_pct + slowWave * 0.6 + (Math.random() - 0.5) * 0.5) * 10) / 10),
      body_temp_c: Math.round((base.body_temp_c + slowWave * 0.2 + (Math.random() - 0.5) * 0.15) * 10) / 10,
      sleep_hours_prev_night: Math.round((base.sleep_hours_prev_night + slowWave * 0.5 + (Math.random() - 0.5) * 0.3) * 10) / 10,
      hip_t_score: Math.round((base.hip_t_score - (points - i) * 0.005 + slowWave * 0.04) * 100) / 100,
      vitamin_d_ng_ml: Math.round((base.vitamin_d_ng_ml + slowWave * 2.5 + (Math.random() - 0.5) * 1.5) * 10) / 10,
      lv_mass_g: Math.round((base.lv_mass_g - memberOffset * 1.5 + slowWave * 2.2 + (Math.random() - 0.5) * 1.5) * 10) / 10,
      pvt_reaction_time_ms: Math.round(base.pvt_reaction_time_ms + memberOffset * 5 + wave * 18 + (Math.random() - 0.5) * 12),
      suit_pressure_psia: Math.round((base.suit_pressure_psia + slowWave * 0.04 + (Math.random() - 0.5) * 0.03) * 100) / 100,
      suit_co2_ppm: Math.round(base.suit_co2_ppm + (points - i) * 35 + wave * 180 + (Math.random() - 0.5) * 120),
      cumulative_radiation_mgy: Math.max(
        0,
        Math.round((base.cumulative_radiation_mgy + (points - i) * 0.35 + memberOffset * 3) * 10) / 10
      ),
    });
  }
  return data;
}

export function generateCrewData() {
  const crewData = {};

  crewMembers.forEach((member, idx) => {
    const sectionsData = {};

    SECTIONS.forEach((sec) => {
      const base = sectionBaselines[sec.id];
      const series = generateTimeSeriesForSection(sec.id, idx, 24);
      const latest = series[series.length - 1];

      const currentVitals = {
        ...latest,
        activity_level: base.activity_level,
        flight_phase: base.flight_phase,
        event: 'Normal',
      };

      // Customize realistic scenarios per astronaut & section based on dataset events
      if (member.id === 'ast-001') {
        if (sec.id === 'spacecraft') currentVitals.flight_phase = 'Transit';
        if (sec.id === 'earth_preflight') currentVitals.activity_level = 'Moderate';
      }

      if (member.id === 'ast-002') {
        if (sec.id === 'spacecraft') currentVitals.flight_phase = 'Docking';
        if (sec.id === 'eva_vehicle') currentVitals.activity_level = 'Light';
      }

      // Eng. Yuki Tanaka (ast-003) shows caution/elevated readings across sections
      if (member.id === 'ast-003') {
        if (sec.id === 'earth_preflight') {
          currentVitals.heart_rate_bpm = 96;
          currentVitals.vitamin_d_ng_ml = 33.8; // Below 35 ng/ml optimal
          currentVitals.sleep_hours_prev_night = 5.4;
          currentVitals.pvt_reaction_time_ms = 352;
          currentVitals.activity_level = 'Intense';
          currentVitals.event = 'Sleep_Deprivation';
        } else if (sec.id === 'eva_vehicle') {
          currentVitals.heart_rate_bpm = 152;
          currentVitals.suit_co2_ppm = 4420;
          currentVitals.suit_pressure_psia = 4.12;
          currentVitals.body_temp_c = 38.0;
          currentVitals.spo2_pct = 93.8;
          currentVitals.activity_level = 'Intense';
          currentVitals.event = 'Overexertion';
        } else if (sec.id === 'space_station') {
          currentVitals.heart_rate_bpm = 102;
          currentVitals.body_temp_c = 37.5;
          currentVitals.sleep_hours_prev_night = 5.1;
          currentVitals.pvt_reaction_time_ms = 365;
          currentVitals.hip_t_score = -1.92;
          currentVitals.event = 'Isolation_Stress';
        } else if (sec.id === 'spacecraft') {
          currentVitals.heart_rate_bpm = 108;
          currentVitals.systolic_bp_mmhg = 138;
          currentVitals.sleep_hours_prev_night = 4.9;
          currentVitals.pvt_reaction_time_ms = 358;
          currentVitals.flight_phase = 'Launch';
          currentVitals.activity_level = 'Moderate';
          currentVitals.event = 'Sleep_Deprivation';
        }
      }

      // Dr. Oleg Petrov (ast-004) has longer mission duration -> higher cumulative radiation & bone loss on station
      if (member.id === 'ast-004') {
        if (sec.id === 'space_station') {
          currentVitals.cumulative_radiation_mgy = 134.6;
          currentVitals.hip_t_score = -1.65;
          currentVitals.lv_mass_g = 168.2;
        } else if (sec.id === 'spacecraft') {
          currentVitals.flight_phase = 'Reentry';
        }
      }

      sectionsData[sec.id] = {
        vitals: series,
        currentVitals,
        status: member.id === 'ast-003' ? 'caution' : 'nominal',
      };
    });

    crewData[member.id] = {
      ...member,
      sections: sectionsData,
    };
  });

  return crewData;
}

// Section-aware alerts in English based on dataset events
export const initialAlerts = [
  {
    id: 'alert-1',
    section: 'eva_vehicle',
    severity: 'critical',
    astronaut: 'Eng. Yuki Tanaka',
    message: 'EVA Suit CO₂ scrubber load elevated (4,420 ppm) & suit pressure dip (4.12 psia) during EVA #2',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'alert-2',
    section: 'eva_vehicle',
    severity: 'warning',
    astronaut: 'Eng. Yuki Tanaka',
    message: 'Peak metabolic exertion detected (HR 152 bpm, Temp 38.0°C) — advise 10-minute tether rest',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'alert-3',
    section: 'space_station',
    severity: 'warning',
    astronaut: 'Dr. Oleg Petrov',
    message: 'Cumulative radiation dose at 134.6 mGy & hip BMD T-score at -1.65 SD (Day 201 on Station)',
    timestamp: new Date(Date.now() - 2400000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'alert-4',
    section: 'space_station',
    severity: 'warning',
    astronaut: 'Eng. Yuki Tanaka',
    message: 'Elevated body temperature (37.5°C) and PVT reaction delay (365 ms) — monitor for isolation stress or infection',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'alert-5',
    section: 'spacecraft',
    severity: 'warning',
    astronaut: 'Eng. Yuki Tanaka',
    message: 'Circadian misalignment in spacecraft transit: 4.9h sleep previous night, PVT reaction time 358 ms',
    timestamp: new Date(Date.now() - 5400000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'alert-6',
    section: 'spacecraft',
    severity: 'info',
    astronaut: 'Dr. Oleg Petrov',
    message: 'Lower-body compression garments (GCG) & fluid-loading protocol verified for Re-entry phase',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    acknowledged: true,
  },
  {
    id: 'alert-7',
    section: 'earth_preflight',
    severity: 'warning',
    astronaut: 'Eng. Yuki Tanaka',
    message: 'Pre-flight Vitamin D (25-OH) at 33.8 ng/ml (optimal range: 35–90 ng/ml) — initiate 1,000 IU daily supplementation',
    timestamp: new Date(Date.now() - 9000000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'alert-8',
    section: 'earth_preflight',
    severity: 'info',
    astronaut: 'Cmdr. Elena Rodríguez',
    message: '30-day Earth pre-flight baseline calibration completed — DXA Hip T-Score (-0.18 SD) and LV Mass (189.5 g) nominal',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    acknowledged: true,
  },
];

// Environment & NASA clinical countermeasures per section (from dataset_space_health_indicators_nasa.csv)
export const sectionEnvironmentData = {
  earth_preflight: {
    title: 'Earth Pre-Flight Facility',
    metrics: [
      { label: 'Ambient Temp', value: '21.5°C', color: '#ff9100' },
      { label: 'Humidity', value: '45%', color: '#00e5ff' },
      { label: 'Gravity', value: '1.00 G', color: '#00ff88' },
      { label: 'Atm. Pressure', value: '101.3 kPa', color: '#00ff88' },
      { label: 'O₂ Level', value: '20.9%', color: '#00e5ff' },
      { label: 'Bg. Radiation', value: '0.01 mGy/d', color: '#b388ff' },
    ],
    radiation: {
      label: 'Pre-Flight Radiation Baseline (30d)',
      current: 0.3,
      limit: 20.0,
      unit: 'mGy',
    },
    nasaIndicators: [
      {
        metric: 'Bone Mineral Density (DXA T-score)',
        hazard: 'Baseline Screening',
        rationale: 'Establish personal hip BMD baseline before microgravity exposure (osteoporosis risk < -2.5 SD)',
        countermeasure: 'Pre-flight resistance conditioning & baseline DXA scan',
      },
      {
        metric: 'Vitamin D (25-OH) & LV Mass',
        hazard: 'Nutritional & Cardiac Readiness',
        rationale: 'Maintain optimal Vitamin D (35–90 ng/ml) and baseline left-ventricular mass (~190 g)',
        countermeasure: 'Daily 1,000 IU Vitamin D supplementation & aerobic conditioning',
      },
    ],
  },
  eva_vehicle: {
    title: 'EVA Suit & Vehicle Telemetry',
    metrics: [
      { label: 'Suit Pressure', value: '4.30 psia', color: '#00ff88' },
      { label: 'Suit O₂', value: '100% Pure', color: '#00e5ff' },
      { label: 'Suit CO₂ Avg', value: '2,450 ppm', color: '#ffd700' },
      { label: 'LCVG Coolant', value: '18.4°C', color: '#00e5ff' },
      { label: 'EVA Duration', value: '3h 15m / 6.5h', color: '#ff9100' },
      { label: 'Solar Activity', value: 'Moderate', color: '#ffd700' },
    ],
    radiation: {
      label: 'EVA Cumulative Dose Exposure',
      current: 53.2,
      limit: 150.0,
      unit: 'mGy',
    },
    nasaIndicators: [
      {
        metric: 'Oxygen Saturation & Suit Pressure',
        hazard: 'Hostile Environments (Closed Suit)',
        rationale: 'Risk of mild hypoxia (< 94% SpO₂) and decompression sickness if suit pressure drops < 4.15 psia',
        countermeasure: 'Pre-breathe O₂ protocols and automated suit pressure/CO₂ alerts',
      },
      {
        metric: 'Metabolic Load & Exertion',
        hazard: 'EVA Physical Fatigue',
        rationale: 'Severe physical fatigue and thermal stress over 6.5h spacewalk (alert if HR > 160 bpm or CO₂ > 5,000 ppm)',
        countermeasure: 'Real-time metabolic exertion monitoring and LCVG thermal regulation',
      },
    ],
  },
  space_station: {
    title: 'ISS Space Station Environment',
    metrics: [
      { label: 'Cabin Temp', value: '22.3°C', color: '#ff9100' },
      { label: 'Humidity', value: '42%', color: '#00e5ff' },
      { label: 'Cabin CO₂', value: '0.38%', color: '#b388ff' },
      { label: 'Cabin Pressure', value: '101.3 kPa', color: '#00ff88' },
      { label: 'Cabin O₂', value: '20.9%', color: '#00e5ff' },
      { label: 'Daily Dose', value: '0.35 mGy/d', color: '#ffd700' },
    ],
    radiation: {
      label: 'Station Cumulative Radiation (Mission)',
      current: 43.3,
      limit: 150.0,
      unit: 'mGy',
    },
    nasaIndicators: [
      {
        metric: 'Bone Mineral Density (Hip T-Score)',
        hazard: 'Microgravity (1.0–1.5% BMD loss/mo)',
        rationale: 'Space osteoporosis monitoring; critical threshold if T-score drops below -2.5 SD',
        countermeasure: 'Advanced Resistive Exercise Device (ARED — 1.5 h/day)',
      },
      {
        metric: 'Vitamin D (25-OH) & LV Mass',
        hazard: 'Microgravity & Fluid Shift',
        rationale: 'Decalcification control (35–90 ng/ml) and cardiac atrophy monitoring (~7.2% LV mass loss / 180d)',
        countermeasure: 'Daily 1,000 IU Vitamin D supplementation + aerobic cycle/treadmill protocol',
      },
    ],
  },
  spacecraft: {
    title: 'Spacecraft Cabin Telemetry',
    metrics: [
      { label: 'Cabin Temp', value: '21.8°C', color: '#ff9100' },
      { label: 'Humidity', value: '40%', color: '#00e5ff' },
      { label: 'Cabin Pressure', value: '70.3 kPa', color: '#00ff88' },
      { label: 'Cabin O₂', value: '26.5%', color: '#00e5ff' },
      { label: 'G-Load', value: '0.0 G (Transit)', color: '#b388ff' },
      { label: 'Comm Delay', value: '4.2 min', color: '#ffd700' },
    ],
    radiation: {
      label: 'Deep-Space Transit Radiation Dose',
      current: 18.6,
      limit: 100.0,
      unit: 'mGy',
    },
    nasaIndicators: [
      {
        metric: 'Blood Pressure & Heart Rate',
        hazard: 'Altered Gravity (Launch / Transit / Reentry)',
        rationale: 'Cephalad body fluid shift and orthostatic intolerance during gravity transitions',
        countermeasure: 'Lower-body compression garments (GCG) & pre-descent fluid loading',
      },
      {
        metric: 'Sleep Hours & PVT Reaction Time',
        hazard: 'Isolation & Confinement',
        rationale: 'Circadian misalignment slows Psychomotor Vigilance Test (+18 ms per hour of sleep deficit)',
        countermeasure: 'Dynamic LED cabin lighting synchronization and sleep schedule control',
      },
    ],
  },
};
