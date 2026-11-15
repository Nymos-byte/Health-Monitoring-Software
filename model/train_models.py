"""
Compares models for detecting risk signals and edge cases in SIMULATED data.

Approaches:
  1. Threshold_Rules      - fixed NASA-style thresholds (no learning)
  2. Baseline_ZScore      - deviation from personal baseline (unsupervised)
  3. Isolation_Forest     - anomaly detection (unsupervised)
  4. Logistic_Regression  - supervised, linear
  5. Random_Forest        - supervised, trees
  6. Gradient_Boosting    - supervised, boosted trees
  7. MLP_Neural_Net       - supervised, small neural network

Validation: GroupKFold by astronaut (tested on astronauts never seen in training),
repeated on 3 simulated populations (seeds) to measure stability.

Usage:  python train_models.py
"""
import os
import sys
import time
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, IsolationForest, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, f1_score
from sklearn.model_selection import GroupKFold
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings('ignore')
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(ROOT, 'generator'))
from generate_data import VITALS, generate  # noqa: E402

SEEDS = [42, 7, 2026]
ACTIVITY = {'Rest': 0, 'Light': 1, 'Moderate': 2, 'Intense': 3}


# ---------------------------------------------------------------------------
# Feature engineering (label-free: the same code would run inside the app)
# ---------------------------------------------------------------------------
def artifact_filter(df, hr_baseline):
    """An HR spike > 50% over baseline with no blood-pressure change is almost certainly sensor motion."""
    suspect = (df.heart_rate_bpm > 1.5 * hr_baseline) & \
              ((df.systolic_bp_mmhg - df.systolic_bp_mmhg.rolling(5, min_periods=1).median()).abs() < 15)
    df['suspected_artifact'] = suspect.astype(int)
    df.loc[suspect, 'heart_rate_bpm'] = np.nan
    return df


def daily_features(daily):
    df = daily.sort_values(['astronaut_id', 'mission_day']).copy()
    df['activity'] = df.activity_level.map(ACTIVITY)
    df['critical_phase'] = df.flight_phase.isin(['Launch', 'Docking', 'Reentry']).astype(int)
    df['in_flight'] = (df.environment != 'Earth').astype(int)
    df['daily_dose_mgy'] = df.groupby('astronaut_id').cumulative_radiation_mgy.diff().fillna(0)
    cols = VITALS + ['sleep_hours_prev_night', 'pvt_reaction_time_ms']
    parts = []
    for _, g in df.groupby('astronaut_id', sort=False):
        g = g.copy()
        hr_base = g.heart_rate_bpm.shift(1).rolling(14, min_periods=5).median()
        g = artifact_filter(g, hr_base.fillna(g.heart_rate_bpm.median()))
        for c in cols:
            base = g[c].shift(1).rolling(14, min_periods=5).median()   # rolling baseline, past only
            spread = g[c].shift(1).rolling(14, min_periods=5).std()
            g[c + '_delta'] = g[c] - base
            g[c + '_z'] = g[c + '_delta'] / spread.clip(lower=1e-3)
            g[c + '_trend3'] = g[c].rolling(3, min_periods=1).mean() - base   # 3-day trend
        parts.append(g)
    df = pd.concat(parts)
    feats = cols + ['activity', 'critical_phase', 'in_flight', 'daily_dose_mgy', 'suspected_artifact'] + \
        [c + s for c in cols for s in ('_delta', '_z', '_trend3')]
    return df, feats


def eva_features(eva):
    df = eva.sort_values(['astronaut_id', 'eva_number', 'eva_minute']).copy()
    df['activity'] = df.activity_level.map(ACTIVITY)
    cols = VITALS + ['suit_pressure_psia', 'suit_co2_ppm']
    parts = []
    for _, g in df.groupby(['astronaut_id', 'eva_number'], sort=False):
        g = g.copy()
        hr_base = g.heart_rate_bpm.iloc[:3].median()
        g = artifact_filter(g, pd.Series(hr_base, index=g.index))
        for c in cols:
            base = g[c].iloc[:3].median()     # first 30 min of the EVA = baseline
            spread = g[c].iloc[:6].std()
            g[c + '_delta'] = g[c] - base
            g[c + '_z'] = g[c + '_delta'] / max(spread if pd.notna(spread) else 1.0, 1e-3)
            g[c + '_slope'] = g[c].diff().rolling(3, min_periods=1).mean()   # rate of change
        parts.append(g)
    df = pd.concat(parts)
    feats = cols + ['eva_minute', 'activity', 'sleep_hours_prev_night', 'suspected_artifact'] + \
        [c + s for c in cols for s in ('_delta', '_z', '_slope')]
    return df, feats


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
def daily_rules(df):
    """0 / 0.6 / 1 score from fixed thresholds. Does not use a personal baseline."""
    resting_hr = (df.heart_rate_bpm > 100) & (df.activity <= 1)
    alert = (df.spo2_pct < 94) | (df.body_temp_c >= 37.5) | resting_hr | \
            (df.sleep_hours_prev_night < 5) | (df.pvt_reaction_time_ms > 400) | (df.daily_dose_mgy > 5)
    critical = (df.spo2_pct < 90) | (df.body_temp_c >= 38.0) | (df.daily_dose_mgy > 20)
    return np.where(critical, 1.0, np.where(alert, 0.6, 0.0))


