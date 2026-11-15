// Loads a sample of the model's training data (data/simulated) into Azure Cosmos DB, next to the
// live telemetry, tagged origen = 'entrenamiento'. Every record is SIMULATED.
//
//   node scripts/seed-training.mjs --dry-run                        (counts only, no key needed)
//   node --env-file=.env.local scripts/seed-training.mjs            (uploads)
//
// Needs COSMOS_ENDPOINT and COSMOS_KEY in Frontend/.env.local (ignored by git). Records have fixed
// ids and are upserted, so running it again replaces the same documents instead of duplicating.
import { readFileSync } from 'node:fs';
import { CosmosClient } from '@azure/cosmos';

const ROOT = new URL('../../data/simulated/', import.meta.url);
const DAILY_SAMPLE = { critical: Infinity, caution: 360, normal: 900 };
const EVA_SESSIONS_PER_EVENT = 2;
const EVA_NORMAL_SESSIONS = 3;
const CONCURRENCY = 8;
const SEED = 42;
// Synthetic calendar: mission day 0 is this date (the source data only has relative days).
// Chosen so the whole sample (days -30 to 535) lies in the past and never looks like new data.
const LAUNCH = Date.UTC(2025, 4, 1, 8);
const DAY_MS = 86400000;

const ENVIRONMENTS = {
  Earth_Preflight: 'earth_preflight',
  Spacecraft: 'spacecraft',
  Space_Station: 'space_station',
  Planetary_Base: 'planetary_base',
  Earth_Postflight: 'earth_postflight',
};
const EVA_LOCATIONS = { Station: 'space_station', Lunar_Surface: 'planetary_base', Mars_Surface: 'planetary_base' };
const TEXT_COLUMNS = new Set([
  'astronaut_id', 'mission_type', 'environment', 'flight_phase', 'activity_level', 'expected_adaptation',
  'event', 'sensor_artifact', 'data_origin', 'eva_location',
]);
// Readings that go in `constantes`, with the same keys the web app uses
const READINGS = [
  'heart_rate_bpm', 'systolic_bp_mmhg', 'diastolic_bp_mmhg', 'spo2_pct', 'body_temp_c',
  'sleep_hours_prev_night', 'pvt_reaction_time_ms', 'cumulative_radiation_mgy', 'hip_t_score',
  'vitamin_d_ng_ml', 'lv_mass_g', 'suit_pressure_psia', 'suit_co2_ppm',
];

function readCsv(name) {
  const [header, ...lines] = readFileSync(new URL(name, ROOT), 'utf8').trim().split(/\r?\n/);
  const cols = header.split(',');
  return lines.map((line) =>
    Object.fromEntries(
      line.split(',').map((v, i) => [cols[i], v === '' ? null : TEXT_COLUMNS.has(cols[i]) ? v : Number(v)])
    )
  );
}

// Deterministic shuffle so every run picks the same sample
function shuffled(items, seed = SEED) {
  let a = seed;
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function sampleDaily(rows) {
  const byRisk = { critical: [], caution: [], normal: [] };
  rows.forEach((r) => byRisk[['normal', 'caution', 'critical'][r.risk_level]].push(r));
  return Object.entries(DAILY_SAMPLE).flatMap(([risk, n]) => shuffled(byRisk[risk]).slice(0, n));
}

// Whole spacewalks, so each one reads as a time series: a couple per event plus some uneventful ones
function sampleEva(rows) {
  const sessions = new Map();
  rows.forEach((r) => {
    const key = `${r.astronaut_id}|${r.eva_number}`;
    if (!sessions.has(key)) sessions.set(key, []);
    sessions.get(key).push(r);
  });
  const list = shuffled([...sessions.values()]);
  const eventOf = (s) => s.find((r) => r.event !== 'Normal')?.event ?? 'Normal';
  const picked = new Set();
  const events = [...new Set(list.map(eventOf))];
  events.forEach((event) => {
    const n = event === 'Normal' ? EVA_NORMAL_SESSIONS : EVA_SESSIONS_PER_EVENT;
    list.filter((s) => eventOf(s) === event).slice(0, n).forEach((s) => picked.add(s));
  });
  return [...picked].flat();
}

function toDocument(row, dataset) {
  const eva = dataset === 'sim_eva';
  const at = LAUNCH + row.mission_day * DAY_MS + (eva ? (5 * 60 + row.eva_minute) * 60000 : 0);
  const constantes = Object.fromEntries(
    READINGS.filter((k) => typeof row[k] === 'number').map((k) => [k, row[k]])
  );
  return {
    id: eva
      ? `train-eva-${row.astronaut_id}-e${row.eva_number}-m${row.eva_minute}`
      : `train-daily-${row.astronaut_id}-d${row.mission_day}`,
    astronauta_id: row.astronaut_id,
    origen: 'entrenamiento',
    dataset,
    mision: row.mission_type,
    entorno: eva ? EVA_LOCATIONS[row.eva_location] : ENVIRONMENTS[row.environment],
    eva,
    fase: eva ? 'EVA' : row.flight_phase,
    dia_mision: row.mission_day,
    ...(eva && { eva_numero: row.eva_number, eva_minuto: row.eva_minute }),
    actividad: row.activity_level,
    ritmo_cardiaco: row.heart_rate_bpm,
    spO2: row.spo2_pct,
    radiacion: row.cumulative_radiation_mgy,
    t_score_cadera: row.hip_t_score ?? null,
    constantes,
    evento: row.event,
    intensidad_evento: row.event_intensity,
    nivel_riesgo: row.risk_level,
    adaptacion_esperada: row.expected_adaptation ?? null,
    artefacto_sensor: row.sensor_artifact,
    data_origin: row.data_origin,
    timestamp: new Date(at).toISOString(),
  };
}

function summary(docs) {
  const count = (key) => docs.reduce((acc, d) => ({ ...acc, [d[key]]: (acc[d[key]] ?? 0) + 1 }), {});
  return { total: docs.length, by_risk: count('nivel_riesgo'), by_event: count('evento') };
}

async function upload(docs) {
  const { COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DATABASE, COSMOS_CONTAINER } = process.env;
  if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
    throw new Error('Set COSMOS_ENDPOINT and COSMOS_KEY in Frontend/.env.local, then run with --env-file=.env.local');
  }
  const container = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY })
    .database(COSMOS_DATABASE || 'MisionMarte')
    .container(COSMOS_CONTAINER || 'Telemetria');

  let done = 0;
  let next = 0;
  const worker = async () => {
    while (next < docs.length) {
      const doc = docs[next++];
      await container.items.upsert(doc);
      done += 1;
      if (done % 200 === 0 || done === docs.length) console.log(`  ${done}/${docs.length}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

const daily = sampleDaily(readCsv('sim_daily.csv')).map((r) => toDocument(r, 'sim_daily'));
const eva = sampleEva(readCsv('sim_eva.csv')).map((r) => toDocument(r, 'sim_eva'));
console.log('Daily sample:', summary(daily));
console.log('EVA sample:', summary(eva));

if (process.argv.includes('--dry-run')) {
  console.log('Dry run: nothing uploaded. Example record:\n', JSON.stringify(daily[0], null, 2));
} else {
  console.log('Uploading to Azure Cosmos DB…');
  await upload([...daily, ...eva]);
  console.log('Done.');
}
