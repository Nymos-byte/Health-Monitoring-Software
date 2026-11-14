"""
Generador de datos SIMULADOS de salud de astronautas para entrenamiento.

Todos los registros son sintéticos (columna Origen_Dato = "SIMULADO"). Los parámetros
están calibrados con fuentes NASA citadas en PARAMETROS (ver parametros_fuentes.csv);
los que dicen "POR VERIFICAR" son supuestos fisiológicos razonables sin cita todavía.

Estructura por astronauta:
  Tierra (preflight, 30 días) -> Nave (lanzamiento, tránsito, acoplamiento)
  -> Estación (150-210 días, con EVAs) -> Nave (reentrada)

Uso:  python generar_datos.py --astronautas 24 --semilla 42 --salida ../datos_simulados
"""
import argparse
import os

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Parámetros y su fuente
# ---------------------------------------------------------------------------
PARAMETROS = [
    # (clave, valor, unidad, fuente)
    ('perdida_osea_mes_min', 1.0, '% DMO/mes',
     'NASA HRP - Risk of Spaceflight-Induced Bone Changes: https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/'),
    ('perdida_osea_mes_max', 1.5, '% DMO/mes', 'Misma fuente'),
    ('tscore_por_pct_dmo', 0.083, 'DE por 1% DMO',
     'POR VERIFICAR - aprox. 1 DE de DMO de cadera ~ 12% de la media'),
    ('ejercicio_h_dia', 1.5, 'h/día',
     'NASA HRP - Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness: https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/'),
    ('umbral_tscore_osteoporosis', -2.5, 'DE', 'dataset_indicadores_salud_espacial_nasa.csv (citar fuente original)'),
    ('vitd_rango_optimo', '35-90', 'ng/ml', 'dataset_indicadores_salud_espacial_nasa.csv (citar fuente original)'),
    ('presion_traje_psia', 4.3, 'psia', 'dataset_eva_vehiculo.csv del equipo / POR VERIFICAR con NASA EVA'),
    ('dosis_diaria_estacion', '0.25-0.45', 'mGy/día', 'POR VERIFICAR - Evidence Report de radiación'),
    ('cambio_fc_vuelo', 3.7, 'lpm', 'Diferencia de medias Tierra vs Estación en datasets del equipo / POR VERIFICAR con Cardio Evidence Book'),
    ('cambio_sistolica_vuelo', 4.5, 'mmHg', 'Igual que arriba'),
    ('cambio_sueno_vuelo', -1.1, 'h', 'Igual que arriba; ver Risk from Inadequate Sleep: https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/'),
    ('perdida_masa_ventricular_180d', 7.2, '%', 'Tendencia de dataset_estacion_espacial.csv del equipo / POR VERIFICAR'),
    ('pvt_ms_por_hora_deficit', 18, 'ms/h', 'POR VERIFICAR - literatura PVT y privación de sueño'),
]
P = {k: v for k, v, _, _ in PARAMETROS}

NIVELES_ACT = ['Reposo', 'Ligera', 'Moderada', 'Intensa']
ACT_FC = np.array([0, 10, 25, 45])            # lpm sobre reposo
ACT_TEMP = np.array([0, 0.05, 0.15, 0.3])     # °C
PROB_ACT = {
    'Tierra': [0.35, 0.35, 0.17, 0.13],
    'Nave': [0.55, 0.40, 0.05, 0.0],
    'Estacion': [0.35, 0.35, 0.15, 0.15],     # ~15% medido durante ejercicio (1.5 h/día)
}

