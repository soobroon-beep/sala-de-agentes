#!/usr/bin/env node
/* SALA DE AGENTES · MODO AUTOMÁTICO (24/7, en GitHub Actions; no necesitas tener la app abierta).
   Cada turno:
   1) Taller de bots: el equipo (Nova → Orion → Vega → Atlas → Sirius) diseña un bot nuevo, lo prueba con velas reales en el motor
      de Nova Bot Lab y, si pasa TODOS los filtros, te llega como propuesta a Nova Bot Lab y un aviso a tu celular.
      Rota estilos, temporalidades y monedas, y aprende de lo que falló antes. Si ya tienes 3 propuestas automáticas sin revisar,
      espera a que las revises (para no llenarte de bots).
   2) Tus salas propias con «Funcionar solo» encendido: corren su tarea fija cada N horas y dejan el informe en tu historial.
   Todo se guarda en users/<tú>/data/sala_auto; la app lo muestra en el historial con la etiqueta «Automático». Nada envía órdenes reales. */
'use strict';
const L = require('./lib.js'), P = require('./plan.js');
const MAX_PENDING = 3, KEEP_RUNS = 30, KEEP_TRIED = 80;

async function runSession(room, inputs, extra) {
  const mem = (globalThis.__salaMem || {})[room.id]; if (mem && mem.notes) room = Object.assign({}, room, {memory: mem.notes}); // memoria de la sala (la escribes en la app)
  const E = globalThis.SalaEngine, T = globalThis.SalaTools;
  const run = {id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), room: room.id, roomName: room.name, at: Date.now(), inputs, events: [], outcome: null, auto: true, title: extra.title || '', ver: room.ver || 1};
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 18 * 6e4);
  const deps = {ai: E.meter((m, o) => L.ai(m, Object.assign({}, o, {signal: ctrl.signal})), run), tools: {market: T.market, backtest: T.backtest, bots: T.bots, web: T.web, novahub: T.novahub, agenda: T.agenda, github: T.github}, parseSpec: T.parseSpec, checks: T.checks, signal: ctrl.signal,
    propose: async ctx => { const p = T.buildProposal(ctx); p.auto = true; p.room = room.name + ' · automático'; await T.sendProposal(p); return p; }};
  const emit = e => { run.events.push(L.keepEvent(e)); if (e.type === 'msg') L.log(`  ${e.fromName} → ${e.to}${e.verdict ? ' [' + e.verdict + ']' : ''}`); if (e.type === 'tool' && e.state !== 'run') L.log(`  herramienta ${e.tool}: ${e.state} ${L.clip(e.text, 90)}`); if (e.type === 'note') L.log('  nota: ' + L.clip(e.text, 140)); };
  let ctx; try { ctx = await E.runRoom(room, inputs, deps, {emit}); } finally { clearTimeout(timer); }
  run.outcome = ctx.outcome; run.proposal = ctx.proposal || null; run.ms = Date.now() - run.at;
  return {run, ctx};
}

/* Cadena de salas: el resultado pasa solo a la sala que elegiste (máx. 3 saltos) */
const OK_OUT = ['informe', 'propuesta', 'rechazado', 'aprobado-sin-enviar'];
async function chainNext(S, R, from, run, push, depth = 0) {
  if (!from.chain || !from.chain.to || depth >= 3 || !OK_OUT.includes(run.outcome)) return;
  const raw = (S.rooms || []).find(x => x.id === from.chain.to && !(S.deleted && S.deleted[x.id])), target = raw ? R.normalizeCustom(raw) : R.BUILTIN.find(x => x.id === from.chain.to);
  if (!target) return; const rep = ((run.events || []).filter(e => e.type === 'msg').slice(-1)[0] || {}).text || '';
  const inputs = {}; for (const f of target.inputs || []) inputs[f.id] = Array.isArray(f.def) ? f.def.slice() : f.def;
  inputs.goal = `${from.chain.goal || (target.auto && target.auto.goal) || 'Continúa con el trabajo de la sala anterior.'}\n\nRESULTADO DE «${from.name}» (sala anterior de la cadena):\n${String(rep).replace(/VEREDICTO:.*$/m, '').trim().slice(0, 2500)}`;
  L.log(`  cadena: «${from.name}» → «${target.name}»`);
  try { const r = await runSession(target, inputs, {title: `Cadena · ${from.name} → ${target.name}`}); r.run.chainOf = {room: from.id, run: run.id}; await push(r.run); await chainNext(S, R, target, r.run, push, depth + 1); }
  catch (e) { L.log('  la cadena falló: ' + L.clip(e.message, 160)); }
}

/* Por qué no pasó (para que la siguiente sesión no tropiece igual) */
function whyFailed(ctx) {
  const notes = (ctx.msgs || []).filter(m => m.verdict === 'cambios').slice(-1)[0];
  const b = ctx.bt && ctx.bt.metrics;
  const parts = [];
  if (b) parts.push(`${b.n} ops, ${b.retPct.toFixed(1)}%, caída ${b.maxDDPct.toFixed(1)}%`);
  if (notes) { const m = /Regla fija:([^\n)]*)/.exec(notes.text); parts.push(m ? m[1].trim() : L.clip(notes.text.replace(/\s+/g, ' '), 140)); }
  if (ctx.outcome === 'spec-invalida') parts.push('el estratega no logró una estrategia válida para el motor');
  if (ctx.outcome === 'error') parts.push('falló la IA');
  return L.clip(parts.join(' · '), 220);
}

