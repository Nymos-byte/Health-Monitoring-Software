"""
Context-aware risk detection on SIMULATED astronaut data.

Pipeline:
  1. Context detector  - infers the mission context (Earth pre-flight, spacecraft, station,
                         planetary base, Earth post-flight) from vehicle telemetry only:
                         gravity, peak acceleration, cabin pressure, cabin O2, radiation dose.
  2. Risk models       - compared with and without context, to show how context avoids false
                         alarms for EXPECTED adaptations (landing orthostatic response,
                         hypobaric habitat SpO2, launch/reentry stress, deep-space dose).

Compared approaches (daily data):
  Rules_Blind      fixed thresholds, same everywhere
  Rules_Context    thresholds adjusted by detected context
  GB_Blind         Gradient Boosting, rolling personal baseline, no context features
  GB_Context       Gradient Boosting + detected context, rolling AND per-context baselines
  GB_Oracle        GB_Context using the TRUE context (upper bound for the detector)

Validation: GroupKFold by astronaut (tested on unseen crew), repeated on 3 simulated
populations (seeds).

Usage:  python train_models.py
"""
import os
import sys
import time
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import GroupKFold

warnings.filterwarnings('ignore')
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(ROOT, 'generator'))
from generate_data import ENVIRONMENTS, P, VITALS, generate  # noqa: E402

SEEDS = [42, 7, 2026]
N_ASTRONAUTS = 30
ACTIVITY = {'Rest': 0, 'Light': 1, 'Moderate': 2, 'Intense': 3}
TELEMETRY = ['gravity_g', 'peak_accel_g', 'cabin_pressure_psia', 'cabin_o2_pct',
             'daily_dose_mgy', 'cumulative_radiation_mgy']
SIGNALS = VITALS + ['sleep_hours_prev_night', 'pvt_reaction_time_ms']


def gb(**kw):
    return HistGradientBoostingClassifier(max_iter=300, learning_rate=0.08, class_weight='balanced',
                                          random_state=0, **kw)


# ---------------------------------------------------------------------------
# 1. Context detection (telemetry only)
# ---------------------------------------------------------------------------
def add_telemetry(df):
    df = df.sort_values(['astronaut_id', 'mission_day']).copy()
    df['daily_dose_mgy'] = df.groupby('astronaut_id').cumulative_radiation_mgy.diff().fillna(0)
    return df


def smooth_context(df, raw):
    """Majority vote over a 3-day window: one noisy day should not flip the context."""
    codes = pd.Series(pd.Categorical(raw, categories=ENVIRONMENTS).codes, index=df.index)
    sm = codes.groupby(df.astronaut_id).transform(
        lambda s: s.rolling(3, center=True, min_periods=1).apply(lambda w: np.bincount(w.astype(int)).argmax()))
    return np.array(ENVIRONMENTS)[sm.astype(int).to_numpy()]


def add_context_features(df, context):
    """Context features derived from a (detected or true) context sequence."""
    df = df.copy()
    df['context'] = context
    seg = (df.context != df.groupby('astronaut_id').context.shift()).cumsum()
    df['context_segment'] = seg
    df['days_in_context'] = df.groupby(seg).cumcount()
    df['dynamic_phase'] = (df.peak_accel_g > 1.5).astype(int)            # launch / reentry
    in_micro = (df.gravity_g < 0.5).astype(float) * (1 - df.gravity_g)
    df['microgravity_days'] = in_micro.groupby(df.astronaut_id).cumsum()
    df['dose_30d_mgy'] = df.groupby('astronaut_id').daily_dose_mgy.transform(lambda s: s.rolling(30, min_periods=1).sum())
    for env in ENVIRONMENTS:
        df[f'ctx_{env}'] = (df.context == env).astype(int)
    return df


