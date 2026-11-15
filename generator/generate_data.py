"""
SIMULATED astronaut health data generator for model training.

Every record is synthetic (column data_origin = "SIMULATED"). Parameters are calibrated
with NASA sources listed in PARAMETERS (see parameters_sources.csv); entries marked
"TO BE VERIFIED" are reasonable physiological assumptions that still need a citation.

Mission types and the environments (contexts) they go through:
  ISS:   Earth_Preflight -> Spacecraft (launch/transit/docking) -> Space_Station
         -> Spacecraft (reentry) -> Earth_Postflight
  Lunar: Earth_Preflight -> Spacecraft (transit) -> Planetary_Base (Moon, 0.17 g)
         -> Spacecraft (transit) -> Earth_Postflight
  Mars:  Earth_Preflight -> Spacecraft (~6-month transit) -> Planetary_Base (Mars, 0.38 g)
         -> Spacecraft (~6-month transit) -> Earth_Postflight

Each context changes physiology in EXPECTED ways (column expected_adaptation). Those rows
are labeled Normal: the monitoring system must not raise false alarms for them.

Usage:  python generate_data.py --astronauts 30 --seed 42 --output ../data/simulated
"""
import argparse
import os

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Parameters and their sources
# ---------------------------------------------------------------------------
CARDIO_EB = 'NASA HRP Cardiovascular Risk Evidence Book 2022: https://humanresearchroadmap.nasa.gov/evidence/reports/Cardio%20Risk%20EB%202022%20FINAL_4-3-2023.pdf'
DEGEN = 'NASA HRP Evidence Report, Degenerative Tissue Effects from Radiation (2016): https://humanresearchroadmap.nasa.gov/evidence/reports/Degen.pdf'
BONE_MTB = 'NASA OCHMO Medical Technical Brief, Bone Loss (OCHMO-MTB-013): https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-030-bone-loss.pdf'
PARAMETERS = [
    # (key, value, unit, source)
    ('bone_loss_per_month_min', 1.0, '% BMD/month',
     'NASA HRP - Risk of Spaceflight-Induced Bone Changes: https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/'),
    ('bone_loss_per_month_max', 1.5, '% BMD/month', 'Same source'),
    ('t_score_per_pct_bmd', 0.083, 'SD per 1% BMD', 'TO BE VERIFIED - approx. 1 SD of hip BMD ~ 12% of the mean'),
    ('t_score_preflight_min', -1.0, 'SD', f'Preflight certification band; {BONE_MTB}'),
    ('t_score_inmission_min', -2.0, 'SD', f'In-mission / end-of-mission band; {BONE_MTB}'),
    ('vitamin_d_insufficient', 35, 'ng/ml', f'Below 35 ng/ml needs higher supplementation; {BONE_MTB}'),
    ('vitamin_d_deficient', 20, 'ng/ml', BONE_MTB),
    ('postflight_reconditioning_days', 45, 'days', f'2 h/day for 45 days from R+1; {BONE_MTB}'),
    ('exercise_hours_per_day', 2.5, 'h/day', f'Scheduled exercise time on ISS (p30); {CARDIO_EB}'),
    ('oi_landing_long_mission', 0.80, 'probability', f'>80% orthostatic intolerance on landing day after 4-6 month missions (p25); {CARDIO_EB}'),
    ('oi_landing_short_mission', 0.30, 'probability', 'TO BE VERIFIED - short missions show milder, less frequent intolerance'),
    ('oi_recovery_days', 1.0, 'days (decay constant)', f'Orthostatic intolerance less prevalent 24 h after landing (p26); {CARDIO_EB}'),
    ('plasma_volume_loss', '5-19', '%', f'Plasma volume deficits after Shuttle missions (p31); {CARDIO_EB}'),
    ('lv_mass_loss_180d', 7.2, '%', f'Conservative vs. bed rest without exercise (-8% at 6 weeks, p54); {CARDIO_EB}'),
    ('station_daily_dose', '0.25-0.45', 'mGy/day', f'ISS 50-100 mSv per 6-month stay (p11); {DEGEN}'),
    ('deep_space_daily_dose', '0.40-0.60', 'mGy/day', f'Derived so a Mars mission totals ~300-450 mGy (p5); {DEGEN}'),
    ('planetary_surface_daily_dose', '0.20-0.35', 'mGy/day', 'TO BE VERIFIED - planet blocks ~half of GCR'),
    ('spe_deep_space', '20-80', 'mGy per event', f'TO BE VERIFIED per event; shielded SPE organ doses 0.15-0.5 Gy per Mars mission (p6); {DEGEN}'),
    ('heart_dose_limit_30d', 250, 'mGy-Eq', f'NASA 30-day heart limit (p7); {DEGEN}'),
    ('heart_dose_limit_1y', 500, 'mGy-Eq', f'NASA 1-year heart limit (p7); {DEGEN}'),
    ('habitat_pressure_psia', 8.2, 'psia', f'Exploration habitat atmosphere 8.2 psia / 34% O2, mildly hypobaric hypoxic (p32); {DEGEN}'),
    ('habitat_o2_pct', 34, '%', 'Same source'),
    ('habitat_spo2_shift', -1.5, '% SpO2', 'TO BE VERIFIED - ppO2 ~10% lower than sea level'),
    ('partial_gravity_deconditioning', '1 - g', 'factor', 'TO BE VERIFIED - deconditioning assumed proportional to missing gravity'),
    ('suit_pressure_psia', 4.3, 'psia', 'TO BE VERIFIED against NASA EVA documentation'),
    ('inflight_hr_shift', 3.7, 'bpm', 'TO BE VERIFIED - not supported by Cardio Evidence Book'),
    ('inflight_systolic_shift', 4.5, 'mmHg', 'TO BE VERIFIED'),
    ('inflight_sleep_shift', -1.1, 'h', 'TO BE VERIFIED; see Risk from Inadequate Sleep: https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/'),
    ('pvt_ms_per_hour_deficit', 18, 'ms/h', 'TO BE VERIFIED - PVT and sleep deprivation literature'),
]
P = {k: v for k, v, _, _ in PARAMETERS}

