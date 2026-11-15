"""
SIMULATED astronaut health data generator for model training.

Every record is synthetic (column data_origin = "SIMULATED"). Parameters are calibrated
with NASA sources listed in PARAMETERS (see parameters_sources.csv); entries marked
"TO BE VERIFIED" are reasonable physiological assumptions that still need a citation.

Per-astronaut timeline:
  Earth (pre-flight, 30 days) -> Spacecraft (launch, transit, docking)
  -> Station (150-210 days, with EVAs) -> Spacecraft (re-entry)

Usage:  python generate_data.py --astronauts 24 --seed 42 --output ../data/simulated
"""
import argparse
import os

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Parameters and their sources
# ---------------------------------------------------------------------------
PARAMETERS = [
    # (key, value, unit, source)
    ('bone_loss_per_month_min', 1.0, '% BMD/month',
     'NASA HRP - Risk of Spaceflight-Induced Bone Changes: https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/'),
    ('bone_loss_per_month_max', 1.5, '% BMD/month', 'Same source'),
    ('t_score_per_pct_bmd', 0.083, 'SD per 1% BMD',
     'TO BE VERIFIED - approx. 1 SD of hip BMD ~ 12% of the mean'),
    ('exercise_hours_per_day', 1.5, 'h/day',
     'NASA HRP - Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness: https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/'),
    ('osteoporosis_t_score_threshold', -2.5, 'SD', 'dataset_space_health_indicators_nasa.csv (cite original source)'),
    ('vitamin_d_optimal_range', '35-90', 'ng/ml', 'dataset_space_health_indicators_nasa.csv (cite original source)'),
    ('suit_pressure_psia', 4.3, 'psia', 'Team dataset_eva_vehicle.csv / TO BE VERIFIED against NASA EVA docs'),
    ('station_daily_dose', '0.25-0.45', 'mGy/day', 'TO BE VERIFIED - radiation Evidence Report'),
    ('inflight_hr_shift', 3.7, 'bpm', 'Earth vs. Station mean difference in team datasets / TO BE VERIFIED with Cardio Evidence Book'),
    ('inflight_systolic_shift', 4.5, 'mmHg', 'Same as above'),
    ('inflight_sleep_shift', -1.1, 'h', 'Same as above; see Risk from Inadequate Sleep: https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/'),
    ('lv_mass_loss_180d', 7.2, '%', 'Trend in team dataset_space_station.csv / TO BE VERIFIED'),
    ('pvt_ms_per_hour_deficit', 18, 'ms/h', 'TO BE VERIFIED - PVT and sleep deprivation literature'),
]
P = {k: v for k, v, _, _ in PARAMETERS}

ACTIVITY_LEVELS = ['Rest', 'Light', 'Moderate', 'Intense']
ACTIVITY_HR = np.array([0, 10, 25, 45])            # bpm above resting
ACTIVITY_TEMP = np.array([0, 0.05, 0.15, 0.3])     # °C
ACTIVITY_PROBS = {
    'Earth': [0.35, 0.35, 0.17, 0.13],
    'Spacecraft': [0.55, 0.40, 0.05, 0.0],
    'Station': [0.35, 0.35, 0.15, 0.15],           # ~15% measured during exercise (1.5 h/day)
}

# Effect of each event at peak intensity. dur = range of days.
DAILY_EVENTS = {
    'Dehydration':          dict(dur=(2, 4),  critical=False, hr=12, sys=-10, temp=0.3, sleep=0.0,  pvt=20, spo2=0.0),
    'Sleep_Deprivation':    dict(dur=(3, 6),  critical=False, hr=4,  sys=3,   temp=0.0, sleep=-2.8, pvt=90, spo2=0.0),
    'Infection':            dict(dur=(4, 7),  critical=True,  hr=14, sys=2,   temp=1.4, sleep=-0.5, pvt=40, spo2=-1.0),
    'Isolation_Stress':     dict(dur=(7, 14), critical=False, hr=5,  sys=5,   temp=0.0, sleep=-1.2, pvt=35, spo2=0.0),
    'Solar_Particle_Event': dict(dur=(2, 4),  critical=True,  hr=3,  sys=0,   temp=0.0, sleep=-0.3, pvt=15, spo2=0.0),
}
EVA_EVENTS = {
    'Mild_Hypoxia':       dict(critical=True,  hr=10, sys=4,  temp=0.0, spo2=-6.0, co2=0,    psia=0.0),
    'CO2_Failure':        dict(critical=True,  hr=8,  sys=6,  temp=0.1, spo2=-1.0, co2=5000, psia=0.0),
    'Overexertion':       dict(critical=False, hr=35, sys=12, temp=0.6, spo2=-1.0, co2=600,  psia=0.0),
    'Suit_Pressure_Leak': dict(critical=True,  hr=10, sys=5,  temp=0.0, spo2=-3.0, co2=0,    psia=-0.5),
}


