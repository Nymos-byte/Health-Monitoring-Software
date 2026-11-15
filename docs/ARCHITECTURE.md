# System architecture

Vital-X has two parts that share the same mission model (five environments, NASA-calibrated
ranges):

1. **Data and ML pipeline** (Python): simulates missions, validates the data and trains
   context-aware risk models. See [`ML_PIPELINE.md`](ML_PIPELINE.md).
2. **Vital-X app** (React PWA + one serverless function): three screens for Ground Control, the
   crew tablet and the wrist display, with offline storage and cloud sync.

```
                    ┌──────────────────────────── Browser (PWA) ─────────────────────────────┐
                    │                                                                         │
                    │  useRealtimeVitals ──► crewData (onboard truth, one sample every 3 s)   │
                    │          │                     │                                        │
                    │          │                     ├──► Crew tablet  #/crew                  │
                    │          │                     ├──► Wrist        #/wrist                 │
                    │          ▼                     │                                        │
                    │    useDownlink (store-and-forward, 1 s tick)                             │
                    │          │  AOS: copy onboard → ground   LOS: ground keeps last copy     │
                    │          ▼                                                              │
                    │     groundData ───────────────────► Ground Control #/ground             │
                    │                                                                         │
                    │  useBlackBox (wearer's device, one snapshot every 15 s)                  │
                    │          │                                                              │
                    │          ▼                                                              │
                    │   IndexedDB "CajaNegraAstronauta" / telemetriaPendiente (max 5,000)     │
                    └──────────┼──────────────────────────────────────────────────────────────┘
                               │ link up: POST oldest-first, batches of 200
                               ▼
                    Vercel function  Frontend/api/telemetry.js
                               │ (COSMOS_ENDPOINT / COSMOS_KEY, server-side only)
                               ▼
                    Azure Cosmos DB  MisionMarte / Telemetria (partition key /astronauta_id)
                               │ GET every 5 s: live records of the last 10 min
                               ▼
                    useCloudFeed ── replaces the simulated ground copy of every astronaut whose
                                    device reported in the last 2 min → Ground Control
```

The container holds two kinds of records, told apart by `origen`:

- `en_vivo`: snapshots uploaded by crew devices (the function sets it on every POST).
- `entrenamiento`: a sample of the model's training data loaded once by
  `Frontend/scripts/seed-training.mjs`: 1,500 daily records (all 240 critical, 360 caution,
  900 normal) and 11 whole spacewalks (297 readings, two per EVA event plus three uneventful ones).
  Their dates are synthetic (mission day 0 = 2025-05-01, so all of them lie in the past). Ground
  never shows them as live data. Live records carry the real recording time.

## Front-end modules

| Path | Role |
|---|---|
| `src/App.jsx` | Root: picks the view from the URL hash, wires the hooks together, owns alert acknowledgement and theme. |
| `src/hooks/useRealtimeVitals.js` | Simulates telemetry for every astronaut in their current task: each reading settles back toward the astronaut's baseline with small sensor noise, unless a demo situation or manual readings push it away. About every 8 minutes per astronaut a reading drifts briefly into the caution band (never critical) and settles back. Also task assignment, planned tasks, mission phases and session records. |
| `src/data/scenarios.js` | Demo risk situations (one per event of the training data) and where each pushes the readings, relative to the context-adjusted limits. |
| `src/hooks/useCloudFeed.js` | Ground's reader of Azure: polls `GET /api/telemetry` and merges the live records into the ground copy; astronauts without a reporting device stay simulated. |
| `src/hooks/useDownlink.js` | Simulates the space-to-ground link per environment, with scheduled outages and forced link loss. Ground only sees what the link delivered. |
| `src/hooks/useBlackBox.js` | The wearer's onboard recorder: writes a snapshot every 15 s, whatever the link, and uploads when both the network and the downlink are up. |
| `src/utils/cloudSync.js` | Snapshot format, IndexedDB queue and batched upload to `/api/telemetry`. |
| `src/data/offlineDB.js` | Dexie (IndexedDB) schema of the black box. |
| `src/data/mockData.js` | Environments, tasks, missions, crew, metric definitions and ranges, combined alert rules, link profiles, body-cam streams. |
| `src/utils/metrics.js` | Confirmed critical readings, crew-friendly labels and advice. |
| `src/utils/missions.js` | Which tasks are allowed in the current mission phase. |
| `src/utils/theme.js` | Crew colour themes (Auto, Cabin, Sunlight, Night). |
| `src/views/` | `GroundView`, `CrewView` (+ `crew/` pages) and `WristView`. |
| `src/components/` | Panels and cards shared by the views. |
| `api/telemetry.js` | Vercel serverless function that writes snapshots to Azure Cosmos DB and serves recent live ones to Ground. |
| `scripts/seed-training.mjs` | One-off loader of the training sample into Cosmos DB (see TOOLS.md). |