# ---------------------------------------------------------------------------
# 2. Feature engineering
# ---------------------------------------------------------------------------
def artifact_filter(df, hr_baseline):
    """An HR spike > 50% over baseline with no blood-pressure change is almost certainly sensor motion."""
    suspect = (df.heart_rate_bpm > 1.5 * hr_baseline) & \
              ((df.systolic_bp_mmhg - df.systolic_bp_mmhg.rolling(5, min_periods=1).median()).abs() < 15)
    df['suspected_artifact'] = suspect.astype(int)
    df.loc[suspect, 'heart_rate_bpm'] = np.nan
    return df


def baseline_features(df, per_context):
    """Deviation from a rolling personal baseline (past 14 days only).
    per_context=True resets the baseline at each context change and falls back to the
    astronaut's Earth pre-flight median for the first days of a new context."""
    df = df.copy()
    df['activity'] = df.activity_level.map(ACTIVITY)
    parts = []
    for _, g in df.groupby('astronaut_id', sort=False):
        g = g.copy()
        hr_base = g.heart_rate_bpm.shift(1).rolling(14, min_periods=5).median()
        g = artifact_filter(g, hr_base.fillna(g.heart_rate_bpm.median()))
        earth = g[g.mission_day < 0]
        for c in SIGNALS:
            if per_context:
                base = g.groupby('context_segment')[c].transform(lambda s: s.shift(1).rolling(14, min_periods=3).median())
                spread = g.groupby('context_segment')[c].transform(lambda s: s.shift(1).rolling(14, min_periods=3).std())
                base = base.fillna(earth[c].median())
                spread = spread.fillna(earth[c].std())
            else:
                base = g[c].shift(1).rolling(14, min_periods=5).median()
                spread = g[c].shift(1).rolling(14, min_periods=5).std()
            g[c + '_delta'] = g[c] - base
            g[c + '_z'] = g[c + '_delta'] / spread.clip(lower=1e-3)
            g[c + '_trend3'] = g[c].rolling(3, min_periods=1).mean() - base
        parts.append(g)
    return pd.concat(parts)


BASE_FEATS = SIGNALS + ['activity', 'daily_dose_mgy', 'suspected_artifact'] + \
    [c + s for c in SIGNALS for s in ('_delta', '_z', '_trend3')]
DEVIATIONS = [c + s for c in SIGNALS for s in ('_delta', '_z', '_trend3')]
CONTEXT_FEATS = ['gravity_g', 'peak_accel_g', 'cabin_pressure_psia', 'cabin_o2_pct', 'days_in_context',
                 'dynamic_phase', 'microgravity_days', 'dose_30d_mgy'] + [f'ctx_{e}' for e in ENVIRONMENTS] + \
                [c + '_ctx' for c in DEVIATIONS]


def context_aware_features(df, context):
    """Both baselines: the continuous rolling one (catches events whenever they start) plus the
    per-context one (knows what is normal right after a gravity transition).
    An ablation showed resetting the baseline alone lowers F1; combining both keeps F1 and cuts
    false alarms at landing and launch/reentry."""
    ctx = add_context_features(df, context)
    both = baseline_features(ctx, per_context=False)
    reset = baseline_features(ctx, per_context=True)
    for c in DEVIATIONS:
        both[c + '_ctx'] = reset[c].to_numpy()
    return both


# ---------------------------------------------------------------------------
# 3. Rules
# ---------------------------------------------------------------------------
def rules_blind(df):
    resting_hr = (df.heart_rate_bpm > 100) & (df.activity <= 1)
    alert = (df.spo2_pct < 94) | (df.body_temp_c >= 37.5) | resting_hr | \
            (df.sleep_hours_prev_night < 5) | (df.pvt_reaction_time_ms > 400) | (df.daily_dose_mgy > 5)
    critical = (df.spo2_pct < 90) | (df.body_temp_c >= 38.0) | (df.daily_dose_mgy > 20)
    return np.where(critical, 1.0, np.where(alert, 0.6, 0.0))