# Efectos de cada evento a intensidad máxima. dur = rango de días.
EVENTOS_DIARIOS = {
    'Deshidratacion':      dict(dur=(2, 4),  critico=False, fc=12, sis=-10, temp=0.3, sueno=0.0, pvt=20, spo2=0.0),
    'Privacion_Sueno':     dict(dur=(3, 6),  critico=False, fc=4,  sis=3,   temp=0.0, sueno=-2.8, pvt=90, spo2=0.0),
    'Infeccion':           dict(dur=(4, 7),  critico=True,  fc=14, sis=2,   temp=1.4, sueno=-0.5, pvt=40, spo2=-1.0),
    'Estres_Aislamiento':  dict(dur=(7, 14), critico=False, fc=5,  sis=5,   temp=0.0, sueno=-1.2, pvt=35, spo2=0.0),
    'Evento_Radiacion_SPE': dict(dur=(2, 4), critico=True,  fc=3,  sis=0,   temp=0.0, sueno=-0.3, pvt=15, spo2=0.0),
}
EVENTOS_EVA = {
    'Hipoxia_Leve':        dict(critico=True,  fc=10, sis=4,  temp=0.0, spo2=-6.0, co2=0,    psia=0.0),
    'Fallo_CO2':           dict(critico=True,  fc=8,  sis=6,  temp=0.1, spo2=-1.0, co2=5000, psia=0.0),
    'Sobreesfuerzo':       dict(critico=False, fc=35, sis=12, temp=0.6, spo2=-1.0, co2=600,  psia=0.0),
    'Fuga_Presion_Traje':  dict(critico=True,  fc=10, sis=5,  temp=0.0, spo2=-3.0, co2=0,    psia=-0.5),
}


def nivel_riesgo(intensidad, critico):
    """0 = normal, 1 = precaución, 2 = crítico (solo en el pico de eventos críticos)."""
    if intensidad < 0.15:
        return 0
    return 2 if (critico and intensidad >= 0.7) else 1


def spo2_valida(x):
    # Refleja en 100 en vez de recortar, para no amontonar valores en 100%.
    return np.where(x > 100, 200 - x, x)


class Astronauta:
    def __init__(self, idx, rng):
        self.id = f'AST-{idx:02d}'
        self.rng = rng
        self.fc0 = rng.normal(62, 6)
        self.sis0 = rng.normal(114, 8)
        self.dia0 = 74 + 0.55 * (self.sis0 - 114) + rng.normal(0, 3.5)
        self.temp0 = rng.normal(36.6, 0.2)
        self.sueno0 = rng.normal(7.5, 0.5)
        self.pvt0 = rng.normal(280, 25)
        self.tscore0 = rng.normal(-0.2, 0.3)
        self.vitd0 = rng.normal(60, 5)
        self.mvi0 = rng.normal(190, 10)
        self.perdida_osea = rng.uniform(P['perdida_osea_mes_min'], P['perdida_osea_mes_max'])
        self.dosis_dia = rng.uniform(0.25, 0.45)
        self.dias_estacion = int(rng.integers(150, 211))

    def plan_eventos(self, dias_vuelo):
        """Eventos no superpuestos sobre los días de vuelo (desde el día 5)."""
        plan = {}
        n = self.rng.poisson(9)
        for _ in range(n):
            nombre = self.rng.choice(list(EVENTOS_DIARIOS))
            d0, d1 = EVENTOS_DIARIOS[nombre]['dur']
            dur = int(self.rng.integers(d0, d1 + 1))
            inicio = int(self.rng.integers(5, max(6, dias_vuelo - dur)))
            dias = range(inicio, inicio + dur)
            if any(d in plan for d in dias):
                continue
            for k, d in enumerate(dias):
                # Perfil en campana: aparece gradual, pico al medio, se resuelve.
                plan[d] = (nombre, float(np.sin(np.pi * (k + 0.5) / dur)))
        return plan


