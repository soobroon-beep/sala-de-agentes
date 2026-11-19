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
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', open: '<path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5"/>', retry: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5"/>', oct: '<path d="M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7z"/><path d="M12 8v5M12 16h.01"/>', tri: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    wand: '<path d="M5 19L15 9M14 4v2M19 9h2M17.5 6.5l1.5-1.5M14 9l1 1"/>', off: '<path d="M4 4l16 16M9 5h9a2 2 0 0 1 2 2v9M16 19H6a2 2 0 0 1-2-2V8"/>', blank: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16"/>', code: '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>',
    tap: '<path d="M9 11V5a2 2 0 0 1 4 0v5l4 1a2 2 0 0 1 1.5 2.2L18 20H10l-4-5a1.6 1.6 0 0 1 2.5-2z"/>', gh: '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 8v8M8 6h4a4 4 0 0 1 4 4v0"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    power: '<path d="M12 3v8M7 6.5a7 7 0 1 0 10 0"/>', server: '<rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/><path d="M8 7.5h.01M8 16.5h.01"/>', users: '<circle cx="9" cy="9" r="3"/><path d="M3 19a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M21 19a6 6 0 0 0-4-5.6"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>', wrench: '<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 1-2-2z"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>', brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>', note: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', gauge: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/>', layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    pc: '<rect x="3" y="5" width="18" height="11" rx="1.5"/><path d="M9 20h6M12 16v4"/>', phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>', motor: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'
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
    const mem = !a.mem ? b.mem : !b.mem ? a.mem : ((b.mem.updatedAt || 0) > (a.mem.updatedAt || 0) ? b.mem : a.mem); // llave de la memoria compartida
    const auto = !a.auto ? b.auto : !b.auto ? a.auto : ((b.auto.updatedAt || 0) > (a.auto.updatedAt || 0) ? b.auto : a.auto); // ajustes del modo automático (24/7)
    const rm = Object.assign({}, a.roomMem || {}); for (const [k, v] of Object.entries(b.roomMem || {})) if (!rm[k] || (v.updatedAt || 0) > (rm[k].updatedAt || 0)) rm[k] = v; // memoria de cada sala
    const rv = Object.assign({}, a.roomVer || {}); for (const [k, l] of Object.entries(b.roomVer || {})) { const m = new Map((rv[k] || []).concat(l).map(x => [x.v + ':' + x.at, x])); rv[k] = [...m.values()].sort((x, y) => y.at - x.at).slice(0, 6); }
    return {v: 2, roomVer: rv, roomMem: rm, rooms: un(a.rooms || [], b.rooms || []), runs: un(a.runs || [], b.runs || []).sort((x, y) => y.at - x.at).slice(0, 20), deleted: del, mem: mem || null, auto: auto || null};
  }
  function save() {
    S.runs = S.runs.slice(0, 20); try { localStorage.setItem(LS, JSON.stringify(S)); } catch { S.runs = S.runs.slice(0, 8); try { localStorage.setItem(LS, JSON.stringify(S)); } catch {} }
    clearTimeout(cloudT); cloudT = setTimeout(async () => { if (!C.user()) return; try { let str = JSON.stringify(S); if (str.length > 900000) { S.runs = S.runs.slice(0, 8); str = JSON.stringify(S); } await C.set('sala', {s: str, at: Date.now()}); } catch (e) { console.warn('No se guardó en tu cuenta', e); } }, 900);
  }
  async function pull() { try { const d = await C.get('sala'); if (d && d.s) { S = mergeStore(S, JSON.parse(d.s)); save(); route(); } else if (S.rooms.length || S.runs.length) save(); } catch (e) { console.warn(e); } }
  const rooms = () => R.BUILTIN.concat(S.rooms.map(R.normalizeCustom));
  let curRoom = null; // la sala en la que entraste: Revisión y Memoria muestran solo lo suyo (sin sala: todo)
  const memOf = id => (S.roomMem = S.roomMem || {})[id] || {notes: '', updatedAt: 0};
  const withMem = r => { const m = memOf(r.id); return m.notes ? Object.assign({}, r, {memory: m.notes}) : r; };
  const roomById = id => id === R.REVISION.id ? R.REVISION : rooms().find(r => r.id === id);

  /* ───────── Lo que hacen tus agentes solos en el servidor (24/7): users/<tú>/data/sala_auto y sala_revision ───────── */
  const SRV = {auto: null, rev: null, at: 0, busy: false};
  async function pullServer(force) {
    if (!C.user() || SRV.busy || (!force && Date.now() - SRV.at < 45000)) return; SRV.busy = true;
    try { const [a, r] = await Promise.all([C.get('sala_auto'), C.get('sala_revision')]); const changed = (a && a.at) !== (SRV.auto && SRV.auto.at) || (r && r.at) !== (SRV.rev && SRV.rev.at); SRV.auto = a; SRV.rev = r; SRV.at = Date.now(); if (changed && !$('.room') && !$('.edit')) route(); }
    catch (e) { console.warn('No se leyó el modo automático', e); } finally { SRV.busy = false; }
  }
  const autoRuns = () => ((SRV.auto && SRV.auto.runs) || []).concat((SRV.rev && SRV.rev.runs) || []);
  const allRuns = () => S.runs.concat(autoRuns()).sort((x, y) => y.at - x.at);
  const findRun = id => allRuns().find(x => x.id === id);
  const autoCfg = () => Object.assign({on: true, perRun: 2}, (S.auto && S.auto.taller) || {});
  const ago = t => { if (!t) return 'nunca'; const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${(m / 60).toFixed(m < 600 ? 1 : 0)} h` : `hace ${Math.round(m / 1440)} d`; };
  const inT = t => { const m = Math.round((t - Date.now()) / 6e4); return m <= 0 ? 'en cualquier momento' : m < 60 ? `en ${m} min` : `en ${(m / 60).toFixed(1)} h`; };

  /* ───────── Cuenta ───────── */
  function paintAcct() {
    const u = C.user(), b = $('#acct');
    b.innerHTML = u ? (u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : `<span>${esc((u.displayName || u.email || '?')[0])}</span>`) : '<span class="acct-in">Iniciar sesión</span>';
    b.title = u ? `${u.displayName || u.email} · tocar para cerrar sesión` : 'Inicia sesión con Google (la misma cuenta de VORTEX)';
  }
  $('#acct').onclick = async () => { try { if (C.user()) { if (confirm('¿Cerrar sesión?')) await C.signOut(); } else await C.signIn(); } catch (e) { toast('No se pudo iniciar sesión: ' + (e.code || e.message)); } };
  C.init().then(ok => { paintAcct(); if (!ok) return; C.on(u => { paintAcct(); if (u) { AI.resetOwn(); pull(); pullServer(true); if (window.SalaConn) window.SalaConn.refresh(); if (live && live.ctx && live.ctx.pending) route(); } }); });

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
    curRoom = null; paintNav(); const rs = rooms();
    view.innerHTML = `<section class="home">
      <div class="hero"><h1>Salas de agentes</h1><p>Equipos de IA que hablan entre ellos, usan datos reales y te entregan el trabajo terminado. ${C.user() ? '' : '<a href="#" data-a="login">Inicia sesión</a> para guardar tus salas y enviar bots a Nova Bot Lab.'}</p></div>
      ${autoStrip()}
      <div class="grid">${rs.map(r => `<article class="card glass" style="--c:${r.color}">
        <div class="card-top"><div class="stack">${r.flow.map(id => r.agents.find(a => a.id === id)).filter(Boolean).map(a => av(a, 38)).join('')}</div>${r.builtin ? '' : `<button class="ib" data-a="edit" data-id="${r.id}" title="Editar sala">${ic('edit', 16)}</button>`}</div>
        <h2>${esc(r.name)}</h2><p>${esc(r.desc || '')}</p>
        <div class="chips">${(r.id === 'taller-bots' && autoCfg().on !== false) || (r.auto && r.auto.on) ? `<span class="on247">${ic('motor', 12)}Funciona solo${r.auto && r.auto.on ? ' · cada ' + r.auto.everyHours + ' h' : ''}</span>` : ''}<span>${r.agents.length} agentes</span><span>${r.final === 'proposal' ? 'Propone bots' : 'Entrega un informe'}</span>${r.agents.some(a => a.tool) ? '<span>Datos reales</span>' : ''}</div>
        <a class="btn pri" href="#/sala/${encodeURIComponent(r.id)}">${ic('play', 16)}Entrar a la sala</a></article>`).join('')}
        ${revCard()}
        <a class="card glass" href="#/memoria" style="--c:#fb923c"><div class="card-top"><div class="stack"><span class="av" style="--c:#fb923c;width:38px;height:38px"><img src="icons/bots/cometa.png" alt=""></span><span class="av" style="--c:#20bf9f;width:38px;height:38px"><img src="icons/bots/robot.png" alt=""></span><span class="av" style="--c:#548fff;width:38px;height:38px"><img src="icons/bots/estrella.png" alt=""></span></div></div>
          <h2>Memoria compartida</h2><p>Claude, ChatGPT y Gemini leen qué estás creando y guardan lo que avanzan, para no volver a explicarles el contexto.</p><div class="chips"><span>3 IAs</span><span>Bitácora y proyectos</span></div><span class="btn pri">${ic('open', 16)}Abrir memoria</span></a>
        <a class="card glass new" href="#/editor/nueva"><span class="plus">${ic('plus', 26)}</span><h2>Crear sala</h2><p>Arma tu propio equipo: nombre, papel e instrucciones de cada agente, quién revisa a quién y qué datos usan.</p></a>
      </div>
      <p class="foot">IA: ${esc(AI.label())}. Las pruebas de bots son simulaciones con datos históricos; nada envía órdenes reales.</p></section>`;
  }

  function autoStrip() { // Taller automático: crea y prueba bots solo, cada 3 h, aunque no abras la app
    const c = autoCfg(), a = SRV.auto, st = a && a.status || {};
    if (!C.user()) return `<div class="auto glass"><span class="pulse"></span><div><b>Tus agentes trabajan solos, 24/7</b><small>El Taller de bots y la Revisión de apps corren en el servidor aunque no abras la app. <a href="#" data-a="login">Inicia sesión</a> para ver lo que hicieron y cambiar los ajustes.</small></div></div>`;
    const off = c.on === false;
    return `<div class="auto glass ${off ? 'off' : ''}"><span class="pulse"></span><div class="auto-t"><b>Taller automático: ${off ? 'en pausa' : 'encendido'}</b>
      <small>${off ? 'El Taller no está creando bots solo (la Revisión de apps sigue cada 2 h).' : `Cada 3 horas el Taller de bots diseña y prueba <strong>${c.perRun} bot${c.perRun > 1 ? 's' : ''}</strong> nuevo${c.perRun > 1 ? 's' : ''} con datos reales; si alguno pasa tus filtros, te llega a Nova Bot Lab. Última vez: ${a ? ago(a.at) : 'aún no corre'}${st.taller ? ' · ' + esc(st.taller) : ''}.`}</small></div>
      <div class="auto-x">${off ? '' : `<span class="auto-l">Bots por turno</span><div class="pills" role="group" aria-label="Bots que prueba cada 3 horas">${[1, 2, 3].map(n => `<button type="button" class="pl ${n === +c.perRun ? 'on' : ''}" data-a="autoPer" data-n="${n}" title="Probar ${n} bot${n > 1 ? 's' : ''} cada 3 horas (más bots = más uso de IA)">${n}</button>`).join('')}</div>`}<button class="btn sm ${off ? 'pri' : 'ghost'}" data-a="autoToggle">${off ? ic('play', 14) + 'Encender' : ic('stop', 14) + 'Pausar'}</button></div></div>`;
  }

  const STC = {bien: ['Bien', 'win'], atencion: ['Atención', 'warn'], falla: ['Falla', 'lose']};
  function revCard() {
    const r = SRV.rev, room = R.REVISION, open = r ? (r.issues || []).filter(i => i.status !== 'resuelta') : [];
    return `<a class="card glass" href="#/revision/${room.id}" style="--c:${room.color}"><div class="card-top"><div class="stack">${room.flow.slice(0, 7).map(id => av(room.agents.find(a => a.id === id), 34)).join('')}</div></div>
      <h2>${esc(room.name)}</h2><p>${esc(room.desc)}</p>
      ${r ? `<div class="appdots">${Object.entries(r.apps || {}).map(([k, a]) => `<span class="ad ${a.state}" title="${esc(a.name)}: ${esc((STC[a.state] || [a.state])[0])}"><i></i>${esc(a.name)}</span>`).join('')}</div>` : ''}
      <div class="chips"><span class="on247">${ic('motor', 12)}Funciona solo · cada 2 h</span><span>${room.agents.length} agentes</span>${r ? `<span>${open.length ? open.length + ' fallas abiertas' : 'Todo bien'}</span><span>${ago(r.at)}</span>` : '<span>Primera revisión pendiente</span>'}</div>
      <div class="row2"><span class="btn pri" data-a="goSala" data-id="${room.id}">${ic('play', 16)}Entrar a la sala</span><span class="btn">${ic('open', 16)}Ver informe</span></div></a>`;
  }

  /* ───────── Revisión: de TODO (sin sala abierta) o solo de la sala en la que entraste ───────── */
  const SEV = {alta: ['Grave', 'bad', 'oct'], media: ['Media', 'warn', 'tri'], baja: ['Baja', 'info', 'info']};
  // cada tipo de falla en palabras sencillas: [prueba, icono, nombre corto, qué significa, pista para arreglarla]
  const KINDS = [
    [/^Seguridad/, 'shield', 'Riesgo de seguridad', 'Cerbero encontró algo que alguien podría aprovechar para entrar, leer tus datos o usar tus claves.', 'Corrígelo sin romper la app: saca las claves del código público (secretos del servidor), cierra las reglas de la base de datos a solo tu cuenta y limita quién puede llamar a tus servidores.'],
    [/no abre/, 'off', 'La app no abre', 'La página no carga: nadie puede entrar.', 'Revisa que el despliegue (GitHub Pages / Cloudflare Pages) haya terminado bien, que index.html exista y que ningún script tumbe la carga.'],
    [/en blanco/, 'blank', 'Pantalla en blanco', 'La página abre pero no muestra nada.', 'Busca el error que detiene el primer pintado (consola del navegador) y una ruta o archivo que no cargue.'],
    [/Error de código/, 'code', 'Error en el código', 'El navegador mostró un error rojo en la consola; esa parte de la app puede no funcionar.', 'Reproduce el error con la consola abierta, encuentra la línea que lo causa y corrígelo.'],
    [/no hacen nada/, 'tap', 'Botones que no responden', 'Se tocaron estos botones y la pantalla no cambió.', 'Revisa que cada botón tenga su acción conectada, que no lo tape otro elemento y que no truene su función.'],
    [/tarea automática/, 'gh', 'Tarea automática fallando', 'Un proceso programado de GitHub Actions está fallando.', 'Abre la ejecución fallida (enlace en la evidencia), lee el error del log y corrige el script, los secretos o los permisos.'],
    [/tarda/, 'clock', 'Carga lenta', 'La app tarda mucho en abrir.', 'Mide qué archivos o peticiones tardan más; difiere lo que no se necesita al abrir y comprime imágenes.'],
    [/se atoró/, 'bots', 'Bot atorado', 'El bot está encendido, pero el servidor dejó de avanzarlo.', 'Revisa el Motor del servidor (GitHub Actions) y el log de ese bot: qué error lo detiene.'],
    [/se apagó/, 'power', 'Bot apagado', 'Un bot que estaba encendido ya no lo está.', 'Si no lo apagaste tú, revisa qué lo apaga (límites de riesgo, error del servidor o un guardado que lo pisó).'],
    [/reporta un error/, 'bots', 'Bot con error', 'Un bot reporta un error al correr.', 'Lee el error del bot y corrige su estrategia o el motor de paper trading.'],
    [/no avanza|está detenido/, 'bots', 'Agente detenido', 'Claudio o Felipe no están avanzando.', 'Revisa su tarea automática (cada hora) y su estado (interruptor de emergencia o límites).'],
    [/Motor/, 'motor', 'El Motor no responde', 'El Motor del servidor (alertas, bots y Claudio) no da señales.', 'Revisa la tarea «Motor del servidor» en GitHub Actions de VORTEX: si está atorada, cancélala y vuelve a lanzarla.'],
    [/velas/, 'chart', 'Velas sin actualizar', 'Las velas guardadas de VORTEX están viejas.', 'Revisa el Motor y la fuente de datos (respaldo de exchanges).'],
    [/Taller/, 'motor', 'Taller automático parado', 'El Taller de bots no ha corrido en horas.', 'Revisa la tarea «Sala · Taller automático» en GitHub Actions.'],
    [/servidor|no responde/i, 'server', 'Servidor sin respuesta', 'Un servidor (Worker) de tus apps no responde.', 'Revisa el Worker en Cloudflare (despliegue, errores, límites).'],
    [/uso/, 'users', 'Bajó el uso', 'Entra mucha menos gente que antes.', 'No es un error de código: revisa si algo impide entrar o iniciar sesión.']
  ];
  const kindOf = t => { const k = KINDS.find(x => x[0].test(t)) || [null, 'tri', 'Otra falla', t, 'Investiga la causa con la evidencia.']; return {icon: k[1], label: k[2], what: k[3], hint: k[4]}; };
  const devsOf = ev => { const d = []; if (/PC/.test(ev || '')) d.push('PC'); if (/celular/.test(ev || '')) d.push('Celular'); return d; };
  const SALA_REPO = {name: 'Sala de agentes', repo: 'sala-de-agentes', url: 'https://soobroon-beep.github.io/sala-de-agentes/'};
  const appMeta = id => id === 'bots' ? {name: 'Bots y servidores de VORTEX', repo: 'Vortex-By-Nova-Nexus', url: 'https://vortex-nexus.pages.dev/'} : (R.APPS.find(a => a.id === id) || SALA_REPO);
  const workRule = m => m.repo === 'Vortex-By-Nova-Nexus' ? 'trabaja en la rama dev y no publiques en la oficial hasta que yo lo apruebe' : 'cuando esté probado, sube a main';

  /* fallas de las apps (las encuentra la Revisión de apps en el servidor) */
  function appIssues() {
    const r = SRV.rev; if (!r) return []; const room = R.REVISION;
    return (r.issues || []).filter(i => i.status !== 'resuelta').map(i => { const ag = room.agents.find(x => x.app === i.app) || room.agents.find(x => x.id === (i.app === 'seguridad' ? 'cerbero' : 'centinela')) || room.agents[0];
      return Object.assign({}, i, {group: 'app:' + i.app, groupName: (r.apps[i.app] || {}).name || i.app, ag, kind: kindOf(i.title), meta: appMeta(i.app)}); });
  }
  /* salud de una sala (sale de sus sesiones, las tuyas y las automáticas del servidor) */
  function roomIssues(room) {
    if (room.server) return appIssues();
    const runs = allRuns().filter(x => x.room === room.id), last = runs.slice(0, 10), out = [], lead = room.agents[room.agents.length - 1] || room.agents[0];
    const add = (sev, title, kind, ev, list) => out.push({id: room.id + '|' + title, group: 'room:' + room.id, groupName: room.name, ag: lead, sev, title, kind, ev, status: list && list.length && list[list.length - 1].at > Date.now() - 6 * 36e5 && list.length === 1 ? 'nueva' : 'sigue', first: list && list.length ? list[list.length - 1].at : Date.now(), seen: list ? list.length : 1, meta: SALA_REPO, room: room.id});
    const errText = x => ((x.events || []).filter(e => e.type === 'error').slice(-1)[0] || {}).text || '';
    const err = last.filter(x => x.outcome === 'error');
    if (err.length) add(err.length * 2 >= last.length ? 'alta' : 'media', `La IA falló en ${err.length} de ${last.length} sesiones de «${room.name}»`, {icon: 'code', label: 'La IA no respondió', what: 'En algunas sesiones la IA se quedó sin responder y el equipo no terminó.', hint: 'Revisa la cadena de IA de la Sala (js/ai.js y server/lib.js): qué proveedor falla y por qué (límite, clave o tiempo de espera) y que el respaldo entre de verdad.'}, errText(err[0]) || 'sin detalle', err);
    const tool = last.filter(x => (x.events || []).some(e => e.type === 'tool' && e.state === 'error'));
    if (tool.length) { const e = (tool[0].events || []).filter(e => e.type === 'tool' && e.state === 'error').slice(-1)[0] || {};
      add('media', `La herramienta «${e.tool || '?'}» falló en ${tool.length} sesión(es)`, {icon: 'wrench', label: 'Herramienta con error', what: 'Un agente no pudo leer sus datos reales (velas, backtest o tus bots) y trabajó a ciegas.', hint: 'Revisa js/tools.js: la fuente de datos de esa herramienta, su tiempo de espera y el respaldo.'}, e.text || 'sin detalle', tool); }
    const lim = last.filter(x => x.outcome === 'limite');
    if (lim.length >= 2) add('baja', `${lim.length} sesiones se quedaron sin mensajes antes de terminar`, {icon: 'clock', label: 'Sesiones sin terminar', what: 'El equipo se pasó el trabajo tantas veces que llegó al límite sin entregar resultado.', hint: 'Ajusta las instrucciones del jefe para que apruebe cuando el trabajo esté «suficientemente bien» o sube las rondas de revisión.'}, lim.map(x => when(x.at)).join(', '), lim);
    const inv = last.filter(x => x.outcome === 'spec-invalida');
    if (inv.length >= 2) add('media', `El estratega no logró una estrategia válida en ${inv.length} sesiones`, {icon: 'code', label: 'Estrategias inválidas', what: 'El agente que escribe la estrategia la entregó con un formato que el motor de backtest no entiende.', hint: 'Revisa SPEC_GUIDE en js/rooms.js y parseSpec en js/tools.js: que la guía y el validador pidan exactamente lo mismo.'}, inv.map(x => when(x.at)).join(', '), inv);
    if (room.id === 'taller-bots' && C.user()) { const c = autoCfg(), a = SRV.auto;
      if (c.on !== false && a && Date.now() - (a.at || 0) > 8 * 36e5) add('alta', 'El Taller automático no ha corrido en más de 8 horas', kindOf('Taller'), 'Última vez hace ' + ago(a.at), [{at: a.at}]);
      const st = a && a.status && a.status.taller || ''; if (/en espera/.test(st)) add('baja', 'El Taller automático está en espera', {icon: 'bots', label: 'Propuestas sin revisar', what: 'Tienes bots propuestos sin revisar en Nova Bot Lab; el Taller espera a que los revises para no llenarte de bots.', hint: 'Abre Nova Bot Lab y Agrega o Descarta las propuestas automáticas.'}, st, [{at: a.at}]);
      const auto = runs.filter(x => x.auto).slice(0, 8); if (auto.length >= 6 && !auto.some(x => x.outcome === 'propuesta')) add('baja', `Ningún bot pasó los filtros en las últimas ${auto.length} sesiones automáticas`, {icon: 'bots', label: 'Sin bots aprobados', what: 'El Taller sigue probando, pero ninguna estrategia pasó tus límites de riesgo.', hint: 'Revisa en la memoria del Taller por qué fallan y ajusta tus límites o los estilos que rota (server/plan.js).'}, auto.map(x => OUT[x.outcome] ? OUT[x.outcome][0] : x.outcome).join(' · '), auto); }
    if (room.auto && room.auto.on) { const lastAuto = runs.find(x => x.auto); if (C.user() && (!lastAuto || Date.now() - lastAuto.at > (2 * room.auto.everyHours + 3) * 36e5)) add('media', `«${room.name}» no ha corrido sola`, kindOf('Taller'), lastAuto ? 'Última sesión automática ' + ago(lastAuto.at) : 'Todavía no hay sesiones automáticas', lastAuto ? [lastAuto] : []); }
    const rank = {alta: 0, media: 1, baja: 2}; return out.sort((x, y) => rank[x.sev] - rank[y.sev]);
  }
  function fixPrompt(i) {
    const m = i.meta, d = devsOf(i.ev), L = [`Eres un desarrollador senior. Trabaja en mi repo de GitHub soobroon-beep/${m.repo} (${m.name}, ${m.url}).`, 'La revisión automática de mi Sala de agentes encontró esta falla. Arréglala:', '',
      `[Prioridad ${i.sev}] ${i.title}`, `Qué pasa: ${i.kind.what}`, `Evidencia: ${i.ev || '—'}`];
    if (d.length) L.push('Dónde: ' + d.join(' y ')); if (i.first) L.push(`Desde: ${when(i.first)}${i.seen > 1 ? ` (${i.seen} revisiones seguidas)` : ''}`); L.push(`Pista: ${i.kind.hint}`, '',
      'Encuentra la causa raíz (no la tapes), cambia solo lo necesario, prueba en PC y celular y ' + workRule(m) + '. Si es falsa alarma, dímelo. Al final dime en 2 líneas qué la causaba y qué cambiaste.');
    return L.join('\n');
  }
  function allPrompt(list) { // resumen corto para arreglar todo de un jalón (sin explicar cada cosa: menos tokens)
    const by = new Map(); for (const i of list) { const k = i.meta.repo; if (!by.has(k)) by.set(k, {m: i.meta, items: []}); by.get(k).items.push(i); }
    const L = ['Eres un desarrollador senior. Arregla de un jalón estas fallas que encontró la revisión automática de mis apps. En cada una busca la causa raíz, cambia solo lo necesario y prueba en PC y celular.', ''];
    for (const {m, items} of by.values()) { L.push(`${m.name} — repo soobroon-beep/${m.repo} (${workRule(m)}):`); for (const i of items) L.push(`- [${i.sev}] ${i.title}: ${clipS(i.ev, 150)}`); L.push(''); }
    L.push('Al final, una línea por falla: qué la causaba y qué cambiaste. Si alguna es falsa alarma, dímelo.'); return L.join('\n');
  }
  const clipS = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

  let revSheet = null, revList = []; // prompt abierto · fallas que se ven en pantalla
  const ring = (ok, tot, cls) => { const r = 34, c = 2 * Math.PI * r, f = tot ? ok / tot : 1; return `<svg class="rv-ring ${cls}" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="${r}" class="bg"/><circle cx="42" cy="42" r="${r}" class="fg" stroke-dasharray="${(f * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 42 42)"/></svg>`; };
  const kpi = (icon, val, lab, cls) => `<div class="rv-kpi ${cls || ''}"><span class="ki">${ic(icon, 16)}</span><b>${val}</b><small>${lab}</small></div>`;
  const ORD = {falla: 0, atencion: 1, bien: 2}, stateOf = list => list.some(i => i.sev === 'alta') ? 'falla' : list.length ? 'atencion' : 'bien';
  function issueHTML(i) {
    const s = SEV[i.sev] || SEV.media, d = devsOf(i.ev);
    return `<div class="rv-i ${s[1]}"><span class="rv-ic">${ic(i.kind.icon, 20)}</span><div class="rv-i-b"><div class="rv-i-t"><b>${esc(i.kind.label)}</b><span class="rv-sev ${s[1]}">${ic(s[2], 12)}${s[0]}</span>${i.status === 'nueva' ? '<span class="rv-tag new">Nueva</span>' : i.first ? `<span class="rv-tag">Sigue · desde ${ago(i.first)}</span>` : ''}${d.map(x => `<span class="rv-tag">${ic(x === 'PC' ? 'pc' : 'phone', 11)}${x}</span>`).join('')}</div>
      <p>${esc(i.kind.what)}</p><small class="rv-i-s">${esc(i.title)}</small>
      <details><summary>Ver detalle técnico</summary><code>${esc(i.ev || '—')}</code><p class="rv-hint">${ic('wand', 13)}${esc(i.kind.hint)}</p></details>
      <button type="button" class="btn sm rv-pbtn" data-a="revPrompt" data-id="${esc(i.id)}">${ic('wand', 14)}Prompt para arreglar esta falla</button></div></div>`;
  }
  function groupsHTML(list) {
    const g = new Map(); for (const i of list) { if (!g.has(i.group)) g.set(i.group, []); g.get(i.group).push(i); }
    return [...g.values()].sort((a, b) => ORD[stateOf(a)] - ORD[stateOf(b)]).map(items => { const i0 = items[0], st = stateOf(items);
      return `<div class="rv-g glass ${st}" id="rg-${esc(i0.group.replace(/[^a-z0-9-]/gi, '_'))}" style="--c:${i0.ag.color}"><header>${av(i0.ag, 34)}<div><b>${esc(i0.groupName)}</b><small>${items.length} ${items.length === 1 ? 'falla' : 'fallas'}</small></div></header>${items.map(issueHTML).join('')}</div>`; }).join('');
  }
  function fixSection(list) {
    revList = list;
    return `<h3 class="mt rv-h">${ic('wrench', 17)}Qué arreglar <small>${list.length ? 'de lo más grave a lo más leve' : ''}</small></h3>
      ${list.length ? `<div class="rv-legend"><span class="rv-sev bad">${ic('oct', 12)}Grave: arréglalo ya</span><span class="rv-sev warn">${ic('tri', 12)}Media: pronto</span><span class="rv-sev info">${ic('info', 12)}Baja: cuando puedas</span></div>${groupsHTML(list)}
        <div class="rv-all glass"><div><b>¿Quieres arreglar todo de un jalón?</b><small>Un solo prompt corto con las ${list.length} fallas, para pegarlo en Claude, ChatGPT o Gemini.</small></div><button type="button" class="btn pri" data-a="revPrompt" data-id="*">${ic('wand', 16)}Prompt para arreglar todo</button></div>`
        : `<div class="rv-empty glass">${ic('check', 30)}<b>Nada que arreglar</b><small>Todo lo revisado funciona.</small></div>`}`;
  }
  function heroHTML(list, okN, totN, sub, kpis) {
    const st = stateOf(list), graves = list.filter(i => i.sev === 'alta').length;
    const head = {bien: ['Todo funciona', 'Pasó la revisión sin fallas.', 'check'], atencion: [`${list.length} ${list.length === 1 ? 'cosa' : 'cosas'} por arreglar`, 'Nada grave: funciona, pero hay detalles que corregir.', 'tri'], falla: [`${graves} ${graves === 1 ? 'falla grave' : 'fallas graves'}`, 'Algo importante no funciona. Empieza por lo marcado en rojo.', 'oct']}[st];
    return `<div class="rv-hero glass ${st}"><div class="rv-score">${ring(okN, totN, st)}<span>${ic(head[2], 26)}</span></div><div class="rv-hero-t"><h2>${esc(head[0])}</h2><p>${esc(head[1])}</p><small>${sub}</small></div><div class="rv-kpis">${kpis}</div></div>`;
  }
  function scopeBar(room, what) { return `<div class="rv-scope glass">${av(room, 28)}<span>${what} solo de <b>${esc(room.name)}</b></span><div class="sp"></div><a class="btn sm ghost" href="#/${what === 'Revisión' ? 'revision' : what === 'Consumo' ? 'consumo' : 'memoria'}" data-a="leaveRoom">Ver de todas</a></div>`; }
  const appTile = (k, a, room, sen) => { const ag = room.agents.find(x => x.app === k) || room.agents.find(x => x.id === 'centinela'), st = STC[a.state] || [a.state, ''], ms = a.loadMs || 0, sp = !ms ? '' : ms < 5000 ? 'ok' : ms < 12000 ? 'warn' : 'bad';
    return `<button type="button" class="rv-app glass ${a.state}" data-a="revGo" data-g="app:${esc(k)}" style="--c:${ag.color}"><span class="rv-app-h">${av(ag, 34)}<span class="rv-badge ${a.state}">${ic(a.state === 'bien' ? 'check' : a.state === 'falla' ? 'oct' : 'tri', 13)}${esc(st[0])}</span></span>
      <b>${esc(a.name)}</b><span class="rv-app-n">${a.open ? `${a.open} por arreglar` : 'Sin fallas'}</span>
      <span class="rv-app-m">${ms ? `<span class="rv-speed ${sp}"><i style="width:${Math.min(100, ms / 150).toFixed(0)}%"></i></span><small>${(ms / 1000).toFixed(1)} s · ${a.tried || 0} botones</small>` : k === 'bots' && sen.bots ? `<small>${sen.bots.live} de ${sen.bots.total} bots encendidos</small>` : k === 'seguridad' ? '<small>Cerbero busca huecos</small>' : '<small>Bots y servidores</small>'}</span></button>`; };
  const roomTile = (r, list) => { const st = stateOf(list), lead = r.agents[r.agents.length - 1] || r.agents[0], runs = allRuns().filter(x => x.room === r.id);
    return `<button type="button" class="rv-app glass ${st}" data-a="revGo" data-g="room:${esc(r.id)}" style="--c:${r.color}"><span class="rv-app-h">${av(lead, 34)}<span class="rv-badge ${st}">${ic(st === 'bien' ? 'check' : st === 'falla' ? 'oct' : 'tri', 13)}${esc(STC[st][0])}</span></span>
      <b>${esc(r.name)}</b><span class="rv-app-n">${list.length ? `${list.length} por arreglar` : 'Sin fallas'}</span><span class="rv-app-m"><small>${runs.length ? runs.length + ' sesiones · última ' + ago(runs[0].at) : 'Sin sesiones todavía'}</small></span></button>`; };

  function revision(scopeId) {
    const room = scopeId ? roomById(scopeId) : null;
    if (scopeId && !room) { location.hash = '#/revision'; return; }
    if (room && !room.server) return roomRevision(room);
    const r = SRV.rev, RV = R.REVISION, scoped = !!room;
    const head = `<div class="room-bar"><a class="ib" href="${scoped ? '#/sala/' + RV.id : '#/'}" aria-label="Volver">${ic('back')}</a><div><h1>${scoped ? esc(RV.name) : 'Revisión de todo'}</h1><small>${r ? `Apps: última revisión ${ago(r.at)} · la siguiente ${inT(r.next)}` : 'Tus apps y tus salas'}</small></div><div class="sp"></div>${scoped ? `<a class="btn sm" href="#/sala/${RV.id}">${ic('play', 14)}Ver a los agentes</a>` : ''}</div>${scoped ? scopeBar(RV, 'Revisión') : ''}`;
    if (!C.user()) { view.innerHTML = `<section class="hist rev">${head}<p class="empty glass">Inicia sesión con tu cuenta de Google (la misma de VORTEX) para ver la revisión. <a href="#" data-a="login">Iniciar sesión</a></p></section>`; return; }
    const sen = (r && r.sentinel) || {}, apps = r ? Object.entries(r.apps || {}) : [], aIss = appIssues();
    const rs = scoped ? [] : rooms(), rIss = rs.map(x => [x, roomIssues(x)]), list = aIss.concat(...rIss.map(x => x[1]));
    const okN = apps.filter(([, a]) => a.state === 'bien').length + rIss.filter(x => !x[1].length).length, totN = apps.length + rIss.length;
    const solved = r ? (r.issues || []).filter(i => i.status === 'resuelta') : [];
    view.innerHTML = `<section class="hist rev">${head}
      ${heroHTML(list, okN, totN, `${okN} de ${totN} ${scoped ? 'apps' : 'apps y salas'} sin fallas${r ? '' : ' · la primera revisión de apps todavía no termina'}`, kpi('tri', list.length, 'Por arreglar', list.length ? 'warn' : 'ok') + kpi('oct', list.filter(i => i.sev === 'alta').length, 'Graves', list.some(i => i.sev === 'alta') ? 'bad' : 'ok') + kpi('bots', sen.bots ? `${sen.bots.live}/${sen.bots.total}` : '—', 'Bots encendidos', '') + kpi('users', sen.traffic ? sen.traffic.d1 : '—', 'Personas hoy', ''))}
      ${apps.length ? `<h3 class="mt rv-h">${ic('grid', 17)}Tus apps <small>toca una para ver qué tiene</small></h3><div class="rv-apps">${apps.slice().sort((x, y) => ORD[x[1].state] - ORD[y[1].state]).map(([k, a]) => appTile(k, a, RV, sen)).join('')}</div>` : ''}
      ${rs.length ? `<h3 class="mt rv-h">${ic('bots', 17)}Tus salas</h3><div class="rv-apps">${rIss.map(([x, l]) => roomTile(x, l)).join('')}</div>` : ''}
      ${fixSection(list)}
      ${(sen.ok || []).length ? `<h3 class="mt rv-h">${ic('check', 17)}Funcionando bien</h3><div class="rv-ok">${sen.ok.map(x => `<span>${ic('check', 13)}${esc(x)}</span>`).join('')}</div>` : ''}
      ${r && r.report ? `<details class="mt rv-more"><summary>${av(RV.agents.find(a => a.id === 'andromeda'), 24)}Leer el informe escrito de Andrómeda</summary><div class="glass box rep"><div class="txt">${md(r.report)}</div></div></details>` : ''}
      ${solved.length ? `<details class="mt rv-more"><summary>${ic('check', 15)}Resueltas recientemente (${solved.length})</summary>${solved.map(i => `<div class="rv-i done"><span class="rv-ic">${ic('check', 18)}</span><div class="rv-i-b"><b>${esc(kindOf(i.title).label)} · ${esc((r.apps[i.app] || {}).name || i.app)}</b><small class="rv-i-s">${esc(i.title)} · resuelta ${ago(i.solvedAt)}</small></div></div>`).join('')}</details>` : ''}
      <p class="foot">La revisión de apps entra sin iniciar sesión, aprieta solo botones seguros y Cerbero busca huecos de seguridad sin atacar ni cambiar nada. Nada se arregla solo: copia el prompt y pégaselo a tu IA.</p></section>${revSheetHTML()}`;
    if (!r) pullServer();
  }
  function roomRevision(room) {
    const list = roomIssues(room), runs = allRuns().filter(x => x.room === room.id), m30 = runs.filter(x => Date.now() - x.at < 30 * 864e5), good = m30.filter(x => ['informe', 'propuesta', 'rechazado', 'aprobado-sin-enviar'].includes(x.outcome));
    const okList = []; if (runs[0] && ['informe', 'propuesta'].includes(runs[0].outcome)) okList.push('La última sesión terminó con resultado'); if (room.id === 'taller-bots' && autoCfg().on !== false) okList.push('Crea bots solo cada 3 h'); if (room.auto && room.auto.on) okList.push(`Funciona sola cada ${room.auto.everyHours} h`); if (!list.length && runs.length) okList.push('Sin errores en sus últimas sesiones');
    view.innerHTML = `<section class="hist rev"><div class="room-bar"><a class="ib" href="#/sala/${encodeURIComponent(room.id)}" aria-label="Volver">${ic('back')}</a><div><h1>Revisión · ${esc(room.name)}</h1><small>Cómo le está yendo a esta sala en sus sesiones</small></div></div>${scopeBar(room, 'Revisión')}
      ${heroHTML(list, list.length ? 0 : 1, 1, runs.length ? `${runs.length} sesiones guardadas · última ${ago(runs[0].at)}` : 'Todavía no hay sesiones de esta sala', kpi('play', m30.length, 'Sesiones (30 d)', '') + kpi('check', m30.length ? Math.round(good.length / m30.length * 100) + '%' : '—', 'Terminaron bien', m30.length && good.length === m30.length ? 'ok' : '') + kpi('tri', list.length, 'Por arreglar', list.length ? 'warn' : 'ok') + kpi(room.final === 'proposal' ? 'bots' : 'clock', room.final === 'proposal' ? runs.filter(x => x.outcome === 'propuesta').length : (runs[0] ? ago(runs[0].at).replace('hace ', '') : '—'), room.final === 'proposal' ? 'Bots propuestos' : 'Última sesión', ''))}
      ${fixSection(list)}
      ${okList.length ? `<h3 class="mt rv-h">${ic('check', 17)}Funcionando bien</h3><div class="rv-ok">${okList.map(x => `<span>${ic('check', 13)}${esc(x)}</span>`).join('')}</div>` : ''}
      <details class="mt rv-more"><summary>${ic('play', 15)}Últimas sesiones (${Math.min(runs.length, 12)})</summary><div class="hlist">${runs.slice(0, 12).map(x => `<a class="hrow glass" href="#/sala/${encodeURIComponent(room.id)}/${x.id}"><div><b>${esc(x.title || 'Sesión')}</b><small>${when(x.at)}${x.auto ? ' · automática' : ''}</small></div><span class="pill ${(OUT[x.outcome] || [])[1] || ''}">${esc((OUT[x.outcome] || [x.outcome || '—'])[0])}</span></a>`).join('')}</div></details></section>${revSheetHTML()}`;
  }
  function revSheetHTML() {
    if (!revSheet) return '';
    return `<div class="sheet-bg" data-a="revClose"></div><div class="sheet glass rv-sheet" role="dialog" aria-label="Prompt"><div class="sheet-h"><span class="rv-ic">${ic('wand', 20)}</span><div><b>${esc(revSheet.title)}</b><small>Cópialo y pégalo en Claude, ChatGPT o Gemini</small></div><div class="sp"></div><button class="ib" data-a="revClose" aria-label="Cerrar">${ic('x', 16)}</button></div>
      <div class="sheet-b"><pre class="rv-pre">${esc(revSheet.text)}</pre></div><div class="sheet-f"><button class="btn pri wide" data-a="revCopy">${ic('copy', 16)}Copiar prompt</button></div></div>`;
  }
  async function copyText(t) { try { await navigator.clipboard.writeText(t); return true; } catch { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch {} ta.remove(); return ok; } }
  function openRevPrompt(id) {
    if (id === '*') revSheet = {title: `Arreglar todo (${revList.length} fallas)`, text: allPrompt(revList)};
    else { const i = revList.find(x => x.id === id); if (!i) return; revSheet = {title: i.kind.label + ' · ' + i.groupName, text: fixPrompt(i)}; }
    const y = scrollY; route(); scrollTo(0, y);
  }

  /* ───────── Memoria: de cada sala (lo que sus agentes recuerdan) y, sin sala abierta, de todas + la compartida con tus IAs ───────── */
  function roomMemory(id) {
    const room = roomById(id); if (!room) { location.hash = '#/memoria'; return; }
    const m = memOf(id), runs = allRuns().filter(x => x.room === id).slice(0, 15);
    const lastMsg = x => ((x.events || []).filter(e => e.type === 'msg').slice(-1)[0] || {}).text || '';
    let learned = '';
    if (id === 'taller-bots') { const tr = ((SRV.auto && SRV.auto.tried) || []).slice(0, 14);
      if (tr.length) { const ok = tr.filter(t => t.outcome === 'propuesta'), cnt = {}; for (const t of tr) if (t.outcome !== 'propuesta') cnt[t.style + ' · ' + t.interval] = (cnt[t.style + ' · ' + t.interval] || 0) + 1;
        learned = `<h3 class="mt rv-h">${ic('brain', 17)}Lo que aprendió solo <small>el Taller automático no repite lo que ya falló</small></h3><div class="glass box"><div class="rv-ok">${ok.length ? ok.map(t => `<span>${ic('check', 13)}Funcionó: ${esc(t.style)} · ${esc(t.interval)}</span>`).join('') : '<span class="muted">Todavía ningún estilo pasó todos los filtros</span>'}${Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `<span class="no">${ic('x', 13)}${esc(k)} falló ${n} ${n > 1 ? 'veces' : 'vez'}</span>`).join('')}</div>
          <ul class="mlearn">${tr.filter(t => t.why).slice(0, 6).map(t => `<li><b>${esc(t.style)} · ${esc(t.interval)}</b><small>${esc(t.why)} · ${ago(t.at)}</small></li>`).join('')}</ul></div>`; } }
    if (room.server && SRV.rev) { const iss = SRV.rev.issues || [], rec = iss.filter(i => (i.seen || 1) >= 3);
      learned = `<h3 class="mt rv-h">${ic('brain', 17)}Lo que recuerda de tus apps</h3><div class="glass box"><div class="rv-ok">${rec.length ? rec.slice(0, 8).map(i => `<span class="no">${ic('tri', 13)}${esc(kindOf(i.title).label)} en ${esc((SRV.rev.apps[i.app] || {}).name || i.app)}: ${i.seen} revisiones</span>`).join('') : '<span>Ninguna falla se ha repetido mucho</span>'}${iss.filter(i => i.status === 'resuelta').slice(0, 6).map(i => `<span>${ic('check', 13)}Resuelta: ${esc(kindOf(i.title).label)} · ${esc((SRV.rev.apps[i.app] || {}).name || i.app)}</span>`).join('')}</div></div>`; }
    view.innerHTML = `<section class="hist rev"><div class="room-bar"><a class="ib" href="#/sala/${encodeURIComponent(id)}" aria-label="Volver">${ic('back')}</a><div><h1>Memoria · ${esc(room.name)}</h1><small>Lo que esta sala recuerda entre sesiones</small></div></div>${scopeBar(room, 'Memoria')}
      <h3 class="mt rv-h">${ic('note', 17)}Lo que el equipo debe recordar siempre</h3>
      <div class="glass box"><small class="muted">Escríbelo como se lo dirías al equipo: reglas, gustos, datos fijos, cosas que no quieres. Todos los agentes de esta sala lo leen en cada sesión, también en las automáticas.</small>
        <textarea id="memNotes" rows="6" maxlength="1500" placeholder="${room.id === 'taller-bots' ? 'Ej.: Opero en 1h y 4h. Riesgo máximo 2 % por operación. No quiero bots que abran y cierren enseguida.' : room.server ? 'Ej.: Neural Brain todavía está en pruebas: sus fallas son de prioridad baja.' : 'Ej.: Mi estilo es neo-japonés con carmesí, oro, jade y negro. Nada de textos genéricos.'}">${esc(m.notes || '')}</textarea>
        <div class="row end"><small class="muted">${m.updatedAt ? 'Guardado ' + ago(m.updatedAt) : 'Aún vacío'}</small><div class="sp"></div><button class="btn pri sm" data-a="memSave" data-id="${esc(id)}">${ic('check', 14)}Guardar</button></div></div>
      ${learned}
      <h3 class="mt rv-h">${ic('play', 17)}Bitácora de sesiones <small>lo que entregó en cada una</small></h3>
      ${runs.length ? `<div class="mlog2">${runs.map(x => `<a class="glass" href="#/sala/${encodeURIComponent(id)}/${x.id}"><header><span class="pill ${(OUT[x.outcome] || [])[1] || ''}">${esc((OUT[x.outcome] || [x.outcome || '—'])[0])}</span><small>${when(x.at)}${x.auto ? ' · automática' : ''}</small></header><b>${esc(x.title || 'Sesión')}</b><p>${esc(clipS(lastMsg(x).replace(/VEREDICTO:.*$/m, ''), 220))}</p></a>`).join('')}</div>` : '<p class="empty glass">Todavía no hay sesiones de esta sala.</p>'}</section>`;
  }
  function memHome() {
    const rs = rooms().concat([R.REVISION]);
    view.innerHTML = `<section class="hist rev"><div class="hero"><h1>Memoria</h1><p>Cada sala tiene su propia memoria: lo que sus agentes deben recordar y lo que han hecho. Entra a una para verla o editarla.</p></div>
      <div class="rv-apps">${rs.map(r => { const m = memOf(r.id), n = allRuns().filter(x => x.room === r.id).length, lead = r.agents[r.agents.length - 1] || r.agents[0];
        return `<a class="rv-app glass ${m.notes ? 'bien' : ''}" href="#/memoria/${encodeURIComponent(r.id)}" style="--c:${r.color}"><span class="rv-app-h">${av(lead, 34)}${m.notes ? `<span class="rv-badge bien">${ic('note', 13)}Con notas</span>` : ''}</span><b>${esc(r.name)}</b><span class="rv-app-n">${n} sesiones en la bitácora</span><span class="rv-app-m"><small>${m.notes ? esc(clipS(m.notes, 70)) : 'Sin notas todavía'}</small></span></a>`; }).join('')}</div>
      ${connBox()}
      <details class="mt rv-more" id="memSharedBox"><summary>${ic('brain', 15)}Memoria compartida con Claude, ChatGPT y Gemini <small class="muted">(aparte de las salas)</small></summary><div id="memShared"></div></details></section>`;
    const d = $('#memSharedBox'); d.addEventListener('toggle', () => { if (d.open && !$('#memShared .mem')) window.SalaMem.render({view: () => $('#memShared'), state: () => S, save, toast, user: () => C.user()}); });
  }

  /* ───────── Conexiones (en Memoria) ───────── */
  function connBox() {
    const h = window.SalaConn && window.SalaConn.cached();
    const row = (icon, name, txt, act) => `<div class="cn-row">${ic(icon, 18)}<div><b>${name}</b><small>${txt}</small></div><div class="sp"></div>${act || ''}</div>`;
    return `<h3 class="mt rv-h">${ic('link', 17)}Conexiones de tus agentes <small>de dónde sacan datos reales</small></h3><div class="glass box cn">
      ${row('note', 'Nova Hub · notas, proyectos y agenda', !C.user() ? 'Inicia sesión primero.' : h ? `Conectado${h.email ? ' (' + esc(h.email) + ')' : ''} · ${h.projects.length} proyectos, ${h.notes.length} notas, ${h.events.length} eventos · actualizado ${ago(h.at)}` : 'Sin conectar: tus agentes no ven tus notas, proyectos ni citas.',
        C.user() ? (h ? `<button class="btn sm ghost" data-a="connRefresh">${ic('retry', 14)}Actualizar</button><button class="btn sm ghost" data-a="connOff">Desconectar</button>` : `<button class="btn sm pri" data-a="connOn">${ic('link', 14)}Conectar Nova Hub</button>`) : '')}
      ${row('globe', 'Internet', 'Noticias recientes (Google y Bing) y Wikipedia. Siempre disponible.', '<span class="rv-badge bien">Listo</span>')}
      ${row('gh', 'GitHub', 'Tus repos públicos, sus últimos cambios y tareas que fallan. Siempre disponible.', '<span class="rv-badge bien">Listo</span>')}
      ${row('chart', 'Mercado y Nova Bot Lab', 'Velas reales de cripto y tus bots. Siempre disponible.', '<span class="rv-badge bien">Listo</span>')}
      <small class="muted">Para usarlas, en el editor de la sala elige la herramienta de cada agente (paso «Equipo»). Nova Hub se lee solo: nunca se cambia nada ahí.</small></div>`;
  }

  /* ───────── Panel de consumo: cuánta IA gasta cada sala ───────── */
  const DAYK = t => new Date(t).toISOString().slice(0, 10);
  function usageOf(x) { // sesiones viejas sin medición: se estima con los mensajes (1 mensaje ≈ 1 consulta)
    if (x.usage) return Object.assign({est: false}, x.usage);
    const m = (x.events || []).filter(e => e.type === 'msg'); return {calls: m.length, tokIn: m.length * 900, tokOut: Math.round(m.reduce((n, e) => n + String(e.text || '').length, 0) / 4), ms: 0, errors: x.outcome === 'error' ? 1 : 0, models: {}, est: true};
  }
  const fmtK = n => n >= 1e6 ? (n / 1e6).toFixed(1) + ' M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + ' k' : String(Math.round(n));
  function consumo(scopeId) {
    const room = scopeId ? roomById(scopeId) : null; if (scopeId && !room) { location.hash = '#/consumo'; return; }
    const runs = allRuns().filter(x => !room || x.room === room.id), now = Date.now(), M30 = runs.filter(x => now - x.at < 30 * 864e5);
    const arq = (() => { try { return JSON.parse(localStorage.getItem('sala_arqui_use') || '{}'); } catch { return {}; } })();
    const sum = (list, f) => list.reduce((n, x) => n + f(usageOf(x)), 0);
    const tot = {calls: sum(M30, u => u.calls) + (room ? 0 : Object.values(arq).reduce((n, d) => n + d.calls, 0)), tok: sum(M30, u => u.tokIn + u.tokOut), err: sum(M30, u => u.errors), ms: sum(M30, u => u.ms), msN: sum(M30, u => u.ms ? u.calls : 0)};
    const today = sum(runs.filter(x => DAYK(x.at) === DAYK(now)), u => u.calls) + (room ? 0 : ((arq[DAYK(now)] || {}).calls || 0));
    const days = [...Array(14)].map((_, i) => DAYK(now - (13 - i) * 864e5)), rs = room ? [room] : rooms().concat([R.REVISION]);
    const per = days.map(d => { const o = {}; for (const x of runs.filter(y => DAYK(y.at) === d)) o[x.room] = (o[x.room] || 0) + usageOf(x).calls; if (!room && arq[d]) o._arqui = arq[d].calls; return o; });
    const maxD = Math.max(1, ...per.map(o => Object.values(o).reduce((a, b) => a + b, 0)));
    const color = id => id === '_arqui' ? '#22d3ee' : (roomById(id) || {color: '#94a3b8'}).color;
    const models = {}; for (const x of M30) for (const [k, v] of Object.entries(usageOf(x).models || {})) models[k] = (models[k] || 0) + v;
    const rows = rs.map(r => { const l = M30.filter(x => x.room === r.id); return {r, n: l.length, calls: sum(l, u => u.calls), tok: sum(l, u => u.tokIn + u.tokOut), err: sum(l, u => u.errors), est: l.some(x => !x.usage), last: l[0]}; }).filter(x => x.n || room).sort((a, b) => b.calls - a.calls);
    const lead = r => r.agents[r.agents.length - 1] || r.agents[0];
    view.innerHTML = `<section class="hist rev"><div class="room-bar"><a class="ib" href="${room ? '#/sala/' + encodeURIComponent(room.id) : '#/'}" aria-label="Volver">${ic('back')}</a><div><h1>Consumo${room ? ' · ' + esc(room.name) : ''}</h1><small>Cuánta IA usan tus salas (últimos 30 días)</small></div></div>${room ? scopeBar(room, 'Consumo') : ''}
      <div class="rv-kpis cs-k">${kpi('gauge', fmtK(tot.calls), 'Consultas de IA', '')}${kpi('layers', fmtK(tot.tok), 'Tokens (aprox.)', '')}${kpi('clock', tot.msN ? (tot.ms / tot.msN / 1000).toFixed(1) + ' s' : '—', 'Por consulta', '')}${kpi('tri', tot.calls ? Math.round(tot.err / Math.max(1, tot.calls + tot.err) * 100) + '%' : '0%', 'Fallaron', tot.err ? 'warn' : 'ok')}${kpi('play', today, 'Consultas hoy', '')}</div>
      <h3 class="mt rv-h">${ic('chart', 17)}Consultas por día <small>últimos 14 días</small></h3>
      <div class="glass box cs-chart"><div class="cs-bars">${per.map((o, i) => { const t = Object.values(o).reduce((a, b) => a + b, 0); return `<div class="cs-col" title="${days[i]}: ${t} consultas"><div class="cs-stack" style="height:${(t / maxD * 100).toFixed(1)}%">${Object.entries(o).map(([k, v]) => `<i style="flex:${v};background:${color(k)}"></i>`).join('')}</div><small>${days[i].slice(8)}</small></div>`; }).join('')}</div>
        <div class="cs-leg">${[...new Set(per.flatMap(o => Object.keys(o)))].map(k => `<span><i style="background:${color(k)}"></i>${k === '_arqui' ? 'Arqui' : esc((roomById(k) || {name: k}).name)}</span>`).join('') || '<span class="muted">Sin consultas en estos días</span>'}</div></div>
      <h3 class="mt rv-h">${ic('bots', 17)}${room ? 'Esta sala' : 'Por sala'}</h3>
      <div class="cs-tab glass"><div class="cs-tr cs-th"><span>Sala</span><span>Sesiones</span><span>Consultas</span><span>Tokens</span><span>Por sesión</span><span>Errores</span></div>
        ${rows.map(x => `<a class="cs-tr" href="#/consumo/${encodeURIComponent(x.r.id)}">${av(lead(x.r), 24)}<span class="cs-n">${esc(x.r.name)}${x.est ? ' <small class="muted">(aprox.)</small>' : ''}</span><span>${x.n}</span><span>${fmtK(x.calls)}</span><span>${fmtK(x.tok)}</span><span>${x.n ? Math.round(x.calls / x.n) : 0}</span><span class="${x.err ? 'bad' : ''}">${x.err}</span></a>`).join('')}
        ${!room && Object.keys(arq).length ? `<div class="cs-tr"><span class="av" style="--c:#22d3ee;width:24px;height:24px"><img src="icons/bots/robot.png" alt=""></span><span class="cs-n">Arqui <small class="muted">(este dispositivo)</small></span><span>—</span><span>${fmtK(Object.values(arq).reduce((n, d) => n + d.calls, 0))}</span><span>${fmtK(Object.values(arq).reduce((n, d) => n + d.tok, 0))}</span><span>—</span><span>${Object.values(arq).reduce((n, d) => n + (d.err || 0), 0)}</span></div>` : ''}
        ${rows.length ? '' : '<p class="empty">Sin sesiones en 30 días.</p>'}</div>
      ${Object.keys(models).length ? `<h3 class="mt rv-h">${ic('motor', 17)}Qué IA respondió</h3><div class="rv-ok">${Object.entries(models).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span>${esc(k)} · ${v}</span>`).join('')}</div>` : ''}
      <p class="foot">Los tokens son aproximados (≈ 4 letras por token). Las sesiones de antes de este panel se estiman con sus mensajes. Con la IA gratis no pagas nada; si usas «Tu IA», esto es lo que gasta de tu saldo.</p></section>`;
  }

  /* ───────── Versiones de una sala propia ───────── */
  function versionsSheet(id) {
    const r = S.rooms.find(x => x.id === id); if (!r) return '';
    const list = ((S.roomVer || {})[id] || []), runs = allRuns().filter(x => x.room === id), stat = v => { const l = runs.filter(x => (x.ver || 1) === v), ok = l.filter(x => ['informe', 'propuesta'].includes(x.outcome)).length; return l.length ? `${l.length} sesiones · ${Math.round(ok / l.length * 100)}% con resultado` : 'sin sesiones'; };
    const diff = (a, b) => { const A = (a.agents || []).map(x => x.name), B = (b.agents || []).map(x => x.name), out = [];
      B.filter(n => !A.includes(n)).forEach(n => out.push('agregó a ' + n)); A.filter(n => !B.includes(n)).forEach(n => out.push('quitó a ' + n));
      (b.agents || []).forEach(x => { const o = (a.agents || []).find(y => y.name === x.name); if (o && (o.prompt !== x.prompt || o.role !== x.role || o.tool !== x.tool)) out.push('cambió a ' + x.name); });
      if (a.name !== b.name) out.push('nombre'); if (JSON.stringify(a.auto) !== JSON.stringify(b.auto)) out.push('modo automático'); if (JSON.stringify(a.chain || null) !== JSON.stringify(b.chain || null)) out.push('cadena');
      return out.slice(0, 5).join(', ') || 'detalles'; };
    return `<div class="sheet-bg" data-a="verClose"></div><div class="sheet glass" role="dialog" aria-label="Versiones"><div class="sheet-h"><span class="rv-ic">${ic('layers', 20)}</span><div><b>Versiones de ${esc(r.name)}</b><small>Cada vez que guardas cambios se guarda la versión anterior (últimas 6)</small></div><div class="sp"></div><button class="ib" data-a="verClose" aria-label="Cerrar">${ic('x', 16)}</button></div>
      <div class="sheet-b"><div class="vr cur"><div><b>v${r.ver || 1} · actual</b><small>${r.agents.length} agentes · ${stat(r.ver || 1)}</small></div><span class="rv-badge bien">En uso</span></div>
      ${list.length ? list.map((v, i) => `<div class="vr"><div><b>v${v.v} · ${when(v.at)}</b><small>${v.room.agents.length} agentes · ${stat(v.v)} · después ${esc(diff(v.room, i ? list[i - 1].room : r))}</small></div><button class="btn sm" data-a="verUse" data-i="${i}">${ic('retry', 14)}Volver a esta</button></div>`).join('') : '<p class="empty">Todavía no hay versiones anteriores: aparecen cuando guardes un cambio.</p>'}
      <small class="muted">Así ves qué versión trabajó mejor. Volver a una versión guarda la actual primero, así no pierdes nada.</small></div></div>`;
  }

  /* ───────── Sesión en vivo ───────── */
  let live = null; // {room, ctx, events, ctrl, scene, running}
  function roomView(id, runId) {
    const room = roomById(id); if (!room) { location.hash = '#/'; return; }
    const replay = runId ? findRun(runId) : null;
    curRoom = id; paintNav();
    if (room.server && !replay) { const lr = SRV.rev && (SRV.rev.runs || [])[0]; if (lr) { location.replace('#/sala/' + encodeURIComponent(id) + '/' + lr.id); return; }
      view.innerHTML = `<section class="hist"><div class="room-bar"><a class="ib" href="#/" aria-label="Volver">${ic('back')}</a><div><h1>${esc(room.name)}</h1><small>Corre sola en el servidor cada 2 horas</small></div></div><p class="empty glass">${C.user() ? (SRV.at ? 'Todavía no hay una sesión de revisión para ver. Vuelve en un rato.' : 'Cargando la última sesión…') : 'Inicia sesión para ver a los agentes de la revisión. <a href="#" data-a="login">Iniciar sesión</a>'}</p></section>`; if (C.user()) pullServer(true); return; }
    if (live && live.running && live.room.id !== id) { toast('Hay una sesión trabajando en «' + live.room.name + '»'); location.hash = '#/sala/' + live.room.id; return; }
    view.innerHTML = `<section class="room">
      <div class="room-bar"><a class="ib" href="#/" aria-label="Volver">${ic('back')}</a><div><h1>${esc(room.name)}</h1><small>${room.agents.length} agentes · ${replay && replay.auto ? 'sesión automática del servidor · ' + when(replay.at) : esc(AI.label())}</small></div><div class="sp"></div><span class="live-dot" hidden>En vivo</span><button class="btn ghost sm" data-a="stop" hidden>${ic('stop', 14)}Detener</button></div>
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
      P.innerHTML = `<div class="setup"><h3>${room.kind === 'bots' ? 'Diseña tu bot' : 'Pedido para el equipo'}</h3>${room.kind === 'bots' ? `<p class="intro">Elige cómo quieres tu bot. El equipo lo diseña, lo prueba con datos reales y, si pasa todos los filtros, te llega a Nova Bot Lab.${autoCfg().on !== false ? ' <b>Además este equipo trabaja solo cada 3 horas</b> aunque no abras la app: lo que hace sale en el Historial como «Automático».' : ''}</p>` : room.auto && room.auto.on ? `<p class="intro"><b>Esta sala funciona sola cada ${room.auto.everyHours} h</b> con su tarea fija; sus informes salen en el Historial como «Automático».</p>` : ''}<form id="ask">${inputHTML(room, live.inputs)}<button class="btn pri wide" type="submit">${ic('play', 16)}Iniciar sesión de agentes</button></form>
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
    if (e.type === 'tool' && e.state !== 'run') { const a = agentOf(e.agent); return `<div class="tool ${e.state}" style="--c:${a.color}">${ic(e.tool === 'market' ? 'chart' : e.tool === 'backtest' || e.tool === 'retest' ? 'flask' : /^inspect_/.test(e.tool) ? 'open' : 'bots', 15)}<div><b>${esc(a.name)} · ${esc({market: 'datos del mercado', backtest: 'backtest en el motor de Nova Bot Lab', bots: 'tus bots de Nova Bot Lab', sentinel: 'bots, servidores y tráfico', retest: 'vuelve a probar cada falla, una por una'}[e.tool] || (/^inspect_/.test(e.tool) ? 'abre la app en PC y celular y aprieta sus botones' : e.tool))}</b><small>${esc(e.text || '')}</small>${e.tool === 'backtest' && e.data ? btHTML(e.data, a.color) : e.tool === 'market' && e.data ? mkHTML(e.data) : ''}</div></div>`; }
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
    if (live.room.server) return `<div class="result">${body}<a class="btn ghost wide" href="#/revision/revision-apps">${ic('back', 15)}Ver el informe</a></div>`;
    return `<div class="result">${body}<button class="btn ghost wide" data-a="again">${ic('retry', 15)}Nueva sesión en esta sala</button></div>`;
  }

  async function start(room, inputs, chainFrom, depth) {
    if (!inputs.goal && room.inputs.some(f => f.id === 'goal') && !room.inputs.some(f => f.type === 'style')) { toast('Escribe tu pedido para el equipo'); return; }
    if (room.inputs.some(f => f.type === 'coins') && !(inputs.coins || []).length) { toast('Agrega al menos una moneda'); return; }
    try { await AI.boot(); } catch (e) { toast(e.message); return; }
    const ctrl = new AbortController(), run = {id: 'r' + Date.now().toString(36), room: room.id, roomName: room.name, at: Date.now(), inputs, events: [], outcome: null, ver: room.ver || 1, chainOf: chainFrom || null};
    Object.assign(live, {events: run.events, inputs, ctrl, running: true, proposal: null, ctx: null, replay: null, _shown: 0}); paintPanel(); syncBar();
    const emit = e => {
      if (e.type === 'done') { live.running = false; live.ctx = e.ctx; }
      const keep = Object.assign({}, e); delete keep.ctx; if (keep.data && keep.tool === 'market') keep.data = {rows: keep.data.rows.map(r => ({sym: r.sym, regime: r.regime, ch24: r.ch24}))};
      if (e.type === 'proposal') live.proposal = e.proposal;
      run.events.push(keep); if (live.scene) live.scene.on(keep);
      if (live.room.id === room.id && $('#panel')) { if (['msg', 'tool', 'note', 'round', 'error', 'done'].includes(e.type)) paintPanel(); else paintTyping(); }
    };
    const deps = {ai: E.meter(AI.chat, run), tools: {market: T.market, backtest: T.backtest, bots: T.bots, web: T.web, novahub: T.novahub, agenda: T.agenda, github: T.github}, parseSpec: T.parseSpec, checks: T.checks, signal: ctrl.signal,
      propose: async ctx => { try { return await T.propose(ctx); } catch (e) { if (e.login) { live.ctx = ctx; return null; } throw e; } }};
    const ctx = await E.runRoom(withMem(room), inputs, deps, {emit});
    live.ctx = ctx; live.running = false; syncBar();
    if (ctx.outcome === 'propuesta' && !ctx.proposal && ctx.pending) emit({type: 'note', text: 'Bot aprobado. Inicia sesión para enviarlo a Nova Bot Lab.'});
    run.outcome = ctx.outcome; run.proposal = ctx.proposal || null; run.title = String(inputs.goal || '').slice(0, 90); run.events.forEach(x => { if (x.text && x.text.length > 1800) x.text = x.text.slice(0, 1800) + '…'; });
    S.runs.unshift(run); save(); if (live.room.id === room.id) paintPanel();
    const ch = room.chain, okOut = ['informe', 'propuesta', 'rechazado', 'aprobado-sin-enviar'].includes(ctx.outcome), target = ch && ch.to && roomById(ch.to);
    if (target && okOut && !target.server && (depth || 0) < 3 && live.room.id === room.id) { // cadena: el resultado pasa solo a la siguiente sala
      const rep = ctx.report || (run.events.filter(x => x.type === 'msg').slice(-1)[0] || {}).text || '';
      emit({type: 'note', text: `Cadena: paso el resultado a «${target.name}» en 3 segundos…`}); paintPanel();
      setTimeout(() => { if (live.running) return; location.hash = '#/sala/' + encodeURIComponent(target.id); setTimeout(() => start(target, chainInputs(target, room, rep, ch.goal), {room: room.id, run: run.id}, (depth || 0) + 1), 600); }, 3000); }
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') try { new Notification('Sala de agentes', {body: ctx.outcome === 'propuesta' ? 'Nuevo bot aprobado para Nova Bot Lab' : 'La sesión de «' + room.name + '» terminó', icon: 'icons/app-192.png'}); } catch {}
  }

  /* ───────── Historial ───────── */
  const OUT = {propuesta: ['Propuesta enviada', 'win'], informe: ['Informe', 'win'], rechazado: ['Sin aprobar', 'lose'], cancelado: ['Detenida', ''], error: ['Error de IA', 'lose'], limite: ['Límite de mensajes', ''], 'spec-invalida': ['Estrategia inválida', 'lose'], 'aprobado-sin-enviar': ['Aprobado, sin enviar', '']};
  function history() {
    pullServer(); const list = allRuns();
    view.innerHTML = `<section class="hist"><div class="hero"><h1>Historial</h1><p>Cada sesión guarda la conversación completa del equipo. Las marcadas «Automático» las hicieron tus agentes solos en el servidor. Ábrela para volver a ver cómo se pasaron el trabajo.</p></div>
      ${list.length ? `<div class="hlist">${list.map(r => { const o = OUT[r.outcome] || [r.outcome || '—', '']; const room = roomById(r.room); return `<a class="hrow glass" href="#/sala/${encodeURIComponent(r.room)}/${r.id}"><div class="stack">${room ? room.flow.slice(0, 5).map(id => av(room.agents.find(a => a.id === id), 26)).join('') : ''}</div><div><b>${esc(r.title || r.roomName)}</b><small>${esc(r.roomName)} · ${when(r.at)}${r.proposal ? ' · «' + esc(r.proposal.name) + '»' : ''}</small></div>${r.auto ? `<span class="pill auto">${ic('motor', 11)}Automático</span>` : ''}<span class="pill ${o[1]}">${esc(o[0])}</span></a>`; }).join('')}</div>` : '<p class="empty glass">Todavía no hay sesiones. Entra a una sala y dale un pedido al equipo.</p>'}</section>`;
  }

  /* ───────── Cadenas de salas y versiones ───────── */
  function chainInputs(target, from, rep, goal) { // lo último que usaste en esa sala (o sus valores de fábrica) + el resultado de la sala anterior
    const prev = (allRuns().find(x => x.room === target.id) || {}).inputs || {}, inp = {};
    for (const f of target.inputs || []) inp[f.id] = prev[f.id] != null && f.id !== 'goal' ? prev[f.id] : Array.isArray(f.def) ? f.def.slice() : f.def;
    inp.goal = `${goal || (target.auto && target.auto.goal) || 'Continúa con el trabajo de la sala anterior.'}\n\nRESULTADO DE «${from.name}» (sala anterior de la cadena):\n${String(rep).replace(/VEREDICTO:.*$/m, '').trim().slice(0, 2500)}`;
    return inp;
  }
  function chainBox() {
    const ch = draft.chain || {}, opts = rooms().filter(r => r.id !== draft.id && !r.server);
    return `<div class="glass box auto-box"><div class="q"><b>${ic('link', 15)} Cadena: ¿a quién le pasa su resultado?</b><small>Cuando esta sala termine, su resultado se le entrega solo a otra sala, que empieza a trabajar con él (también en las sesiones automáticas). Ej.: Noticias → Taller de bots.</small></div>
      <select data-chain="to"><option value="">Nadie: aquí termina</option>${opts.map(r => `<option value="${esc(r.id)}" ${r.id === ch.to ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select>
      ${ch.to ? `<div class="q"><b>¿Qué le pides a esa sala?</b><small>Opcional. Si lo dejas vacío, usa su tarea fija o «continúa con el trabajo».</small></div><textarea data-chaing="1" rows="2" maxlength="400" placeholder="Ej.: Con estas noticias, diseña un bot que aproveche el movimiento">${esc(ch.goal || '')}</textarea>` : ''}</div>`;
  }
  const sig = r => JSON.stringify([r.name, r.desc, r.ask, r.icon, r.color, r.maxRounds, r.auto, r.chain, (r.agents || []).map(a => [a.name, a.role, a.icon, a.color, a.prompt, a.tool, a.back])]);
  function keepVersion(r, note) { const V = (S.roomVer = S.roomVer || {}), list = V[r.id] = V[r.id] || [], snap = JSON.parse(JSON.stringify(r)); delete snap._for;
    if (list[0] && sig(list[0].room) === sig(snap)) return; list.unshift({v: +r.ver || 1, at: Date.now(), note, room: snap}); V[r.id] = list.slice(0, 6); }

  /* ───────── Asistente para crear salas y agentes (paso a paso, con explicaciones) ───────── */
  let draft = null, wz = {step: 1, ag: null, agDraft: null}, verFor = null;
  const STEPS = [['Propósito', 'Para qué es tu sala'], ['Equipo', 'Quiénes trabajan'], ['Revisión', 'Quién revisa a quién'], ['Listo', 'Vista previa y guardar']];
  const toolInfo = {'': ['Sin herramienta', 'Solo piensa con lo que le dicen sus compañeros.', 'motor'], market: ['Datos del mercado', 'Lee velas reales de las monedas que elijas (tendencia, volatilidad, niveles).', 'chart'], bots: ['Mis bots de Nova Bot Lab', 'Lee tus bots y sus resultados para comparar.', 'bots'], web: ['Buscar en internet', 'Noticias recientes (Google y Bing) y Wikipedia sobre el tema del pedido.', 'globe'], novahub: ['Mis notas y proyectos', 'Lee tus proyectos, pendientes y notas de Nova Hub (conéctalo en Memoria).', 'note'], agenda: ['Mi agenda y citas', 'Lee tus próximos eventos, citas de tatuaje y recordatorios.', 'cal'], github: ['Mis repos de GitHub', 'Lee tus repos, sus últimos cambios y las tareas automáticas que fallan.', 'gh']};
  const newId = () => 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  function editor(id) {
    if (!draft || draft._for !== id) { const r = id !== 'nueva' && S.rooms.find(x => x.id === id); draft = r ? JSON.parse(JSON.stringify(r)) : null; if (draft) draft._for = id; wz = {step: draft ? 2 : 1, ag: null, agDraft: null, tpl: !!draft}; }
    const own = draft && S.rooms.some(x => x.id === draft.id);
    const head = `<div class="room-bar"><a class="ib" href="#/" aria-label="Volver">${ic('back')}</a><div><h1>${own ? 'Editar sala' : 'Crear sala'}</h1><small>Te explico cada paso. Puedes cambiar todo después.</small></div><div class="sp"></div>${own ? `<button class="btn sm" data-a="verOpen" data-id="${esc(draft.id)}">${ic('layers', 14)}Versiones (${((S.roomVer || {})[draft.id] || []).length + 1})</button>` : ''}</div>
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
    else { const au = Object.assign({on: false, goal: '', everyHours: 12}, draft.auto || {}); body = `<div class="prev glass" id="wzPrev"></div>
      <div class="glass box auto-box"><div class="row"><div class="q"><b>${ic('motor', 15)} ¿Funciona sola, 24/7?</b><small>Si la enciendes, el equipo trabaja en el servidor cada cierto tiempo aunque no abras la app, con una tarea fija. Sus informes salen en el Historial y te llega un aviso al celular.</small></div><div class="sp"></div><button type="button" class="btn sm ${au.on ? 'pri' : 'ghost'}" data-a="wzAuto">${au.on ? 'Encendida' : 'Apagada'}</button></div>
      ${au.on ? `<div class="q"><b>Tarea fija</b><small>Lo que hará en cada turno. Ej.: «Revisa las noticias de cripto y dime qué cambió» o «Propón 3 ideas de contenido para hoy».</small></div><textarea data-autog="1" rows="3" maxlength="600">${esc(au.goal)}</textarea>
      <div class="q"><b>¿Cada cuánto?</b></div><div class="pills">${[3, 6, 12, 24].map(n => `<button type="button" class="pl ${n === +au.everyHours ? 'on' : ''}" data-a="wzEvery" data-n="${n}">Cada ${n} h</button>`).join('')}</div>` : ''}</div>
      ${chainBox()}
      <div class="glass box"><b>${esc(draft.name || 'Sin nombre')}</b><small class="dim">${esc(draft.desc || '')}</small>
      <ol class="team">${draft.agents.map(a => `<li>${av(a, 30)}<div><b>${esc(a.name)}</b><small>${esc(a.role)}${a.tool ? ' · ' + toolInfo[a.tool][0] : ''}</small></div></li>`).join('')}</ol></div>`; }
    const nav = draft ? `<div class="row end mt">${own && wz.step === 4 ? `<button class="btn ghost" data-a="roomDel">${ic('trash', 15)}Borrar sala</button>` : ''}${wz.step > 1 ? `<button class="btn ghost" data-a="wzGo" data-s="${wz.step - 1}">${ic('back', 15)}Atrás</button>` : ''}<div class="sp"></div>${wz.step < 4 ? `<button class="btn pri" data-a="wzGo" data-s="${wz.step + 1}">Siguiente</button>` : `<button class="btn pri" data-a="roomSave">${ic('check', 15)}Guardar sala</button>`}</div>` : '';
    view.innerHTML = `<section class="edit">${head}${body}${nav}${agentSheet()}${verFor ? versionsSheet(verFor) : ''}</section>`;
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
  view.addEventListener('change', e => { if (e.target.dataset.chain === 'to' && draft) { draft.chain = e.target.value ? Object.assign({}, draft.chain || {}, {to: e.target.value}) : null; rerender(); } });
  view.addEventListener('input', e => {
    if (e.target.type === 'range' && e.target.name) { const o = $(`.rv[data-for="${e.target.name}"]`); if (o) o.textContent = e.target.value + (e.target.dataset.unit || ''); }
    if (!draft || !$('.edit')) return; const k = e.target.dataset.k, g = e.target.dataset.ag;
    if (e.target.dataset.chaing) draft.chain = Object.assign({}, draft.chain || {}, {goal: e.target.value.slice(0, 400)});
    if (e.target.dataset.autog) draft.auto = Object.assign({on: true, everyHours: 12}, draft.auto || {}, {goal: e.target.value});
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
    else if (a === 'connOn' || a === 'connRefresh') { b.disabled = true; try { await (a === 'connOn' ? window.SalaConn.connect() : window.SalaConn.refresh(true)); toast('Nova Hub listo: tus agentes ya pueden leerlo'); } catch (er) { toast('No se pudo conectar Nova Hub: ' + (er.code || er.message)); } route(); }
    else if (a === 'connOff') { if (!confirm('¿Desconectar Nova Hub? Tus agentes dejarán de ver tus notas, proyectos y agenda.')) return; await window.SalaConn.disconnect(); route(); }
    else if (a === 'verOpen') { verFor = b.dataset.id; rerender(); }
    else if (a === 'verClose') { verFor = null; rerender(); }
    else if (a === 'verUse') { const r = S.rooms.find(x => x.id === verFor), v = ((S.roomVer || {})[verFor] || [])[+b.dataset.i]; if (!r || !v || !confirm(`¿Volver a la versión v${v.v}? La actual se guarda primero.`)) return;
      keepVersion(r, 'Antes de volver a v' + v.v); const back = Object.assign(JSON.parse(JSON.stringify(v.room)), {id: r.id, ver: (+r.ver || 1) + 1, updatedAt: Date.now(), createdAt: r.createdAt}); S.rooms[S.rooms.findIndex(x => x.id === r.id)] = back; save(); verFor = null; draft = null; toast('Listo: la sala volvió a la versión v' + v.v + ' (ahora es v' + back.ver + ')'); editor(r.id); }
    else if (a === 'goSala') { e.preventDefault(); location.hash = '#/sala/' + encodeURIComponent(b.dataset.id); }
    else if (a === 'memSave') { const t = $('#memNotes'); const m = memOf(b.dataset.id); S.roomMem[b.dataset.id] = Object.assign({}, m, {notes: t.value.slice(0, 1500), updatedAt: Date.now()}); save(); toast('Guardado: los agentes lo leerán en cada sesión'); }
    else if (a === 'revPrompt') openRevPrompt(b.dataset.id);
    else if (a === 'revClose') { revSheet = null; const y = scrollY; route(); scrollTo(0, y); }
    else if (a === 'leaveRoom') curRoom = null;
    else if (a === 'revCopy') { if (revSheet && await copyText(revSheet.text)) { toast('Prompt copiado: pégalo en tu IA'); b.innerHTML = ic('check', 16) + 'Copiado'; } else toast('No se pudo copiar: selecciona el texto y cópialo'); }
    else if (a === 'revGo') { const g = $('#rg-' + b.dataset.g.replace(/[^a-z0-9-]/gi, '_')); if (g) { g.scrollIntoView({behavior: 'smooth', block: 'start'}); g.classList.remove('flash'); void g.offsetWidth; g.classList.add('flash'); } else toast('No tiene fallas abiertas'); }
    else if (a === 'stop') { if (live && live.ctrl) live.ctrl.abort(); }
    else if (a === 'again') { const inp = live.inputs; live.events = []; live.running = false; live.ctx = null; live.proposal = null; live.replay = null; live.inputs = inp; if (location.hash !== '#/sala/' + live.room.id) location.hash = '#/sala/' + live.room.id; else { live.scene.reset(); paintPanel(); } }
    else if (a === 'copy') { try { await navigator.clipboard.writeText((live.ctx && live.ctx.report) || (live.events.filter(x => x.type === 'msg').pop() || {}).text || ''); toast('Informe copiado'); } catch { toast('No se pudo copiar'); } }
    else if (a === 'sendPend') { try { if (!C.user()) await C.signIn(); if (!C.user()) return; const p = await T.sendProposal(live.ctx.pending); live.ctx.pending = null; live.proposal = p; const r = S.runs.find(x => x.events === live.events); if (r) { r.proposal = p; r.outcome = 'propuesta'; save(); } toast('Enviado a Nova Bot Lab'); paintPanel(); } catch (er) { toast('No se pudo enviar: ' + er.message); } }
    else if (a === 'edit') { e.preventDefault(); location.hash = '#/editor/' + b.dataset.id; }
    else if (a === 'qkCoin') { const inp = b.closest('.fld').querySelector('.coin-in'); inp.value = b.dataset.c; addCoin(inp); }
    else if (a === 'wzTpl') { const t = R.TEMPLATES.find(x => x.id === b.dataset.t); draft = {id: 'u' + Date.now().toString(36), name: t.id === 'blanco' ? '' : t.name, desc: t.id === 'blanco' ? '' : t.desc, ask: t.ask, icon: t.icon, color: t.color, maxRounds: 2, agents: JSON.parse(JSON.stringify(t.agents)), _for: 'nueva'}; wz.step = 1; editor('nueva'); scrollTo(0, 0); }
    else if (a === 'wzGo') { const n = +b.dataset.s; if (n > 1 && !String(draft.name || '').trim()) { wz.step = 1; editor(draft._for); return toast('Ponle nombre a la sala'); } if (n > 2 && draft.agents.some(x => !String(x.prompt || '').trim())) { wz.step = 2; editor(draft._for); return toast('Falta escribir las instrucciones de algún agente'); } wz.step = n; editor(draft._for); scrollTo(0, 0); }
    else if (a === 'wzRounds') { draft.maxRounds = +b.dataset.n; rerender(); }
    else if (a === 'wzAuto') { draft.auto = Object.assign({goal: '', everyHours: 12}, draft.auto || {}); draft.auto.on = !draft.auto.on; rerender(); }
    else if (a === 'wzEvery') { draft.auto = Object.assign({on: true, goal: ''}, draft.auto || {}, {everyHours: +b.dataset.n}); rerender(); }
    else if (a === 'autoToggle' || a === 'autoPer') { if (!C.user()) { try { await C.signIn(); } catch { return; } } const c = autoCfg(); if (a === 'autoToggle') c.on = c.on === false; else c.perRun = +b.dataset.n; S.auto = {taller: c, updatedAt: Date.now()}; save(); toast(a === 'autoToggle' ? (c.on ? 'Modo automático encendido' : 'Modo automático en pausa') : c.perRun + ' sesión(es) por turno'); route(); }
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
    else if (a === 'roomSave') { const d = draft; if (!String(d.name).trim()) return toast('Ponle nombre a la sala'); if (d.auto && d.auto.on && !String(d.auto.goal || '').trim()) return toast('Escribe la tarea fija para que funcione sola'); if (d.agents.some(x => !String(x.prompt).trim())) return toast('Escribe las instrucciones de cada agente');
      const clean = Object.assign({}, d, {updatedAt: Date.now()}); delete clean._for; const i = S.rooms.findIndex(x => x.id === d.id); if (i >= 0) { const old = S.rooms[i]; if (sig(old) !== sig(clean)) { keepVersion(old, 'Antes de editar'); clean.ver = (+old.ver || 1) + 1; } else clean.ver = +old.ver || 1; S.rooms[i] = clean; } else S.rooms.push(Object.assign(clean, {createdAt: Date.now(), ver: 1})); save(); draft = null; toast('Sala guardada' + (C.user() ? ' en tu cuenta' : ' en este dispositivo')); location.hash = '#/sala/' + clean.id; }
    else if (a === 'roomDel') { if (!confirm('¿Borrar esta sala?')) return; S.deleted[draft.id] = Date.now(); S.rooms = S.rooms.filter(x => x.id !== draft.id); save(); draft = null; location.hash = '#/'; }
  });

  /* ───────── Rutas ───────── */
  function paintNav() { // con una sala abierta, Revisión y Memoria llevan a lo de esa sala
    const q = curRoom ? '/' + encodeURIComponent(curRoom) : '', r = $('[data-nav="rev"]'), m = $('[data-nav="mem"]'), u = $('[data-nav="use"]'), rm = curRoom && roomById(curRoom); if (u) u.href = '#/consumo' + q;
    if (r) { r.href = '#/revision' + q; r.title = rm ? 'Revisión de ' + rm.name : 'Revisión de todo'; } if (m) { m.href = '#/memoria' + q; m.title = rm ? 'Memoria de ' + rm.name : 'Memoria de todas tus salas'; }
    document.body.classList.toggle('in-room', !!rm); const lab = $('#navScope'); if (lab) lab.innerHTML = rm ? `${av(rm, 18)}<span>${esc(rm.name)}</span>` : '';
  }
  function route() {
    const h = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    if (h[0] !== 'revision') revSheet = null; // el prompt abierto no te sigue a otras pantallas
    $$('[data-nav]').forEach(a => a.classList.toggle('on', (h[0] || '') === '' ? a.dataset.nav === 'home' : (h[0] === 'historial' && a.dataset.nav === 'history') || (h[0] === 'memoria' && a.dataset.nav === 'mem') || (h[0] === 'revision' && a.dataset.nav === 'rev') || (h[0] === 'consumo' && a.dataset.nav === 'use')));
    if (h[0] === 'sala' && h[1]) { if (!$('.room') || !live || live.room.id !== h[1] || (h[2] || null) !== (live.replay ? live.replay.id : null)) roomView(h[1], h[2]); else paintPanel(); }
    else if (h[0] === 'historial') history();
    else if (h[0] === 'consumo') { if (h[1]) curRoom = h[1]; paintNav(); consumo(h[1] || null); pullServer(); }
    else if (h[0] === 'revision') { if (h[1]) curRoom = h[1]; paintNav(); revision(h[1] || null); pullServer(); }
    else if (h[0] === 'memoria') { if (h[1]) curRoom = h[1]; paintNav(); if (h[1]) roomMemory(h[1]); else memHome(); }
    else if (h[0] === 'editor') { if (h[1] === 'nueva' && draft && draft._for === 'nueva' && !$('.edit')) { draft = null; } editor(h[1] || 'nueva'); }
    else { home(); pullServer(); }
  }
  addEventListener('hashchange', () => { route(); scrollTo(0, 0); });
  SC.sky($('#sky')); paintAcct(); route(); AI.boot().then(() => { if (!$('.room')) route(); }).catch(() => {});
  setInterval(() => { if (!document.hidden) pullServer(); }, 60000); // lo que hacen tus agentes en el servidor se actualiza solo
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  function loadDraft(d) { draft = Object.assign(d, {_for: 'arqui'}); wz = {step: 4, ag: null, agDraft: null, tpl: true}; if (location.hash === '#/editor/arqui') editor('arqui'); else location.hash = '#/editor/arqui'; }
  window.SalaApp = {loadDraft, draft: () => ($('.edit') && draft) || null, state: () => S, live: () => live, start: (id, inputs) => { const r = roomById(id); location.hash = '#/sala/' + id; route(); return start(r, inputs); }};
})();
