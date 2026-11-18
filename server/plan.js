/* SALA DE AGENTES · qué prueba el Taller en cada turno automático (puro: se prueba en tests/server.test.js).
   Rota estilos, temporalidades y canastas de monedas; evita repetir lo que se probó hace poco y le pasa al equipo
   lo que falló antes con ese estilo para que no tropiece igual. Con el mercado en rango favorece estilos de rango/rupturas. */
(function (root) {
  'use strict';
  const STYLES = ['tendencia', 'rango', 'ruptura', 'nova', 'ia'];
  const TFS = ['1h', '4h', '1h', '15m', '4h'];
  const BASKETS = [
    ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT'],
    ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'LINKUSDT', 'ADAUSDT'],
    ['ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'SUIUSDT', 'LINKUSDT', 'AVAXUSDT'],
    ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'LINKUSDT', 'DOGEUSDT', 'SOLUSDT']
  ];
  const DAY = 864e5;
  const comboKey = p => `${p.style}|${p.interval}|${p.basket}`;

  /** tried: [{at, style, interval, basket, outcome, why}], cfg: {riskPct, maxLev, maxDD, styles, intervals}, hint: 'rango'|'tendencia'|null */
  function planTaller(tried, cfg, hint, now, rnd) {
    tried = Array.isArray(tried) ? tried : []; cfg = cfg || {}; now = now || Date.now(); rnd = rnd || Math.random;
    const styles = (Array.isArray(cfg.styles) && cfg.styles.length ? cfg.styles : STYLES).filter(s => STYLES.includes(s));
    const tfs = Array.isArray(cfg.intervals) && cfg.intervals.length ? cfg.intervals : TFS;
    const recent = tried.filter(t => now - t.at < 2 * DAY), seen = new Set(recent.map(comboKey));
    const count = s => recent.filter(t => t.style === s).length;
    const weight = s => { let w = 1 / (1 + count(s)); if (hint === 'rango' && (s === 'rango' || s === 'ruptura')) w *= 2; if (hint === 'tendencia' && (s === 'tendencia' || s === 'nova')) w *= 2; return w; };
    const cands = [];
    for (const s of styles) for (const tf of [...new Set(tfs)]) for (let b = 0; b < BASKETS.length; b++) { const p = {style: s, interval: tf, basket: b}; if (!seen.has(comboKey(p))) cands.push(p); }
    const pool = cands.length ? cands : styles.map(s => ({style: s, interval: tfs[0], basket: 0}));
    const total = pool.reduce((a, p) => a + weight(p.style), 0); let r = rnd() * total, pick = pool[0];
    for (const p of pool) { r -= weight(p.style); if (r <= 0) { pick = p; break; } }
    const fails = tried.filter(t => t.style === pick.style && t.outcome !== 'propuesta' && t.why).slice(0, 3).map(t => `${t.interval}: ${t.why}`);
    const goal = ['Sesión automática de la Sala (sin el usuario presente): busca un bot nuevo que de verdad gane dinero fuera de muestra.',
      'Prioriza pocas reglas claras, al menos 30 operaciones en el histórico y que gane en validación y en prueba.',
      fails.length ? 'Intentos anteriores con este estilo fallaron así; no repitas lo mismo: ' + fails.join(' | ') : ''].filter(Boolean).join(' ');
    return {
      plan: pick,
      inputs: {style: pick.style, interval: pick.interval, coins: BASKETS[pick.basket % BASKETS.length].slice(), sides: 'ia', riskPct: +cfg.riskPct || 2, maxLev: +cfg.maxLev || 5, maxDD: +cfg.maxDD || 25, goal, botName: '', look: null}
    };
  }
  /* Régimen dominante a partir de lo que vio Nova en la sesión anterior (para orientar la siguiente) */
  function regimeHint(rows) {
    if (!Array.isArray(rows) || !rows.length) return null; let r = 0, t = 0;
    for (const x of rows) { const g = String(x.regime || ''); if (/^rango/.test(g)) r++; else if (/^tendencia/.test(g)) t++; }
    return r > rows.length / 2 ? 'rango' : t > rows.length / 2 ? 'tendencia' : null;
  }
  /* ¿Toca correr esta sala propia? (modo automático con su tarea fija y cada cuántas horas) */
  function dueRoom(room, last, now) { const a = room && room.auto; if (!a || !a.on || !String(a.goal || '').trim()) return false; const every = Math.max(2, +a.everyHours || 12) * 36e5; return !last || now - last >= every - 10 * 6e4; }

  const api = {planTaller, regimeHint, dueRoom, STYLES, BASKETS, comboKey};
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SalaPlan = api;
})(typeof self !== 'undefined' ? self : this);
