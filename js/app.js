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

  const lookPicker = (look, attrs) => `<div class="lookp" ${attrs}><div class="lookp-prev">${av(look, 54)}</div><div class="lookp-c"><div class="icg">${R.ICONS.map(k => `<button type="button" class="icb ${k === look.icon ? 'on' : ''}" data-icon="${k}" style="--c:${look.color}" aria-label="${k}"><img src="icons/bots/${k}.png" alt=""></button>`).join('')}</div>
    <div class="sw">${R.COLORS.map(c => `<button type="button" class="swc ${c === look.color ? 'on' : ''}" style="--c:${c}" data-color="${c}" aria-label="Color ${c}"></button>`).join('')}</div></div></div>`;
  function inputHTML(room, vals) {
    const help = f => f.help ? `<small class="hlp">${esc(f.help)}</small>` : '';
    return room.inputs.map(f => { const v = vals && vals[f.id] != null ? vals[f.id] : f.def;
      if (f.type === 'textarea') return `<label class="fld"><span>${esc(f.label)}</span>${help(f)}<textarea name="${f.id}" rows="3" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea></label>`;
      if (f.type === 'text') return `<label class="fld"><span>${esc(f.label)}</span>${help(f)}<input name="${f.id}" maxlength="40" placeholder="${esc(f.placeholder || '')}" value="${esc(v)}"></label>`;
      if (f.type === 'select') return `<label class="fld half"><span>${esc(f.label)}</span><select name="${f.id}">${f.options.map(o => `<option value="${o[0]}" ${o[0] === v ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>`;
      if (f.type === 'pills') return `<div class="fld"><span>${esc(f.label)}</span>${help(f)}<div class="pills" data-f="${f.id}">${f.options.map(o => `<button type="button" class="pl ${o[0] === v ? 'on' : ''}" data-v="${o[0]}">${esc(o[1])}</button>`).join('')}</div></div>`;
      if (f.type === 'style') return `<div class="fld"><span>${esc(f.label)}</span>${help(f)}<div class="styles" data-f="${f.id}">${f.options.map(o => `<button type="button" class="stc ${o[0] === v ? 'on' : ''}" data-v="${o[0]}"><img src="icons/bots/${o[3] || 'robot'}.png" alt=""><b>${esc(o[1])}</b><small>${esc(o[2])}</small></button>`).join('')}</div></div>`;
      if (f.type === 'range' || f.type === 'number') return `<label class="fld"><span>${esc(f.label)} <b class="rv" data-for="${f.id}">${esc(v)}${esc(f.unit || '')}</b></span>${help(f)}<input name="${f.id}" type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${esc(v)}" data-unit="${esc(f.unit || '')}"></label>`;
      if (f.type === 'look') return `<div class="fld"><span>${esc(f.label)}</span>${help(f)}${lookPicker(v, `data-f="${f.id}" data-icon-v="${esc(v.icon)}" data-color-v="${esc(v.color)}"`)}</div>`;
      if (f.type === 'coins') return `<div class="fld"><span>${esc(f.label)}</span>${help(f)}<div class="coins" data-f="${f.id}">${(v || []).map(c => `<button type="button" class="coin" data-a="rmCoin" data-c="${esc(c)}">${esc(c.replace(/USDT$/, ''))}${ic('x', 12)}</button>`).join('')}<input class="coin-in" placeholder="+ moneda" maxlength="10" aria-label="Agregar moneda"></div>${f.quick ? `<div class="quick">${f.quick.map(c => `<button type="button" class="qk" data-a="qkCoin" data-c="${c}">+ ${c.replace(/USDT$/, '')}</button>`).join('')}</div>` : ''}</div>`;
      return '';
    }).join('');
  }
  function readInputs(room) {
    const o = {}; for (const f of room.inputs) {
      if (f.type === 'coins') o[f.id] = $$(`.coins[data-f="${f.id}"] .coin`).map(b => b.dataset.c);
      else if (f.type === 'pills' || f.type === 'style') { const on = $(`[data-f="${f.id}"] .on`); o[f.id] = on ? on.dataset.v : f.def; }
      else if (f.type === 'look') { const el = $(`.lookp[data-f="${f.id}"]`); o[f.id] = el ? {icon: el.dataset.iconV, color: el.dataset.colorV} : f.def; }
      else { const el = $(`[name="${f.id}"]`); o[f.id] = el ? (f.type === 'number' || f.type === 'range' ? Math.max(f.min, Math.min(f.max, +el.value || f.def)) : el.value.trim()) : f.def; }
    } return o;
  }
  function paintPanel() {
    const P = $('#panel'); if (!P || !live) return; const room = live.room, ev = live.events;
    if (!ev.length && !live.running) {
      P.innerHTML = `<div class="setup"><h3>${room.kind === 'bots' ? 'Diseña tu bot' : 'Pedido para el equipo'}</h3>${room.kind === 'bots' ? '<p class="intro">Elige cómo quieres tu bot. El equipo lo diseña, lo prueba con datos reales y, si pasa todos los filtros, te llega a Nova Bot Lab.</p>' : ''}<form id="ask">${inputHTML(room, live.inputs)}<button class="btn pri wide" type="submit">${ic('play', 16)}Iniciar sesión de agentes</button></form>
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
    if (!inputs.goal && room.inputs.some(f => f.id === 'goal') && !room.inputs.some(f => f.type === 'style')) { toast('Escribe tu pedido para el equipo'); return; }
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

  /* ───────── Asistente para crear salas y agentes (paso a paso, con explicaciones) ───────── */
  let draft = null, wz = {step: 1, ag: null, agDraft: null};
  const STEPS = [['Propósito', 'Para qué es tu sala'], ['Equipo', 'Quiénes trabajan'], ['Revisión', 'Quién revisa a quién'], ['Listo', 'Vista previa y guardar']];
  const toolInfo = {'': ['Sin herramienta', 'Solo piensa con lo que le dicen sus compañeros.', 'motor'], market: ['Datos del mercado', 'Lee velas reales de las monedas que elijas (tendencia, volatilidad, niveles).', 'chart'], bots: ['Mis bots de Nova Bot Lab', 'Lee tus bots y sus resultados para comparar.', 'bots']};
  const newId = () => 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  function editor(id) {
    if (!draft || draft._for !== id) { const r = id !== 'nueva' && S.rooms.find(x => x.id === id); draft = r ? JSON.parse(JSON.stringify(r)) : null; if (draft) draft._for = id; wz = {step: draft ? 2 : 1, ag: null, agDraft: null, tpl: !!draft}; }
    const own = draft && S.rooms.some(x => x.id === draft.id);
    const head = `<div class="room-bar"><a class="ib" href="#/" aria-label="Volver">${ic('back')}</a><div><h1>${own ? 'Editar sala' : 'Crear sala'}</h1><small>Te explico cada paso. Puedes cambiar todo después.</small></div></div>
      <ol class="steps">${STEPS.map((x, i) => `<li class="${wz.step === i + 1 ? 'on' : wz.step > i + 1 ? 'done' : ''}"><button type="button" data-a="wzGo" data-s="${i + 1}" ${draft ? '' : 'disabled'}><i>${wz.step > i + 1 ? ic('check', 13) : i + 1}</i><span><b>${x[0]}</b><small>${x[1]}</small></span></button></li>`).join('')}</ol>`;
    let body = '';
    if (!draft) body = `<div class="tip glass">${ic('motor', 18)}<p><b>Una sala es un equipo de agentes de IA.</b> Cada agente tiene un papel (investigar, criticar, escribir…). Hablan en orden, se pasan el trabajo y el último te entrega el resultado. Empieza con una plantilla o en blanco.</p></div>
      <div class="tpls">${R.TEMPLATES.map(t => `<button type="button" class="tpl glass" data-a="wzTpl" data-t="${t.id}" style="--c:${t.color}"><div class="stack">${t.agents.map(a => av(a, 30)).join('')}</div><b>${esc(t.name)}</b><small>${esc(t.desc)}</small><span>${t.agents.length} agentes</span></button>`).join('')}</div>`;
    else if (wz.step === 1) body = `<div class="glass box"><div class="q"><b>¿Cómo se llama tu sala?</b><small>Un nombre corto para encontrarla rápido.</small></div><input data-k="name" value="${esc(draft.name)}" maxlength="40" placeholder="Ej.: Sala de contenido de tatuajes">
        <div class="q"><b>¿Para qué sirve?</b><small>Una línea. Sale en la tarjeta de la sala.</small></div><input data-k="desc" value="${esc(draft.desc)}" maxlength="200">
        <div class="q"><b>¿Qué te va a preguntar al empezar?</b><small>La pregunta que verás cada vez que abras la sala.</small></div><input data-k="ask" value="${esc(draft.ask || '')}" maxlength="120" placeholder="Ej.: ¿Qué tatuaje vamos a publicar?">
        <div class="q"><b>Icono y color de la sala</b></div>${lookPicker({icon: draft.icon, color: draft.color}, 'data-room="1"')}</div>`;
    else if (wz.step === 2) body = `<div class="tip glass">${ic('motor', 18)}<p>Hablan <b>en el orden de la lista</b>: el primero empieza y le pasa su trabajo al siguiente. Toca un agente para cambiar su personaje, papel, instrucciones o herramientas. Entre 2 y 8 agentes.</p></div>
      <div class="agl">${draft.agents.map((a, i) => `<div class="agc glass" style="--c:${a.color}"><button type="button" class="agc-main" data-a="agOpen" data-i="${i}">${av(a, 46)}<span><b>${i + 1}. ${esc(a.name)}</b><small>${esc(a.role)}${a.tool ? ' · ' + toolInfo[a.tool][0] : ''}${a.back ? ' · revisa' : ''}</small></span></button>
        <div class="agc-x"><button class="ib" data-a="agUp" data-i="${i}" ${i ? '' : 'disabled'} title="Antes">${ic('up', 15)}</button><button class="ib" data-a="agDown" data-i="${i}" ${i < draft.agents.length - 1 ? '' : 'disabled'} title="Después">${ic('down', 15)}</button><button class="ib" data-a="agDel" data-i="${i}" ${draft.agents.length > 2 ? '' : 'disabled'} title="Quitar">${ic('trash', 15)}</button></div></div>`).join('')}</div>
      ${draft.agents.length < 8 ? `<button class="btn ghost wide" data-a="agNew">${ic('plus', 16)}Agregar agente</button>` : ''}`;
    else if (wz.step === 3) body = `<div class="tip glass">${ic('retry', 18)}<p>Un agente que <b>revisa</b> puede aprobar el trabajo o <b>regresarlo</b> a un compañero anterior para que lo mejore. El último agente siempre revisa y te entrega el resultado.</p></div>
      <div class="flowv glass">${draft.agents.map((a, i) => `${i ? `<span class="arr">${ic('back', 14)}</span>` : ''}<span class="fa">${av(a, 36)}<small>${esc(a.name)}</small></span>`).join('')}<span class="arr">${ic('back', 14)}</span><span class="fa">${av(null, 36)}<small>Tú</small></span></div>
      <div class="glass box">${draft.agents.map((a, i) => i ? `<div class="rvrow">${av(a, 30)}<b>${esc(a.name)}</b><select data-back="${i}"><option value="">Solo pasa su trabajo</option>${draft.agents.slice(0, i).map(b => `<option value="${b.id}" ${b.id === a.back ? 'selected' : ''}>Revisa y puede regresarlo a ${esc(b.name)}</option>`).join('')}</select></div>` : '').join('')}
      <div class="q"><b>¿Cuántas veces puede regresar el trabajo?</b><small>Más rondas = mejor resultado, pero tarda más y usa más IA.</small></div><div class="pills">${[1, 2, 3, 4].map(n => `<button type="button" class="pl ${n === (draft.maxRounds || 2) ? 'on' : ''}" data-a="wzRounds" data-n="${n}">${n}</button>`).join('')}</div></div>`;
    else body = `<div class="prev glass" id="wzPrev"></div><div class="glass box"><b>${esc(draft.name || 'Sin nombre')}</b><small class="dim">${esc(draft.desc || '')}</small>
      <ol class="team">${draft.agents.map(a => `<li>${av(a, 30)}<div><b>${esc(a.name)}</b><small>${esc(a.role)}${a.tool ? ' · ' + toolInfo[a.tool][0] : ''}</small></div></li>`).join('')}</ol></div>`;
    const nav = draft ? `<div class="row end mt">${own && wz.step === 4 ? `<button class="btn ghost" data-a="roomDel">${ic('trash', 15)}Borrar sala</button>` : ''}${wz.step > 1 ? `<button class="btn ghost" data-a="wzGo" data-s="${wz.step - 1}">${ic('back', 15)}Atrás</button>` : ''}<div class="sp"></div>${wz.step < 4 ? `<button class="btn pri" data-a="wzGo" data-s="${wz.step + 1}">Siguiente</button>` : `<button class="btn pri" data-a="roomSave">${ic('check', 15)}Guardar sala</button>`}</div>` : '';
    view.innerHTML = `<section class="edit">${head}${body}${nav}${agentSheet()}</section>`;
    if (draft && wz.step === 4) { const r = R.normalizeCustom(draft), sc = SC.Scene($('#wzPrev'), r); demo(sc, r); }
  }
  async function demo(sc, r) { // pequeña demostración: el trabajo recorre la sala
    const el = $('#wzPrev'); sc.on({type: 'start'}); for (let i = 0; i < r.flow.length; i++) { if (!el.isConnected) return; const a = r.agents.find(x => x.id === r.flow[i]); sc.on({type: 'think', agent: a.id}); await new Promise(z => setTimeout(z, 700)); if (!el.isConnected) return; await sc.on({type: 'msg', agent: a.id, to: r.flow[i + 1] || 'user', text: a.role + ': ' + (a.prompt || '').slice(0, 90), verdict: a.output === 'verdict' ? 'aprobado' : null}); }
    if (el.isConnected) sc.on({type: 'done', outcome: 'informe'});
  }
  function agentSheet() {
    if (wz.ag == null || !wz.agDraft) return ''; const a = wz.agDraft, i = wz.ag, prev = draft.agents.slice(0, i < 0 ? draft.agents.length : i);
    return `<div class="sheet-bg" data-a="agCancel"></div><div class="sheet glass" role="dialog" aria-label="Agente"><div class="sheet-h">${av(a, 48)}<div><b>${esc(a.name || 'Nuevo agente')}</b><small>${esc(a.role || 'Elige su papel')}</small></div><div class="sp"></div><button class="ib" data-a="agCancel" aria-label="Cerrar">${ic('x', 16)}</button></div>
      <div class="sheet-b">
        <div class="q"><b>1. ¿Qué papel tiene?</b><small>Elige uno y ya trae sus instrucciones. Luego las puedes ajustar.</small></div>
        <div class="roles">${R.ROLES.map(r => `<button type="button" class="rl ${a.preset === r.id ? 'on' : ''}" data-a="agRole" data-r="${r.id}" style="--c:${r.color}"><img src="icons/bots/${r.icon}.png" alt=""><b>${esc(r.name)}</b><small>${esc(r.desc)}</small></button>`).join('')}</div>
        <div class="q"><b>2. Su personaje</b><small>Nombre, icono y color con los que lo verás en la sala.</small></div>
        <div class="row"><input data-ag="name" value="${esc(a.name)}" maxlength="24" placeholder="Nombre"><button type="button" class="btn ghost sm" data-a="agName">Sugerir nombre</button></div>
        ${lookPicker({icon: a.icon, color: a.color}, 'data-agl="1"')}
        <div class="q"><b>3. Instrucciones</b><small>Dile qué recibe, qué debe hacer y qué entrega. Ejemplo: «Eres… Tu trabajo es… Entrega…».</small></div>
        <input data-ag="role" value="${esc(a.role)}" maxlength="40" placeholder="Papel (ej.: Guionista)"><textarea data-ag="prompt" rows="5">${esc(a.prompt)}</textarea>
        <div class="q"><b>4. Herramienta</b><small>Datos reales que usa antes de hablar.</small></div>
        <div class="tools">${Object.entries(toolInfo).map(([k, v]) => `<button type="button" class="tl ${k === (a.tool || '') ? 'on' : ''}" data-a="agTool" data-t="${k}">${ic(v[2], 16)}<b>${v[0]}</b><small>${v[1]}</small></button>`).join('')}</div>
        ${prev.length ? `<div class="q"><b>5. ¿Revisa el trabajo de alguien?</b><small>Si lo eliges, podrá aprobar o regresar el trabajo a ese compañero.</small></div><select data-ag="back"><option value="">No, solo hace su parte</option>${prev.map(b => `<option value="${b.id}" ${b.id === a.back ? 'selected' : ''}>Sí, puede regresarlo a ${esc(b.name)}</option>`).join('')}</select>` : ''}
      </div><div class="row end sheet-f"><button class="btn ghost" data-a="agCancel">Cancelar</button><div class="sp"></div><button class="btn pri" data-a="agOk">${ic('check', 15)}${i < 0 ? 'Agregar agente' : 'Listo'}</button></div></div>`;
  }
  const rerender = () => { const sc = scrollY, sb = $('.sheet-b'), st = sb ? sb.scrollTop : 0; editor(draft ? draft._for : 'nueva'); scrollTo(0, sc); const nb = $('.sheet-b'); if (nb) nb.scrollTop = st; };
  view.addEventListener('input', e => {
    if (e.target.type === 'range' && e.target.name) { const o = $(`.rv[data-for="${e.target.name}"]`); if (o) o.textContent = e.target.value + (e.target.dataset.unit || ''); }
    if (!draft || !$('.edit')) return; const k = e.target.dataset.k, g = e.target.dataset.ag;
    if (k) draft[k] = e.target.value; if (g && wz.agDraft) { wz.agDraft[g] = e.target.value; if (g === 'name' || g === 'role') { const h = $('.sheet-h b'), r = $('.sheet-h small'); if (g === 'name' && h) h.textContent = e.target.value || 'Nuevo agente'; if (g === 'role' && r) r.textContent = e.target.value; } }
  });
  view.addEventListener('change', e => { if (draft && e.target.dataset.back != null) { draft.agents[+e.target.dataset.back].back = e.target.value; } if (e.target.dataset.ag === 'back' && wz.agDraft) wz.agDraft.back = e.target.value; });
  /* selección visual: botones tipo pastilla, tarjetas de estilo e iconos/colores */
  view.addEventListener('click', e => {
    const pl = e.target.closest('.pills[data-f] .pl, .styles .stc'); if (pl) { pl.parentElement.querySelectorAll('.on').forEach(x => x.classList.remove('on')); pl.classList.add('on'); return; }
    const icb = e.target.closest('.icb, .lookp .swc'); if (!icb) return; const lp = icb.closest('.lookp');
    const look = {icon: icb.dataset.icon || (lp.dataset.iconV || (lp.querySelector('.icb.on') || {}).dataset.icon), color: icb.dataset.color || lp.dataset.colorV || (lp.querySelector('.swc.on') || {}).dataset.color};
    if (lp.dataset.room && draft) { draft.icon = look.icon; draft.color = look.color; } if (lp.dataset.agl && wz.agDraft) { Object.assign(wz.agDraft, look); }
    lp.dataset.iconV = look.icon; lp.dataset.colorV = look.color; lp.outerHTML = lookPicker(look, [...lp.attributes].filter(x => x.name !== 'class').map(x => `${x.name}="${esc(x.value)}"`).join(' '));
    if (lp.dataset.agl) { const h = $('.sheet-h .av'); if (h) h.outerHTML = av(wz.agDraft, 48); }
  });

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
    else if (a === 'qkCoin') { const inp = b.closest('.fld').querySelector('.coin-in'); inp.value = b.dataset.c; addCoin(inp); }
    else if (a === 'wzTpl') { const t = R.TEMPLATES.find(x => x.id === b.dataset.t); draft = {id: 'u' + Date.now().toString(36), name: t.id === 'blanco' ? '' : t.name, desc: t.id === 'blanco' ? '' : t.desc, ask: t.ask, icon: t.icon, color: t.color, maxRounds: 2, agents: JSON.parse(JSON.stringify(t.agents)), _for: 'nueva'}; wz.step = 1; editor('nueva'); scrollTo(0, 0); }
    else if (a === 'wzGo') { const n = +b.dataset.s; if (n > 1 && !String(draft.name || '').trim()) { wz.step = 1; editor(draft._for); return toast('Ponle nombre a la sala'); } if (n > 2 && draft.agents.some(x => !String(x.prompt || '').trim())) { wz.step = 2; editor(draft._for); return toast('Falta escribir las instrucciones de algún agente'); } wz.step = n; editor(draft._for); scrollTo(0, 0); }
    else if (a === 'wzRounds') { draft.maxRounds = +b.dataset.n; rerender(); }
    else if (a === 'agOpen') { wz.ag = +b.dataset.i; wz.agDraft = JSON.parse(JSON.stringify(draft.agents[wz.ag])); rerender(); }
    else if (a === 'agNew') { const n = draft.agents.length, used = new Set(draft.agents.map(x => x.name)); wz.ag = -1; wz.agDraft = {id: newId(), name: R.NAMES.find(x => !used.has(x)) || 'Agente ' + (n + 1), role: '', icon: R.ICONS[(n * 5) % R.ICONS.length], color: R.COLORS[(n * 3) % R.COLORS.length], prompt: '', tool: '', back: ''}; rerender(); }
    else if (a === 'agCancel') { wz.ag = null; wz.agDraft = null; rerender(); }
    else if (a === 'agRole') { const r = R.ROLES.find(x => x.id === b.dataset.r), d = wz.agDraft; d.preset = r.id; d.role = r.name; d.prompt = r.prompt; d.icon = r.icon; d.color = r.color; rerender(); }
    else if (a === 'agName') { const used = new Set(draft.agents.map(x => x.name)), pool = R.NAMES.filter(x => !used.has(x) && x !== wz.agDraft.name); wz.agDraft.name = pool[Math.floor(Math.random() * pool.length)] || wz.agDraft.name; rerender(); }
    else if (a === 'agTool') { wz.agDraft.tool = b.dataset.t; rerender(); }
    else if (a === 'agOk') { const d = wz.agDraft; if (!String(d.name).trim()) return toast('Ponle nombre al agente'); if (!String(d.prompt).trim()) return toast('Elige un papel o escribe sus instrucciones'); if (!d.role) d.role = 'Agente'; delete d.preset; if (wz.ag < 0) { const L = draft.agents, last = L[L.length - 1]; if (last && last.back) L.splice(L.length - 1, 0, d); else L.push(d); } else draft.agents[wz.ag] = d; wz.ag = null; wz.agDraft = null; rerender(); }
    else if (['agUp', 'agDown', 'agDel'].includes(a)) { const i = +b.dataset.i, A = draft.agents;
      if (a === 'agUp') [A[i - 1], A[i]] = [A[i], A[i - 1]]; if (a === 'agDown') [A[i + 1], A[i]] = [A[i], A[i + 1]]; if (a === 'agDel') { const id = A[i].id; A.splice(i, 1); A.forEach(x => { if (x.back === id) x.back = ''; }); }
      A.forEach((x, j) => { if (x.back && A.findIndex(y => y.id === x.back) >= j) x.back = ''; }); rerender(); }
    else if (a === 'roomSave') { const d = draft; if (!String(d.name).trim()) return toast('Ponle nombre a la sala'); if (d.agents.some(x => !String(x.prompt).trim())) return toast('Escribe las instrucciones de cada agente');
      const clean = Object.assign({}, d, {updatedAt: Date.now()}); delete clean._for; const i = S.rooms.findIndex(x => x.id === d.id); if (i >= 0) S.rooms[i] = clean; else S.rooms.push(Object.assign(clean, {createdAt: Date.now()})); save(); draft = null; toast('Sala guardada' + (C.user() ? ' en tu cuenta' : ' en este dispositivo')); location.hash = '#/sala/' + clean.id; }
    else if (a === 'roomDel') { if (!confirm('¿Borrar esta sala?')) return; S.deleted[draft.id] = Date.now(); S.rooms = S.rooms.filter(x => x.id !== draft.id); save(); draft = null; location.hash = '#/'; }
  });

  /* ───────── Rutas ───────── */
  function route() {
    const h = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    $$('[data-nav]').forEach(a => a.classList.toggle('on', (h[0] || '') === '' ? a.dataset.nav === 'home' : h[0] === 'historial' && a.dataset.nav === 'history'));
    if (h[0] === 'sala' && h[1]) { if (!$('.room') || !live || live.room.id !== h[1] || (h[2] || null) !== (live.replay ? live.replay.id : null)) roomView(h[1], h[2]); else paintPanel(); }
    else if (h[0] === 'historial') history();
    else if (h[0] === 'editor') { if (h[1] === 'nueva' && draft && draft._for === 'nueva' && !$('.edit')) { draft = null; } editor(h[1] || 'nueva'); }
    else home();
  }
  addEventListener('hashchange', () => { route(); scrollTo(0, 0); });
  SC.sky($('#sky')); paintAcct(); route(); AI.boot().then(() => { if (!$('.room')) route(); }).catch(() => {});
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  window.SalaApp = {state: () => S, live: () => live, start: (id, inputs) => { const r = roomById(id); location.hash = '#/sala/' + id; route(); return start(r, inputs); }};
})();