def eva_rules(df):
    alert = (df.spo2_pct < 94) | (df.suit_co2_ppm > 5000) | (df.suit_pressure_psia < 4.15) | \
            (df.heart_rate_bpm > 160) | (df.body_temp_c >= 38.3)
    critical = (df.spo2_pct < 91) | (df.suit_co2_ppm > 7000) | (df.suit_pressure_psia < 4.0)
    return np.where(critical, 1.0, np.where(alert, 0.6, 0.0))


def zscore_score(df, feats):
    zc = [f for f in feats if f.endswith('_z')]
    return df[zc].abs().max(axis=1).fillna(0).to_numpy()


def supervised_models():
    imp = lambda: SimpleImputer(strategy='median', add_indicator=True)
    return {
        'Logistic_Regression': lambda: make_pipeline(imp(), StandardScaler(),
                                                     LogisticRegression(max_iter=2000, class_weight='balanced')),
        'Random_Forest': lambda: make_pipeline(imp(), RandomForestClassifier(
            n_estimators=300, min_samples_leaf=2, class_weight='balanced_subsample', n_jobs=-1, random_state=0)),
        'Gradient_Boosting': lambda: HistGradientBoostingClassifier(
            max_iter=300, learning_rate=0.08, class_weight='balanced', random_state=0),
        'MLP_Neural_Net': lambda: make_pipeline(imp(), StandardScaler(), MLPClassifier(
            hidden_layer_sizes=(64, 32), alpha=1e-3, max_iter=600, early_stopping=True, random_state=0)),
    }


def false_alarm_threshold(train_score, train_normal, rate=0.05):
    """Threshold so that only ~5% of normal training readings raise an alarm."""
    return np.quantile(train_score[train_normal], 1 - rate)


def cross_validate(df, feats, rules_fn, group_col):
    """Return dict model -> (risk_score, predicted_event) with out-of-fold predictions."""
    X, y_ev = df[feats], df.event.to_numpy()
    normal = y_ev == 'Normal'
    out = {'Threshold_Rules': (rules_fn(df), None)}
    s_z = zscore_score(df, feats)
    pred = {k: np.zeros(len(df)) for k in ['Baseline_ZScore', 'Isolation_Forest']}
    pred_sup = {k: (np.zeros(len(df)), np.empty(len(df), dtype=object)) for k in supervised_models()}
    for tr, te in GroupKFold(n_splits=4).split(X, y_ev, df[group_col]):
        # Unsupervised: they never see labels; only the threshold is calibrated on normal readings.
        u = false_alarm_threshold(s_z[tr], normal[tr])
        pred['Baseline_ZScore'][te] = np.clip(s_z[te] / u * 0.5, 0, 1)
        imp = SimpleImputer(strategy='median').fit(X.iloc[tr])
        iso = IsolationForest(n_estimators=300, random_state=0).fit(imp.transform(X.iloc[tr]))
        s_tr, s_te = -iso.score_samples(imp.transform(X.iloc[tr])), -iso.score_samples(imp.transform(X.iloc[te]))
        u = false_alarm_threshold(s_tr, normal[tr])
        pred['Isolation_Forest'][te] = np.clip(0.5 + (s_te - u) * 5, 0, 1)
        for name, factory in supervised_models().items():
            m = factory().fit(X.iloc[tr], y_ev[tr])
            p = m.predict_proba(X.iloc[te])
            normal_idx = list(m.classes_).index('Normal')
            pred_sup[name][0][te] = 1 - p[:, normal_idx]
            pred_sup[name][1][te] = m.classes_[p.argmax(1)]
    out.update({k: (v, None) for k, v in pred.items()})
    out.update(pred_sup)
    return out


# ---------------------------------------------------------------------------
# Metrics: risk, critical events, false alarms and edge cases
# ---------------------------------------------------------------------------
def episodes(df, time_col):
    """Contiguous blocks of the same event per astronaut (or per EVA)."""
    groups = ['astronaut_id'] + (['eva_number'] if 'eva_number' in df else [])
    d = df.sort_values(groups + [time_col])
    change = (d.event != d.groupby(groups).event.shift()).cumsum()
    return d.assign(episode=change)


