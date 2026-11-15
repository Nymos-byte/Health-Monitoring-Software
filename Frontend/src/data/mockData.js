// Simulated crew and telemetry data calibrated with NASA HRP datasets.
// The five environments match data/simulated/sim_daily.csv (column `environment`).
// EVA is not an environment: it is a task performed from the station or a planetary base
// (data/simulated/sim_eva.csv, column `eva_location`).

export const SECTIONS = [
  {
    id: 'earth_preflight',
    name: 'Earth Pre-Flight',
    shortName: 'Pre-Flight',
    subtitle: 'Baseline & readiness',
    location: 'Johnson Space Center — Pre-flight baseline',
    missionDayLabel: 'Pre-flight day L-15',
    defaultFlightPhase: 'Preflight',
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
    primaryMetrics: ['heart_rate_bpm', 'systolic_bp_mmhg', 'sleep_hours_prev_night', 'pvt_reaction_time_ms'],
  },
  {
    id: 'spacecraft',
    name: 'Spacecraft',
    shortName: 'Spacecraft',
    subtitle: 'Launch, transit & re-entry',
    location: 'Orion — Deep-space transit',
    missionDayLabel: 'Transit day 2',
    defaultFlightPhase: 'Transit',
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
    primaryMetrics: ['heart_rate_bpm', 'systolic_bp_mmhg', 'spo2_pct', 'body_temp_c'],
  },
  {
    id: 'space_station',
    name: 'Space Station',
    shortName: 'Station',
    subtitle: 'Microgravity habitat',
    location: 'ISS — Low Earth Orbit (408 km)',
    missionDayLabel: 'Mission day 127',
    defaultFlightPhase: 'Station_Ops',
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
    primaryMetrics: ['heart_rate_bpm', 'spo2_pct', 'sleep_hours_prev_night', 'cumulative_radiation_mgy'],
  },
  {
    id: 'planetary_base',
    name: 'Planetary Base',
    shortName: 'Planetary Base',
    subtitle: 'Lunar / Martian surface habitat',
    location: 'Artemis Base Camp — Lunar south pole (0.17 g)',
    missionDayLabel: 'Surface day 18',
    defaultFlightPhase: 'Surface_Ops',
    metrics: [
      'heart_rate_bpm',
      'systolic_bp_mmhg',
      'spo2_pct',
      'body_temp_c',
      'sleep_hours_prev_night',
      'activity_level',
      'cumulative_radiation_mgy',
      'hip_t_score',
      'vitamin_d_ng_ml',
      'pvt_reaction_time_ms',
    ],
    // Hypobaric habitat (8.2 psia, 34% O₂): oxygen saturation comes first
    primaryMetrics: ['spo2_pct', 'heart_rate_bpm', 'cumulative_radiation_mgy', 'sleep_hours_prev_night'],
  },
  {
    id: 'earth_postflight',
    name: 'Return to Earth',
    shortName: 'Post-Flight',
    subtitle: 'Recovery & reconditioning',
    location: 'Johnson Space Center — Post-flight rehabilitation',
    missionDayLabel: 'Recovery day R+5',
    defaultFlightPhase: 'Recovery',
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
      'cumulative_radiation_mgy',
    ],
    // Back in 1 g: orthostatic intolerance and bone recovery are the main concerns
    primaryMetrics: ['systolic_bp_mmhg', 'heart_rate_bpm', 'hip_t_score', 'vitamin_d_ng_ml'],
  },
];

export const EVA_METRICS = ['suit_pressure_psia', 'suit_co2_ppm'];
const EVA_PRIMARY_METRICS = ['suit_pressure_psia', 'suit_co2_ppm', 'spo2_pct', 'heart_rate_bpm'];

// Each astronaut has exactly one task at a time; the task decides the environment
// and the activity level the vitals are evaluated against. Several astronauts can do the
// same task at once. `once` marks tasks an astronaut performs a single time per mission
// (their record is final); every other task can be repeated and its record is replaced
// by the newest completed session.
export const TASKS = [
  { id: 'pre_medical', environment: 'earth_preflight', name: 'Baseline medical exam', activity: 'Rest', once: true },
  { id: 'pre_sim', environment: 'earth_preflight', name: 'Simulator training', activity: 'Light' },
  { id: 'pre_fitness', environment: 'earth_preflight', name: 'Fitness conditioning', activity: 'Intense' },

  { id: 'sc_launch', environment: 'spacecraft', name: 'Launch & ascent', activity: 'Rest', flightPhase: 'Launch', once: true },
  { id: 'sc_piloting', environment: 'spacecraft', name: 'Flight operations', activity: 'Light', flightPhase: 'Transit' },
  { id: 'sc_docking', environment: 'spacecraft', name: 'Docking procedure', activity: 'Moderate', flightPhase: 'Docking', once: true },
  { id: 'sc_rest', environment: 'spacecraft', name: 'Scheduled sleep period', activity: 'Rest', flightPhase: 'Transit' },
  { id: 'sc_reentry', environment: 'spacecraft', name: 'Re-entry & landing', activity: 'Rest', flightPhase: 'Reentry', once: true },

  { id: 'iss_science', environment: 'space_station', name: 'Science experiments', activity: 'Light' },
  { id: 'iss_maintenance', environment: 'space_station', name: 'Station maintenance', activity: 'Moderate' },
  { id: 'iss_exercise', environment: 'space_station', name: 'ARED resistance exercise', activity: 'Intense' },
  { id: 'iss_eva', environment: 'space_station', name: 'Spacewalk (EVA)', activity: 'Intense', eva: true, evaLocation: 'Station' },
  { id: 'iss_eva_support', environment: 'space_station', name: 'EVA support (inside)', activity: 'Light' },

  { id: 'base_habitat', environment: 'planetary_base', name: 'Habitat operations', activity: 'Light' },
  { id: 'base_rover', environment: 'planetary_base', name: 'Rover traverse', activity: 'Moderate' },
  { id: 'base_eva', environment: 'planetary_base', name: 'Surface EVA', activity: 'Intense', eva: true, evaLocation: 'Lunar surface' },
  { id: 'base_eva_support', environment: 'planetary_base', name: 'EVA support (habitat)', activity: 'Light' },
  { id: 'base_rest', environment: 'planetary_base', name: 'Rest period', activity: 'Rest' },

  { id: 'post_medical', environment: 'earth_postflight', name: 'Post-flight medical check', activity: 'Rest' },
  { id: 'post_stand', environment: 'earth_postflight', name: 'Orthostatic stand test', activity: 'Light' },
  { id: 'post_rehab', environment: 'earth_postflight', name: 'Reconditioning therapy', activity: 'Moderate' },
];