ENVIRONMENTS = ['Earth_Preflight', 'Spacecraft', 'Space_Station', 'Planetary_Base', 'Earth_Postflight']
ACTIVITY_LEVELS = ['Rest', 'Light', 'Moderate', 'Intense']
ACTIVITY_HR = np.array([0, 10, 25, 45])            # bpm above resting
ACTIVITY_TEMP = np.array([0, 0.05, 0.15, 0.3])     # °C
ACTIVITY_PROBS = {
    'Earth_Preflight': [0.35, 0.35, 0.17, 0.13],
    'Spacecraft': [0.55, 0.40, 0.05, 0.0],
    'Space_Station': [0.35, 0.35, 0.15, 0.15],     # exercise ~2.5 h/day
    'Planetary_Base': [0.30, 0.35, 0.20, 0.15],
    'Earth_Postflight': [0.30, 0.35, 0.25, 0.10],  # reconditioning 2 h/day
}

# Effect of each event at peak intensity. dur = range of days; where = allowed environments.
SPACE = ('Spacecraft', 'Space_Station', 'Planetary_Base')
DAILY_EVENTS = {
    'Dehydration':          dict(dur=(2, 4),  where=SPACE, critical=False, hr=12, sys=-10, temp=0.3, sleep=0.0,  pvt=20, spo2=0.0),
    'Sleep_Deprivation':    dict(dur=(3, 6),  where=SPACE, critical=False, hr=4,  sys=3,   temp=0.0, sleep=-2.8, pvt=90, spo2=0.0),
    'Infection':            dict(dur=(4, 7),  where=SPACE + ('Earth_Postflight',), critical=True, hr=14, sys=2, temp=1.4, sleep=-0.5, pvt=40, spo2=-1.0),
    'Isolation_Stress':     dict(dur=(7, 14), where=SPACE, critical=False, hr=5,  sys=5,   temp=0.0, sleep=-1.2, pvt=35, spo2=0.0),
    'Solar_Particle_Event': dict(dur=(2, 4),  where=SPACE, critical=True,  hr=3,  sys=0,   temp=0.0, sleep=-0.3, pvt=15, spo2=0.0),
    'Habitat_Hypoxia':      dict(dur=(2, 4),  where=('Planetary_Base',), critical=True, hr=10, sys=4, temp=0.0, sleep=-0.6, pvt=30, spo2=-5.0),
    'Severe_Orthostatic_Intolerance': dict(dur=(3, 6), where=('Earth_Postflight',), critical=True,
                                           hr=22, sys=-16, temp=0.0, sleep=0.0, pvt=10, spo2=0.0),
}
EVA_EVENTS = {
    'Mild_Hypoxia':       dict(critical=True,  hr=10, sys=4,  temp=0.0, spo2=-6.0, co2=0,    psia=0.0),
    'CO2_Failure':        dict(critical=True,  hr=8,  sys=6,  temp=0.1, spo2=-1.0, co2=5000, psia=0.0),
    'Overexertion':       dict(critical=False, hr=35, sys=12, temp=0.6, spo2=-1.0, co2=600,  psia=0.0),
    'Suit_Pressure_Leak': dict(critical=True,  hr=10, sys=5,  temp=0.0, spo2=-3.0, co2=0,    psia=-0.5),
}
MISSIONS = ['ISS', 'Lunar', 'Mars']


