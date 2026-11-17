/* SALA DE AGENTES · animación de la sala: los agentes en constelación, conectados por líneas de luz.
   Cuando un agente le habla a otro sale un paquete de luz por la línea; quien recibe se enciende y empieza a «pensar» (anillo en órbita).
   Las herramientas reales (mercado, backtest, tus bots) se ven como un satélite girando alrededor del agente.
   Respeta «reducir movimiento» del sistema. Solo DOM + SVG (ligero en el celular). */
(function () {
  'use strict';
  const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const NS = 'http://www.w3.org/2000/svg', TOOL_TXT = {market: 'Leyendo el mercado', backtest: 'Corriendo backtest', bots: 'Revisando tus bots'};

  /* ───────── Cielo de fondo (estrellas lentas) ───────── */
  function sky(cv) {
    const g = cv.getContext('2d'); let W = 0, H = 0, st = [], raf = 0;
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = cv.width = innerWidth * d; H = cv.height = innerHeight * d; cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
      st = Array.from({length: Math.round(innerWidth * innerHeight / 5200)}, () => ({x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.1 + .25) * d, a: Math.random(), s: Math.random() * .004 + .001, v: Math.random() * .05 * d})); };
    const draw = () => { g.clearRect(0, 0, W, H); for (const s of st) { s.a += s.s; s.y -= s.v; if (s.y < 0) s.y = H; const o = .25 + Math.abs(Math.sin(s.a)) * .6; g.fillStyle = `rgba(210,220,255,${o})`; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill(); } if (!RM()) raf = requestAnimationFrame(draw); };
    size(); draw(); addEventListener('resize', () => { cancelAnimationFrame(raf); size(); draw(); });
  }

  /* ───────── Escena de una sala ───────── */
  function Scene(host, room) {
    const agents = room.flow.map(id => room.agents.find(a => a.id === id)).filter(Boolean), nodes = new Map();
    host.innerHTML = `<svg class="sc-links" aria-hidden="true"><defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g class="sc-back"></g><g class="sc-ring"></g><g class="sc-pk"></g></svg>
      <div class="sc-core"><div class="sc-core-ring"></div><img src="icons/bots/${esc(room.icon)}.png" alt=""><b class="sc-round">Lista</b><small class="sc-status">Esperando tu pedido</small></div>
      <div class="sc-nodes"></div><div class="sc-cap" hidden><span class="sc-cap-av"></span><p></p></div>`;
    const svg = host.querySelector('svg'), gRing = svg.querySelector('.sc-ring'), gBack = svg.querySelector('.sc-back'), gPk = svg.querySelector('.sc-pk'), box = host.querySelector('.sc-nodes');
    const all = agents.concat([{id: 'user', name: 'Tú', role: room.final === 'proposal' ? 'Nova Bot Lab' : 'Informe', icon: null, color: '#e8ecf5'}]);
    for (const a of all) {
      const el = document.createElement('div'); el.className = 'sc-node' + (a.id === 'user' ? ' is-user' : ''); el.style.setProperty('--c', a.color); el.dataset.id = a.id;
      el.innerHTML = `<div class="sc-halo"></div><div class="sc-orbit"><i></i></div><div class="sc-av">${a.icon ? `<img src="icons/bots/${esc(a.icon)}.png" alt="" draggable="false">` : `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.6"/><path d="M4.8 20c1.2-3.7 4-5.4 7.2-5.4s6 1.7 7.2 5.4"/></svg>`}</div>
        <div class="sc-tag"><b>${esc(a.name)}</b><small>${esc(a.role)}</small></div><div class="sc-st">${a.id === 'user' ? '' : 'en espera'}</div><div class="sc-tool"></div><div class="sc-bub" hidden></div>`;
      box.appendChild(el); nodes.set(a.id, {a, el, x: 0, y: 0});
    }
    const paths = new Map(); let W = 0, H = 0;
    function layout() {
      const r = host.getBoundingClientRect(); W = r.width; H = r.height; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const n = all.length, narrow = W < 560, cx = W / 2, cy = narrow ? H * .41 : H / 2 + 6, rx = W * (narrow ? .37 : .37), ry = H * (narrow ? .29 : .35);
      all.forEach((a, i) => { const t = -Math.PI / 2 + (i / n) * Math.PI * 2, N = nodes.get(a.id); N.x = cx + rx * Math.cos(t); N.y = cy + ry * Math.sin(t); N.el.style.left = N.x + 'px'; N.el.style.top = N.y + 'px'; N.el.classList.toggle('lbl-left', Math.cos(t) < -.35); N.el.classList.toggle('bub-down', Math.sin(t) < -.6); });
      gRing.innerHTML = ''; gBack.innerHTML = ''; paths.clear();
      const curve = (A, Bn, k, cls, g) => { const mx = (A.x + Bn.x) / 2, my = (A.y + Bn.y) / 2, qx = mx + (cx - mx) * k, qy = my + (cy - my) * k, p = document.createElementNS(NS, 'path'); p.setAttribute('d', `M${A.x},${A.y} Q${qx},${qy} ${Bn.x},${Bn.y}`); p.setAttribute('class', cls); g.appendChild(p); return p; };
      for (let i = 0; i < all.length - 1; i++) { const A = nodes.get(all[i].id), Bn = nodes.get(all[i + 1].id), p = curve(A, Bn, .28, 'ln', gRing); p.style.setProperty('--c', A.a.color); paths.set(A.a.id + '>' + Bn.a.id, p); }
      for (const a of agents) if (a.back && nodes.get(a.back)) { const p = curve(nodes.get(a.id), nodes.get(a.back), .82, 'ln back', gBack); paths.set(a.id + '>' + a.back, p); }
    }
    const ro = new ResizeObserver(() => layout()); ro.observe(host); layout();

    const core = host.querySelector('.sc-core'), q = s => core.querySelector(s);
    const set = (id, cls, on) => { const N = nodes.get(id); if (N) N.el.classList.toggle(cls, on); };
    const status = (id, t) => { const N = nodes.get(id); if (N) N.el.querySelector('.sc-st').textContent = t; };
    function bubble(id, text, ms) {
      const N = nodes.get(id); if (!N) return; const b = N.el.querySelector('.sc-bub'); clearTimeout(b._t);
      for (const [k, M] of nodes) if (k !== id) M.el.querySelector('.sc-bub').hidden = true; // una sola burbuja a la vez
      const cap = host.querySelector('.sc-cap'); clearTimeout(cap._t); cap.style.setProperty('--c', N.a.color); cap.querySelector('.sc-cap-av').innerHTML = N.a.icon ? `<img src="icons/bots/${esc(N.a.icon)}.png" alt="">` : '';
      const s = String(text || '').replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim(); b.textContent = s.length > 120 ? s.slice(0, 118) + '…' : s; b.hidden = !s;
      b.classList.remove('in'); void b.offsetWidth; b.classList.add('in'); b._t = setTimeout(() => { b.hidden = true; }, ms || 5200);
      cap.querySelector('p').innerHTML = s ? `<b>${esc(N.a.name)}</b> ${esc(s.length > 150 ? s.slice(0, 148) + '…' : s)}` : ''; cap.hidden = !s; cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in'); cap._t = setTimeout(() => { cap.hidden = true; }, (ms || 5200) + 1500);
    }
    function packet(from, to, color) {
      return new Promise(done => {
        const p = paths.get(from + '>' + to) || (() => { const A = nodes.get(from), Bn = nodes.get(to); if (!A || !Bn) return null; const x = document.createElementNS(NS, 'path'); x.setAttribute('d', `M${A.x},${A.y} Q${W / 2},${H / 2} ${Bn.x},${Bn.y}`); x.setAttribute('class', 'ln tmp'); gBack.appendChild(x); setTimeout(() => x.remove(), 1800); return x; })();
        if (!p) return done(); p.classList.add('hot'); p.style.setProperty('--h', color); setTimeout(() => p.classList.remove('hot'), 1500);
        if (RM()) return done();
        const len = p.getTotalLength(), dots = [0, 1, 2].map(k => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', k ? 2.6 - k * .6 : 4.2); c.setAttribute('fill', color); c.setAttribute('opacity', k ? .55 - k * .15 : 1); if (!k) c.setAttribute('filter', 'url(#glow)'); gPk.appendChild(c); return c; });
        const T = Math.max(650, Math.min(1300, len * 2.4)), t0 = performance.now(), ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const step = now => { const t = Math.min(1, (now - t0) / T); dots.forEach((c, k) => { const pt = p.getPointAtLength(len * Math.max(0, ease(t) - k * .045)); c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); }); if (t < 1) requestAnimationFrame(step); else { dots.forEach(c => c.remove()); const N = nodes.get(to); if (N) { N.el.classList.remove('hit'); void N.el.offsetWidth; N.el.classList.add('hit'); } done(); } };
        requestAnimationFrame(step);
      });
    }
    function reset() { for (const [id] of nodes) { ['think', 'talk', 'tool', 'ok', 'warn', 'done', 'hit'].forEach(c => set(id, c, false)); status(id, id === 'user' ? '' : 'en espera'); nodes.get(id).el.querySelector('.sc-bub').hidden = true; } core.classList.remove('run', 'win', 'lose'); q('.sc-round').textContent = 'Lista'; q('.sc-status').textContent = 'Esperando tu pedido'; }

    /* Eventos del orquestador → animación */
    async function on(e) {
      if (e.type === 'start') { reset(); core.classList.add('run'); q('.sc-round').textContent = 'Ronda 1'; q('.sc-status').textContent = 'El equipo está trabajando'; }
      else if (e.type === 'round') { q('.sc-round').textContent = 'Ronda ' + e.round; q('.sc-status').textContent = 'Regresa a ' + (nodes.get(e.to) || {a: {}}).a.name; }
      else if (e.type === 'tool') { set(e.agent, 'tool', e.state === 'run'); const N = nodes.get(e.agent); if (N) N.el.querySelector('.sc-tool').textContent = e.state === 'run' ? TOOL_TXT[e.tool] || 'Herramienta' : ''; if (e.state === 'run') status(e.agent, (TOOL_TXT[e.tool] || 'herramienta').toLowerCase() + '…'); if (e.state === 'ok' && e.text) bubble(e.agent, e.text, 3600); }
      else if (e.type === 'think') { set(e.agent, 'think', true); status(e.agent, 'pensando…'); q('.sc-status').textContent = (nodes.get(e.agent) || {a: {}}).a.name + ' está pensando'; }
      else if (e.type === 'msg') {
        const A = nodes.get(e.agent); set(e.agent, 'think', false); set(e.agent, 'talk', true); setTimeout(() => set(e.agent, 'talk', false), 1600);
        if (e.verdict) { set(e.agent, 'ok', e.verdict === 'aprobado'); set(e.agent, 'warn', e.verdict === 'cambios'); status(e.agent, e.verdict === 'aprobado' ? 'aprobó' : 'pidió cambios'); } else status(e.agent, 'listo');
        bubble(e.agent, e.text, 5600); await packet(e.agent, e.to, A ? A.a.color : '#fff');
        if (e.to === 'user') set('user', 'done', true); else status(e.to, 'recibió');
      }
      else if (e.type === 'note') { if (e.agent) bubble(e.agent, e.text, 4200); }
      else if (e.type === 'done') { core.classList.remove('run'); const win = ['propuesta', 'informe'].includes(e.outcome); core.classList.add(win ? 'win' : 'lose'); q('.sc-round').textContent = win ? (e.outcome === 'propuesta' ? 'Aprobado' : 'Listo') : e.outcome === 'cancelado' ? 'Detenido' : 'Sin aprobar'; q('.sc-status').textContent = e.outcome === 'propuesta' ? 'Propuesta lista para Nova Bot Lab' : e.outcome === 'informe' ? 'Informe entregado' : e.outcome === 'cancelado' ? 'Sesión detenida' : 'El equipo no aprobó'; for (const [id] of nodes) set(id, 'think', false); }
      else if (e.type === 'error') { set(e.agent, 'think', false); status(e.agent, 'sin respuesta'); }
    }
    return {on, reset, destroy: () => ro.disconnect()};
  }

  window.SalaScene = {sky, Scene};
})();