def rules_context(df):
    """Same rules, but thresholds follow the context the astronaut is in."""
    base = df.context == 'Planetary_Base'
    just_landed = (df.gravity_g > 0.1) & (df.days_in_context <= 2) & (df.microgravity_days > 0)
    spo2_alert = np.where(base, 92.5, 94)            # hypobaric habitat: ~1.5% lower SpO2 is expected
    spo2_crit = np.where(base, 88.5, 90)
    hr_limit = np.where(just_landed, 115, 100)        # landing orthostatic response is expected
    resting_hr = (df.heart_rate_bpm > hr_limit) & (df.activity <= 1) & (df.dynamic_phase == 0)
    # Approaching a NASA dose limit is reported on its own channel (radiation_advisory), not as a
    # health alarm; only exceeding the 30-day heart limit is critical.
    dose_alert = df.daily_dose_mgy > 5
    dose_crit = (df.daily_dose_mgy > 20) | (df.dose_30d_mgy > P['heart_dose_limit_30d'])
    alert = (df.spo2_pct < spo2_alert) | (df.body_temp_c >= 37.5) | resting_hr | \
            (df.sleep_hours_prev_night < 5) | (df.pvt_reaction_time_ms > 400) | dose_alert
    critical = (df.spo2_pct < spo2_crit) | (df.body_temp_c >= 38.0) | dose_crit
    return np.where(critical, 1.0, np.where(alert, 0.6, 0.0))


def radiation_advisory(df):
    """Separate channel: 30-day dose above 50% of the NASA 30-day heart limit."""
    return df.dose_30d_mgy > P['heart_dose_limit_30d'] / 2


# ---------------------------------------------------------------------------
# 4. Evaluation
# ---------------------------------------------------------------------------
def metrics(df, score):
    alarm = score >= 0.5
    risk = df.risk_level.to_numpy() > 0
    normal = (df.event.to_numpy() == 'Normal') & (df.sensor_artifact.to_numpy() != 'Motion_Spike')
    expected = normal & (df.expected_adaptation.to_numpy() != 'No_Adaptation')
    critical = df.risk_level.to_numpy() == 2
    return {
        'risk_f1': f1_score(risk, alarm),
        'critical_recall': alarm[critical].mean(),
        'risk_recall': alarm[risk].mean(),
        'false_alarm_rate': alarm[normal].mean(),
        'fa_expected_adaptation': alarm[expected].mean(),
    }


def per_group(df, score, col):
    alarm = score >= 0.5
    normal = (df.event == 'Normal') & (df.sensor_artifact != 'Motion_Spike')
    risk = df.risk_level > 0
    out = {}
    for k, idx in df.groupby(col).groups.items():
        m = df.index.isin(idx)
        out[k] = {'false_alarm_rate': alarm[m & normal].mean() if (m & normal).any() else np.nan,
                  'risk_recall': alarm[m & risk].mean() if (m & risk).any() else np.nan}
    return out