def risk_level(intensity, critical):
    """0 = normal, 1 = caution, 2 = critical (only at the peak of critical events)."""
    if intensity < 0.15:
        return 0
    return 2 if (critical and intensity >= 0.7) else 1


def valid_spo2(x):
    # Reflect at 100 instead of clipping, so values do not pile up at 100%.
    return np.where(x > 100, 200 - x, x)


# ---------------------------------------------------------------------------
# Mission timeline: one entry per day with its context telemetry
# ---------------------------------------------------------------------------
def segment(environment, phase, days, gravity, dose, peak_accel=None):
    pressure, o2 = (P['habitat_pressure_psia'], P['habitat_o2_pct']) if environment == 'Planetary_Base' else (14.7, 21.0)
    return [dict(environment=environment, flight_phase=phase, gravity_g=gravity,
                 peak_accel_g=gravity if peak_accel is None else peak_accel,
                 cabin_pressure_psia=pressure, cabin_o2_pct=o2, dose_rate=dose)] * days


def build_timeline(mission, rng):
    station_dose = rng.uniform(0.25, 0.45)
    deep_dose = rng.uniform(0.40, 0.60)
    surface_dose = rng.uniform(0.20, 0.35)
    tl = segment('Earth_Preflight', 'Preflight', 30, 1.0, 0.0)
    tl += segment('Spacecraft', 'Launch', 1, 0.0, station_dose, peak_accel=3.0)   # TO BE VERIFIED: ~3 g ascent
    if mission == 'ISS':
        tl += segment('Spacecraft', 'Transit', 2, 0.0, station_dose)
        tl += segment('Spacecraft', 'Docking', 1, 0.0, station_dose)
        tl += segment('Space_Station', 'Station_Ops', int(rng.integers(150, 211)), 0.0, station_dose)
    else:
        g, transit, surface = (0.17, (4, 6), (30, 61)) if mission == 'Lunar' else (0.38, (180, 211), (60, 91))
        tl += segment('Spacecraft', 'Transit', int(rng.integers(*transit)), 0.0, deep_dose)
        tl += segment('Planetary_Base', 'Surface_Ops', int(rng.integers(*surface)), g, surface_dose)
        tl += segment('Spacecraft', 'Transit', int(rng.integers(*transit)), 0.0, deep_dose)
    tl += segment('Spacecraft', 'Reentry', 1, 0.0, station_dose, peak_accel=4.0)  # TO BE VERIFIED: ~4 g reentry
    tl += segment('Earth_Postflight', 'Recovery', P['postflight_reconditioning_days'], 1.0, 0.0)
    return tl


