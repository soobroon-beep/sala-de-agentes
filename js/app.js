/* SALA DE AGENTES · la app: salas, sesión en vivo (animación + chat del equipo), historial y editor de salas propias. */
(function () {
  'use strict';
  const R = window.SalaRooms, E = window.SalaEngine, C = window.SalaCloud, AI = window.SalaAI, T = window.SalaTools, SC = window.SalaScene;
  const $ = (s, el) => (el || document).querySelector(s), $$ = (s, el) => [...(el || document).querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const num = (x, d = 2) => x == null || !Number.isFinite(+x) ? '—' : (+x).toLocaleString('es-MX', {maximumFractionDigits: d}), sgn = x => (x > 0 ? '+' : '') + num(x) + '%';
  const when = t => new Date(t).toLocaleString('es-MX', {dateStyle: 'medium', timeStyle: 'short'});
  const view = $('#view'), VORTEX_LAB = 'https://dev.vortex-nexus.pages.dev/';
  const I = {
    back: '<path d="M15 5l-7 7 7 7"/>', play: '<path d="M8 5.5v13l11-6.5z"/>', stop: '<rect x="7" y="7" width="10" height="10" rx="2"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>', copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5H5v11h3"/>',
    send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>', chart: '<path d="M4 19h16M7 15l3-4 3 2 4-6"/>', flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>', bots: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', open: '<path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5"/>', retry: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5"/>', motor: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'
  };
  const ic = (k, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;
  const toast = t => { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 3600); };

  /* ───────── Datos: salas propias + historial (en tu cuenta; sin sesión, en este dispositivo) ───────── */
  const LS = 'sala_v2';
  let S = (() => { try { const o = JSON.parse(localStorage.getItem(LS) || 'null'); if (o && Array.isArray(o.rooms)) return o; } catch {} return {v: 2, rooms: [], runs: [], deleted: {}}; })();
  let cloudT = 0;
  function mergeStore(a, b) {
    const del = Object.assign({}, a.deleted, b.deleted), pick = (x, y) => (x.updatedAt || x.at || 0) >= (y.updatedAt || y.at || 0) ? x : y;
    const un = (xs, ys) => { const m = new Map(); for (const x of [...xs, ...ys]) m.set(x.id, m.has(x.id) ? pick(m.get(x.id), x) : x); return [...m.values()].filter(x => !(del[x.id] >= (x.updatedAt || x.at || 0))); };
    return {v: 2, rooms: un(a.rooms || [], b.rooms || []), runs: un(a.runs || [], b.runs || []).sort((x, y) => y.at - x.at).slice(0, 20), deleted: del};
  }
  function save() {
    S.runs = S.runs.slice(0, 20); try { localStorage.setItem(LS, JSON.stringify(S)); } catch { S.runs = S.runs.slice(0, 8); try { localStorage.setItem(LS, JSON.stringify(S)); } catch {} }
    clearTimeout(cloudT); cloudT = setTimeout(async () => { if (!C.user()) return; try { let str = JSON.stringify(S); if (str.length > 900000) { S.runs = S.runs.slice(0, 8); str = JSON.stringify(S); } await C.set('sala', {s: str, at: Date.now()}); } catch (e) { console.warn('No se guardó en tu cuenta', e); } }, 900);
  }
  async function pull() { try { const d = await C.get('sala'); if (d && d.s) { S = mergeStore(S, JSON.parse(d.s)); save(); route(); } else if (S.rooms.length || S.runs.length) save(); } catch (e) { console.warn(e); } }
  const rooms = () => R.BUILTIN.concat(S.rooms.map(R.normalizeCustom));
  const roomById = id => rooms().find(r => r.id === id);

  /* ───────── Cuenta ───────── */
  function paintAcct() {
    const u = C.user(), b = $('#acct');
    b.innerHTML = u ? (u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : `<span>${esc((u.displayName || u.email || '?')[0])}</span>`) : '<span class="acct-in">Iniciar sesión</span>';
    b.title = u ? `${u.displayName || u.email} · tocar para cerrar sesión` : 'Inicia sesión con Google (la misma cuenta de VORTEX)';
  }
  $('#acct').onclick = async () => { try { if (C.user()) { if (confirm('¿Cerrar sesión?')) await C.signOut(); } else await C.signIn(); } catch (e) { toast('No se pudo iniciar sesión: ' + (e.code || e.message)); } };
  C.init().then(ok => { paintAcct(); if (!ok) return; C.on(u => { paintAcct(); if (u) { AI.resetOwn(); pull(); if (live && live.ctx && live.ctx.pending) route(); } }); });

  /* ───────── Texto con formato ligero ───────── */
  function md(t) {
    const lines = esc(t).split('\n'), out = []; let list = null;
    const inl = s => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
    for (const ln of lines) { const m = /^\s*(?:[-•*]|\d+[.)])\s+(.*)$/.exec(ln); if (m) { if (!list) { list = []; } list.push(`<li>${inl(m[1])}</li>`); continue; } if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; } out.push(ln.trim() ? `<p>${inl(ln.replace(/^#+\s*/, ''))}</p>` : ''); }
    if (list) out.push(`<ul>${list.join('')}</ul>`); return out.join('');
  }
  const av = (a, s = 34) => a && a.icon ? `<span class="av" style="--c:${a.color};width:${s}px;height:${s}px"><img src="icons/bots/${esc(a.icon)}.png" alt=""></span>` : `<span class="av you" style="width:${s}px;height:${s}px">Tú</span>`;

  /* ───────── Inicio: salas ───────── */
  function home() {
    const rs = rooms();
    view.innerHTML = `<section class="home">
      <div class="hero"><h1>Salas de agentes</h1><p>Equipos de IA que hablan entre ellos, usan datos reales y te entregan el trabajo terminado. ${C.user() ? '' : '<a href="#" data-a="login">Inicia sesión</a> para guardar tus salas y enviar bots a Nova Bot Lab.'}</p></div>
      <div class="grid">${rs.map(r => `<article class="card glass" style="--c:${r.color}">
        <div class="card-top"><div class="stack">${r.flow.map(id => r.agents.find(a => a.id === id)).filter(Boolean).map(a => av(a, 38)).join('')}</div>${r.builtin ? '' : `<button class="ib" data-a="edit" data-id="${r.id}" title="Editar sala">${ic('edit', 16)}</button>`}</div>
        <h2>${esc(r.name)}</h2><p>${esc(r.desc || '')}</p>
        <div class="chips"><span>${r.agents.length} agentes</span><span>${r.final === 'proposal' ? 'Propone bots' : 'Entrega un informe'}</span>${r.agents.some(a => a.tool) ? '<span>Datos reales</span>' : ''}</div>
        <a class="btn pri" href="#/sala/${encodeURIComponent(r.id)}">${ic('play', 16)}Entrar a la sala</a></article>`).join('')}
        <a class="card glass new" href="#/editor/nueva"><span class="plus">${ic('plus', 26)}</span><h2>Crear sala</h2><p>Arma tu propio equipo: nombre, papel e instrucciones de cada agente, quién revisa a quién y qué datos usan.</p></a>
      </div>
      <p class="foot">IA: ${esc(AI.label())}. Las pruebas de bots son simulaciones con datos históricos; nada envía órdenes reales.</p></section>`;
  }

  /* ───────── Sesión en vivo ───────── */
  let live = null; // {room, ctx, events, ctrl, scene, running}
  function roomView(id, runId) {
    const room = roomById(id); if (!room) { location.hash = '#/'; return; }
    const replay = runId ? S.runs.find(x => x.id === runId) : null;
    if (live && live.running && live.room.id !== id) { toast('Hay una sesión trabajando en «' + live.room.name + '»'); location.hash = '#/sala/' + live.room.id; return; }
    view.innerHTML = `<section class="room">
      <div class="room-bar"><a class="ib" href="#/" aria-label="Volver">${ic('back')}</a><div><h1>${esc(room.name)}</h1><small>${room.agents.length} agentes · ${esc(AI.label())}</small></div><div class="sp"></div><span class="live-dot" hidden>En vivo</span><button class="btn ghost sm" data-a="stop" hidden>${ic('stop', 14)}Detener</button></div>
      <div class="room-body"><div class="stage glass" id="stage"></div><aside class="panel glass" id="panel"></aside></div></section>`;
    const scene = SC.Scene($('#stage'), room);
    if (live && live.room.id === id && !replay && !live.replay) { live.scene = scene; replayInto(scene, live.events, true); paintPanel(); syncBar(); return; }
    if (replay) { live = {room, events: replay.events, inputs: replay.inputs, ctx: null, scene, running: false, replay}; replayInto(scene, replay.events, false); paintPanel(); syncBar(); return; }
    live = {room, events: [], inputs: null, ctx: null, scene, running: false}; paintPanel(); syncBar();
  }
  async function replayInto(scene, events, instant) {
    for (const e of events) { if (live.scene !== scene) return; if (instant) { if (e.type === 'msg') { scene.on(Object.assign({}, e, {type: 'note'})); } else scene.on(e); continue; } await scene.on(e); await new Promise(r => setTimeout(r, e.type === 'msg' ? 700 : 120)); }
    if (instant) { const last = events.filter(e => e.type === 'done').pop(); if (last) scene.on(last); }
  }
  const syncBar = () => { const r = !!(live && live.running); $$('[data-a="stop"]').forEach(b => { b.hidden = !r; }); const d = $('.live-dot'); if (d) d.hidden = !r; };

  function inputHTML(room, vals) {
    return room.inputs.map(f => { const v = vals && vals[f.id] != null ? vals[f.id] : f.def;
      if (f.type === 'textarea') return `<label class="fld"><span>${esc(f.label)}</span><textarea name="${f.id}" rows="3" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea></label>`;
      if (f.type === 'select') return `<label class="fld half"><span>${esc(f.label)}</span><select name="${f.id}">${f.options.map(o => `<option value="${o[0]}" ${o[0] === v ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>`;
      if (f.type === 'number') return `<label class="fld half"><span>${esc(f.label)}</span><input name="${f.id}" type="number" min="${f.min}" max="${f.max}" step="${f.step}" value="${esc(v)}" inputmode="decimal"></label>`;
      if (f.type === 'coins') return `<div class="fld"><span>${esc(f.label)} <small>(hasta 8)</small></span><div class="coins" data-f="${f.id}">${(v || []).map(c => `<button type="button" class="coin" data-a="rmCoin" data-c="${esc(c)}">${esc(c.replace(/USDT$/, ''))}${ic('x', 12)}</button>`).join('')}<input class="coin-in" placeholder="+ moneda" maxlength="10" aria-label="Agregar moneda"></div></div>`;
      return '';
    }).join('');
  }
  function readInputs(room) {
    const o = {}; for (const f of room.inputs) {
      if (f.type === 'coins') o[f.id] = $$(`.coins[data-f="${f.id}"] .coin`).map(b => b.dataset.c);
      else { const el = $(`[name="${f.id}"]`); o[f.id] = el ? (f.type === 'number' ? Math.max(f.min, Math.min(f.max, +el.value || f.def)) : el.value.trim()) : f.def; }
    } return o;
  }
  function paintPanel() {
    const P = $('#panel'); if (!P || !live) return; const room = live.room, ev = live.events;
    if (!ev.length && !live.running) {
      P.innerHTML = `<div class="setup"><h3>Pedido para el equipo</h3><form id="ask">${inputHTML(room, live.inputs)}<button class="btn pri wide" type="submit">${ic('play', 16)}Iniciar sesión de agentes</button></form>
        <h3 class="mt">El equipo</h3><ol class="team">${room.flow.map(id => room.agents.find(a => a.id === id)).filter(Boolean).map(a => `<li>${av(a, 30)}<div><b>${esc(a.name)}</b><small>${esc(a.role)}${a.tool ? ' · ' + {market: 'datos del mercado', backtest: 'backtest real', bots: 'tus bots'}[a.tool] : ''}${a.back ? ' · puede regresar el trabajo a ' + esc((room.agents.find(x => x.id === a.back) || {}).name || '') : ''}</small></div></li>`).join('')}</ol></div>`;
      return;
    }
    const seen = live._shown || 0; live._shown = ev.length;
    P.innerHTML = `<div class="feed" id="feed">${ev.map((e, k) => k >= seen && live.running ? evHTML(e).replace(/^<(article|div) class="/, '<$1 class="fresh ') : evHTML(e)).join('')}${live.running ? '<div class="typing" id="typing"></div>' : ''}</div>${resultHTML()}`;
    paintTyping(); const f = $('#feed'); f.scrollTop = f.scrollHeight;
    if (live.running && innerWidth <= 900 && innerHeight + scrollY > document.documentElement.scrollHeight - 700) scrollTo({top: document.documentElement.scrollHeight, behavior: 'smooth'}); // en el celular la sala queda fija arriba y el chat avanza abajo
  }
  const agentOf = id => live.room.agents.find(a => a.id === id);
  function paintTyping() { const t = $('#typing'); if (!t) return; const th = [...live.events].reverse().find(e => e.type === 'think' || e.type === 'msg' || (e.type === 'tool' && e.state === 'run')); if (!th || th.type === 'msg') { t.innerHTML = ''; return; } const a = agentOf(th.agent); t.innerHTML = a ? `${av(a, 24)}<span>${esc(a.name)} ${th.type === 'tool' ? 'usa su herramienta' : 'está escribiendo'}</span><i></i><i></i><i></i>` : ''; }
  function evHTML(e) {
    if (e.type === 'msg') { const a = agentOf(e.agent), to = e.to === 'user' ? {name: 'Tú'} : agentOf(e.to) || {};
      return `<article class="msg" style="--c:${a.color}"><header>${av(a)}<div><b>${esc(a.name)}</b> <span class="to">→ ${esc(to.name || '')}</span><small>${esc(a.role)}${e.round > 1 ? ' · ronda ' + e.round : ''}</small></div>${e.verdict ? `<span class="vd ${e.verdict}">${e.verdict === 'aprobado' ? ic('check', 13) + 'Aprobado' : ic('retry', 13) + 'Pide cambios'}</span>` : ''}</header>
        <div class="txt">${md(e.text)}</div>${e.spec ? `<details class="spec"><summary>${ic('flask', 14)}Estrategia «${esc(e.spec.name)}»</summary><div class="txt">${md(e.specText || '')}</div><pre>${esc(JSON.stringify(e.spec, null, 1))}</pre></details>` : ''}${e.model ? `<footer>${esc(e.model)}</footer>` : ''}</article>`; }
    if (e.type === 'tool' && e.state !== 'run') { const a = agentOf(e.agent); return `<div class="tool ${e.state}" style="--c:${a.color}">${ic(e.tool === 'market' ? 'chart' : e.tool === 'backtest' ? 'flask' : 'bots', 15)}<div><b>${esc(a.name)} · ${esc({market: 'datos del mercado', backtest: 'backtest en el motor de Nova Bot Lab', bots: 'tus bots de Nova Bot Lab'}[e.tool] || e.tool)}</b><small>${esc(e.text || '')}</small>${e.tool === 'backtest' && e.data ? btHTML(e.data, a.color) : e.tool === 'market' && e.data ? mkHTML(e.data) : ''}</div></div>`; }
    if (e.type === 'note') return `<div class="note ${e.kind || ''}">${ic(e.kind === 'regla' ? 'x' : 'motor', 14)}<span>${esc(e.text)}</span></div>`;
    if (e.type === 'round') return `<div class="sep"><span>Ronda ${e.round} · el trabajo regresa a ${esc((agentOf(e.to) || {}).name || '')}</span></div>`;
    if (e.type === 'error') return `<div class="note err">${ic('x', 14)}<span>${esc((agentOf(e.agent) || {}).name || '')} no pudo responder: ${esc(e.text)}</span></div>`;
    return '';
  }
  function spark(vals, color) { if (!vals || vals.length < 2) return ''; const mn = Math.min(...vals), mx = Math.max(...vals), W = 220, H = 44, k = (mx - mn) || 1; const pts = vals.map((v, i) => `${(i / (vals.length - 1) * W).toFixed(1)},${(H - 3 - (v - mn) / k * (H - 6)).toFixed(1)}`).join(' '); return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" vector-effect="non-scaling-stroke"/></svg>`; }
  function btHTML(b, color) {
    const m = b.metrics, s = b.segments, k = (l, v, c) => `<div><small>${l}</small><b class="${c || ''}">${v}</b></div>`, cl = x => x > 0 ? 'pos' : x < 0 ? 'neg' : '';
    return `<div class="kpis">${k('Operaciones', m.n)}${k('Rendimiento', sgn(m.retPct), cl(m.retPct))}${k('Aciertos', m.winRate == null ? '—' : num(m.winRate, 1) + '%')}${k('Factor', m.profitFactor == null ? (m.pfInf ? '∞' : '—') : num(m.profitFactor))}${k('Caída máx.', num(m.maxDDPct) + '%')}${k('Validación', sgn(s.val.retPct), cl(s.val.retPct))}${k('Prueba', sgn(s.test.retPct), cl(s.test.retPct))}${k('Comprar y mantener', b.buyHold ? sgn(b.buyHold.retPct) : '—')}</div>${spark(b.equity, color)}<small class="vdt">${esc(b.verdict && b.verdict.text || '')}</small>`;
  }
  const mkHTML = d => `<div class="mk">${d.rows.map(r => `<span class="${/alcista/.test(r.regime) ? 'pos' : /bajista/.test(r.regime) ? 'neg' : ''}"><b>${esc(r.sym.replace(/USDT$/, ''))}</b> ${esc(r.regime)} · ${sgn(r.ch24)}</span>`).join('')}</div>`;
  function resultHTML() {
    if (live.running) return ''; const d = live.events.filter(e => e.type === 'done').pop(); if (!d) return '';
    const o = d.outcome, P = live.proposal || (live.replay && live.replay.proposal), pend = live.ctx && live.ctx.pending;
    let body = '';
    if (o === 'propuesta' && P) body = `<div class="res win">${ic('check', 20)}<div><b>«${esc(P.name)}» está en Nova Bot Lab como propuesta</b><small>${P.metrics.n} operaciones · ${sgn(P.metrics.retPct)} · caída ${num(P.metrics.maxDDPct)}%. Ábrelo y toca <b>Agregar</b> para dejarlo funcionando en simulado.</small></div><a class="btn pri sm" href="${VORTEX_LAB}" target="_blank" rel="noopener">${ic('open', 14)}Nova Bot Lab</a></div>`;
    else if (pend) body = `<div class="res">${ic('send', 20)}<div><b>Bot aprobado, falta enviarlo</b><small>Inicia sesión con tu cuenta de Google (la misma de VORTEX) para mandarlo a Nova Bot Lab.</small></div><button class="btn pri sm" data-a="sendPend">${ic('send', 14)}Iniciar sesión y enviar</button></div>`;
    else if (o === 'informe') body = `<div class="res win">${ic('check', 20)}<div><b>Informe entregado</b><small>Lo último que escribió el jefe de la sala es tu informe.</small></div><button class="btn sm" data-a="copy">${ic('copy', 14)}Copiar informe</button></div>`;
    else body = `<div class="res lose">${ic('x', 20)}<div><b>${o === 'cancelado' ? 'Sesión detenida' : o === 'error' ? 'La IA dejó de responder' : 'El equipo no aprobó nada'}</b><small>${o === 'rechazado' ? 'Ningún bot pasó todos los filtros. Prueba otro enfoque, temporalidad o monedas.' : o === 'error' ? 'Puede ser el límite de la IA gratis; espera un minuto e inténtalo de nuevo.' : ''}</small></div></div>`;
    return `<div class="result">${body}<button class="btn ghost wide" data-a="again">${ic('retry', 15)}Nueva sesión en esta sala</button></div>`;
  }

  async function start(room, inputs) {
    if (!inputs.goal && room.inputs.some(f => f.id === 'goal')) { toast('Escribe tu pedido para el equipo'); return; }
    if (room.inputs.some(f => f.type === 'coins') && !(inputs.coins || []).length) { toast('Agrega al menos una moneda'); return; }
    try { await AI.boot(); } catch (e) { toast(e.message); return; }
    const ctrl = new AbortController(), run = {id: 'r' + Date.now().toString(36), room: room.id, roomName: room.name, at: Date.now(), inputs, events: [], outcome: null};
    Object.assign(live, {events: run.events, inputs, ctrl, running: true, proposal: null, ctx: null, replay: null, _shown: 0}); paintPanel(); syncBar();
    const emit = e => {
      if (e.type === 'done') { live.running = false; live.ctx = e.ctx; }
      const keep = Object.assign({}, e); delete keep.ctx; if (keep.data && keep.tool === 'market') keep.data = {rows: keep.data.rows.map(r => ({sym: r.sym, regime: r.regime, ch24: r.ch24}))};
      if (e.type === 'proposal') live.proposal = e.proposal;
      run.events.push(keep); if (live.scene) live.scene.on(keep);
      if (live.room.id === room.id && $('#panel')) { if (['msg', 'tool', 'note', 'round', 'error', 'done'].includes(e.type)) paintPanel(); else paintTyping(); }
    };
    const deps = {ai: AI.chat, tools: {market: T.market, backtest: T.backtest, bots: T.bots}, parseSpec: T.parseSpec, checks: T.checks, signal: ctrl.signal,
      propose: async ctx => { try { return await T.propose(ctx); } catch (e) { if (e.login) { live.ctx = ctx; return null; } throw e; } }};
    const ctx = await E.runRoom(room, inputs, deps, {emit});
    live.ctx = ctx; live.running = false; syncBar();
    if (ctx.outcome === 'propuesta' && !ctx.proposal && ctx.pending) emit({type: 'note', text: 'Bot aprobado. Inicia sesión para enviarlo a Nova Bot Lab.'});
    run.outcome = ctx.outcome; run.proposal = ctx.proposal || null; run.title = String(inputs.goal || '').slice(0, 90); run.events.forEach(x => { if (x.text && x.text.length > 1800) x.text = x.text.slice(0, 1800) + '…'; });
    S.runs.unshift(run); save(); if (live.room.id === room.id) paintPanel();
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') try { new Notification('Sala de agentes', {body: ctx.outcome === 'propuesta' ? 'Nuevo bot aprobado para Nova Bot Lab' : 'La sesión de «' + room.name + '» terminó', icon: 'icons/app-192.png'}); } catch {}
  }

  /* ───────── Historial ───────── */
  const OUT = {propuesta: ['Propuesta enviada', 'win'], informe: ['Informe', 'win'], rechazado: ['Sin aprobar', 'lose'], cancelado: ['Detenida', ''], error: ['Error de IA', 'lose'], limite: ['Límite de mensajes', ''], 'spec-invalida': ['Estrategia inválida', 'lose'], 'aprobado-sin-enviar': ['Aprobado, sin enviar', '']};
  function history() {
    view.innerHTML = `<section class="hist"><div class="hero"><h1>Historial</h1><p>Cada sesión guarda la conversación completa del equipo. Ábrela para volver a ver cómo se pasaron el trabajo.</p></div>
      ${S.runs.length ? `<div class="hlist">${S.runs.map(r => { const o = OUT[r.outcome] || [r.outcome || '—', '']; const room = roomById(r.room); return `<a class="hrow glass" href="#/sala/${encodeURIComponent(r.room)}/${r.id}"><div class="stack">${room ? room.flow.slice(0, 5).map(id => av(room.agents.find(a => a.id === id), 26)).join('') : ''}</div><div><b>${esc(r.title || r.roomName)}</b><small>${esc(r.roomName)} · ${when(r.at)}</small></div><span class="pill ${o[1]}">${esc(o[0])}</span></a>`; }).join('')}</div>` : '<p class="empty glass">Todavía no hay sesiones. Entra a una sala y dale un pedido al equipo.</p>'}</section>`;
  }

  /* ───────── Editor de salas propias ───────── */
  let draft = null;
  function editor(id) {
    if (!draft || draft._for !== id) { const r = id !== 'nueva' && S.rooms.find(x => x.id === id); draft = r ? JSON.parse(JSON.stringify(r)) : {id: 'u' + Date.now().toString(36), name: '', desc: '', color: R.COLORS[1], icon: 'ovni', maxRounds: 2, ask: '',
      agents: [{id: 'a1', name: 'Agente 1', role: 'Investigador', icon: 'satelite', color: '#22d3ee', prompt: '', tool: ''}, {id: 'a2', name: 'Agente 2', role: 'Crítico', icon: 'alien', color: '#f06b79', prompt: '', tool: ''}, {id: 'a3', name: 'Agente 3', role: 'Jefe', icon: 'estrella', color: '#a3e635', prompt: '', tool: '', back: 'a1'}]}; draft._for = id; }
    const d = draft, own = S.rooms.some(x => x.id === d.id), opts = (arr, v) => arr.map(x => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('');
    view.innerHTML = `<section class="edit"><div class="room-bar"><a class="ib" href="#/" aria-label="Volver">${ic('back')}</a><div><h1>${own ? 'Editar sala' : 'Nueva sala'}</h1><small>Los agentes hablan en el orden de la lista. Un agente con «revisa y regresa a» puede devolver el trabajo.</small></div></div>
      <div class="glass box"><label class="fld"><span>Nombre de la sala</span><input data-k="name" value="${esc(d.name)}" placeholder="Ej.: Sala de contenido de tatuajes"></label>
        <label class="fld"><span>Para qué sirve</span><input data-k="desc" value="${esc(d.desc)}" placeholder="Una línea"></label>
        <label class="fld"><span>Pregunta que te hará al iniciar</span><input data-k="ask" value="${esc(d.ask || '')}" placeholder="Ej.: ¿Qué tatuaje vamos a promocionar?"></label>
        <div class="row"><label class="fld half"><span>Icono</span><select data-k="icon">${opts(R.ICONS, d.icon)}</select></label><label class="fld half"><span>Rondas máximas de revisión</span><input data-k="maxRounds" type="number" min="1" max="4" value="${d.maxRounds || 2}"></label></div>
        <div class="sw">${R.COLORS.map(c => `<button type="button" class="swc ${c === d.color ? 'on' : ''}" style="--c:${c}" data-a="roomColor" data-c="${c}" aria-label="Color ${c}"></button>`).join('')}</div></div>
      <h3 class="mt">Agentes</h3>
      ${d.agents.map((a, i) => `<div class="glass box ag" data-i="${i}" style="--c:${a.color}"><div class="ag-h">${av(a, 40)}<b>${i + 1}. ${esc(a.name || 'Agente')}</b><div class="sp"></div>
          <button class="ib" data-a="agUp" data-i="${i}" ${i ? '' : 'disabled'} title="Subir">${ic('up', 16)}</button><button class="ib" data-a="agDown" data-i="${i}" ${i < d.agents.length - 1 ? '' : 'disabled'} title="Bajar">${ic('down', 16)}</button><button class="ib" data-a="agDel" data-i="${i}" ${d.agents.length > 2 ? '' : 'disabled'} title="Quitar">${ic('trash', 16)}</button></div>
        <div class="row"><label class="fld half"><span>Nombre</span><input data-ag="name" value="${esc(a.name)}" maxlength="24"></label><label class="fld half"><span>Papel</span><input data-ag="role" value="${esc(a.role)}" maxlength="40"></label></div>
        <label class="fld"><span>Instrucciones (qué hace, cómo piensa, qué entrega)</span><textarea data-ag="prompt" rows="4" placeholder="Eres … Tu trabajo es …">${esc(a.prompt)}</textarea></label>
        <div class="row"><label class="fld third"><span>Icono</span><select data-ag="icon">${opts(R.ICONS, a.icon)}</select></label><label class="fld third"><span>Herramienta</span><select data-ag="tool">${Object.entries(R.TOOLS).map(([k, v]) => `<option value="${k}" ${k === (a.tool || '') ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          <label class="fld third"><span>Revisa y regresa a</span><select data-ag="back"><option value="">— no revisa —</option>${d.agents.filter((_, j) => j < i).map(b => `<option value="${b.id}" ${b.id === a.back ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label></div>
        <div class="sw">${R.COLORS.map(c => `<button type="button" class="swc ${c === a.color ? 'on' : ''}" style="--c:${c}" data-a="agColor" data-i="${i}" data-c="${c}" aria-label="Color ${c}"></button>`).join('')}</div></div>`).join('')}
      ${d.agents.length < 8 ? `<button class="btn ghost wide" data-a="agAdd">${ic('plus', 16)}Agregar agente</button>` : ''}
      <div class="row end mt">${own ? `<button class="btn ghost" data-a="roomDel">${ic('trash', 15)}Borrar sala</button>` : ''}<div class="sp"></div><button class="btn pri" data-a="roomSave">${ic('check', 15)}Guardar sala</button></div></section>`;
  }
  view.addEventListener('input', e => { if (!draft || !$('.edit')) return; const k = e.target.dataset.k, g = e.target.dataset.ag; if (k) draft[k] = k === 'maxRounds' ? +e.target.value : e.target.value; if (g) { const i = +e.target.closest('.ag').dataset.i; draft.agents[i][g] = e.target.value; if (g === 'icon' || g === 'name') { const sc = scrollY; editor(draft._for); scrollTo(0, sc); } } });

  /* ───────── Acciones ───────── */
  view.addEventListener('submit', e => { if (e.target.id === 'ask') { e.preventDefault(); start(live.room, readInputs(live.room)); } });
  view.addEventListener('keydown', e => { if (e.target.classList.contains('coin-in') && (e.key === 'Enter' || e.key === ',' || e.key === ' ')) { e.preventDefault(); addCoin(e.target); } });
  view.addEventListener('focusout', e => { if (e.target.classList && e.target.classList.contains('coin-in') && e.target.value.trim()) addCoin(e.target); });
  function addCoin(inp) { let s = inp.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!s) return; if (!/USDT$/.test(s)) s += 'USDT'; const box = inp.parentElement, have = $$('.coin', box).map(b => b.dataset.c); inp.value = ''; if (have.includes(s) || have.length >= 8) return toast(have.length >= 8 ? 'Máximo 8 monedas' : 'Ya está'); inp.insertAdjacentHTML('beforebegin', `<button type="button" class="coin" data-a="rmCoin" data-c="${esc(s)}">${esc(s.replace(/USDT$/, ''))}${ic('x', 12)}</button>`); }
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (a === 'login') { e.preventDefault(); try { await C.signIn(); } catch (er) { toast('No se pudo iniciar sesión'); } }
    else if (a === 'rmCoin') b.remove();
    else if (a === 'stop') { if (live && live.ctrl) live.ctrl.abort(); }
    else if (a === 'again') { const inp = live.inputs; live.events = []; live.running = false; live.ctx = null; live.proposal = null; live.replay = null; live.inputs = inp; if (location.hash !== '#/sala/' + live.room.id) location.hash = '#/sala/' + live.room.id; else { live.scene.reset(); paintPanel(); } }
    else if (a === 'copy') { try { await navigator.clipboard.writeText((live.ctx && live.ctx.report) || (live.events.filter(x => x.type === 'msg').pop() || {}).text || ''); toast('Informe copiado'); } catch { toast('No se pudo copiar'); } }
    else if (a === 'sendPend') { try { if (!C.user()) await C.signIn(); if (!C.user()) return; const p = await T.sendProposal(live.ctx.pending); live.ctx.pending = null; live.proposal = p; const r = S.runs.find(x => x.events === live.events); if (r) { r.proposal = p; r.outcome = 'propuesta'; save(); } toast('Enviado a Nova Bot Lab'); paintPanel(); } catch (er) { toast('No se pudo enviar: ' + er.message); } }
    else if (a === 'edit') { e.preventDefault(); location.hash = '#/editor/' + b.dataset.id; }
    else if (a === 'roomColor') { draft.color = b.dataset.c; editor(draft._for); }
    else if (a === 'agColor') { draft.agents[+b.dataset.i].color = b.dataset.c; const sc = scrollY; editor(draft._for); scrollTo(0, sc); }
    else if (['agUp', 'agDown', 'agDel', 'agAdd'].includes(a)) { const i = +b.dataset.i, A = draft.agents;
      if (a === 'agUp') [A[i - 1], A[i]] = [A[i], A[i - 1]]; if (a === 'agDown') [A[i + 1], A[i]] = [A[i], A[i + 1]]; if (a === 'agDel') { const id = A[i].id; A.splice(i, 1); A.forEach(x => { if (x.back === id) x.back = ''; }); }
      if (a === 'agAdd') { const n = A.length; A.push({id: 'a' + Date.now().toString(36), name: 'Agente ' + (n + 1), role: 'Especialista', icon: R.ICONS[(n * 5) % R.ICONS.length], color: R.COLORS[(n * 3) % R.COLORS.length], prompt: '', tool: ''}); }
      A.forEach((x, j) => { if (x.back && A.findIndex(y => y.id === x.back) >= j) x.back = ''; }); const sc = scrollY; editor(draft._for); scrollTo(0, sc); }
    else if (a === 'roomSave') { const d = draft; if (!d.name.trim()) return toast('Ponle nombre a la sala'); if (d.agents.some(x => !x.prompt.trim())) return toast('Escribe las instrucciones de cada agente');
      const clean = Object.assign({}, d, {updatedAt: Date.now()}); delete clean._for; const i = S.rooms.findIndex(x => x.id === d.id); if (i >= 0) S.rooms[i] = clean; else S.rooms.push(Object.assign(clean, {createdAt: Date.now()})); save(); draft = null; toast('Sala guardada' + (C.user() ? ' en tu cuenta' : ' en este dispositivo')); location.hash = '#/sala/' + clean.id; }
    else if (a === 'roomDel') { if (!confirm('¿Borrar esta sala?')) return; S.deleted[draft.id] = Date.now(); S.rooms = S.rooms.filter(x => x.id !== draft.id); save(); draft = null; location.hash = '#/'; }
  });

  /* ───────── Rutas ───────── */
  function route() {
    const h = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    $$('[data-nav]').forEach(a => a.classList.toggle('on', (h[0] || '') === '' ? a.dataset.nav === 'home' : h[0] === 'historial' && a.dataset.nav === 'history'));
    if (h[0] === 'sala' && h[1]) { if (!$('.room') || !live || live.room.id !== h[1] || (h[2] || null) !== (live.replay ? live.replay.id : null)) roomView(h[1], h[2]); else paintPanel(); }
    else if (h[0] === 'historial') history();
    else if (h[0] === 'editor') editor(h[1] || 'nueva');
    else home();
  }
  addEventListener('hashchange', () => { route(); scrollTo(0, 0); });
  SC.sky($('#sky')); paintAcct(); route(); AI.boot().then(() => { if (!$('.room')) route(); }).catch(() => {});
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  window.SalaApp = {state: () => S, live: () => live, start: (id, inputs) => { const r = roomById(id); location.hash = '#/sala/' + id; route(); return start(r, inputs); }};
})();