def evaluate_seed(seed):
    daily, _ = generate(N_ASTRONAUTS, seed)
    df = add_telemetry(daily).reset_index(drop=True)
    groups = df.astronaut_id
    cv = list(GroupKFold(n_splits=5).split(df, groups=groups))

    # Context detection, out-of-fold.
    det_raw = np.empty(len(df), dtype=object)
    for tr, te in cv:
        m = gb().fit(df.iloc[tr][TELEMETRY], df.iloc[tr].environment)
        det_raw[te] = m.predict(df.iloc[te][TELEMETRY])
    detected = smooth_context(df, det_raw)
    ctx_acc = accuracy_score(df.environment, detected)
    ctx_by_env = pd.Series(detected == df.environment.to_numpy()).groupby(df.environment).mean().to_dict()

    variants = {
        'Blind': baseline_features(add_context_features(df, detected), per_context=False),
        'Context': context_aware_features(df, detected),
        'Oracle': context_aware_features(df, df.environment.to_numpy()),
    }
    scores = {'Rules_Blind': rules_blind(variants['Blind']), 'Rules_Context': rules_context(variants['Context'])}
    for name, feats in [('GB_Blind', ('Blind', BASE_FEATS)),
                        ('GB_Context', ('Context', BASE_FEATS + CONTEXT_FEATS)),
                        ('GB_Oracle', ('Oracle', BASE_FEATS + CONTEXT_FEATS))]:
        data, cols = variants[feats[0]], feats[1]
        s = np.zeros(len(df))
        for tr, te in cv:
            m = gb().fit(data.iloc[tr][cols], data.iloc[tr].event)
            s[te] = 1 - m.predict_proba(data.iloc[te][cols])[:, list(m.classes_).index('Normal')]
        scores[name] = s

    ref = variants['Context']
    overall = [{'seed': seed, 'model': k, **metrics(ref, v)} for k, v in scores.items()]
    by_env = [{'seed': seed, 'model': k, 'environment': e, **m}
              for k, v in scores.items() for e, m in per_group(ref, v, 'environment').items()]
    by_adapt = [{'seed': seed, 'model': k, 'expected_adaptation': e, **m}
                for k, v in scores.items() for e, m in per_group(ref, v, 'expected_adaptation').items()]
    adv = ref.assign(advisory=radiation_advisory(ref)).groupby('mission_type').advisory.mean().to_dict()
    return overall, by_env, by_adapt, ctx_acc, {**ctx_by_env, **{f'radiation_advisory_days_{k}': v for k, v in adv.items()}}


# ---------------------------------------------------------------------------
# 5. EVA (station vs. planetary surface)
# ---------------------------------------------------------------------------
def eva_features(eva, with_location):
    df = eva.sort_values(['astronaut_id', 'eva_number', 'eva_minute']).copy()
    df['activity'] = df.activity_level.map(ACTIVITY)
    cols = VITALS + ['suit_pressure_psia', 'suit_co2_ppm']
    parts = []
    for _, g in df.groupby(['astronaut_id', 'eva_number'], sort=False):
        g = g.copy()
        g = artifact_filter(g, pd.Series(g.heart_rate_bpm.iloc[:3].median(), index=g.index))
        for c in cols:
            base = g[c].iloc[:3].median()     # first 30 min of the EVA = baseline
            g[c + '_delta'] = g[c] - base
            g[c + '_slope'] = g[c].diff().rolling(3, min_periods=1).mean()
        parts.append(g)
    df = pd.concat(parts)
    feats = cols + ['eva_minute', 'activity', 'sleep_hours_prev_night', 'suspected_artifact'] + \
        [c + s for c in cols for s in ('_delta', '_slope')]
    if with_location:
        feats += ['gravity_g']
    return df, feats


def evaluate_eva(seed):
    _, eva = generate(N_ASTRONAUTS, seed)
    rows = []
    for name, loc in [('GB_Blind', False), ('GB_Context', True)]:
        df, feats = eva_features(eva, loc)
        df = df.reset_index(drop=True)
        s = np.zeros(len(df))
        for tr, te in GroupKFold(n_splits=5).split(df, groups=df.astronaut_id):
            m = gb().fit(df.iloc[tr][feats], df.iloc[tr].event)
            s[te] = 1 - m.predict_proba(df.iloc[te][feats])[:, list(m.classes_).index('Normal')]
        base = metrics(df.assign(expected_adaptation='No_Adaptation'), s)
        base.pop('fa_expected_adaptation')
        for loc_name, mm in per_group(df, s, 'eva_location').items():
            rows.append({'seed': seed, 'model': name, 'eva_location': loc_name, **base,
                         'fa_location': mm['false_alarm_rate'], 'recall_location': mm['risk_recall']})
    return rows