export function getTask(taskId) {
  return TASKS.find((t) => t.id === taskId);
}

export function getEnvironment(envId) {
  return SECTIONS.find((s) => s.id === envId) || SECTIONS[0];
}

// Metrics monitored for a task: the environment's set, plus suit telemetry during EVA
export function getTaskMetrics(task) {
  const env = getEnvironment(task.environment);
  return task.eva ? [...env.metrics, ...EVA_METRICS] : env.metrics;
}

export function getTaskPrimaryMetrics(task) {
  return task.eva ? EVA_PRIMARY_METRICS : getEnvironment(task.environment).primaryMetrics;
}

// A crew flies a mission together: everyone in a mission goes through the same phase at the
// same time, and the phase decides which environments (and so which tasks) are possible.
// Within a phase the crew splits into tasks; spacewalks are done in pairs (buddy system).
export const MISSION_PHASES = {
  preflight: { label: 'Pre-flight', environments: ['earth_preflight'], defaultTask: 'pre_sim' },
  launch: { label: 'Launch', environments: ['spacecraft'], defaultTask: 'sc_launch' },
  transit: { label: 'Transit', environments: ['spacecraft'], defaultTask: 'sc_piloting' },
  station: { label: 'Station operations', environments: ['space_station'], defaultTask: 'iss_science' },
  // Lunar surface: landers work in the base, the vehicle stays available in orbit
  surface: { label: 'Surface operations', environments: ['planetary_base', 'spacecraft'], defaultTask: 'base_habitat' },
  return: { label: 'Re-entry', environments: ['spacecraft'], defaultTask: 'sc_reentry' },
  postflight: { label: 'Recovery', environments: ['earth_postflight'], defaultTask: 'post_medical' },
};

// Phases in mission order; a mission only moves forward
export const MISSION_TYPES = {
  ISS: ['preflight', 'launch', 'transit', 'station', 'return', 'postflight'],
  Lunar: ['preflight', 'launch', 'transit', 'surface', 'return', 'postflight'],
};

export const MISSIONS = [
  { id: 'exp-74', name: 'Expedition 74', type: 'ISS', phase: 'station' },
  { id: 'selene-2', name: 'Selene-2', type: 'Lunar', phase: 'surface' },
  { id: 'exp-73', name: 'Expedition 73', type: 'ISS', phase: 'postflight' },
];

export function getMission(missionId) {
  return MISSIONS.find((m) => m.id === missionId);
}

export const crewMembers = [
  {
    id: 'ast-001',
    astronautId: 'AST-01',
    name: 'Eng. Charlotte Hayes',
    role: 'Flight Engineer',
    age: 42,
    nationality: 'United Kingdom',
    avatar: '👩‍🚀',
    missionId: 'exp-74',
    defaultTask: 'iss_eva',
  },
  {
    id: 'ast-002',
    astronautId: 'AST-02',
    name: 'Dr. Daniel Whitaker',
    role: 'Flight Surgeon',
    age: 38,
    nationality: 'United States',
    avatar: '👨‍🚀',
    missionId: 'exp-74',
    defaultTask: 'iss_eva_support',
  },
  {
    id: 'ast-003',
    astronautId: 'AST-03',
    name: 'Eng. Haruka Sato',
    role: 'Mission Commander & Pilot',
    age: 35,
    nationality: 'Japan',
    avatar: '👩‍🚀',
    missionId: 'exp-74',
    defaultTask: 'iss_eva',
  },
  {
    id: 'ast-004',
    astronautId: 'AST-04',
    name: 'Dr. Mikhail Orlov',
    role: 'Science Officer',
    age: 45,
    nationality: 'Russia',
    avatar: '👨‍🚀',
    missionId: 'exp-73',
    defaultTask: 'post_rehab',
  },
  {
    id: 'ast-005',
    astronautId: 'AST-05',
    name: 'Eng. Lucas Moreau',
    role: 'Mission Commander & Pilot',
    age: 44,
    nationality: 'France',
    avatar: '👨‍🚀',
    missionId: 'selene-2',
    defaultTask: 'base_habitat',
  },
  {
    id: 'ast-006',
    astronautId: 'AST-06',
    name: 'Dr. Amara Okafor',
    role: 'Mission Specialist (Geologist)',
    age: 39,
    nationality: 'Nigeria',
    avatar: '👩‍🚀',
    missionId: 'selene-2',
    defaultTask: 'base_habitat',
  },
];

