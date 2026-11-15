import { db } from '../data/offlineDB';

// Cloud storage goes through a server-side function (api/telemetry.js) that holds the database
// credentials. The browser never sees a database key.
const ENDPOINT = '/api/telemetry';

// Telemetry document in the shape of the cloud container (field names kept from the original
// Azure Cosmos DB schema)
export function makeSnapshot(member) {
  const v = member.data.currentVitals;
  return {
    astronauta_id: member.id,
    tarea: member.taskId,
    entorno: member.env,
    ritmo_cardiaco: v.heart_rate_bpm,
    spO2: v.spo2_pct,
    radiacion: v.cumulative_radiation_mgy,
    t_score_cadera: v.hip_t_score,
    timestamp: new Date().toISOString(),
  };
}

async function upload(items) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
}

// Send now if possible; otherwise keep it in the black box. Returns where it ended up.
export async function storeSnapshot(snapshot) {
  if (navigator.onLine) {
    try {
      await upload([snapshot]);
      return 'cloud';
    } catch {
      // Cloud unreachable or not configured: fall through to the black box
    }
  }
  await db.telemetriaPendiente.add(snapshot);
  return 'device';
}

// Send everything waiting in the black box; it is only cleared once the cloud accepts it
export async function flushPending() {
  const pending = await db.telemetriaPendiente.toArray();
  if (!pending.length) return 0;
  await upload(pending.map(({ id: _localId, ...item }) => item));
  await db.telemetriaPendiente.bulkDelete(pending.map((p) => p.id));
  return pending.length;
}

export function countPending() {
  return db.telemetriaPendiente.count();
}
