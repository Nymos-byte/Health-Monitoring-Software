"""
Validates the consistency of the simulated data against the NASA-calibrated expectations.

Usage:  python validate_data.py --data ../data/simulated
"""
import argparse
import os

import numpy as np
import pandas as pd


def check(cond, msg):
    print(('  [OK]   ' if cond else '  [FAIL] ') + msg)
    return cond


def common_checks(df):
    ok = True
    missing = df.isna().mean().max() * 100
    ok &= check(missing < 3, f'Max missing per column {missing:.1f}% (intentional artifacts ~1.5%)')
    ok &= check(not df.duplicated().any(), 'No duplicate rows')
    clean = df[df.sensor_artifact == 'No_Artifact']
    ok &= check((clean.diastolic_bp_mmhg < clean.systolic_bp_mmhg).all(), 'Diastolic < systolic')
    pct100 = (clean.spo2_pct == 100).mean() * 100
    ok &= check(clean.spo2_pct.le(100).all() and pct100 < 5, f'SpO2 <= 100 and not piling up at 100% ({pct100:.1f}%)')
    r = clean.systolic_bp_mmhg.corr(clean.diastolic_bp_mmhg)
    ok &= check(r > 0.4, f'Systolic-diastolic correlation = {r:.2f}')
    hr_act = clean.groupby('activity_level').heart_rate_bpm.mean()
    order = [n for n in ['Rest', 'Light', 'Moderate', 'Intense'] if n in hr_act]
    ok &= check(hr_act[order].is_monotonic_increasing,
                'HR rises with activity: ' + ', '.join(f'{n}={hr_act[n]:.0f}' for n in order))
    time_cols = ['mission_day'] + (['eva_minute'] if 'eva_minute' in df else [])
    mono = df.sort_values(['astronaut_id'] + time_cols).groupby('astronaut_id') \
        .cumulative_radiation_mgy.apply(lambda s: s.dropna().is_monotonic_increasing).all()
    ok &= check(mono, 'Cumulative radiation never decreases')
    return ok


def validate_daily(df):
    print('=' * 90)
    print(f'sim_daily.csv: {len(df)} rows, {df.astronaut_id.nunique()} astronauts, '
          f'missions {df.groupby("astronaut_id").mission_type.first().value_counts().to_dict()}')
    ok = common_checks(df)
    clean = df[(df.sensor_artifact == 'No_Artifact') & (df.event == 'Normal')]
    r = df.sleep_hours_prev_night.corr(df.pvt_reaction_time_ms)
    ok &= check(r < -0.1, f'Less sleep -> slower reaction (r = {r:.2f})')

    # Context-specific expectations from the NASA sources.
    base = clean[clean.environment == 'Planetary_Base'].spo2_pct.mean()
    other = clean[clean.environment != 'Planetary_Base'].spo2_pct.mean()
    ok &= check(-2.5 < base - other < -0.5, f'Hypobaric habitat lowers SpO2 as expected ({other:.1f} -> {base:.1f}%)')
    land = clean[(clean.environment == 'Earth_Postflight') & (clean.days_in_environment == 0)]
    later = clean[(clean.environment == 'Earth_Postflight') & (clean.days_in_environment > 7)]
    ok &= check(land.heart_rate_bpm.mean() - later.heart_rate_bpm.mean() > 5,
                f'Landing-day orthostatic response: HR {later.heart_rate_bpm.mean():.0f} -> {land.heart_rate_bpm.mean():.0f} bpm')
    last = df.groupby('astronaut_id').last()
    mars = last[last.mission_type == 'Mars'].cumulative_radiation_mgy.median()
    ok &= check(250 < mars < 500, f'Mars mission dose median {mars:.0f} mGy (NASA DRM: 300-450)')
    iss = last[last.mission_type == 'ISS'].cumulative_radiation_mgy.median()
    ok &= check(40 < iss < 130, f'ISS mission dose median {iss:.0f} mGy (NASA: 50-100 mSv per 6 months)')
    st = df[df.environment == 'Space_Station']
    slope = st.groupby('astronaut_id').apply(
        lambda g: np.polyfit(g.mission_day, g.hip_t_score, 1)[0] * 30 / 0.083, include_groups=False)
    ok &= check(slope.between(-1.7, -0.8).all(),
                f'Station bone loss {(-slope).min():.2f}-{(-slope).max():.2f} %/month (NASA: 1-1.5)')
    tr = clean[clean.expected_adaptation != 'No_Adaptation']
    print('  Expected adaptations (labeled Normal) by context:')
    print('    ' + tr.groupby(['environment', 'expected_adaptation']).size().to_string().replace('\n', '\n    '))
    print('  Events by context:')
    print('    ' + pd.crosstab(df.event, df.environment).to_string().replace('\n', '\n    '))
    return ok


def validate_eva(df):
    print('=' * 90)
    print(f'sim_eva.csv: {len(df)} rows, {df.groupby(["astronaut_id", "eva_number"]).ngroups} EVAs')
    ok = common_checks(df)
    print('  EVAs by location:', df.groupby('eva_location').apply(
        lambda g: g.groupby(['astronaut_id', 'eva_number']).ngroups, include_groups=False).to_dict())
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=os.path.join(os.path.dirname(__file__), '..', 'data', 'simulated'))
    args = ap.parse_args()
    ok_d = validate_daily(pd.read_csv(os.path.join(args.data, 'sim_daily.csv')))
    ok_e = validate_eva(pd.read_csv(os.path.join(args.data, 'sim_eva.csv')))
    print('=' * 90)
    print('SUMMARY:', 'all checks passed' if ok_d and ok_e else 'FAILURES found (see above)')


if __name__ == '__main__':
    main()