def risk_level(intensity, critical):
    """0 = normal, 1 = caution, 2 = critical (only at the peak of critical events)."""
    if intensity < 0.15:
        return 0
    return 2 if (critical and intensity >= 0.7) else 1


def valid_spo2(x):
    # Reflect at 100 instead of clipping, so values do not pile up at 100%.
    return np.where(x > 100, 200 - x, x)


class Astronaut:
    def __init__(self, idx, rng):
        self.id = f'AST-{idx:02d}'
        self.rng = rng
        self.hr0 = rng.normal(62, 6)
        self.sys0 = rng.normal(114, 8)
        self.dia0 = 74 + 0.55 * (self.sys0 - 114) + rng.normal(0, 3.5)
        self.temp0 = rng.normal(36.6, 0.2)
        self.sleep0 = rng.normal(7.5, 0.5)
        self.pvt0 = rng.normal(280, 25)
        self.t_score0 = rng.normal(-0.2, 0.3)
        self.vit_d0 = rng.normal(60, 5)
        self.lv_mass0 = rng.normal(190, 10)
        self.bone_loss = rng.uniform(P['bone_loss_per_month_min'], P['bone_loss_per_month_max'])
        self.daily_dose = rng.uniform(0.25, 0.45)
        self.station_days = int(rng.integers(150, 211))

    def plan_events(self, flight_days):
        """Non-overlapping events over flight days (from day 5 on)."""
        plan = {}
        n = self.rng.poisson(9)
        for _ in range(n):
            name = self.rng.choice(list(DAILY_EVENTS))
            d0, d1 = DAILY_EVENTS[name]['dur']
            dur = int(self.rng.integers(d0, d1 + 1))
            start = int(self.rng.integers(5, max(6, flight_days - dur)))
            days = range(start, start + dur)
            if any(d in plan for d in days):
                continue
            for k, d in enumerate(days):
                # Bell-shaped profile: gradual onset, peak in the middle, resolution.
                plan[d] = (name, float(np.sin(np.pi * (k + 0.5) / dur)))
        return plan


def daily_record(a, day, environment, phase, adapt, flight_days, event, intensity, radiation):
    rng = a.rng
    probs = np.array(ACTIVITY_PROBS[environment], dtype=float)
    if event in ('Infection', 'Isolation_Stress'):
        probs = probs * np.array([2.0, 1.0, 0.5, 0.2]) if intensity > 0.3 else probs
    probs /= probs.sum()
    act = int(rng.choice(4, p=probs))
    fx = DAILY_EVENTS.get(event, {})
    e = lambda k: fx.get(k, 0.0) * intensity

    phase_hr = {'Launch': 20, 'Docking': 8, 'Reentry': 25}.get(phase, 0)
    phase_sys = {'Launch': 10, 'Docking': 4, 'Reentry': -8}.get(phase, 0)

    sleep = np.clip(a.sleep0 + adapt * P['inflight_sleep_shift'] + e('sleep') + rng.normal(0, 0.6), 2, 10)
    deficit = max(0.0, a.sleep0 - sleep)
    hr = a.hr0 + adapt * P['inflight_hr_shift'] + ACTIVITY_HR[act] + 0.8 * deficit + phase_hr + e('hr') + rng.normal(0, 3)
    sys_ = a.sys0 + adapt * P['inflight_systolic_shift'] + 0.4 * (hr - a.hr0) + phase_sys + e('sys') + rng.normal(0, 5)
    dia = a.dia0 + 0.5 * (sys_ - a.sys0) + rng.normal(0, 3)
    temp = a.temp0 + adapt * 0.2 + ACTIVITY_TEMP[act] + e('temp') + rng.normal(0, 0.12)
    spo2 = valid_spo2(98.5 - 0.3 * act + e('spo2') + rng.normal(0, 0.7))
    pvt = a.pvt0 + P['pvt_ms_per_hour_deficit'] * deficit + e('pvt') + rng.normal(0, 15)

    months = flight_days / 30.0
    t_score = a.t_score0 - a.bone_loss * P['t_score_per_pct_bmd'] * months + rng.normal(0, 0.03)
    vit_d = a.vit_d0 - 0.02 * flight_days + rng.normal(0, 2)
    lv_mass = a.lv_mass0 * (1 - P['lv_mass_loss_180d'] / 100 * flight_days / 180) + rng.normal(0, 3)

    crit = fx.get('critical', False)
    return {
        'astronaut_id': a.id, 'mission_day': day, 'environment': environment, 'flight_phase': phase,
        'heart_rate_bpm': round(hr), 'systolic_bp_mmhg': round(sys_),
        'diastolic_bp_mmhg': round(dia), 'spo2_pct': round(float(spo2), 1),
        'body_temp_c': round(temp, 1), 'sleep_hours_prev_night': round(sleep, 1),
        'activity_level': ACTIVITY_LEVELS[act], 'pvt_reaction_time_ms': round(pvt),
        'cumulative_radiation_mgy': round(radiation, 1) if radiation is not None else np.nan,
        'hip_t_score': round(t_score, 2), 'vitamin_d_ng_ml': round(vit_d, 1),
        'lv_mass_g': round(lv_mass, 1),
        'event': event, 'event_intensity': round(intensity, 2),
        'risk_level': risk_level(intensity, crit) if event != 'Normal' else 0,
    }


