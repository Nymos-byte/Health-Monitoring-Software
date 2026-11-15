# Simulated astronaut health data

**Every record is SIMULATED** (column `data_origin`). None of them is a real NASA measurement.
The simulator parameters and their sources are listed in `parameters_sources.csv`. Parameters
marked "TO BE VERIFIED" still need a NASA citation.

- Regenerate: `python generator/generate_data.py --astronauts 30 --seed 42`
- Validate: `python generator/validate_data.py`

## Files

| File | Content |
|---|---|
| `sim_daily.csv` | One row per astronaut per day, across every mission context |
| `sim_eva.csv` | Spacewalks (station, lunar surface, Mars surface): one reading every 15 min over 6.5 h |
| `parameters_sources.csv` | Every simulator parameter with its source |

## Column glossary

| Column | Meaning | Unit |
|---|---|---|
| `astronaut_id` | Astronaut identifier | — |
| `mission_type` | ISS, Lunar, Mars | — |
| `mission_day` | Day relative to launch (negative = pre-flight) | day |
| `environment` | Earth_Preflight, Spacecraft, Space_Station, Planetary_Base, Earth_Postflight | — |
| `flight_phase` | Preflight, Launch, Transit, Docking, Station_Ops, Surface_Ops, Reentry, Recovery | — |
| `days_in_environment` | Days since entering the current environment | day |
| `gravity_g` | Ambient gravity (0 in orbit or transit, 0.17 Moon, 0.38 Mars, 1 Earth) | g |
| `peak_accel_g` | Peak acceleration of the day (~3 at launch, ~4 at reentry) | g |
| `cabin_pressure_psia` / `cabin_o2_pct` | Cabin atmosphere (14.7 psia / 21%; habitat 8.2 psia / 34%) | psia, % |
| `heart_rate_bpm` | Heart rate | bpm |
| `systolic_bp_mmhg` / `diastolic_bp_mmhg` | Blood pressure | mmHg |
| `spo2_pct` | Oxygen saturation | % |
| `body_temp_c` | Body temperature | °C |
| `sleep_hours_prev_night` | Sleep in the previous night | h |
| `activity_level` | Rest, Light, Moderate, Intense | — |
| `pvt_reaction_time_ms` | Psychomotor Vigilance Test reaction time | ms |
| `cumulative_radiation_mgy` | Cumulative absorbed dose | mGy |
| `hip_t_score` | Hip bone density T-score (model estimate) | SD |
| `vitamin_d_ng_ml` | Vitamin D (25-OH) | ng/ml |
| `lv_mass_g` | Left-ventricular mass | g |
| `eva_number`, `eva_minute`, `eva_location` | EVA number, minute within the EVA, Station / Lunar_Surface / Mars_Surface | — |
| `suit_pressure_psia`, `suit_co2_ppm` | Suit pressure and CO₂ | psia, ppm |

## Label columns

- `expected_adaptation`: a **normal** context effect. These rows have `event = Normal`.
  Values: No_Adaptation, Launch_Reentry_Stress, Early_Microgravity_Adaptation, Hypobaric_Habitat,
  Gravity_Transition_Orthostatic, Post_Flight_Reconditioning.
- `event`: a real health event. Daily data: Dehydration, Sleep_Deprivation, Infection,
  Isolation_Stress, Solar_Particle_Event, Habitat_Hypoxia, Severe_Orthostatic_Intolerance.
  EVA data: Mild_Hypoxia, CO2_Failure, Overexertion, Suit_Pressure_Leak.
- `event_intensity`: from 0 to 1. Events ramp up, peak and resolve.
- `risk_level`: 0 normal, 1 caution, 2 critical.
- `sensor_artifact`: No_Artifact, Missing_Value, Motion_Spike. These are intentional sensor faults
  and do **not** change `event`.

## Training rules

- **Split train and test by `astronaut_id`**, never by random rows.
- Do not use `environment` as a model input at prediction time. Detect the context from the
  telemetry columns instead, as the app would have to.
- Use deviations from the astronaut's personal baseline, not only absolute values.
