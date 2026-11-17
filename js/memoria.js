/* SALA DE AGENTES · Memoria compartida: Claude, ChatGPT y Gemini leen y guardan aquí lo que vas haciendo.
   El servidor vive en tu Worker de VORTEX (vortex-push): /mem/<llave>/mcp, /mem/<llave>/contexto y /mem/<llave>/api.
   La llave se crea aquí una sola vez y se guarda en tu cuenta (documento «sala»), así sale igual en tu PC y tu celular. */
(function () {
  'use strict';
  const BASE = 'https://vortex-push.soobroon.workers.dev';
  const IA = {claude: {name: 'Claude', icon: 'cometa', color: '#fb923c'}, chatgpt: {name: 'ChatGPT', icon: 'robot', color: '#20bf9f'}, gemini: {name: 'Gemini', icon: 'estrella', color: '#548fff'}, yo: {name: 'Tú', icon: 'astronauta', color: '#e8ecf5'}, sala: {name: 'Sala', icon: 'vortice', color: '#7c5cff'}, otra: {name: 'Otra IA', icon: 'ovni', color: '#94a3b8'}};
  let H = null, data = null, tab = 'log', fIa = '', fPj = '', form = null, err = '', busy = false;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const tok = () => (H.state().mem || {}).token || '', url = p => `${BASE}/mem/${tok()}/${p}`;
  const when = t => new Date(t).toLocaleString('es-MX', {dateStyle: 'medium', timeStyle: 'short'});
  const avIA = (k, s) => { const a = IA[k] || IA.otra; return `<span class="av" style="--c:${a.color};width:${s}px;height:${s}px"><img src="icons/bots/${a.icon}.png" alt=""></span>`; };
  async function api(body) {
    const r = await fetch(url('api'), body ? {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)} : {});
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Error ' + r.status); data = j.data || data; return j;
  }
  async function activate() {
    const b = new Uint8Array(32); crypto.getRandomValues(b); const t = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const r = await fetch(BASE + '/mem/init', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({token: t})}); const j = await r.json().catch(() => ({}));
    if (r.status === 409) throw new Error('La memoria ya se activó en otro dispositivo. Inicia sesión con tu cuenta de Google para traer tu llave.');
    if (!r.ok) throw new Error(j.error || 'No se pudo activar (' + r.status + ')');
    H.state().mem = {token: t, at: Date.now(), updatedAt: Date.now()}; H.save();
  }
  const instr = ia => ia === 'gemini'
    ? `Tengo una memoria compartida entre Claude, ChatGPT y Gemini con mis proyectos y lo que vamos avanzando. Al empezar una conversación de trabajo, lee mi contexto en esta dirección y úsalo sin preguntarme: ${url('contexto')}\nCuando te diga «resumen para la memoria», dame un resumen con este formato exacto:\nProyecto: …\nTítulo: …\nResumen: …\nDecisiones: …\nPendientes: …`
    : `Tengo una memoria compartida entre Claude, ChatGPT y Gemini (conector «Memoria compartida»). Al empezar cualquier conversación de trabajo, llama a leer_contexto (con el proyecto si lo sé) para saber qué estamos creando y en qué vamos, sin pedirme el contexto. Cuando terminemos algo importante (decisiones, avances, cambios o pendientes), llama a guardar_sesion con ia="${ia}", el proyecto, un título, un resumen claro, las decisiones y los pendientes. Si cambia el estado de un proyecto, usa actualizar_proyecto.`;
  const copyBtn = (txt, label) => `<button type="button" class="btn sm" data-mm="copy" data-t="${esc(txt)}">${label || 'Copiar'}</button>`;

  function hub() {
    const n = data ? data.log.length : 0, last = data ? data.log.slice(0, 3) : [];
    return `<div class="mhub glass"><svg class="mh-l" viewBox="0 0 400 260" preserveAspectRatio="none" aria-hidden="true">${[[200, 52], [70, 192], [330, 192]].map(([x, y], i) => `<path d="M${x},${y} Q${(x + 200) / 2 + (i ? 0 : 0)},${(y + 156) / 2} 200,156" class="mh-p" style="--c:${['#fb923c', '#20bf9f', '#548fff'][i]};--d:${i * .6}s"/>`).join('')}</svg>
      ${['claude', 'chatgpt', 'gemini'].map((k, i) => { const c = data ? data.log.filter(e => e.ia === k).length : 0, on = last.some(e => e.ia === k); return `<div class="mh-n ${on ? 'on' : ''}" style="--c:${IA[k].color};left:${[50, 17.5, 82.5][i]}%;top:${[20, 74, 74][i]}%">${avIA(k, 54)}<b>${IA[k].name}</b><small>${c} sesiones</small></div>`; }).join('')}
      <div class="mh-core"><img src="icons/bots/vortice.png" alt=""><b>${n}</b><small>en la memoria</small></div></div>`;
  }
  function logView() {
    if (!data) return '<p class="empty glass">Cargando…</p>'; const ps = data.proyectos;
    const L = data.log.filter(e => (!fIa || e.ia === fIa) && (!fPj || e.proyecto === fPj));
    return `<div class="mtools"><div class="pills">${[['', 'Todas'], ['claude', 'Claude'], ['chatgpt', 'ChatGPT'], ['gemini', 'Gemini'], ['yo', 'Tú']].map(([k, v]) => `<button type="button" class="pl ${fIa === k ? 'on' : ''}" data-mm="fIa" data-k="${k}">${v}</button>`).join('')}</div>
      ${ps.length ? `<select data-mm-sel="fPj"><option value="">Todos los proyectos</option>${ps.map(p => `<option value="${esc(p.id)}" ${p.id === fPj ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select>` : ''}<div class="sp"></div><button class="btn pri sm" data-mm="new">+ Agregar resumen</button></div>
      ${form ? formView() : ''}
      ${L.length ? L.map(e => `<article class="msg mlog" style="--c:${(IA[e.ia] || IA.otra).color}"><header>${avIA(e.ia, 34)}<div><b>${esc(e.titulo)}</b><small>${esc((IA[e.ia] || IA.otra).name)}${e.proyecto ? ' · ' + esc((ps.find(p => p.id === e.proyecto) || {}).nombre || e.proyecto) : ''} · ${when(e.at)}</small></div><button class="ib" data-mm="del" data-id="${e.id}" title="Borrar">×</button></header>
        <div class="txt"><p>${esc(e.resumen).replace(/\n/g, '<br>')}</p>${e.decisiones.length ? `<p><b>Decisiones:</b></p><ul>${e.decisiones.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${e.pendientes.length ? `<p><b>Pendientes:</b></p><ul>${e.pendientes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div></article>`).join('')
      : `<p class="empty glass">${data.log.length ? 'Nada con ese filtro.' : 'Todavía no hay sesiones. Conecta tus IAs (pestaña «Conectar IAs») o agrega un resumen a mano.'}</p>`}`;
  }
  function formView() {
    return `<div class="glass box mform"><div class="q"><b>Agregar un resumen</b><small>Pega lo que te dio la IA. Si viene con «Proyecto:», «Título:», «Decisiones:» y «Pendientes:», se acomoda solo.</small></div>
      <div class="pills" data-f="mia">${['claude', 'chatgpt', 'gemini', 'yo'].map(k => `<button type="button" class="pl ${form.ia === k ? 'on' : ''}" data-v="${k}">${IA[k].name}</button>`).join('')}</div>
      <textarea data-mm-in="txt" rows="7" placeholder="Proyecto: Vortex&#10;Título: …&#10;Resumen: …&#10;Decisiones: …&#10;Pendientes: …">${esc(form.txt || '')}</textarea>
      <div class="row"><input data-mm-in="proyecto" placeholder="Proyecto (opcional si viene en el texto)" value="${esc(form.proyecto || '')}" list="mmPj"><datalist id="mmPj">${data.proyectos.map(p => `<option value="${esc(p.nombre)}">`).join('')}</datalist></div>
      <div class="row end"><button class="btn ghost sm" data-mm="cancel">Cancelar</button><div class="sp"></div><button class="btn pri sm" data-mm="saveLog" ${busy ? 'disabled' : ''}>Guardar en la memoria</button></div></div>`;
  }
  function parse(txt) { // «Proyecto: … / Título: … / Resumen: … / Decisiones: … / Pendientes: …»
    const o = {resumen: []}, keys = {proyecto: /^proyecto/i, titulo: /^t[ií]tulo/i, resumen: /^resumen/i, decisiones: /^decisiones/i, pendientes: /^pendientes/i}; let cur = 'resumen';
    for (const ln of String(txt).split('\n')) { const m = /^\s*\**\s*(proyecto|t[ií]tulo|resumen|decisiones|pendientes)\s*\**\s*[:：]\s*(.*)$/i.exec(ln); if (m) { cur = Object.keys(keys).find(k => keys[k].test(m[1])); if (cur === 'proyecto' || cur === 'titulo') { o[cur] = m[2].trim(); cur = 'resumen'; continue; } (o[cur] = o[cur] || []); if (m[2].trim()) o[cur].push(m[2].trim()); continue; } if (ln.trim()) (o[cur] = o[cur] || []).push(ln.trim()); }
    return {proyecto: o.proyecto || '', titulo: o.titulo || '', resumen: (o.resumen || []).join('\n'), decisiones: o.decisiones || [], pendientes: o.pendientes || []};
  }
  function projView() {
    if (!data) return ''; const ps = data.proyectos.slice().sort((a, b) => b.actualizado - a.actualizado);
    return `<div class="tip glass"><p>Tus proyectos y en qué van. Las IAs los actualizan solas con <b>actualizar_proyecto</b>; aquí también los puedes editar.</p></div>
      <div class="glass box"><div class="row"><input data-mm-in="pn" placeholder="Nombre del proyecto"><select data-mm-in="pe">${['activo', 'en pausa', 'terminado', 'idea'].map(x => `<option>${x}</option>`).join('')}</select></div><textarea data-mm-in="pd" rows="2" placeholder="De qué trata (una o dos líneas)"></textarea><div class="row end"><div class="sp"></div><button class="btn pri sm" data-mm="addProj">Guardar proyecto</button></div></div>
      ${ps.map(p => `<div class="glass box mproj"><div class="row"><b>${esc(p.nombre)}</b><span class="pill">${esc(p.estado)}</span><div class="sp"></div><small class="dim">${when(p.actualizado)}</small></div>${p.descripcion ? `<p class="dim">${esc(p.descripcion)}</p>` : ''}${p.notas.length ? `<ul>${p.notas.slice(0, 4).map(n => `<li>${esc(n.t)}</li>`).join('')}</ul>` : ''}
        <div class="row"><select data-mm-st="${esc(p.id)}">${['activo', 'en pausa', 'terminado', 'idea'].map(x => `<option ${x === p.estado ? 'selected' : ''}>${x}</option>`).join('')}</select><input data-mm-note="${esc(p.id)}" placeholder="Agregar nota…"><button class="btn sm" data-mm="note" data-id="${esc(p.id)}">Agregar</button></div></div>`).join('') || '<p class="empty glass">Sin proyectos todavía.</p>'}`;
  }
  function connView() {
    const step = (n, t) => `<li><i>${n}</i><span>${t}</span></li>`;
    return `<div class="tip glass"><p><b>Cómo funciona:</b> cada IA lee tu contexto al empezar y guarda un <b>resumen</b> al terminar algo importante. Las apps no dejan guardar la conversación completa de forma automática; el resumen sí. Esta dirección es secreta: no la compartas.</p></div>
      <div class="mcon glass" style="--c:${IA.claude.color}"><header>${avIA('claude', 40)}<div><b>Claude</b><small>Lee y guarda solo (conector)</small></div></header><ol>
        ${step(1, 'En <b>claude.ai</b> (web) abre Ajustes → Conectores → <b>Agregar conector personalizado</b>.')}
        ${step(2, `Nombre: <b>Memoria compartida</b>. Dirección (URL): ${copyBtn(url('mcp'), 'Copiar URL')}`)}
        ${step(3, `En Ajustes → Perfil → <b>Instrucciones / preferencias</b> (o en las instrucciones de cada proyecto) pega esto: ${copyBtn(instr('claude'), 'Copiar instrucciones')}`)}
        ${step(4, 'Listo: también funciona en la app del celular. Si te pide permiso para usar la herramienta, acéptalo siempre.')}</ol></div>
      <div class="mcon glass" style="--c:${IA.chatgpt.color}"><header>${avIA('chatgpt', 40)}<div><b>ChatGPT</b><small>Conector en modo desarrollador (web)</small></div></header><ol>
        ${step(1, 'En <b>chatgpt.com</b> (web) abre Ajustes → Apps y conectores → Avanzado → activa <b>Modo desarrollador</b>.')}
        ${step(2, `Crea un conector: nombre <b>Memoria compartida</b>, URL ${copyBtn(url('mcp'), 'Copiar URL')}, sin autenticación.`)}
        ${step(3, `En Personalización → <b>Instrucciones personalizadas</b> (o en las instrucciones del proyecto) pega: ${copyBtn(instr('chatgpt'), 'Copiar instrucciones')}`)}
        ${step(4, 'En cada chat: botón <b>+</b> → Modo desarrollador → activa Memoria compartida. Si tu plan solo deja leer, al final pídele «resumen para la memoria» y pégalo en Bitácora → Agregar resumen.')}</ol></div>
      <div class="mcon glass" style="--c:${IA.gemini.color}"><header>${avIA('gemini', 40)}<div><b>Gemini</b><small>Lee por dirección · guardas con un toque</small></div></header><ol>
        ${step(1, `Crea un <b>Gem</b> (gemini.google.com → Gems → Nuevo) y en sus instrucciones pega: ${copyBtn(instr('gemini'), 'Copiar instrucciones')}`)}
        ${step(2, 'Usa ese Gem para tus proyectos: lee tu contexto solo al empezar.')}
        ${step(3, 'Al terminar escríbele «resumen para la memoria» y pega su respuesta aquí en Bitácora → <b>Agregar resumen</b> (eliges Gemini).')}
        ${step(4, `Si en tu cuenta aparece Ajustes → <b>Apps conectadas → Agregar app personalizada</b>, pega la misma URL de Claude ${copyBtn(url('mcp'), 'Copiar URL')} y guardará sola.`)}</ol></div>
      <div class="glass box"><div class="q"><b>Para cualquier otra IA</b><small>Pásale esta dirección o copia el contexto y pégalo al inicio.</small></div><div class="row">${copyBtn(url('contexto'), 'Copiar dirección del contexto')}<button class="btn sm" data-mm="ctx">Copiar contexto completo</button></div></div>`;
  }
  function perfilView() {
    return `<div class="glass box"><div class="q"><b>Quién eres y cómo trabajas</b><small>Lo leen las tres IAs antes que todo: a qué te dedicas, cómo te gusta que te respondan, reglas fijas de tus proyectos.</small></div>
      <textarea data-mm-in="perfil" rows="9" placeholder="Ej.: Soy Payi, tatuador y desarrollador en Veracruz. Respóndeme siempre en español…">${esc(data ? data.perfil : '')}</textarea><div class="row end"><div class="sp"></div><button class="btn pri sm" data-mm="perfil">Guardar perfil</button></div></div>`;
  }
  function paint() {
    const v = H.view(); if (!v.querySelector('.mem')) return;
    const box = v.querySelector('#memBody'); if (!tok()) { box.innerHTML = `<div class="glass box"><div class="q"><b>Activa tu memoria compartida</b><small>Se crea una llave secreta solo para ti. ${H.user() ? 'Se guarda en tu cuenta para usarla en tu PC y tu celular.' : '<b>Inicia sesión primero</b> para que la llave quede en tu cuenta y la veas en todos tus dispositivos.'}</small></div>${err ? `<p class="note err">${esc(err)}</p>` : ''}<div class="row end"><div class="sp"></div><button class="btn pri" data-mm="activate" ${busy ? 'disabled' : ''}>Activar memoria compartida</button></div></div>`; return; }
    box.innerHTML = hub() + `<div class="mtabs">${[['log', 'Bitácora'], ['proj', 'Proyectos'], ['conn', 'Conectar IAs'], ['perfil', 'Perfil']].map(([k, n]) => `<button type="button" class="pl ${tab === k ? 'on' : ''}" data-mm="tab" data-k="${k}">${n}</button>`).join('')}</div>${err ? `<p class="note err">${esc(err)}</p>` : ''}
      <div class="mpane">${tab === 'log' ? logView() : tab === 'proj' ? projView() : tab === 'conn' ? connView() : perfilView()}</div>`;
  }
  async function refresh() { if (!tok()) return paint(); try { await api(); err = ''; } catch (e) { err = 'No se pudo leer la memoria: ' + e.message; } paint(); }
  function render(h) {
    H = h; H.view().innerHTML = `<section class="mem"><div class="hero"><h1>Memoria compartida</h1><p>Claude, ChatGPT y Gemini leen aquí qué estás creando y guardan lo que avanzan. Así ninguna te vuelve a pedir el contexto.</p></div><div id="memBody"></div></section>`;
    paint(); refresh();
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-mm]'); if (!b || !H || !document.querySelector('.mem')) return; const a = b.dataset.mm, v = s => (document.querySelector(`[data-mm-in="${s}"]`) || {}).value || '';
    try {
      if (a === 'copy') { await navigator.clipboard.writeText(b.dataset.t); H.toast('Copiado'); return; }
      if (a === 'ctx') { const r = await fetch(url('contexto')); await navigator.clipboard.writeText(await r.text()); H.toast('Contexto copiado: pégalo al inicio de cualquier chat'); return; }
      if (a === 'activate') { busy = true; err = ''; paint(); await activate(); busy = false; tab = 'conn'; await refresh(); H.toast('Memoria activada. Ahora conecta tus IAs.'); return; }
      if (a === 'tab') { tab = b.dataset.k; form = null; paint(); return; }
      if (a === 'fIa') { fIa = b.dataset.k; paint(); return; }
      if (a === 'new') { form = {ia: 'gemini', txt: ''}; paint(); return; }
      if (a === 'cancel') { form = null; paint(); return; }
      if (a === 'saveLog') { const on = document.querySelector('[data-f="mia"] .on'), p = parse(v('txt')); if (!p.resumen.trim()) return H.toast('Pega el resumen'); busy = true; await api({op: 'sesion', ia: on ? on.dataset.v : 'yo', proyecto: v('proyecto') || p.proyecto, titulo: p.titulo, resumen: p.resumen, decisiones: p.decisiones, pendientes: p.pendientes}); busy = false; form = null; paint(); H.toast('Guardado en la memoria'); return; }
      if (a === 'del') { if (!confirm('¿Borrar este resumen de la memoria?')) return; await api({op: 'borrar', id: b.dataset.id}); paint(); return; }
      if (a === 'addProj') { if (!v('pn').trim()) return H.toast('Escribe el nombre'); await api({op: 'proyecto', nombre: v('pn'), estado: v('pe'), descripcion: v('pd')}); paint(); H.toast('Proyecto guardado'); return; }
      if (a === 'note') { const inp = document.querySelector(`[data-mm-note="${b.dataset.id}"]`); if (!inp.value.trim()) return; await api({op: 'proyecto', id: b.dataset.id, nota: inp.value}); paint(); return; }
      if (a === 'perfil') { await api({op: 'perfil', perfil: v('perfil')}); H.toast('Perfil guardado'); return; }
    } catch (er) { busy = false; err = er.message; paint(); }
  });
  document.addEventListener('input', e => { if (form && e.target.dataset && e.target.dataset.mmIn === 'txt') form.txt = e.target.value; if (form && e.target.dataset && e.target.dataset.mmIn === 'proyecto') form.proyecto = e.target.value; });
  document.addEventListener('change', async e => { if (!H || !document.querySelector('.mem')) return; const t = e.target;
    if (t.dataset.mmSel === 'fPj') { fPj = t.value; paint(); }
    if (t.dataset.mmSt) { try { await api({op: 'proyecto', id: t.dataset.mmSt, estado: t.value}); paint(); } catch (er) { H.toast(er.message); } } });
  document.addEventListener('click', e => { const pl = e.target.closest('[data-f="mia"] .pl'); if (pl && form) form.ia = pl.dataset.v; }, true);
  window.SalaMem = {render, parse};
})();
