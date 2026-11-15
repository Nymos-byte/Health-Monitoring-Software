# Vital-X — Dossier del proyecto

## 1. Desafío
Construir una herramienta visual para ayudar a astronautas a evaluar y vigilar su salud durante misiones espaciales, proporcionar orientación preventiva y facilitar la atención de médicos de vuelo. El proyecto está vinculado al desafío de NASA Space Apps Challenge 2026:
https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources

Se contempla uso en estación espacial, nave, vehículo explorador o base planetaria/lunar. La aplicación debe tener instrucciones comprensibles, gráficas históricas, colores de estado, animación/interactividad y eventualmente gamificación.

## 2. Cambio fundamental acordado: dos interfaces
**Vital-X Space**, para el astronauta: lectura inmediata, sencilla y contextual; signos vitales, alertas locales, rutinas, ayuda y registro de síntomas. Debe funcionar ante ausencia de comunicación.

**Vital-X Ground**, para personal médico en Tierra: visión de toda la tripulación, expediente completo, investigación y trazabilidad de anomalías, tendencias, filtros, notas médicas y recomendaciones autorizadas. El diseño debe ser más intuitivo y agradable que un tablero sobrecargado.

## 3. Flujo de anomalías
1. Registrar una medición con fecha, unidad y contexto.
2. Evaluar con reglas documentadas y parámetros personalizados.
3. Mostrar alerta local al astronauta, sin diagnosticar automáticamente.
4. Guardar evento e historial localmente.
5. Sincronizar con Tierra cuando exista conexión; mostrar retraso y antigüedad de datos.
6. Permitir que el personal médico revise, añada comentarios y envíe instrucciones autorizadas.
7. Registrar recepción, seguimiento y cierre del caso con auditoría.

Ejemplo ficticio discutido: frecuencia cardiaca anómala en reposo, con revisión desde Tierra y re-medición. Los números de demostración **no son umbrales clínicos validados**.

## 4. Indicadores candidatos
- Frecuencia cardíaca (lpm).
- SpO₂ (%).
- Presión arterial (mmHg).
- Temperatura (°C).
- Glucosa (mg/dL), cuando corresponda.
- Sueño (horas/calidad).
- Actividad física/entrenamiento.
- Estado emocional y bienestar.
- Masa corporal (kg).
- Dosis de radiación acumulada mediante dosimetría (mSv).
- Exploraciones adicionales como seguimiento ocular y musculoesquelético, según equipos y protocolos.

Cada valor debe indicar origen, hora, unidad, validez y referencia individual. Un resultado aislado no equivale a un diagnóstico.

## 5. Riesgos que sustentan la solución
Los cinco peligros del vuelo espacial planteados por NASA: radiación, aislamiento/confinamiento, distancia de la Tierra, alteraciones gravitacionales y ambiente cerrado/hostil. También se mencionaron los cambios cardiovasculares, musculoesqueléticos, inmunitarios, de sueño y neurooculares.

## 6. Módulos propuestos
**Space:** dashboard de salud, mediciones, alertas, rutinas, recomendaciones, registro de síntomas, visualización corporal opcional.

**Ground:** panel de misión/tripulación, lista priorizada de anomalías, detalle de evento, expediente histórico, comparador de tendencias, filtros por fecha, severidad y astronauta, registro médico y comunicación.

**Comunes:** gestión de perfiles, almacenamiento y sincronización segura, control por roles, reportes, auditoría y modo de simulación.

## 7. Prototipo mínimo para demostrar
- Dos portales diferentes para Space y Ground.
- 3 astronautas ficticios y registros simulados etiquetados.
- Datos variables y gráficas.
- Reglas de alerta **solo de demostración**.
- Creación y envío simulado de anomalías.
- Retardo y desconexión simulados.
- Revisión de eventos y respuestas médicas.

## 8. Tecnologías sugeridas (no implementadas)
React + TypeScript para frontend; Tailwind CSS y librería de gráficos; FastAPI / Python para backend; PostgreSQL para datos; almacenamiento local/PWA para desconexión; API REST y eventual WebSocket. El modelo anatómico podría hacerse primero 2D y más adelante 3D.

## 9. Diseño y marca
Nombre elegido: **Vital-X**. Subtítulo: **SPACE HEALTH MONITORING SYSTEM**.
Estética elegida: tecnológica, profesional, minimalista, azul y blanco, con referencias al pulso y la órbita.
Se eligió una versión más minimalista del logotipo como la definitiva. Ver `recursos_visuales/logo_final_minimalista.png` y `.svg`.

La imagen de referencia del usuario mostraba un conjunto de pantallas con temática azul oscuro, tarjetas de signos vitales, alertas, métricas, reportes y perfiles. Se pidió mejorar la usabilidad y claridad para el equipo de Tierra.

## 10. Aspectos clínicos/operativos pendientes
- Identificar límites y protocolos autorizados para cada medición; no inventar umbrales clínicos.
- Manejar privacidad, cifrado y acceso por rol.
- Evitar presentar un modelo automático como diagnóstico médico o tratamiento prescrito.
- Modelar desfases reales de comunicación en misiones lejanas.
- Verificar procedencia y permisos de datos científicos para la demostración.
- Diseñar criterios de revisión de alertas, historial de cambios y confirmación de recepción.

## 11. Siguiente etapa propuesta
Diseñar primero el mapa de pantallas, los componentes de cada interfaz y la estructura compartida de datos (astronautas, misiones, mediciones, anomalías, notas, protocolos y sincronización). Posteriormente implementar prototipo integrado con datos ficticios.
