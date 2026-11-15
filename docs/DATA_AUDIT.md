# Integrity audit of the original datasets

The files in [`../data/original/`](../data/original/) were the team's first datasets. Their
origin has not been verified, so **they must not be presented as NASA measurements**.
Column headers and category values were translated to English; every number is unchanged.

## Files

| File | Rows | Content |
|---|---|---|
| `dataset_earth_preflight.csv` | 1,500 | Pre-flight vitals, hip T-score, vitamin D, left-ventricular mass |
| `dataset_spacecraft.csv` | 1,500 | Spacecraft vitals with flight phase |
| `dataset_space_station.csv` | 1,500 | Station vitals, cumulative radiation, T-score, ventricular mass |
| `dataset_eva_vehicle.csv` | 1,500 | EVA vitals, suit pressure, suit CO₂ |
| `dataset_space_health_indicators_nasa.csv` | 11 | Reference table: environment, hazard, metric, unit, threshold, countermeasure |

## What passed

- No missing values, no duplicate rows, unique consecutive IDs.
- All values fall inside physiologically possible ranges, and diastolic is always below systolic.
- The Earth → station direction of change is consistent with NASA findings: HR 67.7 → 71.5 bpm,
  sleep 7.5 → 6.4 h, T-score −0.2 → −1.5, ventricular mass 190 → 175 g.

## Minor issues

- Floating-point artifacts such as `3.4000000000000004` in about 500 cells.
- "Cumulative" radiation sometimes decreases between consecutive rows (down to −9 mGy).
- SpO₂ is clipped at 100%: 25% of the pre-flight rows sit exactly at 100.
- 57 rows have a pulse pressure below 20 mmHg.
- One EVA reading has HR 217 bpm at "moderate" activity.

## Critical issues (why they cannot be used for training)

| Check | Real physiology | Original data |
|---|---|---|
| Systolic–diastolic correlation | ~0.6–0.7 | ~0.01 |
| HR by activity level | Rest ≪ Intense | Flat (71.9 at rest vs 71.0 intense; ANOVA p > 0.2) |
| Max correlation between variables (apart from the time trend) | Several strong links | ≤ 0.16 |

- Each column was generated independently from a normal distribution.
- **There are no labels**, so nothing says whether a record is normal or at risk.
- **There is no astronaut ID or timestamp**, so personal baselines and per-person trends are impossible.
- The four files are independent populations, not the same people across mission phases.

A model trained on these files would learn noise. They were replaced by the calibrated simulator
in [`../generator/`](../generator/). The reference table `dataset_space_health_indicators_nasa.csv`
is still useful as a rules and threshold table, but each threshold needs a primary-source citation.
