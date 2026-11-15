import { db } from '../data/offlineDB';
import { metricDefinitions } from '../data/mockData';

// Ground storage goes through a server-side function (api/telemetry.js) that holds the database
// credentials. The astronaut's device never sees a database key.
const ENDPOINT = '/api/telemetry';
// The black box keeps the newest records if a very long outage ever fills it
const MAX_STORED = 5000;
const BATCH_SIZE = 200;

export class UploadError extends Error {
  constructor(status) {
    super(`Upload failed: ${status}`);
    this.status = status;
  }
}

// One black-box record: every numeric reading at this moment plus where and what the astronaut
// was doing. Top-level field names are kept from the original Azure Cosmos DB schema.
export function makeSnapshot(member) {
  const v = member.data.currentVitals;
  const constantes = Object.fromEntries(
    Object.keys(metricDefinitions)
      .filter((k) => !metricDefinitions[k].isCategorical && typeof v[k] === 'number')
      .map((k) => [k, v[k]])
  );
  return {
    astronauta_id: member.id,
    mision: member.missionId,
    entorno: member.env,
    tarea: member.taskId,
    actividad: v.activity_level,
    ritmo_cardiaco: v.heart_rate_bpm,
    spO2: v.spo2_pct,
    radiacion: v.cumulative_radiation_mgy,
    t_score_cadera: v.hip_t_score,
    constantes,
    timestamp: new Date().toISOString(),
  };
}

async function upload(items) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
  if (!res.ok) throw new UploadError(res.status);
}

// Every record goes into the black box first, so data always reaches ground in recording order
export async function recordSnapshot(snapshot) {
  await db.telemetriaPendiente.add(snapshot);
  const stored = await db.telemetriaPendiente.count();
  if (stored > MAX_STORED) {
    const oldest = await db.telemetriaPendiente.orderBy('id').limit(stored - MAX_STORED).primaryKeys();
    await db.telemetriaPendiente.bulkDelete(oldest);
  }
}

// Send the black box to ground, oldest first, in batches. A batch is only removed from the
// device once ground has accepted it. Returns how many records were sent.
export async function flushPending() {
  let sent = 0;
  for (;;) {
    const batch = await db.telemetriaPendiente.orderBy('id').limit(BATCH_SIZE).toArray();
    if (!batch.length) return sent;
    await upload(batch.map(({ id: _localId, ...item }) => item));
    await db.telemetriaPendiente.bulkDelete(batch.map((r) => r.id));
    sent += batch.length;
  }
}

export function countPending() {
  return db.telemetriaPendiente.count();
}