// Metadata and thresholds for all dataset metrics. Range keys: an environment id,
// `eva` (applies to every metric during a spacewalk) or `default`.
export const metricDefinitions = {
  heart_rate_bpm: {
    key: 'heart_rate_bpm',
    label: 'Heart Rate',
    chartLabel: 'Heart Rate (bpm)',
    unit: 'bpm',
    decimals: 0,
    color: 'var(--color-chart-5)',
    ranges: {
      default: { min: 55, max: 100, criticalLow: 45, criticalHigh: 120 },
      earth_preflight: { min: 52, max: 95, criticalLow: 45, criticalHigh: 115 },
      spacecraft: { min: 55, max: 105, criticalLow: 45, criticalHigh: 125 },
      planetary_base: { min: 55, max: 105, criticalLow: 45, criticalHigh: 125 },
      earth_postflight: { min: 55, max: 105, criticalLow: 45, criticalHigh: 125 },
      eva: { min: 70, max: 145, criticalLow: 55, criticalHigh: 165 },
    },
  },
  systolic_bp_mmhg: {
    key: 'systolic_bp_mmhg',
    secondary: 'diastolic_bp_mmhg',
    label: 'Blood Pressure',
    chartLabel: 'Systolic Blood Pressure (mmHg)',
    unit: 'mmHg',
    decimals: 0,
    color: 'var(--color-chart-2)',
    ranges: {
      default: { min: 95, max: 135, criticalLow: 85, criticalHigh: 150 },
      // Orthostatic intolerance after landing: low pressure is the main risk
      earth_postflight: { min: 98, max: 135, criticalLow: 88, criticalHigh: 150 },
      eva: { min: 100, max: 150, criticalLow: 90, criticalHigh: 165 },
    },
  },
  diastolic_bp_mmhg: {
    key: 'diastolic_bp_mmhg',
    label: 'Diastolic BP',
    chartLabel: 'Diastolic Blood Pressure (mmHg)',
    unit: 'mmHg',
    decimals: 0,
    color: 'var(--color-chart-2)',
    ranges: {
      default: { min: 60, max: 85, criticalLow: 50, criticalHigh: 95 },
      eva: { min: 65, max: 92, criticalLow: 55, criticalHigh: 105 },
    },
  },
  spo2_pct: {
    key: 'spo2_pct',
    label: 'SpO₂ (Oxygen)',
    chartLabel: 'Oxygen Saturation SpO₂ (%)',
    unit: '%',
    decimals: 1,
    color: 'var(--color-chart-1)',
    ranges: {
      default: { min: 95.0, max: 100.0, criticalLow: 92.0, criticalHigh: 101.0 },
      // Hypobaric habitat lowers saturation slightly (sim_daily mean 96.5%)
      planetary_base: { min: 94.5, max: 100.0, criticalLow: 92.0, criticalHigh: 101.0 },
      eva: { min: 94.0, max: 100.0, criticalLow: 91.0, criticalHigh: 101.0 },
    },
  },
  body_temp_c: {
    key: 'body_temp_c',
    label: 'Body Temp',
    chartLabel: 'Body Temperature (°C)',
    unit: '°C',
    decimals: 1,
    color: 'var(--color-chart-2)',
    ranges: {
      default: { min: 36.1, max: 37.3, criticalLow: 35.5, criticalHigh: 38.0 },
      eva: { min: 36.4, max: 37.9, criticalLow: 35.8, criticalHigh: 38.3 },
    },
  },
  sleep_hours_prev_night: {
    key: 'sleep_hours_prev_night',
    label: 'Sleep (Prev Night)',
    chartLabel: 'Sleep Duration — Prev. Night (hrs)',
    unit: 'hrs',
    decimals: 1,
    color: 'var(--color-chart-4)',
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
    color: 'var(--color-chart-3)',
  },
  flight_phase: {
    key: 'flight_phase',
    label: 'Flight Phase',
    chartLabel: 'Flight Phase',
    unit: 'phase',
    isCategorical: true,
    color: 'var(--color-chart-1)',
  },
  hip_t_score: {
    key: 'hip_t_score',
    label: 'Hip BMD T-Score',
    chartLabel: 'Hip Bone Density T-Score (SD)',
    unit: 'SD',
    decimals: 2,
    color: 'var(--color-chart-3)',
    ranges: {
      default: { min: -1.5, max: 1.0, criticalLow: -2.5, criticalHigh: 2.5 },
      earth_preflight: { min: -1.0, max: 1.0, criticalLow: -2.0, criticalHigh: 2.5 },
      space_station: { min: -1.8, max: 0.8, criticalLow: -2.5, criticalHigh: 2.5 },
      earth_postflight: { min: -1.8, max: 1.0, criticalLow: -2.5, criticalHigh: 2.5 },
    },
  },
  vitamin_d_ng_ml: {
    key: 'vitamin_d_ng_ml',
    label: 'Vitamin D (25-OH)',
    chartLabel: 'Vitamin D Concentration (ng/ml)',
    unit: 'ng/ml',
    decimals: 1,
    color: 'var(--color-chart-2)',
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
    color: 'var(--color-chart-5)',
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
    color: 'var(--color-chart-4)',
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
    color: 'var(--color-chart-3)',
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
    color: 'var(--color-chart-2)',
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
    color: 'var(--color-chart-4)',
    ranges: {
      default: { min: 0, max: 130, criticalLow: -1, criticalHigh: 200 },
      spacecraft: { min: 0, max: 45, criticalLow: -1, criticalHigh: 90 },
      space_station: { min: 0, max: 140, criticalLow: -1, criticalHigh: 210 },
      planetary_base: { min: 0, max: 200, criticalLow: -1, criticalHigh: 300 },
      // Dose accumulated over the whole expedition, recorded after landing
      earth_postflight: { min: 0, max: 250, criticalLow: -1, criticalHigh: 400 },
      eva: { min: 0, max: 145, criticalLow: -1, criticalHigh: 210 },
    },
  },
};

