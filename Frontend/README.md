# Vital-X web app

React + Vite progressive web app with three views — **Ground Control** (`#/ground`), **Crew
Display** (`#/crew`) and **Wrist** (`#/wrist`) — plus one Vercel serverless function
(`api/telemetry.js`) that stores the onboard black box in Azure Cosmos DB.

## Run

```bash
npm install
npm run dev        # development server, http://localhost:5173
npm run lint       # Oxlint
npm run build      # production build with the service worker (dist/)
npm run preview    # serve the build; use it to test offline mode
```

## Layout

```
api/telemetry.js        POST /api/telemetry → Azure Cosmos DB (credentials from env vars)
src/App.jsx             View routing (URL hash), alert acknowledgement, theme
src/hooks/              useRealtimeVitals (simulation), useDownlink (link + store-and-forward),
                        useBlackBox (onboard recording and upload)
src/data/               mockData.js (environments, tasks, missions, crew, ranges, rules),
                        offlineDB.js (IndexedDB schema)
src/utils/              cloudSync, metrics (confirmed criticals), missions, theme, helpers
src/views/              GroundView, CrewView (+ crew/ pages), WristView
src/components/         Panels and cards
```

## Environment variables (Vercel)

| Variable | Required | Default |
|---|---|---|
| `COSMOS_ENDPOINT` | Yes | — |
| `COSMOS_KEY` | Yes | — |
| `COSMOS_DATABASE` | No | `MisionMarte` |
| `COSMOS_CONTAINER` | No | `Telemetria` |

Without them `/api/telemetry` returns `503` and the app keeps the data onboard.

## More

- [User guide](../docs/USER_GUIDE.md)
- [Architecture, alert logic and API](../docs/ARCHITECTURE.md)
- [Tools reference and deployment](../docs/TOOLS.md)
