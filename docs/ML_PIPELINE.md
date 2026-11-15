# Data and machine-learning pipeline

This is the science core of Vital-X: a mission simulator calibrated with NASA Human Research
Program (HRP) publications, a validator that checks the simulated data against those numbers, and
context-aware risk models trained on it.

> ⚠️ **All training data is SIMULATED.** Every record carries `data_origin = SIMULATED`. The models
> demonstrate a pipeline that is ready to be retrained on real data. They are **not** validated for
> clinical use.

For the command-line options of each script, see [`TOOLS.md`](TOOLS.md).

---

## The problem: the same reading means different things in different contexts

| Context | What is *expected* there (NASA source) | A context-blind system would… |
|---|---|---|
| Earth pre-flight | Personal baseline | — |
| Spacecraft (launch, transit, reentry) | Launch/reentry stress (high HR); deep-space radiation dose higher than in low Earth orbit | alarm on every launch and reentry |
| Space station (ISS) | Bone loss of 1–1.5% per month; 50–100 mSv per 6-month stay | — |
| Planetary base (Moon 0.17 g, Mars 0.38 g) | Exploration habitat at 8.2 psia / 34% O₂ is mildly hypobaric, so SpO₂ is lower; orthostatic response when gravity returns | alarm on low SpO₂ every day |
| Earth post-flight | **>80% orthostatic intolerance on landing day** after 4–6 month missions, improving after 24 h; 45-day reconditioning | alarm on the landing-day tachycardia |

The system must tell these **expected adaptations** apart from real health events, such as a
severe orthostatic intolerance that does not resolve, habitat hypoxia or an infection.

---

## The simulator (`generator/generate_data.py`)

Thirty astronauts are split evenly between three mission types:

| Mission | Timeline |
|---|---|
| **ISS** | Earth (30 d) → launch → transit → docking → **station 150–210 d** → reentry → Earth post-flight (45 d) |
| **Lunar** | Earth (30 d) → launch → transit 4–5 d → **lunar base 30–60 d (0.17 g)** → transit → reentry → Earth post-flight (45 d) |
| **Mars** | Earth (30 d) → launch → **transit ~6 months** → **Mars base 60–90 d (0.38 g)** → transit ~6 months → reentry → Earth post-flight (45 d) |

The Mars surface stay is shortened from the real ~500-day design reference mission to keep the
dataset small.

**Context telemetry** (what a vehicle or habitat would report): `gravity_g`, `peak_accel_g`
(~3 g at launch, ~4 g at reentry), `cabin_pressure_psia`, `cabin_o2_pct` and the radiation dose.

**Calibration from NASA documents:**

| Parameter | Value | Source |
|---|---|---|
| Bone loss in microgravity | 1–1.5% BMD per month | HRP Risk of Bone Changes |
| Landing-day orthostatic intolerance | >80% after 4–6 month missions; less prevalent after 24 h | Cardio Evidence Book p25–26 |
| Left-ventricular mass | −7.2% over 180 days (bed rest without exercise: −8% at 6 weeks) | Cardio Evidence Book p54 |
| ISS radiation | 50–100 mSv per 6-month stay | Degen Evidence Report p11 |
| Mars mission radiation | 300–450 mGy in total | Degen Evidence Report p5 |
| 30-day / 1-year heart dose limits | 250 / 500 mGy-Eq | Degen Evidence Report p7 |
| Exploration habitat atmosphere | 8.2 psia, 34% O₂ | Degen Evidence Report p32 |
| Bone T-score bands | ≥ −1.0 pre-flight, ≥ −2.0 in-mission | OCHMO Bone Loss brief |
| Post-flight reconditioning | 45 days, 2 h/day | OCHMO Bone Loss brief |

Validation confirms the simulator reproduces these numbers: Mars dose median 364 mGy, ISS 71 mGy,
station bone loss 1.0–1.5%/month, landing-day HR +12 bpm, habitat SpO₂ −1.7%. Parameters still
marked `TO BE VERIFIED` are listed in
[`data/simulated/parameters_sources.csv`](../data/simulated/parameters_sources.csv). A column
glossary is in [`data/simulated/README.md`](../data/simulated/README.md).

**Labels**

- `expected_adaptation` marks normal context effects. These rows are labeled `Normal`.
- `event` marks real health events: dehydration, sleep deprivation, infection, isolation stress,
  solar particle event, habitat hypoxia and severe orthostatic intolerance (daily data); mild
  hypoxia, CO₂ failure, overexertion and suit pressure leak (EVA data).
