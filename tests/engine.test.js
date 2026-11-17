// Pruebas del orquestador y de las herramientas reales (node --test tests/)
'use strict';
const test = require('node:test'), assert = require('node:assert');
global.window = global; global.self = global;
const R = require('../js/rooms.js'), E = require('../js/engine.js');
global.CCTBotLab = require('../vortex/botlab-engine.js'); global.NovaNexus = require('../vortex/nova-nexus.js').compute ? require('../vortex/nova-nexus.js') : global.NovaNexus;
require('../js/tools.js'); const T = global.SalaTools;
const room = R.BUILTIN[0], inputs = {goal: 'bot de tendencia', coins: ['BTCUSDT', 'ETHUSDT'], interval: '1h', sides: 'ia', riskPct: 2, maxLev: 5, maxDD: 25};
const SPEC = '```json\n{"name":"Tendencia EMA","sides":"long","entry":{"long":[{"a":{"k":"ema","n":20},"op":"crossUp","b":{"k":"ema","n":50}}],"short":[]},"exit":{"long":[],"short":[]},"risk":{"riskPct":9,"maxLeverage":20,"sl":{"type":"atr","v":2},"tp":{"type":"rr","v":2}}}\n```';
function fakeAI(script) { const seen = []; return {seen, ai: async (msgs, o) => { seen.push(o.agent.id); const f = script[o.agent.id]; const t = typeof f === 'function' ? f(seen.filter(x => x === o.agent.id).length, msgs) : f; return {text: t, model: 'falso'}; }}; }
const deps = (ai, extra) => Object.assign({ai, tools: {market: async () => ({text: 'datos', summary: 'ok'}), backtest: async ctx => { ctx.bt = {ok: 1}; return {text: 'bt', summary: 'bt'}; }, bots: async () => ({text: 'sin bots'})},
  parseSpec: (o, i) => T.parseSpec(o, i), checks: {backtest: () => [], risk: () => [], judge: () => []}, propose: async ctx => ({name: ctx.spec.name})}, extra || {});