def simulate_eva(a, eva_number, day, adapt, prev_sleep, radiation):
    """6.5 h EVA, one reading every 15 min (27 readings)."""
    rng = a.rng
    event = rng.choice(list(EVA_EVENTS)) if rng.random() < 0.35 else 'Normal'
    event_start = int(rng.integers(4, 20)) if event != 'Normal' else 99
    rows = []
    for k in range(27):
        minute = k * 15
        hours = minute / 60
        act = int(rng.choice([1, 2, 3], p=[0.2, 0.5, 0.3]))
        # Ramp: the event grows over 1 h from its start and then holds.
        intensity = float(np.clip((k - event_start + 1) / 4, 0, 1)) if k >= event_start else 0.0
        fx = EVA_EVENTS.get(event, {})
        e = lambda c: fx.get(c, 0.0) * intensity
        deficit = max(0.0, a.sleep0 - prev_sleep)
        hr = a.hr0 + adapt * P['inflight_hr_shift'] + 15 + ACTIVITY_HR[act] + 0.8 * hours + 0.8 * deficit + e('hr') + rng.normal(0, 4)
        sys_ = a.sys0 + adapt * P['inflight_systolic_shift'] + 0.4 * (hr - a.hr0) + e('sys') + rng.normal(0, 5)
        dia = a.dia0 + 0.5 * (sys_ - a.sys0) + rng.normal(0, 3)
        temp = a.temp0 + 0.2 + ACTIVITY_TEMP[act] + min(0.12 * hours, 0.6) + e('temp') + rng.normal(0, 0.1)
        spo2 = valid_spo2(97.5 - 0.3 * act + e('spo2') + rng.normal(0, 0.6))
        co2 = 1500 + 300 * hours + e('co2') + rng.normal(0, 200)
        psia = P['suit_pressure_psia'] + e('psia') + rng.normal(0, 0.03)
        rows.append({
            'astronaut_id': a.id, 'mission_day': day, 'eva_number': eva_number, 'eva_minute': minute,
            'environment': 'EVA', 'heart_rate_bpm': round(hr), 'systolic_bp_mmhg': round(sys_),
            'diastolic_bp_mmhg': round(dia), 'spo2_pct': round(float(spo2), 1),
            'body_temp_c': round(temp, 1), 'sleep_hours_prev_night': round(prev_sleep, 1),
            'activity_level': ACTIVITY_LEVELS[act], 'suit_pressure_psia': round(psia, 2),
            'suit_co2_ppm': round(max(co2, 300)), 'cumulative_radiation_mgy': round(radiation, 1),
            'event': event if intensity > 0 else 'Normal', 'event_intensity': round(intensity, 2),
            'risk_level': risk_level(intensity, fx.get('critical', False)) if intensity > 0 else 0,
        })
    return rows


