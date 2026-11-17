# Sala de agentes · Nova Nexus

App (PWA) con **salas de agentes de IA** que hablan entre ellos, usan datos reales y te entregan el trabajo terminado.
Publicada en https://soobroon-beep.github.io/sala-de-agentes/ (se instala en el celular como app).

## Salas incluidas
- **Taller de bots** — Nova (analista de mercado) → Orion (estratega) → Vega (backtester) → Atlas (riesgo) → Sirius (juez).
  Vega corre el **mismo motor de Nova Bot Lab** con velas reales; Atlas y Sirius aplican tus límites (riesgo por operación, apalancamiento, caída máxima).
  Si alguno pide cambios, el trabajo regresa a Orion (máx. 3 rondas). Si todos aprueban, el bot llega como **propuesta a Nova Bot Lab** (Agregar / Descartar).
- **Mesa de análisis** — Lyra (técnica) → Draco (abogado del diablo) → Polaris (jefe) → informe con escenarios.
- **Salas propias** — botón «Crear sala»: nombre, agentes, instrucciones, herramienta (mercado / tus bots) y quién revisa a quién. Se guardan en tu cuenta.

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
