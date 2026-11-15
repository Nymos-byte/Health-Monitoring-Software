# Vital-X — Space Health Monitoring System

**NASA Space Apps Challenge 2026 – Health Monitoring challenge**

> **Live demo:** https://vitalx.ticketfix.app — Ground Control, Crew Display
> ([`#/crew`](https://vitalx.ticketfix.app/#/crew)) and Wrist ([`#/wrist`](https://vitalx.ticketfix.app/#/wrist)).
> All health data is simulated.

Long-duration missions expose astronauts to space radiation, isolation and confinement, altered
gravity, distance from Earth and a hostile closed environment. On the Moon or Mars, Earth-based
medical support can be minutes away and the link drops regularly, so crews must spot health
changes themselves.

Vital-X collects health indicators, **knows which mission context the astronaut is in**, detects
risk signals early and avoids false alarms for changes that are expected in that context. A heart
rate of 150 bpm is normal during a spacewalk and an alarm at rest; low SpO₂ is expected in a
hypobaric lunar habitat; tachycardia is expected on landing day.

> ⚠️ **All data in this repository is SIMULATED**, calibrated with NASA Human Research Program
> (HRP) publications ([`docs/SOURCES.md`](docs/SOURCES.md)). Every simulated record carries
> `data_origin = SIMULATED`. Vital-X is a prototype, **not** a validated medical device.

---

## What is in the system

| Part | What it does | Docs |
|---|---|---|
| **Mission simulator** | Simulates ISS, Lunar and Mars missions through five contexts (Earth pre-flight, spacecraft, station, planetary base, Earth post-flight), with expected adaptations and real health events | [ML pipeline](docs/ML_PIPELINE.md) |
| **Context-aware risk models** | Detect the context from vehicle telemetry and the risk level with Gradient Boosting; 0% false alarms at launch/reentry vs 16.8% for context-blind rules | [ML pipeline](docs/ML_PIPELINE.md) |
| **Ground Control** | Web dashboard for the medical team: whole crew, live vitals, history, body cam, records, mission assignments, environment indicators | [User guide](docs/USER_GUIDE.md#ground-control-ground) |
| **Crew Display** | Tablet for one astronaut: key readings in plain words, activity, crewmates, glove-friendly buttons, light-aware colour themes | [User guide](docs/USER_GUIDE.md#crew-display-crew) |
| **Wrist** | Watch-size screen: one idea per screen; emergencies take over the screen and give a stabilisation instruction | [User guide](docs/USER_GUIDE.md#wrist-wrist) |
| **Offline black box** | Records onboard without a link, syncs to the cloud (Azure Cosmos DB) in order when the link returns; installable PWA | [Architecture](docs/ARCHITECTURE.md#communication-link-and-offline-behaviour) |

```
 Python pipeline                              Vital-X app (browser, PWA)
 ───────────────                              ──────────────────────────
 generate_data.py ─► data/simulated/*.csv     simulated crew telemetry ─► Crew Display / Wrist
 validate_data.py ─► checks vs NASA figures          │ store-and-forward downlink
 train_models.py  ─► model/trained/*.joblib          ▼
                     results/*.csv            Ground Control
                                                     │ black box (IndexedDB)
                                                     ▼
                                              /api/telemetry (Vercel) ─► Azure Cosmos DB
```

## Quick start

**Web app** (Node.js 20+):

```bash
cd Frontend
npm install
npm run dev            # http://localhost:5173  →  #/ground, #/crew, #/wrist
```

**Data and models** (Python 3.10+):

```bash
pip install -r requirements.txt
python generator/generate_data.py --astronauts 30 --seed 42   # 1. simulate missions
python generator/validate_data.py                             # 2. check against NASA numbers
python model/train_models.py                                  # 3. evaluate and train (~7 min)
```

Cloud sync is optional: without the Cosmos DB variables the app keeps the data onboard and says
*cloud not configured*. See [`docs/TOOLS.md`](docs/TOOLS.md) for every command, option and setting.

## Key results (simulated data, unseen astronauts)

| | Rules, context-blind | **Gradient Boosting, context-aware** |
|---|---|---|
| Risk F1 | 0.50 | **0.71** |
| Critical recall | 73% | **76%** |
| False alarms on normal days | 2.4% | **1.1%** |
| False alarms at launch / reentry | 16.8% | **0.0%** |

Context detection from telemetry alone reaches 90%; EVA risk detection reaches F1 0.96. Details,
ablations and limitations are in [`docs/ML_PIPELINE.md`](docs/ML_PIPELINE.md).

## Repository structure

```
├── Frontend/                 # Vital-X web app (React + Vite PWA) and api/telemetry.js
├── generator/                # Mission simulator and data validator
├── model/                    # Training script and trained models (.joblib)
├── data/
│   ├── simulated/            # sim_daily.csv, sim_eva.csv, parameters_sources.csv
│   └── original/             # NASA health indicators reference table used by the app
├── results/                  # Evaluation tables (CSV)
└── docs/                     # Documentation (below)
```

## Documentation

| Document | Content |
|---|---|
| [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) | How to use Ground Control, the Crew Display and the Wrist, and a demo flow |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Modules, mission model, alert logic, downlink, black box and the telemetry API |
| [`docs/TOOLS.md`](docs/TOOLS.md) | Help for every tool: Python scripts, npm scripts, API, environment variables, deployment |
| [`docs/ML_PIPELINE.md`](docs/ML_PIPELINE.md) | Simulator calibration, models, full results and limitations |
| [`docs/SOURCES.md`](docs/SOURCES.md) | Every NASA/CSA source and how to cite it |
| [`data/simulated/README.md`](data/simulated/README.md) | Column glossary of the simulated data |

## Use of AI

The team used an AI assistant (Claude, by Anthropic) to help write code and documentation. All
data is simulated and every calibration figure is traced to a NASA/CSA source in
[`docs/SOURCES.md`](docs/SOURCES.md).

## Tech stack

React 19, Vite 8, Tailwind CSS 4, Recharts, Lucide icons, Dexie (IndexedDB), vite-plugin-pwa;
Vercel serverless function with the Azure Cosmos DB SDK; Python with pandas, NumPy, SciPy and
scikit-learn.

## Limitations

- Results measure how well the models learn the simulator's patterns, not real clinical
  performance. Validation on real astronaut or analog data (bed rest, HERA) is needed first.
- The web app uses context- and activity-adjusted thresholds; the trained models are not wired in
  yet.
- The simulation runs in each browser, so separate devices do not share data yet. Ground Control
  reading from Azure is the next step.

## Sources

The main sources are the NASA HRP Hazards, Risks and Ongoing Research pages, the Cardiovascular
Risk Evidence Book (2022), the Evidence Report on degenerative tissue effects from radiation
(2016) and the NASA-STD-3001 Bone Loss technical brief. The full list is in
[`docs/SOURCES.md`](docs/SOURCES.md).