async function main() {
  L.loadAll(); const {uid} = await L.account(); L.log('Cuenta encontrada. Modo automático de la Sala.');
  const S = await L.salaState(); globalThis.__salaMem = S.roomMem || {}; const cfgAll = S.auto || {}; const cfg = Object.assign({on: true, perRun: 2}, cfgAll.taller || {});
  const st = (await L.getDoc('sala_auto')) || {}, runs = Array.isArray(st.runs) ? st.runs : [], tried = Array.isArray(st.tried) ? st.tried : [], last = st.rooms || {};
  const status = {at: Date.now(), taller: '', rooms: [], next: Date.now() + 3 * 36e5};
  const R = globalThis.SalaRooms, taller = R.BUILTIN.find(r => r.id === 'taller-bots');
  const chain = (room, run) => chainNext(S, globalThis.SalaRooms, room, run, async r => { runs.unshift(r); await save(); });
  const save = async () => { await L.setDoc('sala_auto', {runs: L.fit(runs.slice(0, KEEP_RUNS)), tried: tried.slice(0, KEEP_TRIED), rooms: last, status, at: Date.now()}); };

  /* 1) Taller de bots */
  if (cfg.on === false) { status.taller = 'apagado'; L.log('Taller automático apagado en la app.'); }
  else {
    const props = (await L.getDoc('sala_props')) || {}, pending = (Array.isArray(props.items) ? props.items : []).filter(p => p.auto && p.status === 'nueva').length;
    if (pending >= MAX_PENDING) { status.taller = `en espera: tienes ${pending} propuestas automáticas sin revisar en Nova Bot Lab`; L.log(status.taller); }
    else {
      const n = Math.max(1, Math.min(3, +cfg.perRun || 2)); let made = 0;
      for (let i = 0; i < n; i++) {
        const lastMarket = runs.find(r => r.room === 'taller-bots'); const rows = lastMarket && (lastMarket.events.find(e => e.type === 'tool' && e.tool === 'market' && e.data) || {}).data;
        const {plan, inputs} = P.planTaller(tried, cfg, P.regimeHint(rows && rows.rows), Date.now());
        L.log(`Sesión ${i + 1}/${n} del Taller: estilo ${plan.style} · ${plan.interval} · ${inputs.coins.length} monedas`);
        try {
          const {run, ctx} = await runSession(taller, inputs, {title: `Automático · ${plan.style} · ${plan.interval}`});
          runs.unshift(run); tried.unshift({at: run.at, style: plan.style, interval: plan.interval, basket: plan.basket, outcome: run.outcome, why: run.outcome === 'propuesta' ? '' : whyFailed(ctx)});
          L.log(`  resultado: ${run.outcome}${run.proposal ? ' · «' + run.proposal.name + '»' : ''}`);
          if (run.proposal) { made++; const m = run.proposal.metrics; await L.push([{title: `Sala de agentes · bot nuevo: ${run.proposal.name}`, body: `Pasó todos los filtros: ${m.n} ops · ${m.retPct >= 0 ? '+' : ''}${m.retPct}% · caída ${m.maxDDPct}%. Está en Nova Bot Lab para Agregar o Descartar.`, tag: 'sala-prop-' + run.proposal.id}]); }
          if (run.outcome === 'error') { L.log('  la IA no respondió; se intenta en el siguiente turno'); await save(); break; }
        } catch (e) { L.log('  error de la sesión: ' + L.clip(e.message, 200)); runs.unshift({id: 'a' + Date.now().toString(36), room: 'taller-bots', roomName: taller.name, at: Date.now(), inputs, events: [{type: 'error', text: L.clip(e.message, 300), at: Date.now()}, {type: 'done', outcome: 'error', at: Date.now()}], outcome: 'error', auto: true, title: 'Automático · error'}); }
        await save();
      }
      status.taller = made ? `${made} bot(s) nuevos enviados a Nova Bot Lab` : `${n} sesión(es) sin bot aprobado (siguen probando)`;
    }
  }

  /* 2) Tus salas propias en modo automático */
  for (const raw of Array.isArray(S.rooms) ? S.rooms : []) {
    if (S.deleted && S.deleted[raw.id]) continue;
    const room = R.normalizeCustom(raw); if (!P.dueRoom(room, last[room.id], Date.now())) continue;
    L.log(`Sala propia «${room.name}» (cada ${room.auto.everyHours} h)`);
    const inputs = {goal: room.auto.goal}; for (const f of room.inputs) if (inputs[f.id] == null) inputs[f.id] = Array.isArray(f.def) ? f.def.slice() : f.def;
    try { const {run} = await runSession(room, inputs, {title: 'Automático · ' + L.clip(room.auto.goal, 70)}); runs.unshift(run); last[room.id] = run.at; status.rooms.push(`${room.name}: ${run.outcome}`); await chain(room, run);
      if (run.outcome === 'informe') { const rep = (run.events.filter(e => e.type === 'msg').slice(-1)[0] || {}).text || ''; await L.push([{title: `Sala de agentes · ${room.name}`, body: L.clip(rep.replace(/\s+/g, ' '), 260) || 'Informe nuevo en tu historial.', tag: 'sala-room-' + room.id}]); } }
    catch (e) { last[room.id] = Date.now(); status.rooms.push(`${room.name}: error`); L.log('  error: ' + L.clip(e.message, 200)); }
    await save();
  }
  await save(); L.log('Listo: ' + status.taller + (status.rooms.length ? ' · ' + status.rooms.join(' · ') : ''));
}

main().then(() => process.exit(0), e => { console.error('Error:', e.message); process.exit(1); });