// Exertion-dependent upper limits. Heart rate uses a share of the age-predicted maximum
// (Tanaka: HRmax = 208 - 0.7 × age); blood pressure and temperature are shifted up.
// These are general exercise-physiology references, not validated clinical limits.
// SpO₂, suit and radiation limits are never relaxed by activity.
const ACTIVITY_LIMITS = {
  Light: { hrMaxPct: 0.6, hrCriticalPct: 0.75, systolicShift: 10, tempShift: 0 },
  Moderate: { hrMaxPct: 0.75, hrCriticalPct: 0.9, systolicShift: 20, tempShift: 0.3 },
  Intense: { hrMaxPct: 0.9, hrCriticalPct: 0.95, systolicShift: 35, tempShift: 0.5 },
};
const TEMP_CRITICAL_CEILING = 39.0;

// context: { activity, age, eva } of the astronaut; without it the environment range is returned
export function getMetricRange(metricKey, sectionId = 'space_station', context = {}) {
  const def = metricDefinitions[metricKey];
  if (!def || !def.ranges) return null;
  const base = (context.eva && def.ranges.eva) || def.ranges[sectionId] || def.ranges.default;
  const limits = ACTIVITY_LIMITS[context.activity];
  if (!limits) return base;

  // Adjusted limits never drop below the environment's own limits
  const raise = (max, criticalHigh) => {
    if (max <= base.max && criticalHigh <= base.criticalHigh) return base;
    return {
      ...base,
      max: Math.max(base.max, max),
      criticalHigh: Math.max(base.criticalHigh, criticalHigh),
      adjustedFor: context.activity,
    };
  };

  if (metricKey === 'heart_rate_bpm' && context.age) {
    const hrMax = 208 - 0.7 * context.age;
    return raise(Math.round(hrMax * limits.hrMaxPct), Math.round(hrMax * limits.hrCriticalPct));
  }
  if (metricKey === 'systolic_bp_mmhg' && limits.systolicShift) {
    return raise(base.max + limits.systolicShift, base.criticalHigh + limits.systolicShift);
  }
  if (metricKey === 'body_temp_c' && limits.tempShift) {
    return raise(
      Math.round((base.max + limits.tempShift) * 10) / 10,
      Math.min(TEMP_CRITICAL_CEILING, Math.round((base.criticalHigh + limits.tempShift) * 10) / 10)
    );
  }
  return base;
}

// Several readings out of range together can be an emergency even if none is critical alone.
// A rule fires when at least `min` of its metrics are out of range for the confirmation window.
export const COMBINED_RULES = [
  {
    id: 'suit-integrity',
    label: 'Possible suit failure',
    metrics: ['suit_pressure_psia', 'suit_co2_ppm', 'spo2_pct'],
    min: 2,
    advice: 'Stop work and return to the airlock. Check suit seals and CO₂ scrubber.',
  },
  {
    id: 'heat-stress',
    label: 'Heat stress',
    metrics: ['body_temp_c', 'heart_rate_bpm'],
    min: 2,
    advice: 'Stop activity, increase cooling and drink water.',
  },
  {
    id: 'hypoxia',
    label: 'Possible hypoxia',
    metrics: ['spo2_pct', 'heart_rate_bpm'],
    min: 2,
    advice: 'Stop activity, breathe steadily and check the O₂ supply.',
  },
  {
    id: 'cardiovascular',
    label: 'Cardiovascular strain',
    metrics: ['heart_rate_bpm', 'systolic_bp_mmhg'],
    min: 2,
    advice: 'Stop activity, rest and report any symptoms.',
  },
];

export function getVitalContext(member, vitals) {
  return { activity: vitals?.activity_level, age: member?.age, eva: Boolean(member?.task?.eva) };
}

