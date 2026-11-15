# Vital-X — Pitch (3 minutos)

Unas 420 palabras habladas (≈140 palabras por minuto). Los tiempos son orientativos; la demo va en
paralelo a lo que se dice, por eso cada bloque indica qué mostrar en pantalla.

---

## 0:00 – 0:20 · El problema

> Un astronauta en la Estación Espacial pierde entre un 1 % y un 1,5 % de masa ósea al mes, duerme
> menos, recibe radiación todos los días… y la mayor parte de sus datos de salud se revisan desde
> Tierra, con retrasos y cortes de comunicación. Cuando vayamos a la Luna o a Marte, Tierra no
> siempre podrá responder a tiempo.

**En pantalla:** logo de Vital-X.

## 0:20 – 0:40 · La idea

> Vital-X es un sistema de monitoreo de salud con tres pantallas que comparten los mismos datos:
> un centro de control para el equipo médico en Tierra, una tableta para la tripulación y una
> pantalla de muñeca para verlo todo de un vistazo, sin estorbar el trabajo.

**En pantalla:** cambiar entre *Ground Control*, *Crew Display* y *Wrist* desde el encabezado.

## 0:40 – 1:20 · Inteligencia de contexto (Tierra)

> No todas las lecturas significan lo mismo. Un pulso de 150 es normal durante una caminata
> espacial y una alarma en reposo. Vital-X ajusta los límites según el entorno, la actividad y la
> edad de cada astronauta, y detecta combinaciones peligrosas: presión del traje baja, CO₂ alto y
> oxígeno bajo a la vez, aunque ninguno sea crítico por separado.
> Cada tripulación vuela una misión con fases —pre-vuelo, lanzamiento, estación o base lunar,
> regreso— y cada actividad queda registrada para el seguimiento médico.

**En pantalla:** tarjeta de Haruka en EVA (*intense activity*), el modal *Possible suit failure*
→ *Acknowledge* lleva directo a sus constantes. Luego pestañas *Assignments* (fases de misión) y
*Records*.

## 1:20 – 1:50 · Diseñado para el espacio (tripulación)

> La tripulación no necesita un tablero lleno de gráficas. En la tableta ve sus cuatro constantes
> clave, su actividad y a sus compañeros, con botones grandes para usar con guantes. En la muñeca,
> una sola idea por pantalla. Si hay una emergencia, la pantalla se pone roja, vibra, y al confirmar
> le dice qué hacer para estabilizarse.

**En pantalla:** tableta (Vitals → Activity → Crew) y reloj: *Simulate emergency* → *OK* →
instrucción *Do this now*.

## 1:50 – 2:20 · Funciona sin conexión

> En el espacio la señal se pierde. Las constantes se envían solas cuando hay enlace; si no, se
> guardan en una caja negra a bordo y se sincronizan en cuanto vuelve la señal, sin huecos en el
> historial. La cámara corporal se adapta al ancho de banda: vídeo, fotos o nada.
> Y los colores cambian según la luz: cabina, sol directo durante una EVA, o modo noche sin luz
> azul para no romper el sueño.

**En pantalla:** *Simulate link loss* → "24 samples stored onboard" → al volver, "Synced".
Pestaña *Body Cam*. En la tableta, *Settings → Colours*.

## 2:20 – 2:45 · Ciencia y tecnología

> Los datos simulados están calibrados con los conjuntos de datos del Human Research Program de
> NASA en cinco entornos —pre-vuelo, nave, estación, base planetaria y regreso a Tierra— y con
> sus contramedidas. Es una aplicación web instalable, con almacenamiento local y nube en Azure.

**En pantalla:** pestaña *Environment* con los indicadores NASA.

## 2:45 – 3:00 · Cierre

> Vital-X convierte datos de salud en decisiones claras, para el astronauta y para Tierra, incluso
> cuando no pueden hablar entre sí. Porque en una misión larga, cuidar la salud también es parte de
> la misión.

**En pantalla:** volver a *Ground Control* con toda la tripulación en verde.

---

## Preparación de la demo

- Abrir tres pestañas: `#/ground`, `#/crew` y `#/wrist`. Con Auto, el tema de la tableta y la
  muñeca cambia solo según la actividad.
- La emergencia combinada de Haruka (*Possible suit failure*) salta sola a los pocos segundos de
  abrir *Ground Control*: no confirmarla antes de llegar al bloque 0:40.
- Para la emergencia del reloj, usar *Emergency* en los controles debajo del reloj y esperar
  unos 6–9 s: solo salta si el valor sigue crítico en 3 lecturas seguidas.
- La pérdida de señal también ocurre sola cada pocos minutos; *Simulate link loss* la fuerza.

## Lo que hay que decir con cuidado si preguntan

- Todos los datos son **simulados** (calibrados con datasets de NASA HRP), no mediciones reales.
- Los límites ajustados por actividad y las instrucciones al astronauta son **referencias de
  fisiología del ejercicio**, no protocolos clínicos validados por NASA.
- La nube (Azure Cosmos DB) funciona a través de una función de servidor; requiere configurar sus
  credenciales en Vercel.