def registro_diario(a, dia, entorno, fase, adapt, dias_vuelo, evento, intensidad, radiacion):
    rng = a.rng
    probs = np.array(PROB_ACT[entorno], dtype=float)
    if evento in ('Infeccion', 'Estres_Aislamiento'):
        probs = probs * np.array([2.0, 1.0, 0.5, 0.2]) if intensidad > 0.3 else probs
    probs /= probs.sum()
    act = int(rng.choice(4, p=probs))
    ef = EVENTOS_DIARIOS.get(evento, {})
    e = lambda k: ef.get(k, 0.0) * intensidad

    fase_fc = {'Lanzamiento': 20, 'Maniobra_Orbital': 8, 'Reentrada': 25}.get(fase, 0)
    fase_sis = {'Lanzamiento': 10, 'Maniobra_Orbital': 4, 'Reentrada': -8}.get(fase, 0)

    sueno = np.clip(a.sueno0 + adapt * P['cambio_sueno_vuelo'] + e('sueno') + rng.normal(0, 0.6), 2, 10)
    deficit = max(0.0, a.sueno0 - sueno)
    fc = a.fc0 + adapt * P['cambio_fc_vuelo'] + ACT_FC[act] + 0.8 * deficit + fase_fc + e('fc') + rng.normal(0, 3)
    sis = a.sis0 + adapt * P['cambio_sistolica_vuelo'] + 0.4 * (fc - a.fc0) + fase_sis + e('sis') + rng.normal(0, 5)
    dia_ = a.dia0 + 0.5 * (sis - a.sis0) + rng.normal(0, 3)
    temp = a.temp0 + adapt * 0.2 + ACT_TEMP[act] + e('temp') + rng.normal(0, 0.12)
    spo2 = spo2_valida(98.5 - 0.3 * act + e('spo2') + rng.normal(0, 0.7))
    pvt = a.pvt0 + P['pvt_ms_por_hora_deficit'] * deficit + e('pvt') + rng.normal(0, 15)

    meses = dias_vuelo / 30.0
    tscore = a.tscore0 - a.perdida_osea * P['tscore_por_pct_dmo'] * meses + rng.normal(0, 0.03)
    vitd = a.vitd0 - 0.02 * dias_vuelo + rng.normal(0, 2)
    mvi = a.mvi0 * (1 - P['perdida_masa_ventricular_180d'] / 100 * dias_vuelo / 180) + rng.normal(0, 3)

    crit = ef.get('critico', False)
    return {
        'Astronauta_ID': a.id, 'Dia_Mision': dia, 'Entorno': entorno, 'Fase_Vuelo': fase,
        'Frecuencia_Cardiaca_LPM': round(fc), 'Presion_Sistolica_mmHg': round(sis),
        'Presion_Diastolica_mmHg': round(dia_), 'Saturacion_O2_Pct': round(float(spo2), 1),
        'Temperatura_Corporal_C': round(temp, 1), 'Horas_Sueno_Previas': round(sueno, 1),
        'Nivel_Actividad': NIVELES_ACT[act], 'Tiempo_Reaccion_PVT_ms': round(pvt),
        'Radiacion_Acumulada_mGy': round(radiacion, 1) if radiacion is not None else np.nan,
        'T_Score_Cadera': round(tscore, 2), 'Vitamina_D_ng_ml': round(vitd, 1),
        'Masa_Ventricular_Izquierda_g': round(mvi, 1),
        'Evento': evento, 'Intensidad_Evento': round(intensidad, 2),
        'Nivel_Riesgo': nivel_riesgo(intensidad, crit) if evento != 'Normal' else 0,
    }


