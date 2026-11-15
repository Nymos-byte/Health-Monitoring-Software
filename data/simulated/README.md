# Simulated astronaut health data

**Every record is SIMULATED** (column `data_origin`). None of them is a real NASA measurement.
The simulator parameters and their sources are listed in `parameters_sources.csv`. Parameters
marked "TO BE VERIFIED" still need a NASA citation.

- Regenerate: `python generator/generate_data.py --astronauts 24 --seed 42`
- Validate: `python generator/validate_data.py`

## Files

| File | Content |
|---|---|
| `sim_earth_preflight.csv` | 30 pre-flight days per astronaut (baseline) |
| `sim_spacecraft.csv` | Launch, transit, docking and re-entry |
| `sim_station.csv` | 150–210 station days, one reading per day |
| `sim_eva.csv` | Spacewalks: one reading every 15 min over 6.5 h |
| `parameters_sources.csv` | Every simulator parameter with its source |

## Column glossary

| Column | Meaning | Unit |
|---|---|---|
| `astronaut_id` | Astronaut identifier | — |
| `mission_day` | Mission day (negative = pre-flight, 0 = launch) | day |
| `environment` | Earth, Spacecraft, Station, EVA | — |
| `flight_phase` | Preflight, Launch, Transit, Docking, Station, Reentry | — |
| `heart_rate_bpm` | Heart rate | bpm |
| `systolic_bp_mmhg` / `diastolic_bp_mmhg` | Systolic / diastolic blood pressure | mmHg |
| `spo2_pct` | Oxygen saturation (SpO₂) | % |
| `body_temp_c` | Body temperature | °C |
| `sleep_hours_prev_night` | Sleep in the previous night | h |
| `activity_level` | Rest, Light, Moderate, Intense | — |
| `pvt_reaction_time_ms` | Psychomotor Vigilance Test reaction time | ms |
| `cumulative_radiation_mgy` | Cumulative absorbed radiation dose | mGy |
| `hip_t_score` | Hip bone density T-score | SD |
| `vitamin_d_ng_ml` | Vitamin D (25-OH) | ng/ml |
| `lv_mass_g` | Left-ventricular mass | g |
| `eva_number`, `eva_minute` | EVA number and minute within the EVA | —, min |
| `suit_pressure_psia` | Suit pressure | psia |
| `suit_co2_ppm` | Suit CO₂ | ppm |

## Label columns (training targets)

- `event`: the event happening on that row. Daily data: Normal, Dehydration, Sleep_Deprivation,
  Infection, Isolation_Stress, Solar_Particle_Event. EVA data: Mild_Hypoxia, CO2_Failure,
  Overexertion, Suit_Pressure_Leak.
- `event_intensity`: from 0 to 1. Events ramp up, peak and resolve.
- `risk_level`: 0 normal, 1 caution, 2 critical.
- `sensor_artifact`: No_Artifact, Missing_Value, Motion_Spike. These are intentional sensor faults.
  They do **not** change `event`, so the model must learn to ignore them.

## Training rules

- **Split train and test by `astronaut_id`**, never by random rows. A random split leaks data
  between train and test.
- Use deviations from the astronaut's personal baseline, not only absolute values.
- Detect radiation events with the daily dose (the `diff` of `cumulative_radiation_mgy`), not with
  vital signs.