# ---------------------------------------------------------------------------
# 6. Final models
# ---------------------------------------------------------------------------
def train_final(path_dir):
    daily, eva = generate(N_ASTRONAUTS, SEEDS[0])
    df = add_telemetry(daily).reset_index(drop=True)
    detector = gb().fit(df[TELEMETRY], df.environment)
    joblib.dump({'model': detector, 'features': TELEMETRY, 'type': 'Context_Detector',
                 'note': 'Predicts mission context from telemetry; smooth with a 3-day majority vote'},
                os.path.join(path_dir, 'context_detector.joblib'))
    data = context_aware_features(df, smooth_context(df, detector.predict(df[TELEMETRY])))
    risk = gb().fit(data[BASE_FEATS + CONTEXT_FEATS], data.event)
    joblib.dump({'model': risk, 'features': BASE_FEATS + CONTEXT_FEATS, 'type': 'GB_Context',
                 'note': 'Trained on SIMULATED data calibrated with NASA sources'},
                os.path.join(path_dir, 'daily_model.joblib'))
    e, feats = eva_features(eva, True)
    joblib.dump({'model': gb().fit(e[feats], e.event), 'features': feats, 'type': 'GB_Context',
                 'note': 'Trained on SIMULATED data calibrated with NASA sources'},
                os.path.join(path_dir, 'eva_model.joblib'))


def main():
    out_dir = os.path.join(ROOT, 'results')
    model_dir = os.path.join(ROOT, 'model', 'trained')
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(model_dir, exist_ok=True)
    pd.set_option('display.width', 250, 'display.max_columns', 30, 'display.float_format', '{:.3f}'.format)

    overall, by_env, by_adapt, ctx = [], [], [], []
    for s in SEEDS:
        t0 = time.time()
        o, e, a, acc, acc_env = evaluate_seed(s)
        overall += o
        by_env += e
        by_adapt += a
        ctx.append({'seed': s, 'accuracy': acc, **acc_env})
        print(f'  daily seed {s}: {time.time() - t0:.0f}s', flush=True)
    eva_rows = []
    for s in SEEDS:
        eva_rows += evaluate_eva(s)

    order = ['Rules_Blind', 'Rules_Context', 'GB_Blind', 'GB_Context', 'GB_Oracle']
    ctx = pd.DataFrame(ctx)
    ov = pd.DataFrame(overall).groupby('model').mean(numeric_only=True).drop(columns='seed').loc[order]
    ov.insert(1, 'risk_f1_sd', pd.DataFrame(overall).groupby('model').risk_f1.std().loc[order])
    env = pd.DataFrame(by_env).groupby(['environment', 'model']).mean(numeric_only=True).drop(columns='seed')
    ada = pd.DataFrame(by_adapt).groupby(['expected_adaptation', 'model']).mean(numeric_only=True).drop(columns='seed')
    ev = pd.DataFrame(eva_rows).groupby(['eva_location', 'model']).mean(numeric_only=True).drop(columns='seed')

    ctx.to_csv(os.path.join(out_dir, 'context_detection.csv'), index=False)
    ov.to_csv(os.path.join(out_dir, 'summary_overall.csv'))
    env.to_csv(os.path.join(out_dir, 'summary_by_environment.csv'))
    ada.to_csv(os.path.join(out_dir, 'summary_by_expected_adaptation.csv'))
    ev.to_csv(os.path.join(out_dir, 'summary_eva.csv'))

    print('\nCONTEXT DETECTION (telemetry only, unseen astronauts)')
    print(ctx.drop(columns='seed').mean().to_string())
    print('\nOVERALL (daily)')
    print(ov.to_string())
    print('\nFALSE ALARM RATE ON NORMAL DAYS, BY ENVIRONMENT')
    print(env.false_alarm_rate.unstack().loc[:, order].to_string())
    print('\nRISK RECALL BY ENVIRONMENT')
    print(env.risk_recall.unstack().loc[:, order].to_string())
    print('\nFALSE ALARM RATE DURING EXPECTED ADAPTATIONS')
    print(ada.false_alarm_rate.unstack().loc[:, order].to_string())
    print('\nEVA BY LOCATION')
    print(ev[['fa_location', 'recall_location', 'risk_f1']].unstack().to_string())

    train_final(model_dir)
    print('\nSaved: model/trained/context_detector.joblib, daily_model.joblib, eva_model.joblib')


if __name__ == '__main__':
    main()