def simular_eva(a, num_eva, dia, adapt, sueno_previo, radiacion):
    """EVA de 6.5 h, una lectura cada 15 min (27 lecturas)."""
    rng = a.rng
    evento = rng.choice(list(EVENTOS_EVA)) if rng.random() < 0.35 else 'Normal'
    inicio_ev = int(rng.integers(4, 20)) if evento != 'Normal' else 99
    filas = []
    for k in range(27):
        minuto = k * 15
        horas = minuto / 60
        act = int(rng.choice([1, 2, 3], p=[0.2, 0.5, 0.3]))
        # Rampa: el evento crece durante 1 h desde su inicio y se mantiene.
        intensidad = float(np.clip((k - inicio_ev + 1) / 4, 0, 1)) if k >= inicio_ev else 0.0
        ef = EVENTOS_EVA.get(evento, {})
        e = lambda c: ef.get(c, 0.0) * intensidad
        deficit = max(0.0, a.sueno0 - sueno_previo)
        fc = a.fc0 + adapt * P['cambio_fc_vuelo'] + 15 + ACT_FC[act] + 0.8 * horas + 0.8 * deficit + e('fc') + rng.normal(0, 4)
        sis = a.sis0 + adapt * P['cambio_sistolica_vuelo'] + 0.4 * (fc - a.fc0) + e('sis') + rng.normal(0, 5)
        dia_ = a.dia0 + 0.5 * (sis - a.sis0) + rng.normal(0, 3)
        temp = a.temp0 + 0.2 + ACT_TEMP[act] + min(0.12 * horas, 0.6) + e('temp') + rng.normal(0, 0.1)
        spo2 = spo2_valida(97.5 - 0.3 * act + e('spo2') + rng.normal(0, 0.6))
        co2 = 1500 + 300 * horas + e('co2') + rng.normal(0, 200)
        psia = P['presion_traje_psia'] + e('psia') + rng.normal(0, 0.03)
        filas.append({
            'Astronauta_ID': a.id, 'Dia_Mision': dia, 'EVA_Num': num_eva, 'Minuto_EVA': minuto,
            'Entorno': 'EVA', 'Frecuencia_Cardiaca_LPM': round(fc), 'Presion_Sistolica_mmHg': round(sis),
            'Presion_Diastolica_mmHg': round(dia_), 'Saturacion_O2_Pct': round(float(spo2), 1),
            'Temperatura_Corporal_C': round(temp, 1), 'Horas_Sueno_Previas': round(sueno_previo, 1),
            'Nivel_Actividad': NIVELES_ACT[act], 'Presion_Traje_psia': round(psia, 2),
            'CO2_Traje_ppm': round(max(co2, 300)), 'Radiacion_Acumulada_mGy': round(radiacion, 1),
            'Evento': evento if intensidad > 0 else 'Normal', 'Intensidad_Evento': round(intensidad, 2),
            'Nivel_Riesgo': nivel_riesgo(intensidad, ef.get('critico', False)) if intensidad > 0 else 0,
        })
    return filas


def simular_astronauta(a):
    diarios, evas = [], []
    for d in range(-30, 0):
        diarios.append(registro_diario(a, d, 'Tierra', 'Preflight', 0.0, 0, 'Normal', 0.0, None))

    fases_nave = ['Lanzamiento', 'Transito', 'Transito', 'Maniobra_Orbital']
    dias_vuelo = len(fases_nave) + a.dias_estacion + 1
    plan = a.plan_eventos(dias_vuelo - 1)
    eva_dias = set(a.rng.choice(np.arange(20, len(fases_nave) + a.dias_estacion), size=int(a.rng.integers(2, 6)), replace=False).tolist())

    radiacion = 0.0
    for t in range(dias_vuelo):
        adapt = min(1.0, t / 14)  # adaptación gradual en ~2 semanas
        evento, intensidad = plan.get(t, ('Normal', 0.0))
        dosis = a.dosis_dia * a.rng.gamma(20, 1 / 20)  # siempre positiva
        if evento == 'Evento_Radiacion_SPE' and plan.get(t - 1, ('Normal', 0))[0] != evento:
            dosis += a.rng.uniform(10, 40)  # pico de partículas solares el primer día
        radiacion += dosis
        if t < len(fases_nave):
            entorno, fase = 'Nave', fases_nave[t]
        elif t == dias_vuelo - 1:
            entorno, fase = 'Nave', 'Reentrada'
        else:
            entorno, fase = 'Estacion', 'Estacion'
        fila = registro_diario(a, t, entorno, fase, adapt, t, evento, intensidad, radiacion)
        diarios.append(fila)
        if t in eva_dias and evento == 'Normal':
            evas += simular_eva(a, len({e['EVA_Num'] for e in evas}) + 1, t, adapt, fila['Horas_Sueno_Previas'], radiacion)
    return diarios, evas