def simulate_astronaut(a):
    daily, evas = [], []
    for d in range(-30, 0):
        daily.append(daily_record(a, d, 'Earth', 'Preflight', 0.0, 0, 'Normal', 0.0, None))

    spacecraft_phases = ['Launch', 'Transit', 'Transit', 'Docking']
    flight_days = len(spacecraft_phases) + a.station_days + 1
    plan = a.plan_events(flight_days - 1)
    eva_days = set(a.rng.choice(np.arange(20, len(spacecraft_phases) + a.station_days),
                                size=int(a.rng.integers(2, 6)), replace=False).tolist())

    radiation = 0.0
    for t in range(flight_days):
        adapt = min(1.0, t / 14)  # gradual adaptation over ~2 weeks
        event, intensity = plan.get(t, ('Normal', 0.0))
        dose = a.daily_dose * a.rng.gamma(20, 1 / 20)  # always positive
        if event == 'Solar_Particle_Event' and plan.get(t - 1, ('Normal', 0))[0] != event:
            dose += a.rng.uniform(10, 40)  # solar particle spike on the first day
        radiation += dose
        if t < len(spacecraft_phases):
            environment, phase = 'Spacecraft', spacecraft_phases[t]
        elif t == flight_days - 1:
            environment, phase = 'Spacecraft', 'Reentry'
        else:
            environment, phase = 'Station', 'Station'
        row = daily_record(a, t, environment, phase, adapt, t, event, intensity, radiation)
        daily.append(row)
        if t in eva_days and event == 'Normal':
            evas += simulate_eva(a, len({e['eva_number'] for e in evas}) + 1, t, adapt,
                                 row['sleep_hours_prev_night'], radiation)
    return daily, evas


def add_artifacts(df, cols, rng, p_missing=0.015, p_spike=0.005):
    """Sensor faults (edge cases). The event label does NOT change: the model must be robust to them."""
    df = df.copy()
    df['sensor_artifact'] = 'No_Artifact'
    for c in cols:
        m = rng.random(len(df)) < p_missing
        df.loc[m, c] = np.nan
        df.loc[m, 'sensor_artifact'] = 'Missing_Value'
    m = (rng.random(len(df)) < p_spike) & (df['sensor_artifact'] == 'No_Artifact')
    df.loc[m, 'heart_rate_bpm'] = (df.loc[m, 'heart_rate_bpm'] * rng.uniform(1.6, 2.2, m.sum())).round()
    df.loc[m, 'sensor_artifact'] = 'Motion_Spike'
    return df


VITALS = ['heart_rate_bpm', 'systolic_bp_mmhg', 'diastolic_bp_mmhg', 'spo2_pct', 'body_temp_c']


def generate(n_astronauts=24, seed=42):
    """Return (daily, eva) DataFrames; daily covers Earth, Spacecraft and Station."""
    rng = np.random.default_rng(seed)
    daily, evas = [], []
    for i in range(1, n_astronauts + 1):
        d, e = simulate_astronaut(Astronaut(i, rng))
        daily += d
        evas += e
    daily = add_artifacts(pd.DataFrame(daily), VITALS, rng)
    eva = add_artifacts(pd.DataFrame(evas), VITALS, rng)
    for df in (daily, eva):
        df['data_origin'] = 'SIMULATED'
    return daily, eva


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--astronauts', type=int, default=24)
    ap.add_argument('--seed', type=int, default=42)
    ap.add_argument('--output', default=os.path.join(os.path.dirname(__file__), '..', 'data', 'simulated'))
    args = ap.parse_args()
    os.makedirs(args.output, exist_ok=True)
    daily, eva = generate(args.astronauts, args.seed)

    common = ['astronaut_id', 'mission_day', 'environment', 'flight_phase'] + VITALS + [
        'sleep_hours_prev_night', 'activity_level', 'pvt_reaction_time_ms']
    labels = ['event', 'event_intensity', 'risk_level', 'sensor_artifact', 'data_origin']
    columns = {
        'Earth': common + ['hip_t_score', 'vitamin_d_ng_ml', 'lv_mass_g'],
        'Spacecraft': common + ['cumulative_radiation_mgy'],
        'Station': common + ['cumulative_radiation_mgy', 'hip_t_score', 'vitamin_d_ng_ml', 'lv_mass_g'],
    }
    names = {'Earth': 'sim_earth_preflight.csv', 'Spacecraft': 'sim_spacecraft.csv', 'Station': 'sim_station.csv'}
    for env, cols in columns.items():
        daily.loc[daily.environment == env, cols + labels].to_csv(
            os.path.join(args.output, names[env]), index=False, encoding='utf-8')
    eva.to_csv(os.path.join(args.output, 'sim_eva.csv'), index=False, encoding='utf-8')
    pd.DataFrame(PARAMETERS, columns=['parameter', 'value', 'unit', 'source']).to_csv(
        os.path.join(args.output, 'parameters_sources.csv'), index=False, encoding='utf-8')

    print(f'Daily: {len(daily)} rows | EVA: {len(eva)} rows | astronauts: {args.astronauts}')
    print(daily.event.value_counts().to_string())
    print(eva.event.value_counts().to_string())


if __name__ == '__main__':
    main()
