/* SALA DE AGENTES · herramientas REALES de los agentes (nada de números inventados por la IA).
   · market   — velas reales (Binance; si no responde, las velas propias de VORTEX en Firestore) y un resumen técnico por moneda
   · backtest — el MISMO motor de Nova Bot Lab (botlab-engine.js de VORTEX) con comisiones, deslizamiento y validación fuera de muestra
   · bots     — tus bots actuales de Nova Bot Lab con sus resultados (para que el Juez no proponga copias ni algo peor)
   También: validar la estrategia del Estratega, reglas fijas de riesgo y enviar la propuesta a Nova Bot Lab. */
(function () {
  'use strict';
  const B = () => window.CCTBotLab, C = () => window.SalaCloud;
  const IV = {'15m': 9e5, '1h': 36e5, '4h': 144e5, '1d': 864e5}, WANT = {'15m': 3000, '1h': 3000, '4h': 2000, '1d': 1000};
  const cache = new Map(), num = (x, d = 2) => x == null || !Number.isFinite(+x) ? '—' : (+x).toFixed(d), base = s => String(s).replace(/USDT$/, '');

  /* ───────── Velas ───────── */
  async function binance(sym, tf, total) {
    let end = Date.now(), out = [];
    while (out.length < total) {
      const n = Math.min(1000, total - out.length), r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${tf}&limit=${n}&endTime=${end}`);
      if (!r.ok) throw new Error('Binance ' + r.status); const a = await r.json(); if (!Array.isArray(a) || !a.length) break;
      out = a.map(k => ({t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5]})).concat(out); end = +a[0][0] - 1; if (a.length < n) break;
    }
    return out;
  }
  async function vortexStore(sym, tf) { const d = C() && await C().pub(`candles/${sym}_${tf}`); if (!d || !d.d) return []; return JSON.parse(d.d).map(a => ({t: +a[0], o: +a[1], h: +a[2], l: +a[3], c: +a[4], v: +a[5]})); }
  async function candles(sym, tf) {
    const k = sym + '|' + tf, hit = cache.get(k); if (hit && Date.now() - hit.at < 10 * 6e4) return hit.c;
    let c = [], src = 'Binance';
    try { c = await binance(sym, tf, WANT[tf] || 1500); } catch { c = []; }
    if (c.length < 200) { try { c = await vortexStore(sym, tf); src = 'velas de VORTEX'; } catch { c = []; } }
    const now = Date.now(); c = c.filter(x => x.t + (IV[tf] || 0) <= now); // solo velas cerradas
    if (c.length < 120) throw new Error(`No hay suficientes velas de ${base(sym)} en ${tf}`);
    c.src = src; cache.set(k, {c, at: Date.now()}); return c;
  }

  /* ───────── Herramienta: datos del mercado ───────── */
  function coinStats(sym, c) {
    const L = B(), cl = c.map(x => x.c), N = c.length - 1, e50 = L.ema(cl, 50), e200 = L.ema(cl, 200), rsi = L.rsi(cl, 14), atr = L.atr(c, 14), adx = L.adx(c, 14);
    const pct = (a, b) => (b - a) / a * 100, back = k => c[Math.max(0, N - k)].c;
    const atrPct = atr.slice(-50).filter(Number.isFinite).map((a, i, arr) => a / c[N - arr.length + 1 + i].c * 100), atrAvg = atrPct.reduce((s, x) => s + x, 0) / (atrPct.length || 1);
    const hi = Math.max(...c.slice(-100).map(x => x.h)), lo = Math.min(...c.slice(-100).map(x => x.l)), slope = e50[N] && e50[N - 20] ? pct(e50[N - 20], e50[N]) : null;
    const trend = e200[N] == null ? 'sin dato' : cl[N] > e200[N] && slope > 0 ? 'alcista' : cl[N] < e200[N] && slope < 0 ? 'bajista' : 'mixta';
    const reg = adx[N] == null ? 'sin dato' : adx[N] >= 25 ? 'tendencia ' + trend : adx[N] < 20 ? 'rango' : 'transición';
    return {sym, last: cl[N], ch24: pct(back(24), cl[N]), chAll: pct(cl[0], cl[N]), days: Math.round((c[N].t - c[0].t) / 864e5), rsi: rsi[N], adx: adx[N], atrPct: atrAvg, above200: e200[N] != null ? cl[N] > e200[N] : null, slope50: slope, hi, lo, trend, regime: reg, src: c.src, n: c.length};
  }
  async function market(ctx) {
    const coins = (ctx.inputs.coins || []).slice(0, 8), tf = ctx.inputs.interval || '1h'; if (!coins.length) throw new Error('Elige al menos una moneda');
    const rows = [], fails = []; ctx.candles = {};
    for (const s of coins) { try { const c = await candles(s, tf); ctx.candles[s] = c; rows.push(coinStats(s, c)); } catch (e) { fails.push(base(s)); } }
    if (!rows.length) throw new Error('No se pudieron leer las velas (' + fails.join(', ') + ')');
    const text = `Temporalidad ${tf}. ${rows.length} monedas, ${rows[0].n} velas cerradas c/u (~${rows[0].days} días; fuente: ${rows[0].src}).\n` + rows.map(r => `${base(r.sym)}: precio ${r.last} · 24 velas ${num(r.ch24)}% · todo el periodo ${num(r.chAll)}% · régimen ${r.regime} (ADX ${num(r.adx, 1)}) · RSI ${num(r.rsi, 1)} · ATR medio ${num(r.atrPct)}% por vela · ${r.above200 == null ? '' : r.above200 ? 'sobre' : 'bajo'} EMA200 · pendiente EMA50 (20 velas) ${num(r.slope50)}% · máx/mín 100 velas ${r.hi} / ${r.lo}`).join('\n') + (fails.length ? `\nSin datos: ${fails.join(', ')}.` : '');
    const reg = rows.reduce((m, r) => { const k = r.regime.split(' ')[0]; m[k] = (m[k] || 0) + 1; return m; }, {});
    return {text, summary: `${rows.length} monedas · ${tf} · ${Object.entries(reg).map(([k, v]) => v + ' en ' + k).join(', ')}`, data: {rows, tf}};
  }

  /* ───────── Estrategia del Estratega → especificación válida para el motor (con tus límites aplicados) ───────── */
  function parseSpec(obj, inputs) {
    const L = B(); if (!L) return {errors: ['El motor de Nova Bot Lab no cargó']};
    const coins = (inputs.coins || ['BTCUSDT']).slice(0, 8), o = JSON.parse(JSON.stringify(obj || {})), d = L.defaultSpec();
    const risk = Object.assign({}, d.risk, o.risk || {}), errs = [];
    risk.capital = 10000; risk.riskPct = +inputs.riskPct || 2; risk.maxLeverage = Math.max(1, Math.min(+inputs.maxLev || 5, +risk.maxLeverage || +inputs.maxLev || 5));
    risk.minBars = Math.max(3, +risk.minBars || 0);
    if (!risk.sl) errs.push('Falta el stop loss ("sl")'); if (!risk.tp && !risk.trail) errs.push('Falta take profit ("tp") o trailing ("trail")');
    const spec = L.normalizeSpec(Object.assign({}, d, o, {v: 1, name: String(o.name || 'Bot de la Sala').slice(0, 40), symbol: coins[0], interval: inputs.interval || '1h', risk}));
    if (coins.length >= 2) spec.basket = coins; else delete spec.basket;
    if (inputs.sides && inputs.sides !== 'ia') spec.sides = inputs.sides;
    if (spec.sides === 'long') spec.entry.short = [], spec.exit.short = []; if (spec.sides === 'short') spec.entry.long = [], spec.exit.long = [];
    const v = L.validateSpec(spec); errs.push(...v.errors);
    let text = ''; try { text = L.describeSpec(spec); } catch {}
    return {spec, errors: errs, text};
  }

  /* ───────── Herramienta: backtest con el motor de Nova Bot Lab ───────── */
  const down = (arr, n) => { if (arr.length <= n) return arr; const k = arr.length / n; return Array.from({length: n}, (_, i) => arr[Math.floor(i * k)]); };
  async function backtest(ctx) {
    const L = B(), sp = ctx.spec; if (!sp) throw new Error('No hay estrategia que probar');
    const coins = sp.basket || [sp.symbol], by = {};
    for (const s of coins) by[s] = (ctx.candles && ctx.candles[s]) || await candles(s, sp.interval);
    const opts = {nova: window.NovaNexus}, r = coins.length >= 2 ? L.backtestBasket(by, sp, opts) : L.backtest(by[coins[0]], sp, opts);
    const m = r.metrics, S = r.segments, seg = x => `${x.n} ops · ${num(x.retPct)}% · aciertos ${x.winRate == null ? '—' : num(x.winRate, 1) + '%'} · factor ${x.profitFactor == null ? (x.pfInf ? '∞' : '—') : num(x.profitFactor)}`;
    ctx.bt = {metrics: m, segments: S, verdict: r.verdict, buyHold: r.buyHold, warnings: r.warnings || [], perSymbol: r.perSymbol || null, from: r.from, to: r.to, bars: r.bars,
      equity: down(r.equity.map(p => p.e), 80), spec: sp};
    const text = `Periodo: ${new Date(r.from).toISOString().slice(0, 10)} a ${new Date(r.to).toISOString().slice(0, 10)} · capital 10000 · riesgo ${sp.risk.riskPct}% por operación · comisión ${sp.costs.feePct}% y deslizamiento ${sp.costs.slipPct}% por lado.
TOTAL: ${m.n} operaciones · rendimiento ${num(m.retPct)}% · aciertos ${m.winRate == null ? '—' : num(m.winRate, 1) + '%'} · factor de beneficio ${m.profitFactor == null ? (m.pfInf ? '∞' : '—') : num(m.profitFactor)} · relación ganancia/pérdida media ${num(m.rr)} · caída máxima ${num(m.maxDDPct)}% · exposición ${num(m.exposurePct, 0)}% del tiempo.
Entrenamiento: ${seg(S.train)}
Validación: ${seg(S.val)}
Prueba: ${seg(S.test)}
Comprar y mantener en el mismo periodo: ${num(r.buyHold && r.buyHold.retPct)}%.
${r.perSymbol ? 'Por moneda: ' + r.perSymbol.map(p => `${base(p.symbol)} ${p.n} ops ${num(p.retPct)}%`).join(' · ') + '\n' : ''}Veredicto del motor: ${r.verdict.text}${(r.warnings || []).length ? '\nAvisos: ' + r.warnings.slice(0, 3).join(' ') : ''}`;
    return {text, summary: `${m.n} ops · ${num(m.retPct)}% · caída ${num(m.maxDDPct)}%`, data: ctx.bt};
  }

  /* ───────── Herramienta: tus bots de Nova Bot Lab ───────── */
  async function bots(ctx) {
    if (!C() || !C().user()) return {text: 'El usuario no inició sesión: no se pueden ver sus bots actuales. Evalúa solo con el trabajo del equipo.', summary: 'Sin sesión: no veo tus bots', data: {bots: []}};
    const d = await C().get('botlab'); let o = null; try { o = d && typeof d.items === 'string' ? JSON.parse(d.items) : d && typeof d.items === 'object' ? d.items : null; } catch { o = null; } // Nova Bot Lab guarda {items: '<JSON>'}
    const list = (o && Array.isArray(o.bots) ? o.bots : []).filter(b => b.status !== 'archived' && !(o.deleted && o.deleted[b.id] >= (b.updatedAt || 0)));
    const rows = list.map(b => { const v = (b.versions || []).find(x => x.v === b.mainV) || (b.versions || [])[0] || {}, sp = v.spec || {}, run = (b.runs || []).filter(r => r && r.metrics).slice(-1)[0], m = run && run.metrics, live = (b.paper || []).some(p => p.status === 'running');
      return {name: b.name, interval: sp.interval, sides: sp.sides, coins: (sp.basket || [sp.symbol]).filter(Boolean).map(base), live, m: m ? {n: m.n, ret: m.retPct, win: m.winRate, dd: m.maxDDPct, pf: m.profitFactor} : null}; });
    const text = rows.length ? `El usuario tiene ${rows.length} bots en Nova Bot Lab (${rows.filter(r => r.live).length} encendidos):\n` + rows.slice(0, 25).map(r => `- ${r.name} · ${r.interval || '?'} · ${r.sides === 'long' ? 'compras' : r.sides === 'short' ? 'ventas' : 'ambos'} · ${r.coins.join(',')}${r.live ? ' · ENCENDIDO' : ''}${r.m ? ` · backtest: ${r.m.n} ops, ${num(r.m.ret)}%, aciertos ${num(r.m.win, 1)}%, caída ${num(r.m.dd)}%` : ''}`).join('\n') : 'El usuario todavía no tiene bots en Nova Bot Lab.';
    return {text, summary: rows.length ? `${rows.length} bots tuyos revisados` : 'Aún no tienes bots', data: {bots: rows}};
  }

  /* ───────── Reglas fijas (en código; la IA no puede saltárselas) ───────── */
  function btRule(ctx) {
    const b = ctx.bt, out = []; if (!b) return ['no hay un backtest válido de esta versión'];
    if (b.metrics.n < 30) out.push(`solo ${b.metrics.n} operaciones (mínimo 30)`);
    if (b.metrics.retPct <= 0) out.push('pierde dinero en el histórico');
    if (b.segments.val.net < 0 && b.segments.test.net < 0) out.push('pierde en validación y en prueba (sobreajuste)');
    return out;
  }
  function riskRule(ctx) {
    const b = ctx.bt, sp = ctx.spec, i = ctx.inputs, out = []; if (!sp) return ['no hay estrategia'];
    if (!sp.risk.sl) out.push('no tiene stop loss'); if (sp.risk.riskPct > (+i.riskPct || 2) + 1e-9) out.push('se pasa del riesgo por operación');
    if (sp.risk.maxLeverage > (+i.maxLev || 5)) out.push('se pasa del apalancamiento máximo');
    if (b && b.metrics.maxDDPct > (+i.maxDD || 25)) out.push(`caída máxima ${num(b.metrics.maxDDPct)}% mayor a tu límite de ${+i.maxDD || 25}%`);
    return out;
  }
  const checks = {backtest: btRule, risk: riskRule, judge: ctx => [...new Set(btRule(ctx).concat(riskRule(ctx)))]};

  /* ───────── Propuesta para Nova Bot Lab ───────── */
  const LOOK = ['robot', 'astronauta', 'alien', 'cohete', 'planeta', 'estrella', 'ovni', 'luna', 'cometa', 'pulpo', 'satelite', 'vortice'], COL = ['#7c5cff', '#548fff', '#22d3ee', '#20bf9f', '#f0b90b', '#fb923c', '#f06b79', '#f472b6', '#a3e635'];
  function buildProposal(ctx) {
    const judge = ctx.msgs.filter(m => m.verdict === 'aprobado').slice(-1)[0], b = ctx.bt, m = b.metrics, h = Math.abs([...ctx.spec.name].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7));
    return {id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: Date.now(), room: ctx.room.name, name: ctx.spec.name, status: 'nueva',
      desc: String(judge ? judge.text : '').slice(0, 600), goal: String(ctx.inputs.goal || '').slice(0, 300), spec: ctx.spec, look: {color: COL[h % COL.length], icon: LOOK[h % LOOK.length]},
      metrics: {n: m.n, retPct: +num(m.retPct), winRate: m.winRate == null ? null : +num(m.winRate, 1), profitFactor: m.profitFactor == null ? null : +num(m.profitFactor), maxDDPct: +num(m.maxDDPct), valRet: +num(b.segments.val.retPct), testRet: +num(b.segments.test.retPct), bhRet: b.buyHold ? +num(b.buyHold.retPct) : null},
      verdict: b.verdict.text, rounds: ctx.round, team: ctx.msgs.filter(x => x.verdict).slice(-3).map(x => `${x.fromName}: ${x.verdict}`)};
  }
  async function sendProposal(p) {
    const cur = (await C().get('sala_props')) || {}, items = Array.isArray(cur.items) ? cur.items : [];
    await C().set('sala_props', {items: [p].concat(items.filter(x => x.id !== p.id)).slice(0, 20), at: Date.now()}); return p;
  }
  async function propose(ctx) {
    const p = buildProposal(ctx); ctx.pending = p;
    if (!C() || !C().user()) { const e = new Error('Inicia sesión con Google para enviarla a Nova Bot Lab'); e.login = true; throw e; }
    await sendProposal(p); ctx.pending = null; return p;
  }

  window.SalaTools = {candles, market, backtest, bots, parseSpec, checks, propose, sendProposal, buildProposal};
})();