def agregar_artefactos(df, cols, rng, p_faltante=0.015, p_pico=0.005):
    """Fallas de sensor (casos borde). La etiqueta del evento NO cambia: el modelo debe ser robusto."""
    df = df.copy()
    df['Artefacto_Sensor'] = 'Ninguno'
    for c in cols:
        m = rng.random(len(df)) < p_faltante
        df.loc[m, c] = np.nan
        df.loc[m, 'Artefacto_Sensor'] = 'Dato_Faltante'
    m = (rng.random(len(df)) < p_pico) & (df['Artefacto_Sensor'] == 'Ninguno')
    df.loc[m, 'Frecuencia_Cardiaca_LPM'] = (df.loc[m, 'Frecuencia_Cardiaca_LPM'] * rng.uniform(1.6, 2.2, m.sum())).round()
    df.loc[m, 'Artefacto_Sensor'] = 'Pico_Movimiento'
    return df


def generar(n_astronautas=24, semilla=42):
    """Devuelve (diario, eva) como DataFrames; diario incluye Tierra, Nave y Estación."""
    rng = np.random.default_rng(semilla)
    diarios, evas = [], []
    for i in range(1, n_astronautas + 1):
        d, e = simular_astronauta(Astronauta(i, rng))
        diarios += d
        evas += e
    vitales = ['Frecuencia_Cardiaca_LPM', 'Presion_Sistolica_mmHg', 'Presion_Diastolica_mmHg',
               'Saturacion_O2_Pct', 'Temperatura_Corporal_C']
    diario = agregar_artefactos(pd.DataFrame(diarios), vitales, rng)
    eva = agregar_artefactos(pd.DataFrame(evas), vitales, rng)
    for df in (diario, eva):
        df['Origen_Dato'] = 'SIMULADO'
    return diario, eva


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--astronautas', type=int, default=24)
    ap.add_argument('--semilla', type=int, default=42)
    ap.add_argument('--salida', default=os.path.join(os.path.dirname(__file__), '..', 'datos_simulados'))
    args = ap.parse_args()
    os.makedirs(args.salida, exist_ok=True)
    diario, eva = generar(args.astronautas, args.semilla)
    vitales = ['Frecuencia_Cardiaca_LPM', 'Presion_Sistolica_mmHg', 'Presion_Diastolica_mmHg',
               'Saturacion_O2_Pct', 'Temperatura_Corporal_C']

    comunes = ['Astronauta_ID', 'Dia_Mision', 'Entorno', 'Fase_Vuelo'] + vitales + [
        'Horas_Sueno_Previas', 'Nivel_Actividad', 'Tiempo_Reaccion_PVT_ms']
    etiquetas = ['Evento', 'Intensidad_Evento', 'Nivel_Riesgo', 'Artefacto_Sensor', 'Origen_Dato']
    columnas = {
        'Tierra': comunes + ['T_Score_Cadera', 'Vitamina_D_ng_ml', 'Masa_Ventricular_Izquierda_g'],
        'Nave': comunes + ['Radiacion_Acumulada_mGy'],
        'Estacion': comunes + ['Radiacion_Acumulada_mGy', 'T_Score_Cadera', 'Vitamina_D_ng_ml', 'Masa_Ventricular_Izquierda_g'],
    }
    nombres = {'Tierra': 'sim_tierra_preflight.csv', 'Nave': 'sim_nave_espacial.csv', 'Estacion': 'sim_estacion_espacial.csv'}
    for ent, cols in columnas.items():
        diario.loc[diario.Entorno == ent, cols + etiquetas].to_csv(
            os.path.join(args.salida, nombres[ent]), index=False, encoding='utf-8-sig')
    eva.to_csv(os.path.join(args.salida, 'sim_eva.csv'), index=False, encoding='utf-8-sig')
    pd.DataFrame(PARAMETROS, columns=['Parametro', 'Valor', 'Unidad', 'Fuente']).to_csv(
        os.path.join(args.salida, 'parametros_fuentes.csv'), index=False, encoding='utf-8-sig')

    print(f'Diarios: {len(diario)} filas | EVA: {len(eva)} filas | astronautas: {args.astronautas}')
    print(diario.Evento.value_counts().to_string())
    print(eva.Evento.value_counts().to_string())


if __name__ == '__main__':
    main()
