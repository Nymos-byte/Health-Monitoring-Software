# Vital-X — notes for Claude Code

Astronaut health monitoring for the NASA Space Apps Challenge 2026. Two parts:

- **Python pipeline** (repo root): `generator/` simulates missions, `model/` trains context-aware
  risk models, outputs in `data/simulated/`, `results/`, `model/trained/`.
- **Web app** (`Frontend/`): React 19 + Vite + Tailwind 4 PWA with three views (`#/ground`,
  `#/crew`, `#/wrist`), an IndexedDB black box (Dexie) and a Vercel function
  (`Frontend/api/telemetry.js`) that writes to Azure Cosmos DB.

See `docs/ARCHITECTURE.md` before changing data flow, and `docs/TOOLS.md` for commands.

## Commands

- Front end (run in `Frontend/`): `npm run dev`, `npm run lint`, `npm run build`.
  Run lint and build after every front-end change.
- Pipeline (run at the root): `python generator/generate_data.py`, `python generator/validate_data.py`,
  `python model/train_models.py` (~7 min).

## Conventions

- Code, UI text and docs in English. The Cosmos DB snapshot keeps its Spanish top-level field
  names (`astronauta_id`, `ritmo_cardiaco`…) for compatibility.
- Conventional Commits with a `frontend` scope for app changes, e.g. `feat(frontend): …`.
- All data is simulated: never present it as real NASA measurements. New calibration figures need
  a source in `docs/SOURCES.md`.
- Credentials only in Vercel environment variables, never in front-end code or git.
- Vercel Root Directory is `Frontend`; every push to `main` deploys production, so ask before
  pushing.
