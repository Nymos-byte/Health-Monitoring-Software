# Astronaut Health Monitoring Software

**NASA Space Apps Challenge 2026 – Health Monitoring challenge**

Long-duration missions expose astronauts to space radiation, isolation and confinement, altered
gravity, distance from Earth and a hostile closed environment. On a Mars mission, Earth-based
medical support can be minutes away, so crews must spot health changes themselves. This project
builds the data and machine-learning core of a health-monitoring system that collects health
indicators, detects risk signals early and tells the astronaut **what is happening and why**.

> ⚠️ **All training data in this repository is SIMULATED.** It is generated from parameters
> calibrated with NASA Human Research Program (HRP) publications (see [`docs/SOURCES.md`](docs/SOURCES.md)).
> Every simulated record carries `data_origin = SIMULATED`. The models demonstrate a pipeline that is
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

An audit of an earlier set of team CSVs (in [`data/original/`](data/original/)) showed they
were independent random columns with no physiological relationships and no labels, so they were
replaced. See [`docs/DATA_AUDIT.md`](docs/DATA_AUDIT.md).

---

## Repository structure

```
├── generator/
│   ├── generate_data.py        # Physiological simulator (reproducible with a seed)
│   └── validate_data.py        # Consistency checks + quick trainability test
├── data/
│   ├── simulated/              # Generated datasets (see data/simulated/README.md)
│   └── original/               # Earlier team CSVs (origin unverified, kept for reference)
├── model/
│   ├── train_models.py         # Benchmark of 7 approaches + final model training
│   └── trained/                # Trained models (.joblib)
├── results/                    # Benchmark results (CSV)
└── docs/
    ├── SOURCES.md                       # Every NASA/CSA source and how to cite it
    ├── DATA_AUDIT.md                    # Integrity audit of the original CSVs
    └── NASA_Sources_Citation_Guide.docx # Citation guide (Word)
```

A column glossary is in [`data/simulated/README.md`](data/simulated/README.md).

---

## Quick start

Requires Python 3.10+.

```bash
pip install -r requirements.txt

# 1. Generate simulated data (24 astronauts, seed 42)
python generator/generate_data.py --astronauts 24 --seed 42

# 2. Validate consistency
python generator/validate_data.py

# 3. Benchmark all models and train the final ones (~4 minutes)
python model/train_models.py
```

Load a trained model:

```python
import joblib
bundle = joblib.load("model/trained/eva_model.joblib")
model, features = bundle["model"], bundle["features"]
# features must be built with eva_features() / daily_features() from model/train_models.py
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
measurable. Each row has `event`, `event_intensity` (0–1) and `risk_level` (0 normal,
1 caution, 2 critical).

**Edge cases.** About 1.5% of the data is missing, there are motion-artifact spikes, and launch and
re-entry are stressful but normal phases. These are labeled in `sensor_artifact` and do **not**
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
| MLP neural network | 0.72 ± 0.02 | 76% | 93% | 2% | 2% | 0% |
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
| MLP neural network | 0.88 ± 0.01 | 93% | 22.5 min | 1% | 0.85 |
| Threshold rules | 0.86 ± 0.02 | 100% | 20 min | 0.04% | — |
| Isolation Forest | 0.77 ± 0.05 | 85% | 25 min | 5% | — |
| Personal-baseline z-score | 0.66 ± 0.08 | 71% | 25 min | 5% | — |

Full metrics are in [`results/`](results/). They include early-detection recall, AUC-PR and
F1 on rows with missing data.

### Why Gradient Boosting

- **Most stable across populations.** In the daily data the MLP is +0.01 F1 higher, but that is
  within its own variability (±0.02). The selection rule is: among models within 0.02 F1 of
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
- Parameters marked `TO BE VERIFIED` in
  [`data/simulated/parameters_sources.csv`](data/simulated/parameters_sources.csv) do not have a
  NASA citation yet.
- The models need validation on real astronaut or analog data (bed rest, HERA) before any
  operational use.

## Sources

The main sources are the NASA Human Research Program
[Hazards](https://www.nasa.gov/hrp/hazards/), [Risks](https://www.nasa.gov/hrp/risks/) and
[Ongoing Research](https://www.nasa.gov/hrp/ongoing-hrp-research/) pages, plus Canadian Space
Agency articles. The full list, with the exact page each number comes from, is in
[`docs/SOURCES.md`](docs/SOURCES.md).