def metrics(df, score, ev_pred, time_col):
    alarm = score >= 0.5
    risk = df.risk_level.to_numpy() > 0
    normal = df.event.to_numpy() == 'Normal'
    critical = df.risk_level.to_numpy() == 2
    early = risk & (df.event_intensity.to_numpy() < 0.5)
    spike = (df.sensor_artifact == 'Motion_Spike').to_numpy() & normal
    missing = (df.sensor_artifact == 'Missing_Value').to_numpy()
    r = {
        'risk_f1': f1_score(risk, alarm),
        'auc_pr': average_precision_score(risk, score),
        'critical_recall': alarm[critical].mean(),
        'early_recall': alarm[early].mean() if early.any() else np.nan,
        'false_alarm_rate': alarm[normal & ~spike].mean(),
        'fa_sensor_spike': alarm[spike].mean() if spike.any() else np.nan,
        'f1_missing_data': f1_score(risk[missing], alarm[missing]) if risk[missing].any() else np.nan,
    }
    if 'critical_phase' in df:
        cp = (df.critical_phase.to_numpy() == 1) & normal
        r['fa_launch_reentry'] = alarm[cp].mean()
    ep = episodes(df.assign(_a=alarm), time_col)
    ep = ep[ep.event != 'Normal']
    detected = ep.groupby('episode').apply(lambda g: g._a.any(), include_groups=False)
    latency = ep.groupby('episode').apply(
        lambda g: (g[time_col][g._a].min() - g[time_col].min()) if g._a.any() else np.nan, include_groups=False)
    r['episodes_detected'] = detected.mean()
    r['median_latency'] = latency.median()
    r['event_type_f1'] = f1_score(df.event, ev_pred, average='macro') if ev_pred is not None else np.nan
    return r


def run(dataset_name, prepare, source, rules_fn, time_col, latency_unit):
    rows = []
    for s in SEEDS:
        t0 = time.time()
        daily, eva = generate(24, s)
        df, feats = prepare(daily if source == 'daily' else eva)
        df = df.reset_index(drop=True)
        res = cross_validate(df, feats, rules_fn, 'astronaut_id')
        for model, (score, ev_pred) in res.items():
            rows.append({'dataset': dataset_name, 'seed': s, 'model': model,
                         **metrics(df, score, ev_pred, time_col)})
        print(f'  {dataset_name} seed {s}: {len(df)} rows, {time.time() - t0:.0f}s', flush=True)
    r = pd.DataFrame(rows)
    r['latency_unit'] = latency_unit
    return r


def summarize(r):
    cols = ['risk_f1', 'auc_pr', 'critical_recall', 'early_recall', 'episodes_detected',
            'median_latency', 'false_alarm_rate', 'fa_sensor_spike', 'f1_missing_data',
            'event_type_f1'] + (['fa_launch_reentry'] if 'fa_launch_reentry' in r and r.fa_launch_reentry.notna().any() else [])
    m = r.groupby('model')[cols].mean()
    m.insert(1, 'risk_f1_sd', r.groupby('model')['risk_f1'].std())
    return m.sort_values('risk_f1', ascending=False)


def train_final(prepare, source, model_name, path):
    daily, eva = generate(24, SEEDS[0])
    df, feats = prepare(daily if source == 'daily' else eva)
    m = supervised_models()[model_name]().fit(df[feats], df.event)
    joblib.dump({'model': m, 'features': feats, 'type': model_name,
                 'note': 'Trained on SIMULATED data calibrated with NASA sources'}, path)


def main():
    out_dir = os.path.join(ROOT, 'results')
    model_dir = os.path.join(ROOT, 'model', 'trained')
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(model_dir, exist_ok=True)
    pd.set_option('display.width', 250, 'display.max_columns', 30, 'display.float_format', '{:.2f}'.format)

    print('Training and evaluating (astronaut-grouped validation, 3 populations)...')
    r_d = run('Daily', daily_features, 'daily', daily_rules, 'mission_day', 'days')
    r_e = run('EVA', eva_features, 'eva', eva_rules, 'eva_minute', 'minutes')
    pd.concat([r_d, r_e]).to_csv(os.path.join(out_dir, 'model_comparison_detail.csv'), index=False)

    for title, r in [('DAILY (Earth + Spacecraft + Station)', r_d), ('EVA (spacewalk)', r_e)]:
        res = summarize(r)
        res.to_csv(os.path.join(out_dir, f'summary_{r.dataset.iloc[0].lower()}.csv'))
        print('\n' + '=' * 120 + f'\n{title}  - latency in {r.latency_unit.iloc[0]}\n' + '=' * 120)
        print(res.to_string())

    for r, prep, source, filename in [(r_d, daily_features, 'daily', 'daily_model.joblib'),
                                      (r_e, eva_features, 'eva', 'eva_model.joblib')]:
        sup = summarize(r).loc[list(supervised_models())]
        # Among models within 0.02 of the best F1, pick the most stable across populations.
        close = sup[sup.risk_f1 >= sup.risk_f1.max() - 0.02]
        best = close.risk_f1_sd.idxmin()
        train_final(prep, source, best, os.path.join(model_dir, filename))
        print(f'\nFinal {source} model: {best} -> model/trained/{filename}')


if __name__ == '__main__':
    main()
