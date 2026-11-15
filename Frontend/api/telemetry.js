import { CosmosClient } from '@azure/cosmos';

// Vercel serverless function: stores telemetry snapshots in Azure Cosmos DB.
// Credentials come from environment variables set in Vercel, never from the browser:
//   COSMOS_ENDPOINT, COSMOS_KEY, and optionally COSMOS_DATABASE / COSMOS_CONTAINER.
const MAX_ITEMS = 500;
const REQUIRED_FIELDS = ['astronauta_id', 'timestamp'];

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
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
    for (const item of items) await target.items.create(item);
    return res.status(201).json({ stored: items.length });
  } catch (error) {
    console.error('Cosmos DB write failed:', error.message);
    return res.status(502).json({ error: 'Cloud storage rejected the data' });
  }
}
