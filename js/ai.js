/* SALA DE AGENTES · IA de los agentes y piezas compartidas con VORTEX.
   Se cargan EN VIVO de tu VORTEX publicado (así el motor de backtest, Nova Nexus y la IA son siempre los mismos que en Nova Bot Lab);
   si no responde, se usa la copia de respaldo guardada en este repositorio (carpeta vortex/).
   IA: «Tu IA» (si la conectaste en VORTEX, se lee de tu cuenta) → IA gratis de tu servidor VORTEX (open source: Groq / Cloudflare) → servicio gratis. */
(function () {
  'use strict';
  const LIVE = 'https://vortex-nexus.pages.dev/', FILES = ['nova-nexus.js', 'botlab-engine.js', 'llm.js'];
  const load = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = ok; s.onerror = () => { s.remove(); ko(new Error(src)); }; document.head.appendChild(s); });
  const ok = f => f === 'llm.js' ? !!window.CCTLLM : f === 'botlab-engine.js' ? !!window.CCTBotLab : !!window.NovaNexus;
  let ready = null, source = '';
  function boot() {
    if (ready) return ready;
    ready = (async () => {
      const from = {};
      for (const f of FILES) {
        try { await Promise.race([load(LIVE + f + '?v=' + Math.floor(Date.now() / 36e5)), new Promise((_, ko) => setTimeout(() => ko(new Error('tiempo')), 8000))]); } catch {}
        if (!ok(f)) { try { await load('vortex/' + f); } catch {} from[f] = 'respaldo'; } else from[f] = 'en vivo';
      }
      source = Object.values(from).every(x => x === 'en vivo') ? 'VORTEX en vivo' : 'copia de respaldo';
      if (!window.CCTBotLab || !window.CCTLLM) throw new Error('No se pudieron cargar las piezas de VORTEX');
      return true;
    })();
    return ready;
  }

  /* «Tu IA» de tu cuenta → la usa también la sala (misma lógica de VORTEX: si falla o se queda sin saldo, sigue con la gratis) */
  let ownAt = 0;
  async function syncOwn() {
    const C = window.SalaCloud, L = window.CCTLLM; if (!C || !L || !C.user() || Date.now() - ownAt < 5 * 6e4) return; ownAt = Date.now();
    try { const d = await C.get('ownai'); if (d && d.on && d.key && L.OWN[d.provider]) L.ownSave({on: true, provider: d.provider, key: d.key, model: d.model, url: d.url || ''}); else if (d && !d.on) L.ownSave(null); } catch {}
  }
  function label() { const L = window.CCTLLM; if (!L) return 'IA'; const o = L.ownLoad(); return o.on ? 'Tu IA · ' + o.model : 'IA gratis de VORTEX'; }

  async function chat(messages, o) {
    await boot(); await syncOwn(); const L = window.CCTLLM;
    const r = await L.chat(messages, {purpose: 'text', maxTokens: o && o.purpose === 'spec' ? 1800 : 1100, temperature: o && o.purpose === 'spec' ? .3 : .5, signal: o && o.signal});
    return {text: String(r.text || '').trim(), model: String(r.model || '')};
  }

  window.SalaAI = {boot, chat, label, source: () => source, resetOwn: () => { ownAt = 0; }};
})();
