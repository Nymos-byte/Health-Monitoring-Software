# Astronaut Health Monitoring Software

**NASA Space Apps Challenge 2026 – Health Monitoring challenge**

Long-duration missions expose astronauts to space radiation, isolation and confinement, altered
gravity, distance from Earth and a hostile closed environment. On a Mars mission, Earth-based
medical support can be minutes away, so crews must spot health changes themselves. This project
builds the data and machine-learning core of a health-monitoring system that collects health
indicators, detects risk signals early and tells the astronaut **what is happening and why**.

> ⚠️ **All training data in this repository is SIMULATED.** It is generated from parameters
> calibrated with NASA Human Research Program (HRP) publications (see [`docs/SOURCES.md`](docs/SOURCES.md)).
> Every simulated record carries `Origen_Dato = SIMULADO`. The models demonstrate a pipeline that is
> ready to be retrained on real data (e.g. restricted NASA LSDA/NLSP datasets). They are **not**
> validated for clinical use.

---

## Why simulated data?

The public NASA datasets we reviewed (OSDR, NLSP open bed-rest studies) cover very few subjects,
and the large human datasets are restricted. NASA HRP pages describe *what* is measured and *how*
the body changes (e.g. bone mineral density loss of 1–1.5% per month), but do not publish
continuous vital-sign streams. We therefore:

1. Extracted quantitative findings from NASA HRP risk pages and evidence reports.
2. Built a physiological simulator calibrated with those parameters.
3. Injected labeled health events and sensor faults (edge cases).
4. Benchmarked 7 detection approaches, testing always on astronauts never seen in training.

An audit of an earlier set of team CSVs (in [`datos_originales/`](datos_originales/)) showed they
were independent random columns with no physiological relationships and no labels, so they were
replaced. See [`docs/DATA_AUDIT.md`](docs/DATA_AUDIT.md).

---

## Repository structure

```
├── generador/
│   ├── generar_datos.py        # Physiological simulator (reproducible with a seed)
│   └── validar_datos.py        # Consistency checks + quick trainability test
├── datos_simulados/            # Generated datasets (see datos_simulados/README.md)
├── modelo/
│   ├── entrenar_modelos.py     # Benchmark of 7 approaches + final model training
│   └── entrenados/             # Trained models (.joblib)
├── resultados/                 # Benchmark results (CSV)
├── datos_originales/           # Earlier team CSVs (origin unverified, kept for reference)
└── docs/
    ├── SOURCES.md              # Every NASA/CSA source and how to cite it
    ├── DATA_AUDIT.md           # Integrity audit of the original CSVs
    └── Fuentes_NASA_citas.docx # Citation guide (Spanish)
```

