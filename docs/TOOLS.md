# Tools reference

Help for every tool in the repository: the Python scripts, the web app's npm scripts, the
telemetry API and deployment. For the AI assistant, see [`AI_ASSISTANT.md`](AI_ASSISTANT.md).

## Requirements

| Part | Needs |
|---|---|
| Data and ML pipeline | Python 3.10+, packages in `requirements.txt` (numpy, pandas, scipy, scikit-learn, joblib) |
| Web app | Node.js 20+ and npm |
| Cloud sync (optional) | An Azure Cosmos DB account and a Vercel project |

```bash
pip install -r requirements.txt     # Python pipeline
cd Frontend && npm install          # web app
```

---

## Python pipeline

Run the scripts from the repository root. Each one prints its progress; failures are marked
`[FAIL]`.

### `generator/generate_data.py` — mission simulator

Generates the simulated daily and EVA datasets.

```bash
python generator/generate_data.py [--astronauts N] [--seed S] [--output DIR]
```

| Option | Default | Meaning |
|---|---|---|
| `--astronauts` | `30` | Number of astronauts, split evenly between ISS, Lunar and Mars missions |
| `--seed` | `42` | Random seed; the same seed gives the same data |
| `--output` | `data/simulated` | Folder for `sim_daily.csv`, `sim_eva.csv` and `parameters_sources.csv` |

### `generator/validate_data.py` — data validator

Checks the simulated data against the NASA-calibrated expectations (radiation dose per mission,
bone loss rate, landing-day heart rate, habitat SpO₂, missing values…).

```bash
python generator/validate_data.py [--data DIR]
```

| Option | Default | Meaning |
|---|---|---|
| `--data` | `data/simulated` | Folder with the generated CSVs |

### `model/train_models.py` — evaluation and training

Compares rule-based and Gradient Boosting models with and without context (GroupKFold by
astronaut, 3 simulated populations), writes the evaluation tables to `results/` and the final models
to `model/trained/`. Takes about 7 minutes. No options.

```bash
python model/train_models.py
```

| Output | Content |
|---|---|
| `results/context_detection.csv` | Context detector accuracy per environment |
| `results/summary_overall.csv` | F1, critical recall and false alarms per approach |
| `results/summary_by_environment.csv` | The same, per environment |
| `results/summary_by_expected_adaptation.csv` | False alarms during each expected adaptation |
| `results/summary_eva.csv` | EVA model results per location |
| `model/trained/*.joblib` | `context_detector`, `daily_model`, `eva_model` |

Load a model with `joblib.load('model/trained/daily_model.joblib')`.

---

## Web app (`Frontend/`)

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload (default http://localhost:5173). No service worker. |
| `npm run build` | Production build in `Frontend/dist/`, including the PWA service worker |
| `npm run preview` | Serves the production build locally; use it to test offline mode and installation |
| `npm run lint` | Lints the code with Oxlint |

**Testing offline:** `npm run build && npm run preview`, open the app once, then turn the network
off in the browser developer tools (Network → Offline). The app still opens, and the black-box
counter grows until the network returns.

**Inspecting the black box:** developer tools → Application → IndexedDB →
`CajaNegraAstronauta` → `telemetriaPendiente`.

**Troubleshooting**

| Symptom | Fix |
|---|---|
| Styles or modules look stale in `npm run dev` | Restart with `npm run dev -- --force` |
| *Cloud not configured* in the header | Expected without Cosmos DB variables; data stays onboard |
| Offline mode does nothing | The service worker only exists in the production build (`build` + `preview`) |
| Old version after a deploy | The PWA updates itself; reload once more, or clear site data |

---

## Telemetry API

`Frontend/api/telemetry.js` is a Vercel serverless function. It accepts `POST /api/telemetry` with
1–500 snapshots and writes them to Azure Cosmos DB. The request format and status codes are in
[`ARCHITECTURE.md`](ARCHITECTURE.md#telemetry-api).

```bash
curl -X POST https://<your-deployment>/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{"astronauta_id":"ast-001","timestamp":"2026-11-15T12:00:00Z","ritmo_cardiaco":72}'
```

**Environment variables** (set in Vercel, never in the front-end code):

| Variable | Required | Default |
|---|---|---|
| `COSMOS_ENDPOINT` | Yes | — |
| `COSMOS_KEY` | Yes | — |
| `COSMOS_DATABASE` | No | `MisionMarte` |
| `COSMOS_CONTAINER` | No | `Telemetria` |

To run the function locally, use `vercel dev` in `Frontend/` with the variables in a local `.env`
file (it is ignored by git). Without them the endpoint answers `503`.

---

## Deployment (Vercel)

- The Vercel project uses **Root Directory = `Frontend`**. At the repository root Vercel detects
  the Python files and the build fails with `vite: command not found`.
- Every push to `main` deploys production; other branches get preview deployments.
- `Frontend/vercel.json` adds an `X-Robots-Tag: noindex` header, and `robots.txt` blocks crawlers,
  so the demo stays unlisted.
- After changing environment variables, redeploy for them to take effect.
