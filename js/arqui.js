/* SALA DE AGENTES · ARQUI: el robotcito que arma salas por ti.
   Le dices qué sala quieres (para qué sirve, qué agentes, cada cuánto) y él llena TODO el formulario: nombre, pregunta, icono y color,
   y crea los agentes uno por uno con sus instrucciones, quién revisa a quién y si funciona sola. Tú solo revisas y guardas.
   IA propia y 100 % gratis: el modelo abierto anónimo de Pollinations (sin clave, sin créditos, aparte de la IA de VORTEX).
   Si prefieres, puede usar «Tu IA». Si ninguna responde, arma la sala con las plantillas y papeles de la app (nunca te deja sin sala). */
(function () {
  'use strict';
  const R = window.SalaRooms, FREE = 'https://text.pollinations.ai/openai', MODEL = 'openai-fast';
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const LS = 'sala_arqui', st = (() => { try { return Object.assign({own: false, msgs: []}, JSON.parse(localStorage.getItem(LS) || '{}')); } catch { return {own: false, msgs: []}; } })();
  const keep = () => { try { localStorage.setItem(LS, JSON.stringify({own: st.own, msgs: st.msgs.slice(-14)})); } catch {} };
  let open = false, busy = false, root = null;

  /* ───────── IA de Arqui ───────── */
  let lastCall = 0;
  async function free(messages, json) { // el modelo anónimo aguanta poco seguido: espaciamos las consultas
    let last = null;
    for (let t = 0; t < 4; t++) {
      const gap = 3500 - (Date.now() - lastCall); if (gap > 0) await new Promise(ok => setTimeout(ok, gap)); lastCall = Date.now();
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 60000);
      try {
        const r = await fetch(FREE, {method: 'POST', headers: {'content-type': 'application/json'}, signal: ctl.signal, body: JSON.stringify(Object.assign({model: MODEL, messages, temperature: .6}, json ? {response_format: {type: 'json_object'}} : {}))});
        if (r.status === 429 || r.status >= 500) { last = new Error('IA ocupada (' + r.status + ')'); await new Promise(ok => setTimeout(ok, 5000 * (t + 1))); continue; }
        if (!r.ok) throw new Error('IA ' + r.status);
        const j = await r.json(), txt = String(j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '').trim();
        if (txt) return txt; last = new Error('respuesta vacía');
      } catch (e) { last = e; } finally { clearTimeout(to); }
    }
    throw last || new Error('sin respuesta');
  }
  function use(messages, out, err) { try { const k = new Date().toISOString().slice(0, 10), o = JSON.parse(localStorage.getItem('sala_arqui_use') || '{}'), d = o[k] = o[k] || {calls: 0, tok: 0, err: 0};
    if (err) d.err++; else { d.calls++; d.tok += Math.round((messages.reduce((n, m) => n + String(m.content).length, 0) + String(out).length) / 4); }
    for (const x of Object.keys(o).sort().slice(0, -30)) delete o[x]; localStorage.setItem('sala_arqui_use', JSON.stringify(o)); } catch {} } // para el panel de Consumo
  async function ask(messages, json) { try { const r = await ask0(messages, json); use(messages, r); return r; } catch (e) { use(messages, '', true); throw e; } }
  async function ask0(messages, json) {
    if (st.own && window.SalaAI) { try { const r = await window.SalaAI.chat(messages, {purpose: json ? 'spec' : 'text'}); if (r.text) return r.text; } catch {} }
    return free(messages, json);
  }
  const parseJson = t => { const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a < 0 || b <= a) return null; try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; } };

  const SYS = `Eres Arqui, el arquitecto de la app «Sala de agentes» de Payi (tatuador neo-japonés y trader de cripto en Veracruz; también crea apps).
Una SALA es un equipo de 2 a 8 agentes de IA que hablan EN ORDEN: cada uno hace su parte y le pasa el trabajo al siguiente; el último es el jefe que revisa y entrega el resultado final.
Tu trabajo: convertir lo que pide el usuario en el diseño completo de la sala. Devuelve SOLO un objeto JSON válido:
{"name":"máx 40 letras","desc":"una línea: para qué sirve","ask":"la pregunta que verá al abrir la sala (máx 110 letras)","icon":"ICONO","color":"COLOR","maxRounds":2,
 "agents":[{"name":"un nombre de estrella o constelación (único)","role":"papel corto (máx 30 letras)","icon":"ICONO","color":"COLOR","tool":"","reviews":"","prompt":"qué hace, 1 frase"}],
 "auto":{"on":false,"goal":"","everyHours":12}}
ICONO: uno de ${R.ICONS.join(', ')}. COLOR: uno de ${R.COLORS.join(', ')}.
tool (herramienta real que usa ANTES de hablar): "" (solo piensa), "market" (velas reales de cripto), "bots" (sus bots de Nova Bot Lab), "web" (noticias recientes y Wikipedia sobre el tema), "novahub" (sus proyectos, pendientes y notas), "agenda" (sus próximas citas y eventos), "github" (sus repos y tareas que fallan). Dale herramienta solo al agente que la necesita.
reviews: nombre de UN agente ANTERIOR cuyo trabajo puede regresar para que lo mejore, o "" si no revisa. El último agente SIEMPRE revisa (normalmente al primero o al que hace el trabajo principal).
auto: si pide que funcione sola o con una frecuencia (diario, cada mañana, cada X horas) → {"on":true,"goal":"la tarea fija que hará cada vez","everyHours":3|6|12|24}.
Diseña papeles complementarios (alguien investiga o crea, alguien critica, alguien entrega). Todo en español.`;
  const AGENT_SYS = `Eres Arqui. Escribe las INSTRUCCIONES de un agente de una sala de agentes de IA: en segunda persona («Eres …»), 3 a 5 frases concretas: qué hace exactamente, con qué criterio, qué formato entrega y a quién le pasa el trabajo. Escribe SOLO las de ese agente (nunca las de sus compañeros). Sin saludos, sin emojis, sin comillas. Solo el texto de las instrucciones.`;

  /* ───────── convertir la respuesta en una sala válida para el editor ───────── */
  function toDraft(o, prev) {
    const pick = (v, list, i) => list.includes(v) ? v : list[i % list.length], used = new Set();
    const agents = (Array.isArray(o.agents) ? o.agents : []).filter(a => a && a.name).slice(0, 8).map((a, i) => {
      let name = String(a.name).trim().slice(0, 24); if (used.has(name.toLowerCase())) name = (R.NAMES.find(n => !used.has(n.toLowerCase())) || name + ' ' + (i + 1)); used.add(name.toLowerCase());
      return {id: 'a' + Date.now().toString(36) + i, name, role: String(a.role || 'Agente').slice(0, 40), icon: pick(a.icon, R.ICONS, i * 5), color: pick(a.color, R.COLORS, i * 3), prompt: String(a.prompt || '').slice(0, 3000), tool: ['market', 'bots', 'web', 'novahub', 'agenda', 'github'].includes(a.tool) ? a.tool : '', _rev: String(a.reviews || '').trim().toLowerCase()};
    });
    if (agents.length < 2) return null;
    agents.forEach((a, i) => { const j = agents.findIndex(b => b.name.toLowerCase() === a._rev); a.back = j >= 0 && j < i ? agents[j].id : ''; });
    const last = agents[agents.length - 1]; if (!last.back) last.back = agents[0].id; agents.forEach(a => delete a._rev);
    const au = o.auto && o.auto.on ? {on: true, goal: String(o.auto.goal || '').slice(0, 600), everyHours: [3, 6, 12, 24].includes(+o.auto.everyHours) ? +o.auto.everyHours : 24} : {on: false, goal: '', everyHours: 12};
    return {id: prev && prev.id || 'u' + Date.now().toString(36), name: String(o.name || 'Mi sala').slice(0, 40), desc: String(o.desc || '').slice(0, 200), ask: String(o.ask || '¿Qué hacemos hoy?').slice(0, 120),
      icon: pick(o.icon, R.ICONS, 6), color: pick(o.color, R.COLORS, 1), maxRounds: Math.max(1, Math.min(4, +o.maxRounds || 2)), agents, auto: au};
  }
  /* sin IA: arma la sala con los papeles de la app según las palabras del pedido */
  function localDraft(text, prev) {
    const t = text.toLowerCase(), has = re => re.test(t), roles = [], every = /cada (\d+) ?h/.exec(t), daily = has(/diari|cada (día|dia|mañana|noche)|todos los días/), auto = every || daily ? {on: true, goal: text.slice(0, 300), everyHours: every ? +every[1] : 24} : {on: false};
    if (has(/tatu|contenido|instagram|tiktok|post|video|reel/)) { const tp = R.TEMPLATES.find(x => x.id === 'contenido'); if (tp) return Object.assign(toDraft({name: 'Contenido de tatuajes', desc: tp.desc, ask: tp.ask, icon: tp.icon, color: tp.color, agents: tp.agents.map((a, i, A) => Object.assign({}, a, {reviews: i === A.length - 1 ? A[0].name : ''})), auto}, prev), {}); }
    roles.push(has(/idea|cre|dise|nombre|marca/) ? 'creativo' : 'investigador'); if (has(/mercado|cripto|trading|btc|bot/)) roles.push('analista'); roles.push(has(/plan|estrateg|negocio|vender|clientes/) ? 'estratega' : 'analista');
    roles.push('critico'); if (has(/texto|escrib|mensaje|guion|correo|caption/)) roles.push('redactor'); roles.push('juez');
    const uniq = [...new Set(roles)], names = R.NAMES.slice(0, uniq.length);
    return toDraft({name: text.replace(/^(quiero|crea|haz|hazme|necesito)( una)? sala( de| que| para)?/i, '').trim().slice(0, 36).replace(/^./, c => c.toUpperCase()) || 'Mi sala', desc: text.slice(0, 190), ask: '¿Qué trabajamos hoy?',
      icon: 'ovni', color: R.COLORS[1], agents: uniq.map((rid, i) => { const r = R.ROLES.find(x => x.id === rid); return {name: names[i], role: r.name, icon: r.icon, color: r.color, prompt: r.prompt, tool: rid === 'analista' && has(/mercado|cripto|trading|btc/) ? 'market' : '', reviews: i === uniq.length - 1 ? names[0] : ''}; }),
      auto}, prev);
  }

  /* ───────── el trabajo: entender el pedido → equipo → instrucciones de cada agente, uno por uno ───────── */
  async function build(text) {
    const app = window.SalaApp, cur = app && app.draft && app.draft();
    busy = true; face('think'); say('user', text);
    const note = say('arqui', 'Estoy pensando el equipo…', true);
    let d = null, used = 'ia';
    try {
      const ctx = cur && cur.agents && cur.agents.length ? `\nEl usuario está editando esta sala; MODIFÍCALA según su pedido y conserva lo que no pida cambiar:\n${JSON.stringify({name: cur.name, desc: cur.desc, ask: cur.ask, icon: cur.icon, color: cur.color, maxRounds: cur.maxRounds, auto: cur.auto, agents: cur.agents.map(a => ({name: a.name, role: a.role, icon: a.icon, color: a.color, tool: a.tool, reviews: (cur.agents.find(b => b.id === a.back) || {}).name || '', prompt: a.prompt.slice(0, 300)}))})}` : '';
      const o = parseJson(await ask([{role: 'system', content: SYS + ctx}, {role: 'user', content: text}], true)); d = o && toDraft(o, cur && cur.agents ? cur : null);
    } catch {}
    if (!d) { d = localDraft(text, cur && cur.agents ? cur : null); used = 'local'; }
    const ev = /cada (\d+) ?h/i.exec(text), daily = /diari|cada (día|dia|mañana|noche)|todos los días|cada maña/i.test(text);
    if (!d.auto.on && (ev || daily)) d.auto = {on: true, goal: text.slice(0, 300), everyHours: ev && [3, 6, 12, 24].includes(+ev[1]) ? +ev[1] : 24}; // si pidió frecuencia, que funcione sola
    update(note, `Listo el equipo de <b>${esc(d.name)}</b>: ${d.agents.length} agentes. Ahora los creo uno por uno.`);
    const team = d.agents.map(a => `${a.name} (${a.role})`).join(', ');
    for (let i = 0; i < d.agents.length; i++) {
      const a = d.agents[i], n = say('arqui', `${avatar(a)}<span>Creando a <b>${esc(a.name)}</b> · ${esc(a.role)}…</span>`, true, 'mk');
      if (used === 'ia') { try { const p = (await ask([{role: 'system', content: AGENT_SYS}, {role: 'user', content: `Sala «${d.name}»: ${d.desc}\nPedido del usuario: ${text}\nEquipo en orden: ${team}.\nAgente ${i + 1} de ${d.agents.length}: ${a.name}, papel «${a.role}»${a.tool ? ', antes de hablar recibe datos reales de su herramienta «' + (R.TOOLS[a.tool] || a.tool) + '»' : ''}${a.back ? ', puede regresar el trabajo a ' + (d.agents.find(b => b.id === a.back) || {}).name : ''}${i === d.agents.length - 1 ? ', es el jefe: revisa todo y entrega el resultado final' : ', le pasa su trabajo a ' + d.agents[i + 1].name}.\nIdea inicial: ${a.prompt}`}], false)).replace(/^["«]|["»]$/g, '').trim(); const own = p.split(/\n\s*\n/).filter(x => !d.agents.some(b => b !== a && x.trim().startsWith(b.name))).join('\n\n').trim(); if (own.length > 40) a.prompt = own.slice(0, 3000); } catch {} }
      if (a.prompt.length < 120) a.prompt = `Eres ${a.name}, ${a.role.toLowerCase()} de la sala «${d.name}» (${d.desc || text.slice(0, 120)}). ${a.prompt ? a.prompt.replace(/\.?$/, '.') : ''} ${i === d.agents.length - 1 ? 'Eres el último: revisa todo lo que hizo el equipo y entrégale al usuario el resultado final, claro y listo para usar.' : `Entrega tu parte en puntos claros y concretos y pásasela a ${d.agents[i + 1].name}.`}`.replace(/\s+/g, ' ').trim(); // si la IA no la escribió, una instrucción completa igual
      update(n, `${avatar(a)}<span><b>${esc(a.name)}</b> · ${esc(a.role)} ${chk()}</span>`);
    }
    say('arqui', `<div class="aq-team">${d.agents.map(a => `<span>${avatar(a)}${esc(a.name)} <small>${esc(a.role)}</small></span>`).join('')}</div>`);
    say('arqui', `${used === 'local' ? 'Mi IA gratis no respondió, así que la armé con los papeles de la app. ' : ''}Te la dejé lista en el formulario${d.auto.on ? `, funcionando sola cada ${d.auto.everyHours} h` : ''}. Revísala y toca <b>Guardar sala</b>. Si quieres cambios, dímelo aquí («hazla más corta», «agrega un agente que…»).`);
    busy = false; face('happy'); setTimeout(() => face(''), 2400);
    if (app && app.loadDraft) app.loadDraft(d);
  }

  /* ───────── interfaz: el robotcito flotante y su chat ───────── */
  const avatar = a => `<span class="av" style="--c:${a.color};width:26px;height:26px"><img src="icons/bots/${esc(a.icon)}.png" alt=""></span>`;
  const chk = () => '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="ok"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  function say(who, html, tmp, cls) { if (!tmp) { st.msgs.push({who, html}); keep(); } const box = $('#arqMsgs'); if (!box) return null; const el = document.createElement('div'); el.className = 'aq-m ' + who + (cls ? ' ' + cls : ''); el.innerHTML = who === 'user' ? esc(html) : html; box.appendChild(el); box.scrollTop = box.scrollHeight; return el; }
  function update(el, html) { if (el) el.innerHTML = html; const box = $('#arqMsgs'); if (box) box.scrollTop = box.scrollHeight; }
  function face(s) { if (root) root.dataset.face = s; }
  const EX = ['Una sala que cada mañana me dé 3 ideas de contenido de tatuajes para Instagram', 'Una sala que analice las noticias cripto y me diga si hoy conviene operar', 'Una sala que revise mis ideas de apps y me diga cuál hacer primero'];
  function paint() {
    if (!root) return; const cur = window.SalaApp && window.SalaApp.draft && window.SalaApp.draft();
    root.innerHTML = `<button type="button" class="aq-bot" aria-label="Arqui: crea una sala por ti" aria-expanded="${open}"><span class="aq-orbit"></span><img src="icons/bots/robot.png" alt=""><span class="aq-ant"></span><i class="aq-ping"></i></button>
      ${!open && !st.msgs.length ? '<span class="aq-tip">¿Te armo una sala?</span>' : ''}
      ${open ? `<div class="aq-panel glass" role="dialog" aria-label="Arqui"><header><span class="aq-mini"><img src="icons/bots/robot.png" alt=""></span><div><b>Arqui</b><small>${st.own ? 'Con Tu IA' : 'IA gratis propia'}</small></div><div class="sp"></div>
          <button type="button" class="aq-x" data-aq="own" title="Cambiar la IA de Arqui">${st.own ? 'Tu IA' : 'Gratis'}</button><button type="button" class="aq-x" data-aq="clear" title="Borrar la conversación">Limpiar</button><button type="button" class="aq-x" data-aq="close" aria-label="Cerrar">✕</button></header>
        <div class="aq-msgs" id="arqMsgs"><div class="aq-m arqui">Hola, soy <b>Arqui</b>. Dime qué sala quieres: para qué sirve, qué tipo de agentes y si debe trabajar sola. Yo lleno todo el formulario y creo a los agentes uno por uno.</div>${st.msgs.map(m => `<div class="aq-m ${m.who}">${m.who === 'user' ? esc(m.html) : m.html}</div>`).join('')}</div>
        ${busy ? '' : `<div class="aq-ex">${(cur && cur.agents && cur.agents.length ? ['Agrega un agente que critique todo', 'Hazla funcionar sola cada mañana', 'Hazla más corta: 3 agentes'] : EX).map(x => `<button type="button" data-aq="ex">${esc(x)}</button>`).join('')}</div>`}
        <form class="aq-in" data-aq-form><textarea rows="2" placeholder="${cur && cur.agents ? 'Dime qué cambiar de la sala que estás editando…' : 'Ej.: Quiero una sala que me ayude a…'}" ${busy ? 'disabled' : ''}></textarea><button class="btn pri sm" ${busy ? 'disabled' : ''}>${busy ? 'Creando…' : 'Crear'}</button></form></div>` : ''}`;
    const box = $('#arqMsgs'); if (box) box.scrollTop = box.scrollHeight;
  }
  function mount() {
    root = document.createElement('div'); root.id = 'arqui'; document.body.appendChild(root); paint();
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-aq], .aq-bot'); if (!b) return;
      if (b.classList.contains('aq-bot')) { open = !open; paint(); if (open) setTimeout(() => { const t = $('.aq-in textarea'); if (t) t.focus(); }, 60); return; }
      const k = b.dataset.aq;
      if (k === 'close') { open = false; paint(); }
      else if (k === 'clear') { st.msgs = []; keep(); paint(); }
      else if (k === 'own') { st.own = !st.own; keep(); paint(); }
      else if (k === 'ex' && !busy) go(b.textContent);
    });
    root.addEventListener('submit', e => { e.preventDefault(); const t = $('.aq-in textarea'); if (t && t.value.trim() && !busy) go(t.value.trim()); });
    root.addEventListener('keydown', e => { if (e.target.matches('.aq-in textarea') && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); root.querySelector('.aq-in').requestSubmit(); } });
  }
  async function go(text) { busy = true; paint(); try { await build(text); } catch (e) { say('arqui', 'Algo falló: ' + esc(e.message) + '. Intenta otra vez.'); } busy = false; paint(); setTimeout(paint, 400); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  window.SalaArqui = {open: () => { open = true; paint(); }, toDraft, localDraft, repaint: paint};
})();