> Code identifiers and column names are in Spanish (the team's working language); all
> documentation is in English. A column glossary is in [`datos_simulados/README.md`](datos_simulados/README.md).

---

## Quick start

Requires Python 3.10+.

```bash
pip install -r requirements.txt

# 1. Generate simulated data (24 astronauts, seed 42)
python generador/generar_datos.py --astronautas 24 --semilla 42

# 2. Validate consistency
python generador/validar_datos.py

# 3. Benchmark all models and train the final ones (~4 minutes)
python modelo/entrenar_modelos.py
```

Load a trained model:

```python
import joblib
bundle = joblib.load("modelo/entrenados/modelo_eva.joblib")
model, features = bundle["modelo"], bundle["variables"]
# features must be built with variables_eva() / variables_diarias() from modelo/entrenar_modelos.py
```

---

## The simulator

Each simulated astronaut has a **personal baseline** (heart rate, blood pressure, sleep, bone
density, etc.) and goes through a full mission:

`Earth pre-flight (30 days) → launch → transit → docking → station (150–210 days, 2–5 EVAs) → re-entry`

| Physiology modeled | How |
|---|---|
| Heart rate vs. activity | Rest → light → moderate → intense raises HR (≈68 → 77 → 93 → 112 bpm) |
| Blood pressure | Systolic follows HR; diastolic follows systolic (r ≈ 0.77) |
| Sleep → cognition | Sleep deficit slows Psychomotor Vigilance Test reaction time (r ≈ −0.48) |
| Bone loss | 1.0–1.5% BMD per month (NASA HRP) |
| Spaceflight adaptation | Gradual shift in HR, BP and sleep over the first ~2 weeks |
| Radiation | Cumulative dose that only increases; solar particle events add spikes |
| EVA suit | Suit pressure (~4.3 psia), CO₂ build-up over 6.5 h, thermal load |

**Labeled events.** Daily data includes dehydration, sleep deprivation, infection,
isolation stress and solar particle events. EVA data includes mild hypoxia, CO₂ scrubber failure,
overexertion and suit pressure leaks. Events ramp up, peak and resolve, which makes early detection
measurable. Each row has `Evento`, `Intensidad_Evento` (0–1) and `Nivel_Riesgo` (0 normal,
1 caution, 2 critical).

**Edge cases.** About 1.5% of the data is missing, there are motion-artifact spikes, and launch and
re-entry are stressful but normal phases. These are labeled in `Artefacto_Sensor` and do **not**
change the event label, so the model must learn to ignore them.

---

## Model benchmark

Seven approaches were compared using **GroupKFold by astronaut** (4 folds). The models are always
tested on unseen crew members. The benchmark was repeated on **3 independent simulated populations**
(seeds 42, 7, 2026). The tables show means; ± is the standard deviation across populations.

### Daily monitoring (Earth + spacecraft + station)

| Model | Risk F1 | Critical recall | Episodes detected | False alarms | FA on sensor spikes | FA on launch/re-entry |
|---|---|---|---|---|---|---|
| **Gradient Boosting** ✅ | **0.71 ± 0.01** | 76% | 90% | 2% | 2% | 1% |
| MLP neural network | 0.72 ± 0.03 | 76% | 94% | 2% | 2% | 0% |
| Random Forest | 0.70 ± 0.02 | 75% | 86% | 2% | 0% | 0% |
| Threshold rules | 0.54 ± 0.02 | 74% | 84% | 4% | 20% | 12% |
| Logistic regression | 0.44 ± 0.01 | 94% | 100% | 46% | 85% | 0% |
| Isolation Forest | 0.31 ± 0.03 | 50% | 54% | 5% | 16% | 24% |
| Personal-baseline z-score | 0.26 ± 0.03 | 33% | 55% | 5% | 11% | 7% |

### EVA / spacewalk (one reading every 15 min)

| Model | Risk F1 | Critical recall | Median latency | False alarms | Event-type F1 |
|---|---|---|---|---|---|
| **Gradient Boosting** ✅ | **0.93 ± 0.00** | 97% | 15 min | 0.4% | 0.89 |
| Random Forest | 0.93 ± 0.01 | 98% | 15 min | 0.2% | 0.91 |
| Logistic regression | 0.91 ± 0.02 | 100% | 10 min | 3% | 0.93 |
| MLP neural network | 0.86 ± 0.04 | 87% | 30 min | 0.3% | 0.74 |
| Threshold rules | 0.86 ± 0.02 | 100% | 20 min | 0.04% | — |
| Isolation Forest | 0.77 ± 0.05 | 85% | 25 min | 5% | — |
| Personal-baseline z-score | 0.66 ± 0.08 | 71% | 25 min | 5% | — |

Full metrics are in [`resultados/`](resultados/). They include early-detection recall, AUC-PR and
F1 on rows with missing data.

### Why Gradient Boosting

- **Most stable across populations.** In the daily data the MLP is +0.01 F1 higher, but that is
  smaller than its own variability (±0.03). The selection rule is: among models within 0.02 F1 of
  the best, pick the lowest standard deviation.
- **Robust to edge cases.** It raises 2% false alarms on sensor spikes, against 20% for fixed
  thresholds. It is also not fooled by launch and re-entry stress.
- **Handles missing data natively.**
- **Explainable** through feature importance, so the app can tell the astronaut *why* an alert fired.

### Key findings

- **Hybrid design recommended.** Fixed thresholds catch almost as many critical events as the
  model (74% vs 76%) but raise more false alarms. The best design keeps rules as a safety net for
  clearly dangerous values and uses the model for subtle patterns.
- **High recall can be misleading.** Logistic regression catches 94% of critical events in daily
  data, but it alarms on 46% of normal days. An astronaut would learn to ignore it.
- **Unsupervised methods are weak here.** Isolation Forest and z-score flag that something is
  unusual, but cannot tell what it is.
- **Radiation is detected by the dosimeter, not by vital signs.** The daily dose is a key feature.
- **Dehydration is hard to detect** because its signature resembles exercise. This suggests the
  app should ask the astronaut about fluid intake.
- **Weak point: early detection.** Only ~40% of daily events are flagged in their early phase
  (intensity < 0.5). This is the main area for improvement.

---

## Limitations

- The results measure how well the models learn the simulator's patterns, **not real-world
  clinical performance**.
- Parameters marked `POR VERIFICAR` ("to be verified") in
  [`datos_simulados/parametros_fuentes.csv`](datos_simulados/parametros_fuentes.csv) do not have a
  NASA citation yet.
- The models need validation on real astronaut or analog data (bed rest, HERA) before any
  operational use.

## Sources

The main sources are the NASA Human Research Program
[Hazards](https://www.nasa.gov/hrp/hazards/), [Risks](https://www.nasa.gov/hrp/risks/) and
[Ongoing Research](https://www.nasa.gov/hrp/ongoing-hrp-research/) pages, plus Canadian Space
Agency articles. The full list, with the exact page each number comes from, is in
[`docs/SOURCES.md`](docs/SOURCES.md).