test('flujo completo: aprueba y propone', async () => {
  const f = fakeAI({nova: 'Mercado alcista', orion: 'Idea' + SPEC, vega: 'Bien.\nVEREDICTO: APROBADO', atlas: 'VEREDICTO: APROBADO', sirius: 'La propongo.\nVEREDICTO: APROBADO'}), ev = [];
  const ctx = await E.runRoom(room, inputs, deps(f.ai), {emit: e => ev.push(e)});
  assert.equal(ctx.outcome, 'propuesta'); assert.equal(ctx.proposal.name, 'Tendencia EMA');
  assert.deepEqual(f.seen, ['nova', 'orion', 'vega', 'atlas', 'sirius']);
  assert.equal(ctx.spec.risk.riskPct, 2, 'riesgo recortado al límite del usuario'); assert.equal(ctx.spec.risk.maxLeverage, 5); assert.deepEqual(ctx.spec.basket, ['BTCUSDT', 'ETHUSDT']); assert.ok(ctx.spec.risk.minBars >= 3);
  const msgs = ev.filter(e => e.type === 'msg'); assert.equal(msgs[0].to, 'orion'); assert.equal(msgs[4].to, 'user'); assert.ok(!/```/.test(msgs[1].text), 'el JSON no se muestra como texto');
});
test('pide cambios: regresa al estratega y cuenta rondas', async () => {
  const f = fakeAI({nova: 'x', orion: SPEC, vega: n => n === 1 ? 'Pierde.\nVEREDICTO: CAMBIOS' : 'VEREDICTO: APROBADO', atlas: 'VEREDICTO: APROBADO', sirius: 'VEREDICTO: APROBADO'});
  const ctx = await E.runRoom(room, inputs, deps(f.ai), {});
  assert.deepEqual(f.seen, ['nova', 'orion', 'vega', 'orion', 'vega', 'atlas', 'sirius']); assert.equal(ctx.round, 2); assert.equal(ctx.outcome, 'propuesta');
});
test('rondas agotadas: no propone nada', async () => {
  const f = fakeAI({nova: 'x', orion: SPEC, vega: 'VEREDICTO: CAMBIOS'}); let proposed = false;
  const ctx = await E.runRoom(room, inputs, deps(f.ai, {propose: async () => { proposed = true; }}), {});
  assert.equal(ctx.outcome, 'rechazado'); assert.equal(proposed, false); assert.equal(f.seen.filter(x => x === 'vega').length, 3);
});
test('regla fija: la IA aprueba pero el código lo regresa', async () => {
  let n = 0; const f = fakeAI({nova: 'x', orion: SPEC, vega: 'VEREDICTO: APROBADO', atlas: 'VEREDICTO: APROBADO', sirius: 'VEREDICTO: APROBADO'}), ev = [];
  const ctx = await E.runRoom(room, inputs, deps(f.ai, {checks: {backtest: () => (++n === 1 ? ['pierde dinero'] : []), risk: () => [], judge: () => []}}), {emit: e => ev.push(e)});
  assert.ok(ev.some(e => e.type === 'note' && /Regla fija/.test(e.text))); assert.equal(ctx.round, 2); assert.equal(ctx.outcome, 'propuesta');
});
test('estrategia inválida: el motor la rechaza y el estratega corrige', async () => {
  const f = fakeAI({nova: 'x', orion: n => n === 1 ? '```json\n{"name":"Mal","sides":"long","entry":{"long":[{"a":{"k":"inventado"},"op":"gt","b":{"k":"num","v":1}}]},"risk":{"sl":{"type":"atr","v":2},"tp":{"type":"rr","v":2}}}\n```' : SPEC, vega: 'VEREDICTO: APROBADO', atlas: 'VEREDICTO: APROBADO', sirius: 'VEREDICTO: APROBADO'}), ev = [];
  const ctx = await E.runRoom(room, inputs, deps(f.ai), {emit: e => ev.push(e)});
  assert.equal(f.seen.filter(x => x === 'orion').length, 2); assert.ok(ev.some(e => e.kind === 'motor')); assert.equal(ctx.outcome, 'propuesta');
});
test('veredictos', () => {
  assert.equal(E.parseVerdict('ok\nVEREDICTO: APROBADO'), 'aprobado'); assert.equal(E.parseVerdict('**VEREDICTO:** CAMBIOS'), 'cambios'); assert.equal(E.parseVerdict('Veredicto - aprobada'), 'aprobado');
  assert.equal(E.parseVerdict('nada'), null); assert.equal(E.stripVerdict('Hola\nVEREDICTO: APROBADO'), 'Hola');
});
test('sala propia: se normaliza y el último agente revisa', () => {
  const r = R.normalizeCustom({id: 'u1', name: 'Tatuajes', agents: [{id: 'a', name: 'Ana', prompt: 'x'}, {id: 'b', name: 'Beto', prompt: 'y', tool: 'market'}]});
  assert.deepEqual(r.flow, ['a', 'b']); assert.equal(r.agents[1].output, 'verdict'); assert.equal(r.agents[1].back, 'a'); assert.ok(r.inputs.some(f => f.type === 'coins'));
});
test('backtest REAL con el motor de Nova Bot Lab y reglas fijas', async () => {
  const mk = (seed) => { let p = 100, s = seed; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280; return Array.from({length: 1500}, (_, i) => { const o = p; p = Math.max(1, p * (1 + (r() - .48) * .02)); return {t: 1.7e12 + i * 36e5, o, h: Math.max(o, p) * 1.004, l: Math.min(o, p) * .996, c: p, v: 1000 + r() * 500}; }); };
  const ctx = {inputs, candles: {BTCUSDT: mk(1), ETHUSDT: mk(7)}, spec: T.parseSpec(JSON.parse(SPEC.replace(/```(json)?/g, '')), inputs).spec};
  const r = await T.backtest(ctx); assert.ok(ctx.bt.metrics.n > 0); assert.ok(/TOTAL:/.test(r.text)); assert.ok(Array.isArray(ctx.bt.equity));
  const rules = T.checks.judge(ctx); assert.ok(Array.isArray(rules));
  ctx.inputs = Object.assign({}, inputs, {maxDD: 0.0001}); assert.ok(T.checks.risk(ctx).some(x => /caída máxima/.test(x)));
});