## Mission model

- **Environments** (same names as `data/simulated/sim_daily.csv`): Earth pre-flight, spacecraft,
  space station, planetary base, return to Earth. Each one has its own monitored metrics and four
  "key readings".
- **Tasks.** Each astronaut has exactly one task, and the task sets the environment and activity
  level (Rest, Light, Moderate, Intense). EVA is a task done from the station or a planetary base;
  it adds suit pressure and suit CO₂. Tasks marked `once` (launch, docking, re-entry, baseline exam)
  can only be done once per mission.
- **Missions and phases.** A crew moves through its phases together and only forward
  (ISS: pre-flight → launch → transit → station → re-entry → recovery; Lunar has surface operations
  instead of station). The phase limits which tasks can be assigned.
- **Session records.** When a task ends, its session is stored as a record (Ground → *Records*).

## Alert logic

Implemented in `src/data/mockData.js` and `src/utils/metrics.js`:

1. **Context-adjusted ranges.** Each metric has normal and critical limits per environment (EVA
   has its own). Limits are raised for the activity level; heart-rate limits use the astronaut's
   age (`HRmax = 208 − 0.7 × age`). Adjusted limits never drop below the environment's own.
2. **Confirmation.** A reading only becomes an emergency after **3 consecutive critical samples**,
   so a single spike or sensor glitch does not alarm.
3. **Combined rules.** Several readings out of range together can be an emergency even if none is
   critical alone: *Possible suit failure* (suit pressure, suit CO₂, SpO₂), *Heat stress*,
   *Possible hypoxia* and *Cardiovascular strain*. Each comes with a crew instruction.
4. **Demo situations.** Ground → *Live* → *Risk simulation* starts a situation on the selected
   astronaut's device (dehydration, infection, sleep deprivation, habitat hypoxia, orthostatic
   intolerance, solar particle event; on EVA: suit CO₂ failure, suit leak, overexertion, mild
   hypoxia; or a cardiac emergency). Readings ramp past their limits in about 15 s and settle back
   when it ends. *Enter readings* holds typed values instead. Crew devices keep a single
   *Simulate emergency* button (cardiac).
5. **Acknowledgement.** Ground and crew acknowledge separately. The wrist and tablet belong to the
   same astronaut, so acknowledging on one silences both. When a reading leaves the critical zone,
   its acknowledgement is forgotten so a new episode alarms again.

## Communication link and offline behaviour

- **Downlink simulation (`useDownlink`).** Each environment has a route, bandwidth and delay
  (fiber on Earth, TDRS for the station, Deep Space Network for the spacecraft, lunar relay for the
  base). The spacecraft, station and base have repeating scheduled outages (LOS). During LOS,
  Ground keeps the last received copy and shows how many samples are buffered onboard; when the
  link returns (AOS) the backlog is delivered at once. New task assignments reach Ground
  immediately, because Ground issues them.
- **Body cam.** High-bandwidth links show live video; low-bandwidth links show a still frame
  periodically; no link shows *No signal*. Real stream URLs can be set in `bodyCamStreams`.