- `risk_level` is 0 normal, 1 caution, 2 critical.
- `sensor_artifact` marks missing values and motion spikes. These are edge cases that must not
  change the result.

---

## How the risk system works (`model/train_models.py`)

1. **Context detector.** It infers the context from telemetry only, then applies a 3-day majority
   vote so a single noisy day cannot flip the context.
2. **Context features.** It adds the detected context, the days in that context, the cumulative
   microgravity exposure and the 30-day radiation dose.
3. **Two personal baselines.** A continuous rolling baseline (past 14 days) and a per-context
   baseline that restarts at every transition, using the Earth pre-flight values for the first
   days.
4. **Risk model.** Gradient Boosting, the model selected in an earlier 7-model benchmark.
5. **Radiation advisory.** A separate channel for a 30-day dose above 50% of the NASA heart limit.
   It is not a health alarm.

Trained models are saved to `model/trained/` (`context_detector.joblib`, `daily_model.joblib`,
`eva_model.joblib`) and the evaluation tables to `results/`.

## Results

All results are tested on astronauts never seen in training (GroupKFold by astronaut), and
averaged over 3 independent simulated populations.

**Context detection (telemetry only):** 90% overall. It is 100% for Earth pre-flight, Earth
post-flight and planetary base. The remaining errors are spacecraft days in low Earth orbit
confused with station days, which have identical telemetry.

**Daily risk detection:**

| Model | Risk F1 | Critical recall | False alarms (normal days) |
|---|---|---|---|
| Rules, context-blind | 0.50 | 73% | 2.4% |
| Rules, context-aware | 0.50 | 70% | 2.2% |
| Gradient Boosting, context-blind | 0.72 ± 0.00 | 76% | 1.2% |
| **Gradient Boosting, context-aware** ✅ | **0.71 ± 0.00** | **76%** | **1.1%** |
| Gradient Boosting, true context (upper bound) | 0.71 ± 0.01 | 77% | 1.2% |

**False alarms during expected adaptations** (the core of the problem):

| Expected adaptation | Rules blind | Rules context | GB blind | **GB context** |
|---|---|---|---|---|
| Launch / reentry stress | **16.8%** | 1.5% | 2.4% | **0.0%** |
| Landing orthostatic response | 3.0% | 0.8% | 4.9% | 3.6% |
| Hypobaric habitat (planetary base) | 1.7% | 1.7% | 1.4% | 1.8% |
| Early microgravity adaptation | 0.5% | 0.5% | 1.3% | 1.2% |
| Post-flight reconditioning | 0.4% | 0.4% | 0.1% | 0.1% |

**EVA** (station vs. lunar and Mars surface): F1 0.96. False alarms stay at or below 0.4% at every
location, with or without the location feature.

### What we learned

- **Context matters most at abrupt transitions.** For rules, it cuts launch/reentry false alarms
  from 16.8% to 1.5% and landing false alarms from 3.0% to 0.8%. For the model, it removes
  launch/reentry false alarms and cuts landing false alarms by about a quarter.
- **Gradual adaptations are already handled by a rolling personal baseline.** The blind model
  re-learns "normal" within days, so contexts such as the hypobaric habitat do not need special
  treatment. Context does not hurt overall accuracy (F1 0.71 vs 0.72).
- **Resetting the baseline alone is a mistake.** An ablation showed it lowers F1 to 0.69. Keeping
  both baselines restores F1 and still cuts transition false alarms.
- **Approaching a radiation limit is not a health alarm.** It needs its own advisory channel,
  otherwise it shows up as false alarms after solar particle events.
- **Context detection is easy once telemetry is available**; the only confusion has no clinical
  impact. The detected context performs about as well as the true context.

## Limitations

- These results measure how well the models learn the simulator's patterns, **not real-world
  clinical performance**.
- Expected adaptations follow average values from NASA documents. Real individual responses vary
  more.
- Parameters marked `TO BE VERIFIED` still need a citation.
- The models need validation on real astronaut or analog data (bed rest, HERA) before any
  operational use.
- The web app does not run the trained models yet. It applies the same context idea with
  context- and activity-adjusted thresholds (see [`ARCHITECTURE.md`](ARCHITECTURE.md#alert-logic)).