class Astronaut:
    def __init__(self, idx, rng):
        self.id = f'AST-{idx:02d}'
        self.rng = rng
        self.mission = MISSIONS[idx % len(MISSIONS)]   # balanced across mission types
        self.hr0 = rng.normal(62, 6)
        self.sys0 = rng.normal(114, 8)
        self.dia0 = 74 + 0.55 * (self.sys0 - 114) + rng.normal(0, 3.5)
        self.temp0 = rng.normal(36.6, 0.2)
        self.sleep0 = rng.normal(7.5, 0.5)
        self.pvt0 = rng.normal(280, 25)
        self.t_score0 = rng.normal(-0.2, 0.3)
        self.vit_d0 = rng.normal(55, 10)
        self.lv_mass0 = rng.normal(190, 10)
        self.bone_loss = rng.uniform(P['bone_loss_per_month_min'], P['bone_loss_per_month_max'])
        self.timeline = build_timeline(self.mission, rng)

    def plan_events(self):
        """Non-overlapping events, each fully inside one environment segment."""
        plan = {}
        env = [d['environment'] for d in self.timeline]
        for name, ev in DAILY_EVENTS.items():
            for day in range(len(env)):
                if env[day] not in ev['where'] or day in plan:
                    continue
                if name == 'Severe_Orthostatic_Intolerance':
                    # Only right after landing, and more likely after long missions.
                    landing = env.index('Earth_Postflight')
                    long_mission = (landing - 30) > 120
                    if day != landing or self.rng.random() > (0.25 if long_mission else 0.08):
                        continue
                elif self.rng.random() > 0.045 / 6:   # ~9 event onsets per 200 space days
                    continue
                dur = int(self.rng.integers(ev['dur'][0], ev['dur'][1] + 1))
                days = range(day, day + dur)
                if any(d in plan or d >= len(env) or env[d] != env[day] for d in days):
                    continue
                for k, d in enumerate(days):
                    # Severe OI peaks at landing and fades; other events are bell-shaped.
                    shape = 1 - k / dur if name == 'Severe_Orthostatic_Intolerance' else np.sin(np.pi * (k + 0.5) / dur)
                    plan[d] = (name, float(shape))
        return plan


