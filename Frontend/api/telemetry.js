import { CosmosClient } from '@azure/cosmos';

// Vercel serverless function: stores telemetry snapshots in Azure Cosmos DB and serves the
// recent ones to Ground Control.
// Credentials come from environment variables set in Vercel, never from the browser:
//   COSMOS_ENDPOINT, COSMOS_KEY, and optionally COSMOS_DATABASE / COSMOS_CONTAINER.
// The container also holds the model's training sample (origen = 'entrenamiento', loaded by
// scripts/seed-training.mjs); records sent by crew devices are always stored as 'en_vivo'.
const MAX_ITEMS = 500;
const REQUIRED_FIELDS = ['astronauta_id', 'timestamp'];
const LIVE = 'en_vivo';
// Ground asks for the last few minutes of live telemetry
const DEFAULT_MINUTES = 10;
const MAX_MINUTES = 60;
const MAX_RECORDS = 500;
// A record that reaches the server later than this was held in the black box, not sent live
const LIVE_DELAY_S = 45;

let container = null;

function getContainer() {
  const { COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DATABASE, COSMOS_CONTAINER } = process.env;
  if (!COSMOS_ENDPOINT || !COSMOS_KEY) return null;
  if (!container) {
    container = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY })
      .database(COSMOS_DATABASE || 'MisionMarte')
      .container(COSMOS_CONTAINER || 'Telemetria');
  }
  return container;
}

// How a record reached ground: straight away, or delivered later from the onboard black box
function delivery(item, receivedAt) {
  const delay = Math.max(0, Math.round((receivedAt - Date.parse(item.timestamp)) / 1000));
  const recordedOffline = item.enlace_al_grabar && item.enlace_al_grabar !== 'conectado';
  return {
    recibido: new Date(receivedAt).toISOString(),
    retraso_s: Number.isFinite(delay) ? delay : null,
    entrega: recordedOffline || delay > LIVE_DELAY_S ? 'caja_negra' : 'tiempo_real',
  };
}

// Live records received recently, newest first, across every astronaut. Filtering on arrival
// time keeps a black-box backlog visible even when it was recorded long ago.
async function readRecent(req, res) {
  const target = getContainer();
  if (!target) {
    return res.status(503).json({ error: 'Cloud storage is not configured' });
  }
  const minutes = Math.min(Number(req.query?.minutes) || DEFAULT_MINUTES, MAX_MINUTES);
  const since = new Date(Date.now() - minutes * 60000).toISOString();
  try {
    const { resources } = await target.items
      .query({
        query:
          'SELECT TOP @limit * FROM c WHERE c.origen = @origen AND c.recibido >= @since ORDER BY c.timestamp DESC',
        parameters: [
          { name: '@limit', value: MAX_RECORDS },
          { name: '@origen', value: LIVE },
          { name: '@since', value: since },
        ],
      })
      .fetchAll();
    const records = resources.map(({ _rid, _self, _etag, _attachments, _ts, ...record }) => record);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ records });
  } catch (error) {
    console.error('Cosmos DB read failed:', error.message);
    return res.status(502).json({ error: 'Cloud storage could not be read' });
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') return readRecent(req, res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Use GET or POST' });
  }

  const items = Array.isArray(req.body) ? req.body : [req.body];
  if (!items.length || items.length > MAX_ITEMS) {
    return res.status(400).json({ error: `Send between 1 and ${MAX_ITEMS} items` });
  }
  if (!items.every((item) => item && REQUIRED_FIELDS.every((f) => item[f] !== undefined))) {
    return res.status(400).json({ error: `Each item needs ${REQUIRED_FIELDS.join(', ')}` });
  }

  const target = getContainer();
  if (!target) {
    return res.status(503).json({ error: 'Cloud storage is not configured' });
  }

  try {
    const receivedAt = Date.now();
    for (const item of items) {
      await target.items.create({ ...item, ...delivery(item, receivedAt), origen: LIVE });
    }
    return res.status(201).json({ stored: items.length });
  } catch (error) {
    console.error('Cosmos DB write failed:', error.message);
    return res.status(502).json({ error: 'Cloud storage rejected the data' });
  }
}