- **Black box (`useBlackBox`).** The device worn by the selected astronaut records a snapshot every
  15 s into IndexedDB, even with no link. When both the browser is online and the downlink of the
  astronaut's environment is up, it uploads everything stored, oldest first, in batches of 200.
  A batch is deleted from the device only after the server accepts it. The store keeps the newest
  5,000 records if an outage fills it.
- **PWA.** The service worker (production build only) caches the app shell so it opens without a
  connection; `/api/` requests are never served from cache.

## Telemetry API

`GET /api/telemetry[?minutes=10]` — live records (`origen = en_vivo`) of the last 10 minutes (max
60), newest first, at most 500: `{"records": [...]}`. `503` if not configured, `502` if the read
fails.

`GET` filters on arrival time (`recibido`), so a black-box backlog recorded long ago still shows.

`POST /api/telemetry` — body: one snapshot or an array of 1–500 snapshots. Each one is stored with
`origen: "en_vivo"`, whatever the client sends, plus how it arrived:

| Field | Set by | Meaning |
|---|---|---|
| `enlace_al_grabar` | device | Link when recorded: `conectado`, `sin_red` (real network outage), `perdida_simulada_manual` (*Simulate link loss*), `perdida_simulada_programada` (scheduled LOS) |
| `recibido` | server | Arrival time |
| `retraso_s` | server | Seconds between recording and arrival |
| `entrega` | server | `tiempo_real`, or `caja_negra` if recorded without a link or delayed more than 45 s |

The server sets `id = live-<astronauta_id>-<timestamp>`, so a record sent twice is stored once
(the response counts `duplicates`), and puts `astronauta_id`, `origen`, `entrega`, `recibido`,
`retraso_s`, `enlace_al_grabar` and `timestamp` first in each document. Cosmos DB keeps documents
in arrival order, so a black-box backlog appears after newer live records; to browse by recording
time in Data Explorer use
`SELECT * FROM c WHERE c.origen = 'en_vivo' ORDER BY c.timestamp DESC`.

Ground → *Live* → *Azure reception* lists these per astronaut (control only, not on crew devices),
so a test can show whether the offline mode worked and whether the outage was real or simulated.
To test a real outage, put the crew device in airplane mode (or DevTools → Network → Offline).

```json
{
  "astronauta_id": "ast-001",
  "mision": "exp-74",
  "entorno": "space_station",
  "tarea": "iss_eva",
  "actividad": "Intense",
  "ritmo_cardiaco": 132,
  "spO2": 97.4,
  "radiacion": 71.2,
  "t_score_cadera": -0.84,
  "evento": "Normal",
  "constantes": { "heart_rate_bpm": 132, "suit_co2_ppm": 2100, "...": 0 },
  "timestamp": "2026-11-15T12:00:00.000Z"
}
```

Top-level field names keep the original Spanish Cosmos DB schema; `constantes` holds every numeric
reading under its English metric key. `astronauta_id` and `timestamp` are required.

| Status | Meaning |
|---|---|
| `201 {"stored": n}` | Stored |
| `400` | Empty body, more than 500 items, or a missing required field |
| `405` | Method other than GET or POST |
| `503` | `COSMOS_ENDPOINT` / `COSMOS_KEY` not configured (the app shows *cloud not configured* and keeps the data onboard) |
| `502` | Cosmos DB rejected the write |

Credentials live only in Vercel environment variables. The browser never sees a database key.

## Current limitations

- The simulation still runs in each browser. Ground shows Azure data only for astronauts whose
  device is uploading (the black box sends the wearer only, every 15 s); the rest stay simulated.
  *Data → Simulation* on Ground ignores Azure entirely (fallback for the demo).
- The app uses rule-based, context-adjusted thresholds; the trained ML models are not wired in yet.
- Crew, missions and alerts are demo data (`src/data/mockData.js`).