# ---------------------------------------------------------------------------
# Daily physiology
# ---------------------------------------------------------------------------
def simulate_astronaut(a):
    rng = a.rng
    plan = a.plan_events()
    daily, evas = [], []
    radiation, micro_days, adapt = 0.0, 0.0, 0.0
    day_in_env, prev_env = 0, None
    gravity_drop_days = 0.0      # microgravity exposure accumulated before the latest gravity transition
    transition_oi = 0.0          # magnitude of the expected orthostatic response at the latest landing
    t_score = a.t_score0
    lv_mass = a.lv_mass0
    vit_d = a.vit_d0
    eva_count = 0
    first_flight_day = 30

    for t, ctx in enumerate(a.timeline):
        env, g = ctx['environment'], ctx['gravity_g']
        day_in_env = day_in_env + 1 if env == prev_env else 0
        if env != prev_env and prev_env is not None and g > 0 and a.timeline[t - 1]['gravity_g'] == 0:
            # Gravity transition after microgravity (landing on Earth, Moon or Mars).
            long_mission = micro_days > 120
            p_oi = P['oi_landing_long_mission'] if long_mission else P['oi_landing_short_mission'] + 0.5 * micro_days / 120
            transition_oi = (g * min(1.0, micro_days / 120)) if rng.random() < p_oi else 0.25 * g
            gravity_drop_days = micro_days
        prev_env = env
        in_space = env in SPACE
        deconditioning = (1 - g) if in_space else 0.0
        micro_days += deconditioning

        # Cardiovascular/sleep shift: builds over ~2 weeks in space, fades over ~2 weeks after return.
        target = deconditioning
        adapt += (target - adapt) / 14
        oi = transition_oi * np.exp(-day_in_env / P['oi_recovery_days']) if g > 0 and gravity_drop_days > 0 else 0.0

        event, intensity = plan.get(t, ('Normal', 0.0))
        fx = DAILY_EVENTS.get(event, {})
        e = lambda k: fx.get(k, 0.0) * intensity

        if env == 'Earth_Preflight':
            expected = 'No_Adaptation'
        elif ctx['flight_phase'] in ('Launch', 'Reentry', 'Docking'):
            expected = 'Launch_Reentry_Stress'
        elif oi > 0.15:
            expected = 'Gravity_Transition_Orthostatic'
        elif env == 'Planetary_Base':
            expected = 'Hypobaric_Habitat'
        elif in_space and day_in_env < 14 and t - first_flight_day < 21:
            expected = 'Early_Microgravity_Adaptation'
        elif env == 'Earth_Postflight':
            expected = 'Post_Flight_Reconditioning'
        else:
            expected = 'No_Adaptation'

        probs = np.array(ACTIVITY_PROBS[env], dtype=float)
        if (event in ('Infection', 'Isolation_Stress', 'Severe_Orthostatic_Intolerance') and intensity > 0.3) or oi > 0.3:
            probs = probs * np.array([2.0, 1.0, 0.5, 0.2])
        act = int(rng.choice(4, p=probs / probs.sum()))

        phase_hr = {'Launch': 20, 'Docking': 8, 'Reentry': 25}.get(ctx['flight_phase'], 0)
        phase_sys = {'Launch': 10, 'Docking': 4, 'Reentry': -8}.get(ctx['flight_phase'], 0)

        sleep = np.clip(a.sleep0 + adapt * P['inflight_sleep_shift'] + e('sleep') + rng.normal(0, 0.6), 2, 10)
        deficit = max(0.0, a.sleep0 - sleep)
        hr = (a.hr0 + adapt * P['inflight_hr_shift'] + ACTIVITY_HR[act] + 0.8 * deficit + phase_hr
              + 20 * oi + e('hr') + rng.normal(0, 3))
        sys_ = (a.sys0 + adapt * P['inflight_systolic_shift'] + 0.4 * (hr - a.hr0 - 20 * oi) + phase_sys
                - 12 * oi + e('sys') + rng.normal(0, 5))
        dia = a.dia0 + 0.5 * (sys_ - a.sys0) + rng.normal(0, 3)
        temp = a.temp0 + adapt * 0.2 + ACTIVITY_TEMP[act] + e('temp') + rng.normal(0, 0.12)
        habitat = P['habitat_spo2_shift'] if env == 'Planetary_Base' else 0.0
        spo2 = valid_spo2(98.5 + habitat - 0.3 * act + e('spo2') + rng.normal(0, 0.7))
        pvt = a.pvt0 + P['pvt_ms_per_hour_deficit'] * deficit + e('pvt') + rng.normal(0, 15)

        dose = ctx['dose_rate'] * rng.gamma(20, 1 / 20) if ctx['dose_rate'] > 0 else 0.0
        if event == 'Solar_Particle_Event' and plan.get(t - 1, ('Normal', 0))[0] != event:
            low_earth_orbit = env == 'Space_Station' or (env == 'Spacecraft' and a.mission == 'ISS')
            dose += rng.uniform(5, 20) if low_earth_orbit else rng.uniform(20, 80)
        radiation += dose

        # Slow structural changes: lost in (partial) microgravity, slowly regained on Earth.
        t_score -= deconditioning * a.bone_loss * P['t_score_per_pct_bmd'] / 30
        lv_mass -= deconditioning * a.lv_mass0 * P['lv_mass_loss_180d'] / 100 / 180
        if env == 'Earth_Postflight':
            t_score += 0.3 * P['t_score_per_pct_bmd'] / 30          # TO BE VERIFIED: ~0.3% BMD/month recovery
            lv_mass += (a.lv_mass0 - lv_mass) / 30
        vit_d += -0.02 if in_space else 0.0

        crit = fx.get('critical', False)
        row = {
            'astronaut_id': a.id, 'mission_type': a.mission, 'mission_day': t - first_flight_day,
            'environment': env, 'flight_phase': ctx['flight_phase'], 'days_in_environment': day_in_env,
            'gravity_g': g, 'peak_accel_g': round(ctx['peak_accel_g'] + abs(rng.normal(0, 0.02)), 2),
            'cabin_pressure_psia': round(ctx['cabin_pressure_psia'] + rng.normal(0, 0.05), 2),
            'cabin_o2_pct': round(ctx['cabin_o2_pct'] + rng.normal(0, 0.3), 1),
            'heart_rate_bpm': round(hr), 'systolic_bp_mmhg': round(sys_), 'diastolic_bp_mmhg': round(dia),
            'spo2_pct': round(float(spo2), 1), 'body_temp_c': round(temp, 1),
            'sleep_hours_prev_night': round(sleep, 1), 'activity_level': ACTIVITY_LEVELS[act],
            'pvt_reaction_time_ms': round(pvt), 'cumulative_radiation_mgy': round(radiation, 1),
            'hip_t_score': round(t_score + rng.normal(0, 0.03), 2),
            'vitamin_d_ng_ml': round(vit_d + rng.normal(0, 2), 1),
            'lv_mass_g': round(lv_mass + rng.normal(0, 3), 1),
            'expected_adaptation': expected,
            'event': event, 'event_intensity': round(intensity, 2),
            'risk_level': risk_level(intensity, crit) if event != 'Normal' else 0,
        }
        daily.append(row)

        can_eva = env in ('Space_Station', 'Planetary_Base') and event == 'Normal' and day_in_env > 7 and oi < 0.15
        if can_eva and rng.random() < (0.02 if env == 'Space_Station' else 0.08):
            eva_count += 1
            evas += simulate_eva(a, eva_count, row, adapt, radiation)
    return daily, evas