// Baseline per environment for a Light activity level, calibrated with the
// per-environment means of data/simulated/sim_daily.csv
const environmentBaselines = {
  earth_preflight: {
    heart_rate_bpm: 70,
    systolic_bp_mmhg: 117,
    diastolic_bp_mmhg: 75,
    spo2_pct: 98.4,
    body_temp_c: 36.6,
    sleep_hours_prev_night: 7.5,
    hip_t_score: -0.25,
    vitamin_d_ng_ml: 56.0,
    lv_mass_g: 191.0,
    pvt_reaction_time_ms: 280,
    cumulative_radiation_mgy: 0.0,
  },
  spacecraft: {
    heart_rate_bpm: 75,
    systolic_bp_mmhg: 122,
    diastolic_bp_mmhg: 79,
    spo2_pct: 98.3,
    body_temp_c: 36.8,
    sleep_hours_prev_night: 6.6,
    hip_t_score: -0.25,
    vitamin_d_ng_ml: 56.0,
    lv_mass_g: 188.0,
    pvt_reaction_time_ms: 300,
    cumulative_radiation_mgy: 14.2,
  },
  space_station: {
    heart_rate_bpm: 76,
    systolic_bp_mmhg: 122,
    diastolic_bp_mmhg: 78,
    spo2_pct: 98.2,
    body_temp_c: 36.9,
    sleep_hours_prev_night: 6.4,
    hip_t_score: -0.7,
    vitamin_d_ng_ml: 48.0,
    lv_mass_g: 182.0,
    pvt_reaction_time_ms: 305,
    cumulative_radiation_mgy: 42.8,
  },
  planetary_base: {
    heart_rate_bpm: 78,
    systolic_bp_mmhg: 123,
    diastolic_bp_mmhg: 79,
    spo2_pct: 96.6,
    body_temp_c: 36.8,
    sleep_hours_prev_night: 6.8,
    hip_t_score: -0.8,
    vitamin_d_ng_ml: 57.0,
    lv_mass_g: 181.0,
    pvt_reaction_time_ms: 300,
    cumulative_radiation_mgy: 38.5,
  },
  earth_postflight: {
    heart_rate_bpm: 78,
    systolic_bp_mmhg: 116,
    diastolic_bp_mmhg: 76,
    spo2_pct: 98.2,
    body_temp_c: 36.7,
    sleep_hours_prev_night: 7.3,
    hip_t_score: -1.1,
    vitamin_d_ng_ml: 51.0,
    lv_mass_g: 183.0,
    pvt_reaction_time_ms: 290,
    cumulative_radiation_mgy: 120.0,
  },
};

// Spacewalk overlay (sim_eva.csv): exertion, suit telemetry and a lower SpO₂
const evaBaseline = {
  heart_rate_bpm: 112,
  systolic_bp_mmhg: 135,
  diastolic_bp_mmhg: 85,
  spo2_pct: 96.5,
  body_temp_c: 37.3,
  suit_pressure_psia: 4.29,
  suit_co2_ppm: 2450,
};

// How much the activity level moves the Light-activity baseline (non-EVA tasks)
const activityShift = {
  Rest: { heart_rate_bpm: -8, systolic_bp_mmhg: -3, body_temp_c: -0.1 },
  Light: {},
  Moderate: { heart_rate_bpm: 18, systolic_bp_mmhg: 8, body_temp_c: 0.2 },
  Intense: { heart_rate_bpm: 40, systolic_bp_mmhg: 18, body_temp_c: 0.4 },
};

// Story-driven readings for the default assignments, keyed "<astronaut>:<task>"
const scenarios = {
  // Commander on EVA from the station: suit CO₂ scrubber load and a pressure dip
  'ast-003:iss_eva': {
    heart_rate_bpm: 152,
    suit_co2_ppm: 4420,
    suit_pressure_psia: 4.12,
    body_temp_c: 38.0,
    spo2_pct: 93.8,
    event: 'Overexertion',
  },
  // Back on Earth after 201 days: accumulated dose and bone loss to recover
  'ast-004:post_rehab': {
    cumulative_radiation_mgy: 134.6,
    hip_t_score: -1.65,
    lv_mass_g: 168.2,
    vitamin_d_ng_ml: 44.5,
  },
  // Lunar habitat at 8.2 psia: slightly lower saturation is expected
  'ast-006:base_habitat': { spo2_pct: 96.4 },
};

