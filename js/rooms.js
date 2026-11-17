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
      {id: 'goal', label: '¿Qué bot quieres?', type: 'textarea', placeholder: 'Ej.: un bot de tendencia para 1h que use las señales de Nova Nexus y no opere en rango', def: ''},
      {id: 'coins', label: 'Monedas', type: 'coins', def: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']},
      {id: 'interval', label: 'Temporalidad', type: 'select', options: [['15m', '15 min'], ['1h', '1 hora'], ['4h', '4 horas'], ['1d', '1 día']], def: '1h'},
      {id: 'sides', label: 'Dirección', type: 'select', options: [['ia', 'Que decida el equipo'], ['long', 'Solo compras'], ['short', 'Solo ventas'], ['both', 'Compras y ventas']], def: 'ia'},
      {id: 'riskPct', label: 'Riesgo por operación (%)', type: 'number', min: .25, max: 5, step: .25, def: 2},
      {id: 'maxLev', label: 'Apalancamiento máximo', type: 'number', min: 1, max: 10, step: 1, def: 5},
      {id: 'maxDD', label: 'Caída máxima aceptable (%)', type: 'number', min: 5, max: 60, step: 1, def: 25}
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
        {id: 'coins', label: 'Monedas', type: 'coins', def: ['BTCUSDT', 'ETHUSDT']}, {id: 'interval', label: 'Temporalidad', type: 'select', options: [['15m', '15 min'], ['1h', '1 hora'], ['4h', '4 horas'], ['1d', '1 día']], def: '4h'}] : []),
      agents, flow: ids, createdAt: r.createdAt || Date.now(), updatedAt: r.updatedAt || Date.now()};
  }

  const api = {BUILTIN, ICONS, COLORS, TOOLS, SPEC_GUIDE, normalizeCustom};
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SalaRooms = api;
})(typeof self !== 'undefined' ? self : this);
