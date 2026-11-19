# Sala de agentes · Nova Nexus

App (PWA) con **salas de agentes de IA** que hablan entre ellos, usan datos reales y te entregan el trabajo terminado.
Publicada en https://soobroon-beep.github.io/sala-de-agentes/ (se instala en el celular como app).

## Salas incluidas
- **Taller de bots** — Nova (analista de mercado) → Orion (estratega) → Vega (backtester) → Atlas (riesgo) → Sirius (juez).
  Vega corre el **mismo motor de Nova Bot Lab** con velas reales; Atlas y Sirius aplican tus límites (riesgo por operación, apalancamiento, caída máxima).
  Si alguno pide cambios, el trabajo regresa a Orion (máx. 3 rondas). Si todos aprueban, el bot llega como **propuesta a Nova Bot Lab** (Agregar / Descartar).
- **Mesa de análisis** — Lyra (técnica) → Draco (abogado del diablo) → Polaris (jefe) → informe con escenarios.
- **Salas propias** — botón «Crear sala»: nombre, agentes, instrucciones, herramienta (mercado / tus bots) y quién revisa a quién. Se guardan en tu cuenta.

## Funciona sola, 24/7 (aunque no abras la app)
Corre en GitHub Actions desde el repo de VORTEX (ahí están los secretos: cuenta de servicio de Firebase y Groq), usando el código de esta carpeta `server/`:
- **Taller automático** (`server/taller.js`, cada 3 h, flujo «Sala · Taller automático» de VORTEX): el mismo equipo del Taller diseña y prueba bots rotando estilos, temporalidades y monedas, aprende de lo que falló antes y, si un bot pasa todos los filtros, llega a Nova Bot Lab como propuesta + aviso al celular. Si ya hay 3 propuestas automáticas sin revisar, espera. Se pausa o se cambian las sesiones por turno desde la app (inicio).
- **Salas propias con «Funciona sola»**: en el asistente (paso «Listo») se enciende, con una tarea fija y cada cuántas horas.
- **Revisión de apps** (`server/revision.js`, cada 2 h, flujo «Sala · Revisión de apps» de VORTEX): un inspector por app (VORTEX, Nova HUB, Neural Brain, INKBOT PRO, Sala, Moldes Gaby's) abre la app con Chromium en PC y celular, aprieta los botones seguros, junta errores y revisa sus tareas de GitHub; Centinela vigila Motor, velas, servidores, bots (¿se apagó o se atoró alguno?), Claudio/Felipe y el uso; Quasar repite cada falla para descartar falsas alarmas; Andrómeda escribe el informe. Pestaña «Revisión» de la app: dashboard con semáforo por app, «Qué arreglar» agrupado por app y, para cada falla y cada app, un **prompt listo** para pedirle a tu IA que la arregle.
- Documentos: `sala_auto` (sesiones automáticas y estado) y `sala_revision` (estado por app, fallas nuevas/siguen/resueltas, informes).

## Cómo funciona
- `js/engine.js` — orquestador: cada agente recibe la conversación del equipo y le habla al siguiente; los jueces terminan con `VEREDICTO: APROBADO | CAMBIOS`.
  Reglas fijas en código (pierde dinero, < 30 operaciones, se pasa del riesgo o de la caída máxima) regresan el trabajo aunque la IA apruebe.
- `js/tools.js` — herramientas reales: velas (Binance → velas de VORTEX en Firestore), backtest con `botlab-engine.js`, lectura de tus bots, propuesta.
- `js/ai.js` — carga EN VIVO `llm.js`, `botlab-engine.js` y `nova-nexus.js` de vortex-nexus.pages.dev (respaldo en `vortex/`).
  IA: «Tu IA» de tu cuenta → IA gratis de tu servidor VORTEX (Groq / Cloudflare) → servicio gratis.
- `js/scene.js` — animación: constelación de agentes, paquetes de luz entre ellos, órbita al pensar o usar herramientas.
- `js/rooms.js` — definición de salas (agregar una sala incluida = agregar un objeto aquí).

## Cuenta
Misma cuenta de Google que VORTEX (Firebase `criptochart-bd774`). Documentos `users/<uid>/data/sala` (salas e historial) y `sala_props` (propuestas).
Sin sesión funciona con la IA gratis y guarda en el dispositivo; enviar a Nova Bot Lab pide iniciar sesión.

## Pruebas
`node --test tests/`
