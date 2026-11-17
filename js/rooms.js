/* SALA DE AGENTES · definición de las salas.
   Una sala = un equipo de agentes de IA que se pasan el trabajo en orden (flow). Cada agente:
   · prompt   — su papel (se le añade el protocolo común de la sala)
   · tool     — herramienta REAL que usa antes de hablar: 'market' (velas y datos del mercado), 'backtest' (motor de Nova Bot Lab), 'bots' (tus bots actuales)
   · output   — 'text' (opina), 'spec' (escribe la estrategia del bot en JSON) o 'verdict' (aprueba o pide cambios)
   · back     — si pide cambios, a quién le regresa el trabajo
   · check    — regla fija en código que se aplica aunque la IA diga otra cosa ('backtest', 'risk', 'judge')
   Las salas propias que crees en la app usan este mismo formato y se guardan en tu cuenta. */
(function (root) {
  'use strict';

  const SPEC_GUIDE = `FORMATO DE LA ESTRATEGIA (motor de Nova Bot Lab de VORTEX). Escribe UN bloque \`\`\`json con este objeto:
{"name":"nombre corto","sides":"long|short|both","entry":{"long":[COND],"short":[COND]},"exit":{"long":[COND],"short":[COND]},
 "filters":{"minVolRatio":0,"minAtrPct":0,"maxAtrPct":0,"hoursUtc":null},
 "risk":{"riskPct":2,"maxLeverage":5,"atrLen":14,"sl":{"type":"atr|pct","v":2},"tp":{"type":"rr|atr|pct","v":2},"trail":null|{"type":"atr|pct","v":2},"maxBars":0,"minBars":3,"maxDailyLossPct":0,"maxDrawdownPct":0}}
COND = {"a":OPERANDO,"op":"gt|lt|gte|lte|crossUp|crossDown|is","b":OPERANDO}  (con "is" no hay "b"; sirve para señales 1/0).
En ENTRADA se deben cumplir TODAS las condiciones de la lista; en SALIDA basta UNA (además del stop loss / take profit).
OPERANDO = {"k":"close|open|high|low|volume|ema|sma|rsi|atr|adx|macd|macdSignal|macdHist|bbUp|bbMid|bbLo|volRatio|hh|ll|num|novaBuy|novaSell|novaScore|novaRange|novaOsc|novaFlux|novaAdx|novaBull", ...parámetros}
Parámetros: ema/sma/rsi/atr/adx/volRatio/hh/ll → "n" (1-500); macd* → "f","s","g"; bb* → "n","d"; num → "v".
novaBuy/novaSell = señal de compra/venta del indicador Nova Nexus v2.7 del usuario (1 = hay señal, úsalas con "op":"is"); novaScore 1-5 = fuerza de la señal; novaBull 1 = precio sobre la nube EMA; novaRange 1 = mercado en rango.
Ejemplo de condición: {"a":{"k":"rsi","n":14},"op":"lt","b":{"k":"num","v":30}}  ·  {"a":{"k":"ema","n":20},"op":"crossUp","b":{"k":"ema","n":50}}  ·  {"a":{"k":"novaBuy"},"op":"is"}
REGLAS: siempre stop loss ("sl") y take profit ("tp"); "minBars" ≥ 3 para no abrir y cerrar enseguida; nada de "hh"/"ll" comparados contra el mismo precio de la vela (nunca se cumple); 2 a 4 condiciones de entrada, claras.
NO pongas símbolo, monedas ni temporalidad: los fija la sala.`;

  const BOTS = {
    id: 'taller-bots', builtin: true, kind: 'bots', name: 'Taller de bots', color: '#7c5cff', icon: 'cohete',
    desc: 'Cinco agentes diseñan, prueban con datos reales y evalúan un bot de trading. Si pasa todos los filtros, llega como propuesta a Nova Bot Lab.',
    final: 'proposal', maxRounds: 3,
    inputs: [
      {id: 'style', label: '¿Qué tipo de bot quieres?', type: 'style', help: 'Elige un estilo. El equipo lo usa como punto de partida.', def: 'ia', options: [
        ['tendencia', 'Seguir la tendencia', 'Entra a favor del movimiento fuerte y lo aguanta mientras dure.', 'cohete'],
        ['rango', 'Rebotes en rango', 'Compra abajo y vende arriba cuando el precio va de lado.', 'planeta'],
        ['ruptura', 'Rupturas', 'Entra cuando el precio rompe máximos o mínimos recientes con volumen.', 'cometa'],
        ['nova', 'Señales Nova Nexus', 'Opera las señales de compra y venta de tu indicador Nova Nexus v2.7.', 'vortice'],
        ['ia', 'Que decida el equipo', 'Nova revisa el mercado y el equipo propone el estilo que mejor encaja.', 'estrella']]},
      {id: 'goal', label: 'Detalles extra (opcional)', type: 'textarea', help: 'Cualquier idea o regla tuya: «no operar en rango», «usar RSI», «pocas operaciones pero buenas»…', placeholder: 'Ej.: que no opere contra la EMA200 y que use stop amplio', def: ''},
      {id: 'coins', label: 'Monedas', type: 'coins', help: 'Hasta 8. El bot opera las mismas reglas en todas y reparte el capital.', quick: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'SUIUSDT'], def: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']},
      {id: 'interval', label: 'Temporalidad', type: 'pills', help: 'Cada cuánto «ve» una vela nueva. 1h y 4h dan menos ruido.', options: [['15m', '15 min'], ['1h', '1 hora'], ['4h', '4 horas'], ['1d', '1 día']], def: '1h'},
      {id: 'sides', label: 'Dirección', type: 'pills', help: 'Compras = gana si sube. Ventas (cortos) = gana si baja.', options: [['ia', 'Que decida'], ['long', 'Solo compras'], ['short', 'Solo ventas'], ['both', 'Ambas']], def: 'ia'},
      {id: 'riskPct', label: 'Riesgo por operación', type: 'range', unit: '%', help: 'Cuánto de tu capital pierdes como máximo si una operación toca el stop.', min: .25, max: 5, step: .25, def: 2},
      {id: 'maxLev', label: 'Apalancamiento máximo', type: 'range', unit: 'x', help: 'Tope de apalancamiento. Más alto = más riesgo.', min: 1, max: 10, step: 1, def: 5},
      {id: 'maxDD', label: 'Caída máxima aceptable', type: 'range', unit: '%', help: 'Si en el backtest la cuenta llega a caer más que esto desde su punto más alto, el equipo no lo aprueba.', min: 5, max: 60, step: 1, def: 25},
      {id: 'look', label: 'Apariencia del bot', type: 'look', help: 'Así se verá en Nova Bot Lab.', def: {icon: 'cohete', color: '#7c5cff'}},
      {id: 'botName', label: 'Nombre del bot (opcional)', type: 'text', placeholder: 'Si lo dejas vacío, el estratega le pone uno', def: ''}
    ],
    agents: [
      {id: 'nova', name: 'Nova', role: 'Analista de mercado', icon: 'satelite', color: '#22d3ee', tool: 'market', output: 'text',
        prompt: 'Eres Nova, analista de mercado cripto. Recibes datos REALES de las monedas elegidas (tendencia, volatilidad, ADX, RSI, rendimiento reciente) y el pedido del usuario. Explica en qué régimen está el mercado (tendencia, rango o volatilidad alta) moneda por moneda en una línea cada una, qué tipo de estrategia encaja mejor y cuál NO, y qué riesgo concreto ves. Termina con 2 o 3 recomendaciones claras para el Estratega.'},
      {id: 'orion', name: 'Orion', role: 'Estratega', icon: 'cohete', color: '#7c5cff', output: 'spec',
        prompt: 'Eres Orion, estratega de bots de trading. Con el análisis de Nova y el pedido del usuario diseñas UNA estrategia concreta y probable de funcionar (no sobreajustada: pocas condiciones, parámetros estándar). Si un compañero te pidió cambios, atiéndelos uno por uno y di qué cambiaste. Primero explica en 3-5 líneas la idea (cuándo entra, cuándo sale, stop y objetivo); después el bloque JSON.\n\n' + SPEC_GUIDE},
      {id: 'vega', name: 'Vega', role: 'Backtester', icon: 'robot', color: '#20bf9f', tool: 'backtest', output: 'verdict', back: 'orion', check: 'backtest',
        prompt: 'Eres Vega, backtester. Acabas de correr la estrategia de Orion en el motor REAL de Nova Bot Lab con velas reales (comisiones y deslizamiento incluidos; el histórico se divide en entrenamiento 60 %, validación 20 % y prueba 20 %). Interpreta los números con honestidad: rendimiento, operaciones, porcentaje de aciertos, factor de beneficio, caída máxima y sobre todo si se sostiene en validación y prueba. Compara contra comprar y mantener. APRUEBA solo si gana dinero, tiene al menos 30 operaciones y no se derrumba fuera de entrenamiento. Si pides cambios, di exactamente qué cambiar (parámetro, filtro, salida) y por qué, con base en los números.'},
      {id: 'atlas', name: 'Atlas', role: 'Gestor de riesgo', icon: 'astronauta', color: '#f0b90b', output: 'verdict', back: 'orion', check: 'risk',
        prompt: 'Eres Atlas, gestor de riesgo. Revisas la estrategia y su backtest contra los límites del usuario (riesgo por operación, apalancamiento máximo, caída máxima aceptable). Revisa: distancia del stop, caída máxima, rachas perdedoras, exposición, si cierra demasiado rápido, y si el riesgo es coherente con el beneficio. APRUEBA si respeta los límites y el riesgo está controlado; si no, pide cambios concretos.'},
      {id: 'sirius', name: 'Sirius', role: 'Juez', icon: 'estrella', color: '#f06b79', tool: 'bots', output: 'verdict', back: 'orion', check: 'judge',
        prompt: 'Eres Sirius, juez final. Recibes todo el trabajo del equipo y la lista de bots que el usuario YA tiene en Nova Bot Lab con sus resultados. Decide si este bot merece entrar a Nova Bot Lab a probarse en vivo (simulado): debe aportar algo (mejor resultado, otra temporalidad o estilo, menos riesgo) y no ser una copia de uno existente. Si lo apruebas, resume para el usuario en 3-4 líneas qué hace el bot, por qué lo propones y qué vigilar. Si no, pide cambios a Orion.'}
    ],
    flow: ['nova', 'orion', 'vega', 'atlas', 'sirius']
  };

  const MESA = {
    id: 'mesa-mercado', builtin: true, kind: 'general', name: 'Mesa de análisis', color: '#548fff', icon: 'planeta',
    desc: 'Tres agentes analizan el mercado con datos reales, se contradicen y te entregan un plan con escenarios.',
    final: 'report', maxRounds: 2,
    inputs: [
      {id: 'goal', label: 'Pregunta para la mesa', type: 'textarea', placeholder: 'Ej.: ¿conviene buscar largos en SOL esta semana?', def: ''},
      {id: 'coins', label: 'Monedas', type: 'coins', def: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']},
      {id: 'interval', label: 'Temporalidad', type: 'select', options: [['15m', '15 min'], ['1h', '1 hora'], ['4h', '4 horas'], ['1d', '1 día']], def: '4h'}
    ],
    agents: [
      {id: 'lyra', name: 'Lyra', role: 'Analista técnica', icon: 'luna', color: '#22d3ee', tool: 'market', output: 'text',
        prompt: 'Eres Lyra, analista técnica. Con los datos REALES del mercado responde la pregunta del usuario: estructura, tendencia, volatilidad, niveles relevantes (usa los máximos y mínimos recientes de los datos) y tu sesgo con probabilidad aproximada. Sé concreta.'},
      {id: 'draco', name: 'Draco', role: 'Abogado del diablo', icon: 'alien', color: '#f06b79', output: 'text',
        prompt: 'Eres Draco, el abogado del diablo. Tu trabajo es atacar el análisis de Lyra: qué está ignorando, qué escenario contrario es plausible, qué invalidaría su sesgo y qué dato del propio análisis lo contradice. No estés en contra por estarlo: si algo está bien, dilo en una línea.'},
      {id: 'polaris', name: 'Polaris', role: 'Jefe de mesa', icon: 'vortice', color: '#a3e635', output: 'verdict', back: 'lyra',
        prompt: 'Eres Polaris, jefe de la mesa. Si Lyra y Draco dejaron un punto clave sin resolver, pide CAMBIOS a Lyra diciendo exactamente qué aclarar. Si ya está completo, APRUEBA y escribe el informe final para el usuario: conclusión, escenario principal y alternativo, niveles de invalidación y qué hacer (o no hacer). Formato breve con viñetas.'}
    ],
    flow: ['lyra', 'draco', 'polaris']
  };

  const BUILTIN = [BOTS, MESA];
  const ICONS = ['robot', 'astronauta', 'alien', 'cohete', 'planeta', 'estrella', 'ovni', 'luna', 'cometa', 'pulpo', 'satelite', 'vortice'];
  const COLORS = ['#7c5cff', '#548fff', '#22d3ee', '#20bf9f', '#f0b90b', '#fb923c', '#f06b79', '#f472b6', '#a3e635', '#94a3b8'];
  const TOOLS = {'': 'Ninguna', market: 'Datos del mercado', bots: 'Mis bots de Nova Bot Lab'};

  /* Sala propia → misma forma que las incluidas (sin JSON de bots: entrega un informe) */
  function normalizeCustom(r) {
    const agents = (r.agents || []).filter(a => a && a.name).slice(0, 8).map((a, i) => ({
      id: a.id || ('a' + i), name: String(a.name).slice(0, 24), role: String(a.role || 'Agente').slice(0, 40), icon: ICONS.includes(a.icon) ? a.icon : ICONS[i % ICONS.length],
      color: COLORS.includes(a.color) ? a.color : COLORS[i % COLORS.length], prompt: String(a.prompt || '').slice(0, 3000), tool: TOOLS[a.tool] ? a.tool || '' : '',
      output: a.back ? 'verdict' : 'text', back: a.back || ''}));
    const ids = agents.map(a => a.id); agents.forEach(a => { if (a.back && !ids.includes(a.back)) { a.back = ''; a.output = 'text'; } });
    const last = agents[agents.length - 1]; if (last && last.output !== 'verdict') { last.output = 'verdict'; last.back = last.back || (agents.length > 1 ? agents[0].id : ''); if (!last.back) last.output = 'text'; }
    return {id: r.id, builtin: false, kind: 'general', name: String(r.name || 'Mi sala').slice(0, 40), color: COLORS.includes(r.color) ? r.color : COLORS[1], icon: ICONS.includes(r.icon) ? r.icon : 'ovni',
      desc: String(r.desc || '').slice(0, 200), final: 'report', maxRounds: Math.max(1, Math.min(4, +r.maxRounds || 2)),
      inputs: [{id: 'goal', label: r.ask || 'Tema o pregunta para la sala', type: 'textarea', placeholder: '', def: ''}].concat(agents.some(a => a.tool === 'market') ? [
        {id: 'coins', label: 'Monedas', type: 'coins', def: ['BTCUSDT', 'ETHUSDT']}, {id: 'interval', label: 'Temporalidad', type: 'pills', options: [['15m', '15 min'], ['1h', '1 hora'], ['4h', '4 horas'], ['1d', '1 día']], def: '4h'}] : []),
      agents, flow: ids, createdAt: r.createdAt || Date.now(), updatedAt: r.updatedAt || Date.now()};
  }

  /* ───────── Asistente: plantillas de sala y papeles listos para agentes ───────── */
  const ROLES = [
    {id: 'investigador', name: 'Investigador', icon: 'satelite', color: '#22d3ee', desc: 'Reúne información y datos antes que nadie.', prompt: 'Eres el investigador del equipo. Reúne los hechos y datos importantes sobre el tema del usuario, separa lo seguro de lo dudoso y entrega una lista clara de hallazgos para tus compañeros.'},
    {id: 'analista', name: 'Analista', icon: 'luna', color: '#548fff', desc: 'Interpreta la información y saca conclusiones.', prompt: 'Eres el analista. Con lo que reunió el equipo, interpreta qué significa, encuentra patrones y saca 3 conclusiones concretas con su porqué.'},
    {id: 'estratega', name: 'Estratega', icon: 'cohete', color: '#7c5cff', desc: 'Convierte el análisis en un plan de acción.', prompt: 'Eres el estratega. Convierte lo que dijo el equipo en un plan paso a paso, realista y ordenado por prioridad, con qué hacer primero y qué evitar.'},
    {id: 'creativo', name: 'Creativo', icon: 'pulpo', color: '#f472b6', desc: 'Propone ideas originales y llamativas.', prompt: 'Eres el creativo del equipo. Propón ideas originales, llamativas y fáciles de ejecutar sobre el tema del usuario. Da al menos 3 opciones distintas y explica brevemente cada una.'},
    {id: 'redactor', name: 'Redactor', icon: 'ovni', color: '#fb923c', desc: 'Escribe textos listos para usar.', prompt: 'Eres el redactor. Escribe el texto final listo para usar (publicación, guion, mensaje o documento) con el tono que pidió el usuario, claro y sin relleno.'},
    {id: 'critico', name: 'Abogado del diablo', icon: 'alien', color: '#f06b79', desc: 'Busca fallas y riesgos en lo que dicen los demás.', prompt: 'Eres el abogado del diablo. Ataca el trabajo de tus compañeros: qué falla, qué riesgo no vieron, qué supuesto es débil. Sé concreto y propón cómo arreglar cada punto.'},
    {id: 'riesgo', name: 'Gestor de riesgo', icon: 'astronauta', color: '#f0b90b', desc: 'Revisa qué puede salir mal y cuánto cuesta.', prompt: 'Eres el gestor de riesgo. Revisa qué puede salir mal, qué tan probable es, cuánto costaría y cómo protegerse. Termina con los 3 riesgos principales y su protección.'},
    {id: 'programador', name: 'Programador', icon: 'robot', color: '#20bf9f', desc: 'Piensa en cómo construirlo técnicamente.', prompt: 'Eres el programador del equipo. Explica cómo construir técnicamente lo que se propone: piezas, tecnologías, pasos y posibles problemas, sin escribir código largo.'},
    {id: 'juez', name: 'Juez / Jefe', icon: 'estrella', color: '#a3e635', desc: 'Revisa todo, aprueba o regresa el trabajo y entrega el resultado.', prompt: 'Eres el jefe de la sala. Revisa todo lo que hizo el equipo. Si falta algo importante, pide cambios diciendo exactamente qué. Si está completo, aprueba y entrega al usuario el resultado final, claro y ordenado.'}
  ];
  const role = id => Object.assign({}, ROLES.find(r => r.id === id));
  const ag = (id, rid, name, extra) => Object.assign({id, name, role: role(rid).name, icon: role(rid).icon, color: role(rid).color, prompt: role(rid).prompt, tool: ''}, extra || {});
  const TEMPLATES = [
    {id: 'contenido', name: 'Contenido de tatuajes', icon: 'pulpo', color: '#f472b6', desc: 'Ideas, guion y textos para Instagram y TikTok de tus tatuajes.', ask: '¿Qué tatuaje o tema vamos a publicar?',
      agents: [ag('t1', 'investigador', 'Lumen', {role: 'Tendencias', prompt: 'Eres Lumen, experto en tendencias de Instagram y TikTok para tatuadores. Di qué formatos, audios, ganchos y estilos de video funcionan ahora para el tema del usuario y por qué.'}), ag('t2', 'creativo', 'Iris', {role: 'Guionista', prompt: 'Eres Iris, guionista de videos cortos. Con lo que dijo Lumen, escribe 2 guiones de 15-30 s (gancho en los primeros 2 s, tomas, texto en pantalla) para mostrar el tatuaje.'}), ag('t3', 'redactor', 'Echo', {role: 'Copy y hashtags', prompt: 'Eres Echo. Escribe el caption (corto, con llamada a la acción para agendar cita) y 15 hashtags mezclando grandes y de nicho para cada guion de Iris.'}), ag('t4', 'juez', 'Halo', {role: 'Editor jefe', back: 't2'})]},
    {id: 'proyecto', name: 'Revisión de proyecto', icon: 'robot', color: '#20bf9f', desc: 'Revisan una idea o app tuya y te dan prioridades claras.', ask: '¿Qué proyecto o idea revisamos y qué te preocupa?',
      agents: [ag('p1', 'analista', 'Atlas', {role: 'Analista de producto'}), ag('p2', 'programador', 'Bit'), ag('p3', 'critico', 'Draco'), ag('p4', 'juez', 'Polaris', {back: 'p1'})]},
    {id: 'investigacion', name: 'Investigación', icon: 'satelite', color: '#22d3ee', desc: 'Investigan un tema, lo cuestionan y te entregan un resumen.', ask: '¿Qué tema quieres investigar?',
      agents: [ag('i1', 'investigador', 'Nova'), ag('i2', 'critico', 'Vex'), ag('i3', 'redactor', 'Quill', {role: 'Redactor del resumen'}), ag('i4', 'juez', 'Sol', {back: 'i1'})]},
    {id: 'trading', name: 'Mesa de trading', icon: 'cometa', color: '#548fff', desc: 'Analizan monedas con datos reales y te dan un plan.', ask: '¿Qué quieres que analice la mesa?',
      agents: [ag('m1', 'analista', 'Lyra', {role: 'Analista técnica', tool: 'market', prompt: 'Eres Lyra, analista técnica. Con los datos reales del mercado di tendencia, volatilidad, niveles importantes y tu sesgo para cada moneda.'}), ag('m2', 'riesgo', 'Atlas'), ag('m3', 'juez', 'Polaris', {role: 'Jefe de mesa', back: 'm1'})]},
    {id: 'blanco', name: 'En blanco', icon: 'ovni', color: '#94a3b8', desc: 'Empiezas desde cero y armas tu propio equipo.', ask: '', agents: [ag('b1', 'investigador', 'Agente 1'), ag('b2', 'juez', 'Agente 2', {back: 'b1'})]}
  ];
  const NAMES = ['Nova', 'Orion', 'Vega', 'Atlas', 'Sirius', 'Lyra', 'Draco', 'Polaris', 'Altair', 'Rigel', 'Deneb', 'Electra', 'Kepler', 'Halley', 'Cassini', 'Juno', 'Titan', 'Luna', 'Cosmo', 'Astra', 'Quasar', 'Pulsar', 'Zenit', 'Aurora'];

  const api = {ROLES, TEMPLATES, NAMES, BUILTIN, ICONS, COLORS, TOOLS, SPEC_GUIDE, normalizeCustom};
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SalaRooms = api;
})(typeof self !== 'undefined' ? self : this);