function round(value, decimals) {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function taskBaseline(task) {
  const base = { ...environmentBaselines[task.environment] };
  if (task.eva) {
    Object.assign(base, evaBaseline);
    if (task.environment === 'planetary_base') base.spo2_pct = 96.0;
  } else {
    Object.entries(activityShift[task.activity] || {}).forEach(([k, d]) => {
      base[k] += d;
    });
  }
  return base;
}

function generateTimeSeries(task, memberOffset, points = 24, endAt = Date.now()) {
  const base = taskBaseline(task);
  const data = [];
  const stepMs = task.eva ? 15 * 60000 : 3600000;

  for (let i = points; i >= 0; i--) {
    const time = new Date(endAt - i * stepMs);
    const wave = Math.sin(i * 0.45 + memberOffset);
    const slowWave = Math.cos(i * 0.2 + memberOffset);
    const noise = (m) => (Math.random() - 0.5) * m;

    const sample = {
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      timestamp: time.getTime(),
      heart_rate_bpm: Math.round(base.heart_rate_bpm + memberOffset * 2 + wave * 8 + noise(5)),
      systolic_bp_mmhg: Math.round(base.systolic_bp_mmhg + memberOffset * 2 + wave * 6 + noise(4)),
      diastolic_bp_mmhg: Math.round(base.diastolic_bp_mmhg + memberOffset + wave * 4 + noise(3)),
      spo2_pct: Math.min(100, round(base.spo2_pct + slowWave * 0.5 + noise(0.5), 1)),
      body_temp_c: round(base.body_temp_c + slowWave * 0.2 + noise(0.15), 1),
      sleep_hours_prev_night: round(base.sleep_hours_prev_night + slowWave * 0.5 + noise(0.3), 1),
      hip_t_score: round(base.hip_t_score - (points - i) * 0.005 + slowWave * 0.04, 2),
      vitamin_d_ng_ml: round(base.vitamin_d_ng_ml + slowWave * 2.5 + noise(1.5), 1),
      lv_mass_g: round(base.lv_mass_g - memberOffset * 1.5 + slowWave * 2.2 + noise(1.5), 1),
      pvt_reaction_time_ms: Math.round(base.pvt_reaction_time_ms + memberOffset * 5 + wave * 18 + noise(12)),
      cumulative_radiation_mgy: Math.max(
        0,
        round(base.cumulative_radiation_mgy + (points - i) * 0.35 + memberOffset * 3, 1)
      ),
    };
    if (task.eva) {
      sample.suit_pressure_psia = round(base.suit_pressure_psia + slowWave * 0.04 + noise(0.03), 2);
      sample.suit_co2_ppm = Math.round(base.suit_co2_ppm + (points - i) * 35 + wave * 180 + noise(120));
    }
    data.push(sample);
  }
  return data;
}

// Monitoring state for one astronaut doing one task. `endAt` lets past sessions be generated.
export function buildAssignment(member, taskId, memberIndex, endAt = Date.now()) {
  const task = getTask(taskId);
  const env = getEnvironment(task.environment);
  const series = generateTimeSeries(task, memberIndex, 24, endAt);
  const currentVitals = {
    ...series[series.length - 1],
    activity_level: task.activity,
    flight_phase: task.flightPhase || (task.eva ? 'EVA' : env.defaultFlightPhase),
    event: 'Normal',
    ...scenarios[`${member.id}:${taskId}`],
  };
  return {
    ...member,
    taskId,
    task,
    env: task.environment,
    startedAt: endAt,
    data: { vitals: series, currentVitals },
  };
}

export function generateCrewData() {
  return Object.fromEntries(
    crewMembers.map((member, idx) => [member.id, buildAssignment(member, member.defaultTask, idx)])
  );
}

export function recordKey(astronautId, taskId) {
  return `${astronautId}:${taskId}`;
}

// Completed session of a task: the astronaut's state when the task ended, kept on the ground
export function makeSessionRecord(member, endedAt = Date.now()) {
  return {
    key: recordKey(member.id, member.taskId),
    member,
    startedAt: member.startedAt,
    endedAt,
  };
}

const DAY_MS = 86400000;

// Sessions already completed before the monitoring starts, consistent with where each
// astronaut is now (e.g. whoever is in transit has done the pre-flight baseline exam)
const completedSessions = [
  // Expedition 74 flew together: same exams, launch and docking, then station work
  ...['ast-001', 'ast-002', 'ast-003'].flatMap((astronautId) => [
    { astronautId, taskId: 'pre_medical', daysAgo: 160 },
    { astronautId, taskId: 'sc_launch', daysAgo: 127 },
    { astronautId, taskId: 'sc_docking', daysAgo: 126 },
  ]),
  { astronautId: 'ast-001', taskId: 'iss_exercise', daysAgo: 1 },
  { astronautId: 'ast-002', taskId: 'iss_maintenance', daysAgo: 1 },
  { astronautId: 'ast-003', taskId: 'iss_science', daysAgo: 2 },
  // Selene-2: both surface crew members did their first lunar EVA together
  ...['ast-005', 'ast-006'].flatMap((astronautId) => [
    { astronautId, taskId: 'pre_medical', daysAgo: 60 },
    { astronautId, taskId: 'sc_launch', daysAgo: 21 },
    { astronautId, taskId: 'base_eva', daysAgo: 3 },
  ]),
  // Expedition 73 is back on Earth
  { astronautId: 'ast-004', taskId: 'pre_medical', daysAgo: 240 },
  { astronautId: 'ast-004', taskId: 'sc_launch', daysAgo: 206 },
  { astronautId: 'ast-004', taskId: 'iss_science', daysAgo: 8 },
  { astronautId: 'ast-004', taskId: 'sc_reentry', daysAgo: 5 },
];

export function generateInitialRecords() {
  return Object.fromEntries(
    completedSessions.map(({ astronautId, taskId, daysAgo }) => {
      const index = crewMembers.findIndex((m) => m.id === astronautId);
      const endedAt = Date.now() - daysAgo * DAY_MS;
      const member = buildAssignment(crewMembers[index], taskId, index, endedAt);
      const startedAt = member.data.vitals[0].timestamp;
      return [recordKey(astronautId, taskId), { ...makeSessionRecord(member, endedAt), startedAt }];
    })
  );
}

// Alerts in English, matching the default assignments
export const initialAlerts = [
  {
    id: 'alert-1',
    section: 'space_station',
    severity: 'critical',
    astronaut: 'Eng. Haruka Sato',
    message: 'EVA suit CO₂ scrubber load elevated (4,420 ppm) & suit pressure dip (4.12 psia) during station EVA #2',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'alert-2',
    section: 'space_station',
    severity: 'warning',
    astronaut: 'Eng. Haruka Sato',
    message: 'Peak metabolic exertion detected (HR 152 bpm, Temp 38.0°C) — advise 10-minute tether rest',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'alert-3',
    section: 'earth_postflight',
    severity: 'warning',
    astronaut: 'Dr. Mikhail Orlov',
    message: 'Post-flight hip BMD T-score at -1.65 SD after 201 days on station — continue resistance reconditioning and schedule DXA follow-up',
    timestamp: new Date(Date.now() - 2400000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'alert-4',
    section: 'earth_postflight',
    severity: 'info',
    astronaut: 'Dr. Mikhail Orlov',
    message: 'Expedition cumulative dose recorded: 134.6 mGy. Orthostatic stand test scheduled for R+6',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    acknowledged: true,
  },
  {
    id: 'alert-5',
    section: 'planetary_base',
    severity: 'info',
    astronaut: 'Dr. Amara Okafor',
    message: 'Habitat at 8.2 psia / 34% O₂: SpO₂ around 96% is expected (hypobaric adaptation). Alert threshold 94.5%',
    timestamp: new Date(Date.now() - 5400000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'alert-6',
    section: 'space_station',
    severity: 'info',
    astronaut: 'Eng. Charlotte Hayes',
    message: 'EVA #2 buddy pair: Hayes & Sato outside, Whitaker on EVA support inside (procedures and robotic arm)',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    acknowledged: true,
  },
];

// Environment & NASA clinical countermeasures per environment
// (from data/original/dataset_space_health_indicators_nasa.csv)
export const sectionEnvironmentData = {
  earth_preflight: {
    title: 'Earth Pre-Flight Facility',
    metrics: [
      { label: 'Ambient Temp', value: '21.5°C', color: 'var(--color-chart-2)' },
      { label: 'Humidity', value: '45%', color: 'var(--color-chart-1)' },
      { label: 'Gravity', value: '1.00 g', color: 'var(--color-chart-3)' },
      { label: 'Atm. Pressure', value: '14.7 psia', color: 'var(--color-chart-3)' },
      { label: 'O₂ Level', value: '20.9%', color: 'var(--color-chart-1)' },
      { label: 'Bg. Radiation', value: '0.01 mGy/d', color: 'var(--color-chart-4)' },
    ],
    radiation: { label: 'Pre-Flight Radiation Baseline (30d)', current: 0.3, limit: 20.0, unit: 'mGy' },
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
  spacecraft: {
    title: 'Spacecraft Cabin Telemetry',
    metrics: [
      { label: 'Cabin Temp', value: '21.8°C', color: 'var(--color-chart-2)' },
      { label: 'Humidity', value: '40%', color: 'var(--color-chart-1)' },
      { label: 'Cabin Pressure', value: '14.7 psia', color: 'var(--color-chart-3)' },
      { label: 'Cabin O₂', value: '21.0%', color: 'var(--color-chart-1)' },
      { label: 'Gravity', value: '0.0 g (Transit)', color: 'var(--color-chart-4)' },
      { label: 'Comm Delay', value: '4.2 min', color: 'var(--color-chart-2)' },
    ],
    radiation: { label: 'Deep-Space Transit Radiation Dose', current: 18.6, limit: 100.0, unit: 'mGy' },
    nasaIndicators: [
      {
        metric: 'Blood Pressure & Heart Rate',
        hazard: 'Altered Gravity (Launch / Transit / Reentry)',
        rationale: 'Body fluid shift; orthostatic intolerance on reconditioning',
        countermeasure: 'Lower-body compression garments (GCG) & pre-descent fluid loading',
      },
      {
        metric: 'Sleep Hours & Circadian Rhythm',
        hazard: 'Isolation & Confinement',
        rationale: 'Biological clock misalignment increases the risk of psychosocial problems',
        countermeasure: 'Cabin lighting synchronization and routine control',
      },
    ],
  },
  space_station: {
    title: 'ISS Space Station Environment',
    metrics: [
      { label: 'Cabin Temp', value: '22.3°C', color: 'var(--color-chart-2)' },
      { label: 'Humidity', value: '42%', color: 'var(--color-chart-1)' },
      { label: 'Cabin CO₂', value: '0.38%', color: 'var(--color-chart-4)' },
      { label: 'Cabin Pressure', value: '14.7 psia', color: 'var(--color-chart-3)' },
      { label: 'Cabin O₂', value: '20.9%', color: 'var(--color-chart-1)' },
      { label: 'Daily Dose', value: '0.35 mGy/d', color: 'var(--color-chart-2)' },
    ],
    radiation: { label: 'Station Cumulative Radiation (Mission)', current: 43.3, limit: 150.0, unit: 'mGy' },
    nasaIndicators: [
      {
        metric: 'Bone Mineral Density (Hip T-Score)',
        hazard: 'Microgravity (1.0–1.5% BMD loss/mo)',
        rationale: 'Space osteoporosis monitoring; critical threshold if T-score drops below -2.5 SD',
        countermeasure: 'Advanced Resistive Exercise Device (ARED — 1.5 h/day)',
      },
      {
        metric: 'Oxygen Saturation & Suit Pressure (EVA)',
        hazard: 'Hostile Environments (Closed Suit)',
        rationale: 'Risk of mild hypoxia and decompression sickness due to pressure differences',
        countermeasure: 'Pre-breathe protocols and automated suit alerts',
      },
    ],
  },
  planetary_base: {
    title: 'Lunar Surface Habitat',
    metrics: [
      { label: 'Habitat Pressure', value: '8.2 psia', color: 'var(--color-chart-3)' },
      { label: 'Habitat O₂', value: '34%', color: 'var(--color-chart-1)' },
      { label: 'Gravity', value: '0.17 g (Moon)', color: 'var(--color-chart-4)' },
      { label: 'Habitat Temp', value: '21.5°C', color: 'var(--color-chart-2)' },
      { label: 'Comm Delay', value: '1.3 s', color: 'var(--color-chart-2)' },
      { label: 'Daily Dose', value: '1.4 mGy/d', color: 'var(--color-chart-2)' },
    ],
    radiation: { label: 'Surface Cumulative Radiation (Mission)', current: 38.5, limit: 300.0, unit: 'mGy' },
    nasaIndicators: [
      {
        metric: 'Radiation Dosimetry',
        hazard: 'Space Radiation (GCR / SPE)',
        rationale: 'Exposures > 0.5 Gy increase the risk of degenerative tissue damage and cataracts',
        countermeasure: 'Cumulative dose monitoring; antioxidant diet development',
      },
      {
        metric: 'Communication Delay',
        hazard: 'Distance from Earth',
        rationale: 'Real-time medical intervention from Earth is impossible',
        countermeasure: "Fully autonomous medical software with 'just-in-time' training",
      },
    ],
  },
  earth_postflight: {
    title: 'Post-Flight Rehabilitation Center',
    metrics: [
      { label: 'Gravity', value: '1.00 g', color: 'var(--color-chart-3)' },
      { label: 'Ambient Temp', value: '22.0°C', color: 'var(--color-chart-2)' },
      { label: 'Atm. Pressure', value: '14.7 psia', color: 'var(--color-chart-3)' },
      { label: 'O₂ Level', value: '20.9%', color: 'var(--color-chart-1)' },
      { label: 'Days on Earth', value: 'R+5', color: 'var(--color-chart-4)' },
      { label: 'Rehab Plan', value: '45 days', color: 'var(--color-chart-2)' },
    ],
    radiation: { label: 'Expedition Total Radiation Dose', current: 134.6, limit: 500.0, unit: 'mGy' },
    nasaIndicators: [
      {
        metric: 'Blood Pressure & Heart Rate',
        hazard: 'Altered Gravity (Reconditioning)',
        rationale: 'Body fluid shift; orthostatic intolerance on reconditioning',
        countermeasure: 'Lower-body compression garments (GCG) & fluid loading',
      },
      {
        metric: 'Bone Mineral Density (DXA T-score)',
        hazard: 'Recovery after Microgravity',
        rationale: 'Space osteoporosis monitoring (risk if T-score < -2.5)',
        countermeasure: 'Progressive resistance reconditioning & follow-up DXA scans',
      },
    ],
  },
};

// Communication link per environment. Outages repeat every `period` seconds and last `outage`
// seconds (offset so environments don't drop together). During an outage telemetry is kept in
// the onboard store-and-forward buffer (Docker service on the vehicle) and sent when the link
// returns. bandwidth 'high' allows live body-cam video; 'low' only allows periodic snapshots.
export const LINK_PROFILES = {
  earth_preflight: {
    route: 'Ground network (fiber)',
    bandwidth: 'high',
    delayLabel: '< 1 s',
    cycle: null,
  },
  spacecraft: {
    route: 'Deep Space Network',
    bandwidth: 'low',
    delayLabel: '4.2 min one-way',
    cycle: { period: 120, outage: 30, offset: 0 },
  },
  space_station: {
    route: 'TDRS relay satellites',
    bandwidth: 'high',
    delayLabel: '~0.6 s',
    cycle: { period: 90, outage: 20, offset: 40 },
  },
  planetary_base: {
    route: 'Lunar relay → Deep Space Network',
    bandwidth: 'low',
    delayLabel: '~1.3 s',
    cycle: { period: 100, outage: 25, offset: 70 },
  },
  earth_postflight: {
    route: 'Ground network (fiber)',
    bandwidth: 'high',
    delayLabel: '< 1 s',
    cycle: null,
  },
};

// Body-cam stream URLs per astronaut (e.g. HLS/WebRTC gateway). null = show the simulated feed.
export const bodyCamStreams = {
  'ast-001': null,
  'ast-002': null,
  'ast-003': null,
  'ast-004': null,
  'ast-005': null,
  'ast-006': null,
};