def simulate_eva(a, eva_number, day_row, adapt, radiation):
    """6.5 h EVA, one reading every 15 min (27 readings). From the station or a planetary surface."""
    rng = a.rng
    g = day_row['gravity_g']
    location = 'Station' if day_row['environment'] == 'Space_Station' else ('Lunar_Surface' if a.mission == 'Lunar' else 'Mars_Surface')
    walking = 8 * g / 0.38 if g > 0 else 0.0     # TO BE VERIFIED: surface walking adds metabolic load
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
        deficit = max(0.0, a.sleep0 - day_row['sleep_hours_prev_night'])
        hr = a.hr0 + adapt * P['inflight_hr_shift'] + 15 + walking + ACTIVITY_HR[act] + 0.8 * hours + 0.8 * deficit + e('hr') + rng.normal(0, 4)
        sys_ = a.sys0 + adapt * P['inflight_systolic_shift'] + 0.4 * (hr - a.hr0) + e('sys') + rng.normal(0, 5)
        dia = a.dia0 + 0.5 * (sys_ - a.sys0) + rng.normal(0, 3)
        temp = a.temp0 + 0.2 + ACTIVITY_TEMP[act] + min(0.12 * hours, 0.6) + e('temp') + rng.normal(0, 0.1)
        spo2 = valid_spo2(97.5 - 0.3 * act + e('spo2') + rng.normal(0, 0.6))
        co2 = 1500 + 300 * hours + e('co2') + rng.normal(0, 200)
        psia = P['suit_pressure_psia'] + e('psia') + rng.normal(0, 0.03)
        rows.append({
            'astronaut_id': a.id, 'mission_type': a.mission, 'mission_day': day_row['mission_day'],
            'eva_number': eva_number, 'eva_minute': minute, 'eva_location': location, 'gravity_g': g,
            'heart_rate_bpm': round(hr), 'systolic_bp_mmhg': round(sys_),
            'diastolic_bp_mmhg': round(dia), 'spo2_pct': round(float(spo2), 1),
            'body_temp_c': round(temp, 1), 'sleep_hours_prev_night': day_row['sleep_hours_prev_night'],
            'activity_level': ACTIVITY_LEVELS[act], 'suit_pressure_psia': round(psia, 2),
            'suit_co2_ppm': round(max(co2, 300)), 'cumulative_radiation_mgy': round(radiation, 1),
            'event': event if intensity > 0 else 'Normal', 'event_intensity': round(intensity, 2),
            'risk_level': risk_level(intensity, fx.get('critical', False)) if intensity > 0 else 0,
        })
    return rows


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


def generate(n_astronauts=30, seed=42):
    """Return (daily, eva) DataFrames. daily covers every mission context."""
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
    ap.add_argument('--astronauts', type=int, default=30)
    ap.add_argument('--seed', type=int, default=42)
    ap.add_argument('--output', default=os.path.join(os.path.dirname(__file__), '..', 'data', 'simulated'))
    args = ap.parse_args()
    os.makedirs(args.output, exist_ok=True)
    daily, eva = generate(args.astronauts, args.seed)
    daily.to_csv(os.path.join(args.output, 'sim_daily.csv'), index=False, encoding='utf-8')
    eva.to_csv(os.path.join(args.output, 'sim_eva.csv'), index=False, encoding='utf-8')
    pd.DataFrame(PARAMETERS, columns=['parameter', 'value', 'unit', 'source']).to_csv(
        os.path.join(args.output, 'parameters_sources.csv'), index=False, encoding='utf-8')

    print(f'Daily: {len(daily)} rows | EVA: {len(eva)} rows | astronauts: {args.astronauts}')
    print(daily.groupby('astronaut_id').mission_type.first().value_counts().to_string())
    print(pd.crosstab(daily.event, daily.environment).to_string())
    print(pd.crosstab(daily.expected_adaptation, daily.environment).to_string())
    print(eva.groupby('eva_location').event.value_counts().unstack(fill_value=0).to_string())


if __name__ == '__main__':
    main()
