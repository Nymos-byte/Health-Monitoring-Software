# Simulated astronaut health data

**Every record is SIMULATED** (column `Origen_Dato`). None of them is a real NASA measurement.
The simulator parameters and their sources are listed in `parametros_fuentes.csv`. Parameters
marked "POR VERIFICAR" (to be verified) still need a NASA citation.

- Regenerate: `python generador/generar_datos.py --astronautas 24 --semilla 42`
- Validate: `python generador/validar_datos.py`

## Files

| File | Content |
|---|---|
| `sim_tierra_preflight.csv` | 30 pre-flight days per astronaut (baseline) |
| `sim_nave_espacial.csv` | Launch, transit, docking and re-entry |
| `sim_estacion_espacial.csv` | 150–210 station days, one reading per day |
| `sim_eva.csv` | Spacewalks: one reading every 15 min over 6.5 h |
| `parametros_fuentes.csv` | Every simulator parameter with its source |

## Column glossary

| Column (Spanish) | Meaning | Unit |
|---|---|---|
| `Astronauta_ID` | Astronaut identifier | — |
| `Dia_Mision` | Mission day (negative = pre-flight, 0 = launch) | day |
| `Entorno` | Environment: Tierra (Earth), Nave (spacecraft), Estacion (station), EVA | — |
| `Fase_Vuelo` | Flight phase: Preflight, Lanzamiento (launch), Transito (transit), Maniobra_Orbital (docking), Estacion, Reentrada (re-entry) | — |
| `Frecuencia_Cardiaca_LPM` | Heart rate | bpm |
| `Presion_Sistolica_mmHg` / `Presion_Diastolica_mmHg` | Systolic / diastolic blood pressure | mmHg |
| `Saturacion_O2_Pct` | Oxygen saturation (SpO₂) | % |
| `Temperatura_Corporal_C` | Body temperature | °C |
| `Horas_Sueno_Previas` | Sleep in the previous night | h |
| `Nivel_Actividad` | Activity: Reposo (rest), Ligera (light), Moderada (moderate), Intensa (intense) | — |
| `Tiempo_Reaccion_PVT_ms` | Psychomotor Vigilance Test reaction time | ms |
| `Radiacion_Acumulada_mGy` | Cumulative absorbed radiation dose | mGy |
| `T_Score_Cadera` | Hip bone density T-score | SD |
| `Vitamina_D_ng_ml` | Vitamin D (25-OH) | ng/ml |
| `Masa_Ventricular_Izquierda_g` | Left-ventricular mass | g |
| `EVA_Num`, `Minuto_EVA` | EVA number and minute within the EVA | —, min |
| `Presion_Traje_psia` | Suit pressure | psia |
| `CO2_Traje_ppm` | Suit CO₂ | ppm |

## Label columns (training targets)

- `Evento`: the event happening on that row. Daily data: Normal, Deshidratacion (dehydration),
  Privacion_Sueno (sleep deprivation), Infeccion (infection), Estres_Aislamiento (isolation
  stress), Evento_Radiacion_SPE (solar particle event). EVA data: Hipoxia_Leve (mild hypoxia),
  Fallo_CO2 (CO₂ failure), Sobreesfuerzo (overexertion), Fuga_Presion_Traje (suit pressure leak).
- `Intensidad_Evento`: from 0 to 1. Events ramp up, peak and resolve.
- `Nivel_Riesgo`: 0 normal, 1 caution, 2 critical.
- `Artefacto_Sensor`: Ninguno (none), Dato_Faltante (missing value), Pico_Movimiento (motion spike).
  These are intentional sensor faults. They do **not** change `Evento`, so the model must learn to
  ignore them.

## Training rules

- **Split train and test by `Astronauta_ID`**, never by random rows. A random split leaks data
  between train and test.
- Use deviations from the astronaut's personal baseline, not only absolute values.
- Detect radiation events with the daily dose (the `diff` of `Radiacion_Acumulada_mGy`), not with
  vital signs.
