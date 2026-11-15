import Dexie from 'dexie';

// Onboard "black box": telemetry snapshots waiting to reach the cloud. They stay on the device
// (IndexedDB) while there is no connection and are sent when it returns.
export const db = new Dexie('CajaNegraAstronauta');

db.version(1).stores({
  telemetriaPendiente: '++id, astronauta_id, timestamp, ritmo_cardiaco, spO2, radiacion, t_score_cadera',
});
