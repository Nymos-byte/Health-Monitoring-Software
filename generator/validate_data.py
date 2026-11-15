"""
Validates the consistency of the simulated data and checks that it is trainable.

Usage:  python validate_data.py --data ../data/simulated
"""
import argparse
import glob
import os

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import GroupKFold


def check(cond, msg):
    print(('  [OK]   ' if cond else '  [FAIL] ') + msg)
    return cond


def validate(df, name):
    print('=' * 90)
    print(f'{name}: {len(df)} rows, {df.astronaut_id.nunique()} astronauts')
    all_ok = True
    missing = df.isna().mean().max() * 100
    all_ok &= check(missing < 3, f'Max missing per column {missing:.1f}% (intentional artifacts ~1.5%)')
    all_ok &= check(not df.duplicated().any(), 'No duplicate rows')
    clean = df[df.sensor_artifact == 'No_Artifact']
    all_ok &= check((clean.diastolic_bp_mmhg < clean.systolic_bp_mmhg).all(), 'Diastolic < systolic')
    all_ok &= check(clean.spo2_pct.le(100).all(), 'SpO2 <= 100')
    pct100 = (clean.spo2_pct == 100).mean() * 100
    all_ok &= check(pct100 < 5, f'SpO2 not piling up at 100% ({pct100:.1f}%)')
    r = clean.systolic_bp_mmhg.corr(clean.diastolic_bp_mmhg)
    all_ok &= check(r > 0.4, f'Systolic-diastolic correlation = {r:.2f}')
    hr_act = clean.groupby('activity_level').heart_rate_bpm.mean()
    order = [n for n in ['Rest', 'Light', 'Moderate', 'Intense'] if n in hr_act]
    all_ok &= check(hr_act[order].is_monotonic_increasing,
                    'HR rises with activity: ' + ', '.join(f'{n}={hr_act[n]:.0f}' for n in order))
    if 'pvt_reaction_time_ms' in df:
        r = clean.sleep_hours_prev_night.corr(clean.pvt_reaction_time_ms)
        all_ok &= check(r < -0.1, f'Less sleep -> slower reaction (r = {r:.2f}; weak when there is little sleep deficit)')
    if 'cumulative_radiation_mgy' in df and df.cumulative_radiation_mgy.notna().any():
        time_order = ['eva_minute'] if 'eva_minute' in df else []
        mono = df.sort_values(['astronaut_id', 'mission_day'] + time_order).groupby('astronaut_id') \
            .cumulative_radiation_mgy.apply(lambda s: s.dropna().is_monotonic_increasing).all()
        all_ok &= check(mono, 'Cumulative radiation never decreases')
    if 'hip_t_score' in df and (df.environment == 'Station').any():
        st = df[df.environment == 'Station']
        slope = st.groupby('astronaut_id').apply(
            lambda g: np.polyfit(g.mission_day, g.hip_t_score, 1)[0] * 30 / 0.083, include_groups=False)
        all_ok &= check(slope.between(-1.7, -0.8).all(),
                        f'Bone loss {(-slope).min():.2f}-{(-slope).max():.2f} %/month (NASA: 1-1.5)')
    ev = clean[clean.event != 'Normal']
    if len(ev):
        base = clean[clean.event == 'Normal']
        print('  Mean difference vs. Normal (event peak, intensity >= 0.7):')
        cols = ['heart_rate_bpm', 'systolic_bp_mmhg', 'body_temp_c', 'sleep_hours_prev_night', 'spo2_pct'] + \
               [c for c in ['pvt_reaction_time_ms', 'suit_co2_ppm', 'suit_pressure_psia'] if c in df]
        table = ev[ev.event_intensity >= 0.7].groupby('event')[cols].mean() - base[cols].mean()
        print('    ' + table.round(2).to_string().replace('\n', '\n    '))
    print('  risk_level distribution:', df.risk_level.value_counts().sort_index().to_dict())
    return all_ok


def model_test(df, features, name):
    """Train on some astronauts and evaluate on OTHERS (GroupKFold) to avoid data leakage."""
    print('-' * 90)
    print(f'Test model ({name}): predict event, astronaut-grouped validation')
    X = pd.get_dummies(df[features], columns=[c for c in ['activity_level', 'flight_phase'] if c in features])
    y = df.event
    preds = pd.Series(index=df.index, dtype=object)
    for tr, te in GroupKFold(n_splits=4).split(X, y, df.astronaut_id):
        m = HistGradientBoostingClassifier(max_iter=200, class_weight='balanced', random_state=0)
        m.fit(X.iloc[tr], y.iloc[tr])
        preds.iloc[te] = m.predict(X.iloc[te])
    print(classification_report(y, preds, digits=2, zero_division=0))
    print(f'  Macro F1 = {f1_score(y, preds, average="macro"):.2f}  (1.00 would be suspicious; ~0.6-0.9 is realistic)')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=os.path.join(os.path.dirname(__file__), '..', 'data', 'simulated'))
    args = ap.parse_args()
    read = lambda f: pd.read_csv(os.path.join(args.data, f))

    results = {}
    for f in sorted(glob.glob(os.path.join(args.data, 'sim_*.csv'))):
        n = os.path.basename(f)
        results[n] = validate(read(n), n)

    vitals = ['heart_rate_bpm', 'systolic_bp_mmhg', 'diastolic_bp_mmhg', 'spo2_pct', 'body_temp_c',
              'sleep_hours_prev_night', 'activity_level']
    st = read('sim_station.csv')
    # Deviation from personal baseline (first 20 station days, no events).
    base = st[(st.mission_day < 25) & (st.event == 'Normal')].groupby('astronaut_id')[vitals[:6] + ['pvt_reaction_time_ms']].median()
    for c in base:
        st[c + '_delta'] = st[c] - st.astronaut_id.map(base[c])
    # The dosimeter, not vital signs, is what detects a solar particle event.
    st['daily_dose_mgy'] = st.sort_values(['astronaut_id', 'mission_day']).groupby('astronaut_id').cumulative_radiation_mgy.diff()
    model_test(st, vitals + ['pvt_reaction_time_ms', 'daily_dose_mgy'] + [c + '_delta' for c in base], 'station, daily')
    eva = read('sim_eva.csv')
    model_test(eva, vitals + ['eva_minute', 'suit_pressure_psia', 'suit_co2_ppm'], 'EVA')

    print('=' * 90)
    print('SUMMARY:', 'all checks passed' if all(results.values()) else
          'FAILURES in: ' + ', '.join(k for k, v in results.items() if not v))


if __name__ == '__main__':
    main()
