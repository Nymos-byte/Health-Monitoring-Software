"""
Valida la consistencia de los datos simulados y prueba que sean entrenables.

Uso:  python validar_datos.py --datos ../datos_simulados
"""
import argparse
import glob
import os

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import GroupKFold


def ok(cond, msg):
    print(('  [OK]    ' if cond else '  [FALLA] ') + msg)
    return cond


def validar(df, nombre):
    print('=' * 90)
    print(f'{nombre}: {len(df)} filas, {df.Astronauta_ID.nunique()} astronautas')
    todo_ok = True
    nul = df.isna().mean().max() * 100
    todo_ok &= ok(nul < 3, f'Faltantes máx. por columna {nul:.1f}% (artefactos intencionales ~1.5%)')
    todo_ok &= ok(not df.duplicated().any(), 'Sin filas duplicadas')
    limpio = df[df.Artefacto_Sensor == 'Ninguno']
    todo_ok &= ok((limpio.Presion_Diastolica_mmHg < limpio.Presion_Sistolica_mmHg).all(), 'Diastólica < sistólica')
    todo_ok &= ok(limpio.Saturacion_O2_Pct.le(100).all(), 'SpO2 <= 100')
    pct100 = (limpio.Saturacion_O2_Pct == 100).mean() * 100
    todo_ok &= ok(pct100 < 5, f'SpO2 sin amontonarse en 100% ({pct100:.1f}%)')
    r = limpio.Presion_Sistolica_mmHg.corr(limpio.Presion_Diastolica_mmHg)
    todo_ok &= ok(r > 0.4, f'Correlación sistólica-diastólica = {r:.2f}')
    fc_act = limpio.groupby('Nivel_Actividad').Frecuencia_Cardiaca_LPM.mean()
    orden = [n for n in ['Reposo', 'Ligera', 'Moderada', 'Intensa'] if n in fc_act]
    todo_ok &= ok(fc_act[orden].is_monotonic_increasing,
                  'FC sube con actividad: ' + ', '.join(f'{n}={fc_act[n]:.0f}' for n in orden))
    if 'Tiempo_Reaccion_PVT_ms' in df:
        r = limpio.Horas_Sueno_Previas.corr(limpio.Tiempo_Reaccion_PVT_ms)
        todo_ok &= ok(r < -0.1, f'Menos sueño -> reacción más lenta (r = {r:.2f}; débil si casi no hay déficit de sueño)')
    if 'Radiacion_Acumulada_mGy' in df and df.Radiacion_Acumulada_mGy.notna().any():
        orden_t = ['Minuto_EVA'] if 'Minuto_EVA' in df else []
        mono = df.sort_values(['Astronauta_ID', 'Dia_Mision'] + orden_t).groupby('Astronauta_ID') \
            .Radiacion_Acumulada_mGy.apply(lambda s: s.dropna().is_monotonic_increasing).all()
        todo_ok &= ok(mono, 'Radiación acumulada nunca disminuye')
    if 'T_Score_Cadera' in df and (df.Entorno == 'Estacion').any():
        est = df[df.Entorno == 'Estacion']
        pend = est.groupby('Astronauta_ID').apply(
            lambda g: np.polyfit(g.Dia_Mision, g.T_Score_Cadera, 1)[0] * 30 / 0.083, include_groups=False)
        todo_ok &= ok(pend.between(-1.7, -0.8).all(),
                      f'Pérdida ósea {(-pend).min():.2f}-{(-pend).max():.2f} %/mes (NASA: 1-1.5)')
    ev = limpio[limpio.Evento != 'Normal']
    if len(ev):
        base = limpio[limpio.Evento == 'Normal']
        print('  Diferencia media vs Normal (pico del evento, intensidad >= 0.7):')
        cols = ['Frecuencia_Cardiaca_LPM', 'Presion_Sistolica_mmHg', 'Temperatura_Corporal_C',
                'Horas_Sueno_Previas', 'Saturacion_O2_Pct'] + \
               [c for c in ['Tiempo_Reaccion_PVT_ms', 'CO2_Traje_ppm', 'Presion_Traje_psia'] if c in df]
        tabla = ev[ev.Intensidad_Evento >= 0.7].groupby('Evento')[cols].mean() - base[cols].mean()
        print(tabla.round(2).to_string().replace('\n', '\n    '))
    print('  Distribución Nivel_Riesgo:', df.Nivel_Riesgo.value_counts().sort_index().to_dict())
    return todo_ok


def prueba_modelo(df, features, nombre):
    """Entrena con unos astronautas y evalúa con OTROS (GroupKFold) para evitar fuga de datos."""
    print('-' * 90)
    print(f'Modelo de prueba ({nombre}): predecir Evento, validación por astronauta')
    X = pd.get_dummies(df[features], columns=[c for c in ['Nivel_Actividad', 'Fase_Vuelo'] if c in features])
    y = df.Evento
    preds = pd.Series(index=df.index, dtype=object)
    for tr, te in GroupKFold(n_splits=4).split(X, y, df.Astronauta_ID):
        m = HistGradientBoostingClassifier(max_iter=200, class_weight='balanced', random_state=0)
        m.fit(X.iloc[tr], y.iloc[tr])
        preds.iloc[te] = m.predict(X.iloc[te])
    print(classification_report(y, preds, digits=2, zero_division=0))
    print(f'  F1 macro = {f1_score(y, preds, average="macro"):.2f}  (1.00 sería sospechoso; ~0.6-0.9 es realista)')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--datos', default=os.path.join(os.path.dirname(__file__), '..', 'datos_simulados'))
    args = ap.parse_args()
    leer = lambda f: pd.read_csv(os.path.join(args.datos, f), encoding='utf-8-sig')

    resultados = {}
    for f in sorted(glob.glob(os.path.join(args.datos, 'sim_*.csv'))):
        n = os.path.basename(f)
        resultados[n] = validar(leer(n), n)

    vitales = ['Frecuencia_Cardiaca_LPM', 'Presion_Sistolica_mmHg', 'Presion_Diastolica_mmHg',
               'Saturacion_O2_Pct', 'Temperatura_Corporal_C', 'Horas_Sueno_Previas', 'Nivel_Actividad']
    est = leer('sim_estacion_espacial.csv')
    # Desviación respecto a la línea base personal (primeros 20 días de estación, sin eventos).
    base = est[(est.Dia_Mision < 25) & (est.Evento == 'Normal')].groupby('Astronauta_ID')[vitales[:6] + ['Tiempo_Reaccion_PVT_ms']].median()
    for c in base:
        est[c + '_delta'] = est[c] - est.Astronauta_ID.map(base[c])
    # El dosímetro, no los signos vitales, es lo que detecta un evento de partículas solares.
    est['Dosis_Dia_mGy'] = est.sort_values(['Astronauta_ID', 'Dia_Mision']).groupby('Astronauta_ID').Radiacion_Acumulada_mGy.diff()
    prueba_modelo(est, vitales + ['Tiempo_Reaccion_PVT_ms', 'Dosis_Dia_mGy'] + [c + '_delta' for c in base], 'estación, diario')
    eva = leer('sim_eva.csv')
    prueba_modelo(eva, vitales + ['Minuto_EVA', 'Presion_Traje_psia', 'CO2_Traje_ppm'], 'EVA')

    print('=' * 90)
    print('RESUMEN:', 'todas las pruebas OK' if all(resultados.values()) else
          'FALLAS en: ' + ', '.join(k for k, v in resultados.items() if not v))


if __name__ == '__main__':
    main()
