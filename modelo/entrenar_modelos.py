"""
Compara modelos para detectar señales de riesgo y casos borde en datos SIMULADOS.

Enfoques:
  1. Reglas_Umbral        - umbrales fijos tipo NASA (sin aprendizaje)
  2. ZScore_Linea_Base    - desviación vs. línea base personal (no supervisado)
  3. Isolation_Forest     - detección de anomalías (no supervisado)
  4. Regresion_Logistica  - supervisado lineal
  5. Random_Forest        - supervisado, árboles
  6. Gradient_Boosting    - supervisado, árboles secuenciales
  7. Red_Neuronal_MLP     - supervisado, red neuronal pequeña

Validación: GroupKFold por astronauta (se prueba con astronautas nunca vistos),
repetida en 3 poblaciones simuladas (semillas) para medir estabilidad.

Uso:  python entrenar_modelos.py
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
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(RAIZ, 'generador'))
from generar_datos import generar  # noqa: E402

SEMILLAS = [42, 7, 2026]
ACT = {'Reposo': 0, 'Ligera': 1, 'Moderada': 2, 'Intensa': 3}
VITALES = ['Frecuencia_Cardiaca_LPM', 'Presion_Sistolica_mmHg', 'Presion_Diastolica_mmHg',
           'Saturacion_O2_Pct', 'Temperatura_Corporal_C']


# ---------------------------------------------------------------------------
# Ingeniería de variables (sin usar etiquetas: lo mismo correría en la app)
# ---------------------------------------------------------------------------
def filtro_artefactos(df, base_fc):
    """Un pico de FC > 50% sobre la línea base sin cambio de presión es casi seguro movimiento del sensor."""
    sosp = (df.Frecuencia_Cardiaca_LPM > 1.5 * base_fc) & \
           ((df.Presion_Sistolica_mmHg - df.Presion_Sistolica_mmHg.rolling(5, min_periods=1).median()).abs() < 15)
    df['Sospecha_Artefacto'] = sosp.astype(int)
    df.loc[sosp, 'Frecuencia_Cardiaca_LPM'] = np.nan
    return df


def variables_diarias(diario):
    df = diario.sort_values(['Astronauta_ID', 'Dia_Mision']).copy()
    df['Actividad'] = df.Nivel_Actividad.map(ACT)
    df['Fase_Critica'] = df.Fase_Vuelo.isin(['Lanzamiento', 'Maniobra_Orbital', 'Reentrada']).astype(int)
    df['En_Vuelo'] = (df.Entorno != 'Tierra').astype(int)
    df['Dosis_Dia_mGy'] = df.groupby('Astronauta_ID').Radiacion_Acumulada_mGy.diff().fillna(0)
    cols = VITALES + ['Horas_Sueno_Previas', 'Tiempo_Reaccion_PVT_ms']
    partes = []
    for _, g in df.groupby('Astronauta_ID', sort=False):
        g = g.copy()
        base_fc = g.Frecuencia_Cardiaca_LPM.shift(1).rolling(14, min_periods=5).median()
        g = filtro_artefactos(g, base_fc.fillna(g.Frecuencia_Cardiaca_LPM.median()))
        for c in cols:
            base = g[c].shift(1).rolling(14, min_periods=5).median()   # línea base móvil, solo pasado
            disp = g[c].shift(1).rolling(14, min_periods=5).std()
            g[c + '_delta'] = g[c] - base
            g[c + '_z'] = g[c + '_delta'] / disp.clip(lower=1e-3)
            g[c + '_tend3'] = g[c].rolling(3, min_periods=1).mean() - base   # tendencia de 3 días
        partes.append(g)
    df = pd.concat(partes)
    feats = cols + ['Actividad', 'Fase_Critica', 'En_Vuelo', 'Dosis_Dia_mGy', 'Sospecha_Artefacto'] + \
        [c + s for c in cols for s in ('_delta', '_z', '_tend3')]
    return df, feats


def variables_eva(eva):
    df = eva.sort_values(['Astronauta_ID', 'EVA_Num', 'Minuto_EVA']).copy()
    df['Actividad'] = df.Nivel_Actividad.map(ACT)
    cols = VITALES + ['Presion_Traje_psia', 'CO2_Traje_ppm']
    partes = []
    for _, g in df.groupby(['Astronauta_ID', 'EVA_Num'], sort=False):
        g = g.copy()
        base_fc = g.Frecuencia_Cardiaca_LPM.iloc[:3].median()
        g = filtro_artefactos(g, pd.Series(base_fc, index=g.index))
        for c in cols:
            base = g[c].iloc[:3].median()     # primeros 30 min de la EVA = línea base
            disp = g[c].iloc[:6].std()
            g[c + '_delta'] = g[c] - base
            g[c + '_z'] = g[c + '_delta'] / max(disp if pd.notna(disp) else 1.0, 1e-3)
            g[c + '_pend'] = g[c].diff().rolling(3, min_periods=1).mean()   # velocidad de cambio
        partes.append(g)
    df = pd.concat(partes)
    feats = cols + ['Minuto_EVA', 'Actividad', 'Horas_Sueno_Previas', 'Sospecha_Artefacto'] + \
        [c + s for c in cols for s in ('_delta', '_z', '_pend')]
    return df, feats


# ---------------------------------------------------------------------------
# Modelos
# ---------------------------------------------------------------------------
def reglas_diarias(df):
    """Puntaje 0/1/2 con umbrales fijos. No usa línea base personal."""
    fc_reposo = (df.Frecuencia_Cardiaca_LPM > 100) & (df.Actividad <= 1)
    alerta = (df.Saturacion_O2_Pct < 94) | (df.Temperatura_Corporal_C >= 37.5) | fc_reposo | \
             (df.Horas_Sueno_Previas < 5) | (df.Tiempo_Reaccion_PVT_ms > 400) | (df.Dosis_Dia_mGy > 5)
    critico = (df.Saturacion_O2_Pct < 90) | (df.Temperatura_Corporal_C >= 38.0) | (df.Dosis_Dia_mGy > 20)
    return np.where(critico, 1.0, np.where(alerta, 0.6, 0.0))


def reglas_eva(df):
    alerta = (df.Saturacion_O2_Pct < 94) | (df.CO2_Traje_ppm > 5000) | (df.Presion_Traje_psia < 4.15) | \
             (df.Frecuencia_Cardiaca_LPM > 160) | (df.Temperatura_Corporal_C >= 38.3)
    critico = (df.Saturacion_O2_Pct < 91) | (df.CO2_Traje_ppm > 7000) | (df.Presion_Traje_psia < 4.0)
    return np.where(critico, 1.0, np.where(alerta, 0.6, 0.0))


def zscore_score(df, feats):
    zc = [f for f in feats if f.endswith('_z')]
    return df[zc].abs().max(axis=1).fillna(0).to_numpy()


def supervisados():
    imp = lambda: SimpleImputer(strategy='median', add_indicator=True)
    return {
        'Regresion_Logistica': lambda: make_pipeline(imp(), StandardScaler(),
                                                     LogisticRegression(max_iter=2000, class_weight='balanced')),
        'Random_Forest': lambda: make_pipeline(imp(), RandomForestClassifier(
            n_estimators=300, min_samples_leaf=2, class_weight='balanced_subsample', n_jobs=-1, random_state=0)),
        'Gradient_Boosting': lambda: HistGradientBoostingClassifier(
            max_iter=300, learning_rate=0.08, class_weight='balanced', random_state=0),
        'Red_Neuronal_MLP': lambda: make_pipeline(imp(), StandardScaler(), MLPClassifier(
            hidden_layer_sizes=(64, 32), alpha=1e-3, max_iter=600, early_stopping=True, random_state=0)),
    }


def umbral_falsas_alarmas(score_train, normal_train, tasa=0.05):
    """Umbral para que solo ~5% de las lecturas normales de entrenamiento disparen alarma."""
    return np.quantile(score_train[normal_train], 1 - tasa)


def evaluar_cv(df, feats, reglas_fn, id_grupo):
    """Devuelve dict modelo -> (score_riesgo, evento_predicho) con predicciones fuera de muestra."""
    X, y_ev = df[feats], df.Evento.to_numpy()
    normal = y_ev == 'Normal'
    out = {'Reglas_Umbral': (reglas_fn(df), None)}
    s_z = zscore_score(df, feats)
    pred = {k: np.zeros(len(df)) for k in ['ZScore_Linea_Base', 'Isolation_Forest']}
    pred_sup = {k: (np.zeros(len(df)), np.empty(len(df), dtype=object)) for k in supervisados()}
    for tr, te in GroupKFold(n_splits=4).split(X, y_ev, df[id_grupo]):
        # No supervisados: no ven etiquetas; solo el umbral se calibra con lecturas normales.
        u = umbral_falsas_alarmas(s_z[tr], normal[tr])
        pred['ZScore_Linea_Base'][te] = np.clip(s_z[te] / u * 0.5, 0, 1)
        imp = SimpleImputer(strategy='median').fit(X.iloc[tr])
        iso = IsolationForest(n_estimators=300, random_state=0).fit(imp.transform(X.iloc[tr]))
        s_tr, s_te = -iso.score_samples(imp.transform(X.iloc[tr])), -iso.score_samples(imp.transform(X.iloc[te]))
        u = umbral_falsas_alarmas(s_tr, normal[tr])
        pred['Isolation_Forest'][te] = np.clip(0.5 + (s_te - u) * 5, 0, 1)
        for nombre, fabrica in supervisados().items():
            m = fabrica().fit(X.iloc[tr], y_ev[tr])
            p = m.predict_proba(X.iloc[te])
            idx_normal = list(m.classes_).index('Normal')
            pred_sup[nombre][0][te] = 1 - p[:, idx_normal]
            pred_sup[nombre][1][te] = m.classes_[p.argmax(1)]
    out.update({k: (v, None) for k, v in pred.items()})
    out.update(pred_sup)
    return out


# ---------------------------------------------------------------------------
# Métricas: riesgo, críticos, alarmas falsas y casos borde
# ---------------------------------------------------------------------------
def episodios(df, clave_tiempo):
    """Bloques contiguos del mismo evento por astronauta (o por EVA)."""
    grupos = ['Astronauta_ID'] + (['EVA_Num'] if 'EVA_Num' in df else [])
    d = df.sort_values(grupos + [clave_tiempo])
    cambio = (d.Evento != d.groupby(grupos).Evento.shift()).cumsum()
    return d.assign(Episodio=cambio)


def metricas(df, score, ev_pred, clave_tiempo):
    alarma = score >= 0.5
    riesgo = df.Nivel_Riesgo.to_numpy() > 0
    normal = df.Evento.to_numpy() == 'Normal'
    critico = df.Nivel_Riesgo.to_numpy() == 2
    temprano = riesgo & (df.Intensidad_Evento.to_numpy() < 0.5)
    pico = (df.Artefacto_Sensor == 'Pico_Movimiento').to_numpy() & normal
    falt = (df.Artefacto_Sensor == 'Dato_Faltante').to_numpy()
    r = {
        'F1_Riesgo': f1_score(riesgo, alarma),
        'AUC_PR': average_precision_score(riesgo, score),
        'Recall_Critico': alarma[critico].mean(),
        'Recall_Temprano': alarma[temprano].mean() if temprano.any() else np.nan,
        'Falsas_Alarmas_Normal': alarma[normal & ~pico].mean(),
        'FA_Pico_Sensor': alarma[pico].mean() if pico.any() else np.nan,
        'F1_Con_Dato_Faltante': f1_score(riesgo[falt], alarma[falt]) if riesgo[falt].any() else np.nan,
    }
    if 'Fase_Critica' in df:
        fc = (df.Fase_Critica.to_numpy() == 1) & normal
        r['FA_Lanz_Reentrada'] = alarma[fc].mean()
    ep = episodios(df.assign(_a=alarma), clave_tiempo)
    ep = ep[ep.Evento != 'Normal']
    det = ep.groupby('Episodio').apply(lambda g: g._a.any(), include_groups=False)
    lat = ep.groupby('Episodio').apply(
        lambda g: (g[clave_tiempo][g._a].min() - g[clave_tiempo].min()) if g._a.any() else np.nan, include_groups=False)
    r['Episodios_Detectados'] = det.mean()
    r['Latencia_Mediana'] = lat.median()
    r['F1_Tipo_Evento'] = f1_score(df.Evento, ev_pred, average='macro') if ev_pred is not None else np.nan
    return r


def correr(nombre_ds, preparar, fuente, reglas_fn, clave_tiempo, unidad_lat):
    filas = []
    for s in SEMILLAS:
        t0 = time.time()
        diario, eva = generar(24, s)
        df, feats = preparar(diario if fuente == 'diario' else eva)
        df = df.reset_index(drop=True)
        res = evaluar_cv(df, feats, reglas_fn, 'Astronauta_ID')
        for modelo, (score, ev_pred) in res.items():
            filas.append({'Dataset': nombre_ds, 'Semilla': s, 'Modelo': modelo,
                          **metricas(df, score, ev_pred, clave_tiempo)})
        print(f'  {nombre_ds} semilla {s}: {len(df)} filas, {time.time() - t0:.0f}s', flush=True)
    r = pd.DataFrame(filas)
    r['Unidad_Latencia'] = unidad_lat
    return r


def resumen(r):
    cols = ['F1_Riesgo', 'AUC_PR', 'Recall_Critico', 'Recall_Temprano', 'Episodios_Detectados',
            'Latencia_Mediana', 'Falsas_Alarmas_Normal', 'FA_Pico_Sensor', 'F1_Con_Dato_Faltante',
            'F1_Tipo_Evento'] + (['FA_Lanz_Reentrada'] if 'FA_Lanz_Reentrada' in r and r.FA_Lanz_Reentrada.notna().any() else [])
    m = r.groupby('Modelo')[cols].mean()
    sd = r.groupby('Modelo')['F1_Riesgo'].std()
    m.insert(1, 'F1_Riesgo_DE', sd)
    return m.sort_values('F1_Riesgo', ascending=False)


def entrenar_final(preparar, fuente, nombre_modelo, destino):
    diario, eva = generar(24, SEMILLAS[0])
    df, feats = preparar(diario if fuente == 'diario' else eva)
    m = supervisados()[nombre_modelo]().fit(df[feats], df.Evento)
    joblib.dump({'modelo': m, 'variables': feats, 'tipo': nombre_modelo,
                 'nota': 'Entrenado con datos SIMULADOS calibrados con fuentes NASA'}, destino)


def main():
    salida = os.path.join(RAIZ, 'resultados')
    os.makedirs(salida, exist_ok=True)
    os.makedirs(os.path.join(RAIZ, 'modelo', 'entrenados'), exist_ok=True)
    pd.set_option('display.width', 250, 'display.max_columns', 30, 'display.float_format', '{:.2f}'.format)

    print('Entrenando y evaluando (validación por astronauta, 3 poblaciones)...')
    r_d = correr('Diario', variables_diarias, 'diario', reglas_diarias, 'Dia_Mision', 'días')
    r_e = correr('EVA', variables_eva, 'eva', reglas_eva, 'Minuto_EVA', 'minutos')
    pd.concat([r_d, r_e]).to_csv(os.path.join(salida, 'comparacion_modelos_detalle.csv'), index=False, encoding='utf-8-sig')

    for nombre, r in [('DIARIO (Tierra + Nave + Estación)', r_d), ('EVA (caminata espacial)', r_e)]:
        res = resumen(r)
        res.to_csv(os.path.join(salida, f'resumen_{r.Dataset.iloc[0].lower()}.csv'), encoding='utf-8-sig')
        print('\n' + '=' * 120 + f'\n{nombre}  - latencia en {r.Unidad_Latencia.iloc[0]}\n' + '=' * 120)
        print(res.to_string())

    for r, prep, fuente, archivo in [(r_d, variables_diarias, 'diario', 'modelo_diario.joblib'),
                                     (r_e, variables_eva, 'eva', 'modelo_eva.joblib')]:
        sup = resumen(r).loc[list(supervisados())]
        # Entre los que quedan a <= 0.02 del mejor F1, gana el más estable entre poblaciones.
        cerca = sup[sup.F1_Riesgo >= sup.F1_Riesgo.max() - 0.02]
        mejor = cerca.F1_Riesgo_DE.idxmin()
        entrenar_final(prep, fuente, mejor, os.path.join(RAIZ, 'modelo', 'entrenados', archivo))
        print(f'\nModelo final {fuente}: {mejor} -> modelo/entrenados/{archivo}')


if __name__ == '__main__':
    main()
